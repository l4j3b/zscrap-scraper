import { ZenRows } from "zenrows";
import * as cheerio from "cheerio";

import { scrapGPT } from "./scrap-gpt";

const zenrowsApiKey = process.env.ZENROWS_API_KEY!;
const openaiApiKey = process.env.OPENAI_API_KEY!;
const debug = process.env.DEBUG === "true";

export async function processUrl({
  url,
  prompt,
}: {
  url: string;
  prompt: string;
}) {
  if (debug) {
    console.log("DEBUG: Skipping scraping and AI processing");

    return {
      result: null,
      usageInfo: null,
      jsonResult: {},
      suggestion: null,
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

  // Ask GPT to extract the data
  const { gptResponse, jsonResult, suggestion } = await scrapGPT({
    apiKey: openaiApiKey,
    htmlContent: text,
    userPrompt: prompt,
  });

  return {
    result: gptResponse.data,
    usageInfo: gptResponse.usageInfo,
    jsonResult,
    suggestion,
  };
}
