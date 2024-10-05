import { APIGatewayProxyHandler } from "aws-lambda";
import * as Sentry from "@sentry/aws-serverless";
import { createHmac } from "node:crypto";
import * as urlValidator from "valid-url";

import { processUrl } from "./lib/process-url";
import { deductApiCredit } from "./lib/deduct-api-credit";
import { createSupabaseClient } from "./lib/create-supabase-client";

type RequestBody = {
  url: string | null | undefined;
  prompt: string | null | undefined;
  jsonSchema: string | null | undefined;
};

function hashApiKey(apiKey: string, secret: string) {
  return createHmac("sha256", secret).update(apiKey).digest("hex");
}

export const handler: APIGatewayProxyHandler = Sentry.wrapHandler(
  async (event) => {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    const apiKeySecret = process.env.API_KEY_SECRET;

    if (!supabaseUrl || !supabaseKey || !apiKeySecret) {
      throw new Error("Missing required environment variables");
    }

    const supabase = createSupabaseClient(supabaseUrl, supabaseKey);

    try {
      const authorizationHeader =
        event.headers["Authorization"] || event.headers["authorization"];

      if (!authorizationHeader) {
        return {
          statusCode: 401,
          body: JSON.stringify({ error: "Missing API key." }),
        };
      }

      const match = authorizationHeader.match(/^Bearer\s+(.+)$/i);

      if (!match) {
        return {
          statusCode: 401,
          body: JSON.stringify({
            error: "Invalid Authorization header format.",
          }),
        };
      }

      const apiKey = match[1].trim();

      if (!apiKey) {
        return {
          statusCode: 401,
          body: JSON.stringify({ error: "Missing API key." }),
        };
      }

      let body: RequestBody;

      try {
        body = JSON.parse(event.body || "{}");
      } catch (error) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "Invalid JSON body." }),
        };
      }

      const { url, prompt, jsonSchema } = body;

      if (!url || !prompt) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            error: "Missing required parameters: url, prompt",
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

      // Validate jsonSchema
      if (
        jsonSchema &&
        (typeof jsonSchema !== "string" || jsonSchema.trim() === "")
      ) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            error: "Invalid JSON schema provided.",
          }),
        };
      }

      // Check the API key
      const { data: apiKeyData, error } = await supabase
        .from("api_keys")
        .select("organization_id")
        .eq("key", hashApiKey(apiKey, apiKeySecret))
        .single();

      if (error || !apiKeyData) {
        return {
          statusCode: 401,
          body: JSON.stringify({
            error: "Invalid API key.",
          }),
        };
      }

      // Deduct the API credit
      // Measure the time it takes to deduct the credit
      const start = Date.now();
      await deductApiCredit(supabase, apiKeyData.organization_id);
      const end = Date.now();
      const duration = end - start;
      console.log(`Deducting API credit took ${duration}ms`);

      try {
        // Process the URL
        const { result, usageInfo } = await processUrl({
          url,
          prompt,
          jsonSchema,
        });

        // Creating a response object to easily retrieve the type
        // TODO: Make the response type exportable/shared
        const response = {
          result,
          usageInfo,
        };

        return {
          statusCode: 200,
          body: JSON.stringify(response),
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
      Sentry.captureException(error);

      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "Internal Server Error",
        }),
      };
    }
  }
);

module.exports = { handler };
