import { createClient } from "@supabase/supabase-js";

import { SQSHandler } from "aws-lambda";

import { Database } from "../database.types";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Supabase URL or Key is not set");
}

const supabase = createClient<Database>(supabaseUrl, supabaseKey);

type MessageBody = {
  url: string | null;
  prompt: string | null;
  scraperUrlId: string | null;
};

export const handler: SQSHandler = async (event) => {
  for (const record of event.Records) {
    console.log("Processing record:", record);

    try {
      const messageBody: MessageBody = JSON.parse(record.body || "{}");
      const { url, prompt, scraperUrlId } = messageBody;

      if (!url || !prompt || !scraperUrlId) {
        console.error("Missing required parameters");
        continue;
      }

      try {
        const { data: scraperUrl, error: scraperUrlError } = await supabase
          .from("scraper_urls")
          .select("*")
          .eq("id", scraperUrlId)
          .single();

        if (scraperUrlError) throw scraperUrlError;

        const { data: updateAPICreditsResult, error: updateAPICreditsError } =
          await supabase.rpc("deduct_api_credit", {
            org_id: scraperUrl.organization_id,
          });

        if (
          updateAPICreditsError ||
          updateAPICreditsResult[0].updated_credits < 0
        ) {
          throw new Error("Failed to deduct API credit.");
        }
      } catch (error) {
        console.error(error);
      }
    } catch (error) {
      console.error("Error processing message:", error);
      // Handle the error, e.g., send to a Dead-Letter Queue
    }
  }
};
