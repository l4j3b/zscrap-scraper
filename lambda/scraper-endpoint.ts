import { APIGatewayProxyHandler } from "aws-lambda";
import { createClient } from "@supabase/supabase-js";
import * as Sentry from "@sentry/aws-serverless";
import { createHash } from "node:crypto";

import { processUrl } from "./lib/process-url";
import { Database } from "../database.types";
import { deductApiCredit } from "./lib/deduct-api-credit";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing required environment variables");
}

const supabase = createClient<Database>(supabaseUrl, supabaseKey);

type RequestBody = {
  url: string | null;
  prompt: string | null;
  organizationId: string | null;
  apiKey: string | null;
};

function hashApiKey(apiKey: string) {
  return createHash("sha256").update(apiKey).digest("hex");
}

export const handler: APIGatewayProxyHandler = Sentry.wrapHandler(
  async (event) => {
    try {
      const body: RequestBody = JSON.parse(event.body || "{}");
      const { url, prompt, organizationId, apiKey } = body;

      if (!url || !prompt || !organizationId || !apiKey) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            error:
              "Missing required parameters: url, prompt, organization_id, api_key",
          }),
        };
      }

      // Check the API key
      const { data: apiKeyData } = await supabase
        .from("api_keys")
        .select("*")
        .eq("api_key", hashApiKey(apiKey))
        .eq("organization_id", organizationId)
        .single()
        .throwOnError();

      if (!apiKeyData) {
        return {
          statusCode: 401,
          body: JSON.stringify({ error: "Invalid API key." }),
        };
      }

      // Deduct the API credit
      await deductApiCredit(supabase, organizationId);

      try {
        // Process the URL
        const { jsonResult } = await processUrl({
          url,
          prompt,
        });

        return {
          statusCode: 200,
          body: JSON.stringify({
            jsonResult,
          }),
        };
      } catch (error) {
        // Re credit the API credit on error
        await supabase
          .rpc("add_api_credit", {
            org_id: organizationId,
          })
          .throwOnError();

        // Surface the error
        throw error;
      }
    } catch (error) {
      console.error("Error processing API request:", error);

      // Log into Sentry
      Sentry.captureException(error);

      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "Internal Server Error",
          details: error instanceof Error ? error.message : String(error),
        }),
      };
    }
  }
);
