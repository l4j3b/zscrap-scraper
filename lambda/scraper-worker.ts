import { createClient } from "@supabase/supabase-js";
import * as Sentry from "@sentry/aws-serverless";

import { SQSHandler } from "aws-lambda";

import { Database } from "../database.types";
import { processUrl } from "./lib/process-url";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const zenrowsApiKey = process.env.ZENROWS_API_KEY;
const openaiApiKey = process.env.OPENAI_API_KEY;

if (!supabaseUrl || !supabaseKey || !zenrowsApiKey || !openaiApiKey) {
  throw new Error("Missing required environment variables");
}

const supabase = createClient<Database>(supabaseUrl, supabaseKey);

type MessageBody = {
  scraperUrlId: string | null;
};

export const handler: SQSHandler = Sentry.wrapHandler(async (event) => {
  for (const record of event.Records) {
    try {
      const messageBody: MessageBody = JSON.parse(record.body || "{}");
      const { scraperUrlId } = messageBody;

      if (!scraperUrlId) {
        continue;
      }

      // Retrieve the scraper_url to process
      const { data: scraperUrl, error: scraperUrlError } = await supabase
        .from("scraper_urls")
        .select("organization_id, url, scrapers!inner(prompt)")
        .eq("id", scraperUrlId)
        .single()
        .throwOnError();

      if (scraperUrlError) throw scraperUrlError;

      if (!scraperUrl.url || !scraperUrl.scrapers.prompt) {
        throw new Error("Missing required parameters: url, prompt");
      }

      // Deduct the API credit
      const { data: updateAPICreditsResult, error: updateAPICreditsError } =
        await supabase.rpc("deduct_api_credit", {
          org_id: scraperUrl.organization_id,
        });

      if (updateAPICreditsError) {
        throw new Error(
          "Failed to deduct API credit: " + updateAPICreditsError.message
        );
      }

      if (!updateAPICreditsResult[0].credits_deducted) {
        throw new Error("Insufficient API credits.");
      }

      try {
        // At this point, we have enough credits to scrape the URL, any errors from here on out should result in the API credit being credited back

        // Update the scraper_url status to "scraping"
        await supabase
          .from("scraper_urls")
          .update({ status: "processing" })
          .eq("id", scraperUrlId)
          .throwOnError();

        // Process the URL
        const { result, usageInfo, jsonResult, suggestion } = await processUrl({
          url: scraperUrl.url,
          prompt: scraperUrl.scrapers.prompt,
        });

        // Save the data
        await supabase
          .from("scraper_urls")
          .update({
            status: "completed",
            result,
            usageInfo,
            jsonResult,
            suggestion,
            updatedAt: new Date().toISOString(),
            error: null,
          })
          .eq("id", scraperUrlId)
          .throwOnError();
      } catch (error) {
        // Re credit the API credit on error
        await supabase
          .rpc("add_api_credit", {
            org_id: scraperUrl.organization_id,
          })
          .throwOnError();

        // Update the scraper_url status to "error"
        await supabase
          .from("scraper_urls")
          .update({
            status: "failed",
            error: error instanceof Error ? error.message : String(error),
            updatedAt: new Date().toISOString(),
          })
          .eq("id", scraperUrlId)
          .throwOnError();

        throw error;
      }
    } catch (error) {
      console.error("Error processing message:", error);

      // Log into Sentry
      Sentry.captureException(error);
    }
  }
});
