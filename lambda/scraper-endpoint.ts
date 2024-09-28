import { APIGatewayProxyHandler } from "aws-lambda";
import * as Sentry from "@sentry/aws-serverless";
import { createHash } from "node:crypto";
import * as urlValidator from "valid-url";

import { processUrl } from "./lib/process-url";
import { deductApiCredit } from "./lib/deduct-api-credit";
import { createSupabaseClient } from "./lib/create-supabase-client";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing required environment variables");
}

const supabase = createSupabaseClient(supabaseUrl, supabaseKey);

type RequestBody = {
  url: string | null;
  prompt: string | null;
};

function hashApiKey(apiKey: string) {
  return createHash("sha256").update(apiKey).digest("hex");
}

export const handler: APIGatewayProxyHandler = Sentry.wrapHandler(
  async (event) => {
    try {
      const apiKey = event.headers["Authorization"]?.replace("Bearer ", "");
      const { url, prompt } = JSON.parse(event.body || "{}") as RequestBody;

      if (!url || !prompt || !apiKey) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            error:
              "Missing required parameters: url, prompt, organization_id, api_key",
          }),
        };
      }

      // Validate URL
      if (!urlValidator.isWebUri(url)) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "Invalid URL provided." }),
        };
      }

      // Validate prompt
      if (typeof prompt !== "string" || prompt.trim() === "") {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "Prompt must be a non-empty string." }),
        };
      }

      // Check the API key
      const { data: apiKeyData } = await supabase
        .from("api_keys")
        .select("*")
        .eq("api_key", hashApiKey(apiKey))
        .single()
        .throwOnError();

      if (!apiKeyData) {
        return {
          statusCode: 401,
          body: JSON.stringify({ error: "Invalid API key." }),
        };
      }

      // Deduct the API credit
      await deductApiCredit(supabase, apiKeyData.organization_id);
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
            org_id: apiKeyData.organization_id,
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
