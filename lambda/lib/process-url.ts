import { ZenRows } from "zenrows";
import * as cheerio from "cheerio";

import { scrapGPT } from "./scrap-gpt";

const zenrowsApiKey = process.env.ZENROWS_API_KEY!;
const openaiApiKey = process.env.OPENAI_API_KEY!;
const testMode = process.env.TEST_MODE === "true";

export async function processUrl({
  url,
  prompt,
  jsonSchema,
}: {
  url: string;
  prompt: string;
  jsonSchema: string;
}) {
  if (testMode) {
    console.log("TEST_MODE: Skipping scraping and AI processing");

    return {
      result: {
        title: "TEST_MODE",
        jsonResult: "{}",
        suggestion: null as string | null,
        jsonSchema: null as string | null,
      },
      usageInfo: null,
    };
  }

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

  const data: { html: string; status: string } = await scraper.json();

  if (data.status !== "200") {
    throw new Error(`Scraper returned non-200 status: ${JSON.stringify(data)}`);
  }

  if (!data.html) {
    throw new Error("Scraper returned no HTML.");
  }

  // Clean the HTML
  const $ = cheerio.load(data.html);
  $("script, style, svg").remove();
  const text = $("html").text().replace(/\n/g, "");
  const title = $("title").text();

  // Ask GPT to extract the data
  const { result, usageInfo } = await scrapGPT({
    apiKey: openaiApiKey,
    htmlContent: text,
    userPrompt: prompt,
    userJsonSchema: jsonSchema,
  });

  return {
    result: {
      ...result,
      title,
    },
    usageInfo,
  };
}
