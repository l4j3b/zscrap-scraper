import { APIGatewayProxyHandler } from "aws-lambda";
import { createClient } from "@supabase/supabase-js";
import * as Sentry from "@sentry/aws-serverless";

import { processUrl } from "./lib/process-url";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing required environment variables");
}

const supabase = createClient(supabaseUrl, supabaseKey);

type RequestBody = {
  url: string | null;
  prompt: string | null;
  organizationId: string | null;
};

export const handler: APIGatewayProxyHandler = Sentry.wrapHandler(
  async (event) => {
    try {
      const body: RequestBody = JSON.parse(event.body || "{}");
      const { url, prompt, organizationId } = body;

      if (!url || !prompt || !organizationId) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            error: "Missing required parameters: url, prompt, organization_id",
          }),
        };
      }

      // Deduct the API credit
      const { data: updateAPICreditsResult, error: updateAPICreditsError } =
        await supabase.rpc("deduct_api_credit", {
          org_id: organizationId,
        });

      if (updateAPICreditsError) {
        throw new Error(
          "Failed to deduct API credit: " + updateAPICreditsError.message
        );
      }

      if (!updateAPICreditsResult[0]?.credits_deducted) {
        return {
          statusCode: 402,
          body: JSON.stringify({ error: "Insufficient API credits." }),
        };
      }

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
