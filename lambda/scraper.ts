import { createClient } from "@supabase/supabase-js";
import { ZenRows } from "zenrows";
import * as cheerio from "cheerio";

import { SQSHandler } from "aws-lambda";

import { Database } from "../database.types";
import { scrapGPT } from "./lib/scrap-gpt";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const zenrowsApiKey = process.env.ZENROWS_API_KEY;
const openaiApiKey = process.env.OPENAI_API_KEY;

if (!supabaseUrl || !supabaseKey || !zenrowsApiKey || !openaiApiKey) {
  throw new Error("Missing required environment variables");
}

const supabase = createClient<Database>(supabaseUrl, supabaseKey);

type MessageBody = {
  url: string | null;
  prompt: string | null;
  scraperUrlId: string | null;
};

export const handler: SQSHandler = async (event) => {
  for (const record of event.Records) {
    try {
      const messageBody: MessageBody = JSON.parse(record.body || "{}");
      const { url, prompt, scraperUrlId } = messageBody;

      if (!url || !prompt || !scraperUrlId) {
        console.error("Missing required parameters");
        continue;
      }

      // Retrieve the scraper_url to process
      const { data: scraperUrl, error: scraperUrlError } = await supabase
        .from("scraper_urls")
        .select("*")
        .eq("id", scraperUrlId)
        .single()
        .throwOnError();

      if (scraperUrlError) throw scraperUrlError;

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

        // Scrape the URL
        const client = new ZenRows(zenrowsApiKey);
        const scraper = await client.get(url, {
          js_render: true,
          json_response: true,
          js_instructions: JSON.stringify([
            { wait: 2000 },
            { scroll_y: 3000 },
            { wait: 2000 },
            { scroll_y: 5000 },
            { wait: 1000 },
            { scroll_y: 3000 },
            { wait: 1000 },
            { scroll_y: 4000 },
            { wait: 2000 },
          ]),
        });
        const data: { html: string } = await scraper.json();

        if (!data.html) {
          throw new Error("Scraper returned no HTML.");
        }

        // Clean the HTML
        const $ = cheerio.load(data.html);
        $("script, style, svg").remove();
        const title = $("title").text();
        const cleanedHtml = $("html").html();
        const text = $("html").text().replaceAll("\n", "");

        // Save the data
        await supabase
          .from("scraper_urls")
          .update({
            status: "completed",
            title,
            html: cleanedHtml,
            text,
          })
          .eq("id", scraperUrlId)
          .throwOnError();

        // Ask GPT to extract the data
        const { gptResponse, jsonResult, suggestion } = await scrapGPT({
          apiKey: openaiApiKey,
          htmlContent: text,
          userPrompt: prompt,
        });

        // Save the data
        await supabase
          .from("scraper_urls")
          .update({
            result: gptResponse,
            status: "completed",
            jsonResult,
            suggestion,
            updatedAt: new Date().toISOString(),
            error: null,
          })
          .eq("id", scraperUrlId)
          .throwOnError();
      } catch (error) {
        // Recredit the API credit on error
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
      }
    } catch (error) {
      console.error("Error processing message:", error);
      // Handle the error, e.g., send to a Dead-Letter Queue
    }
  }
};
