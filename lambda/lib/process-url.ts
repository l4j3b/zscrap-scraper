import { ZenRows } from "zenrows";
import * as cheerio from "cheerio";
import { Element } from "domhandler";

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
  jsonSchema?: string | null;
}) {
  if (testMode) {
    console.log("TEST_MODE: Skipping scraping and AI processing");

    return {
      result: {
        title: "TEST_MODE",
        jsonResult: "{}",
        suggestion: null as string | null,
        jsonSchema: null as string | null,
        html: null as string | null,
        text: null as string | null,
      },
      usageInfo: null,
    };
  }

  // Scrape the URL
  // Measure the time it takes to scrape the URL
  let start = Date.now();
  const client = new ZenRows(zenrowsApiKey);
  const scraper = await client.get(url, {
    js_render: true,
    json_response: true,
    premium_proxy: true,
    proxy_country: "us",
    js_instructions: JSON.stringify([
      { wait: 2000 },
      { scroll_y: 3000 },
      { wait: 500 },
      { scroll_y: 5000 },
      { wait: 1000 },
      { scroll_y: 3000 },
      { wait: 500 },
      { scroll_y: 4000 },
      { wait: 2000 },
    ]),
  });
  let end = Date.now();
  let duration = end - start;
  console.log(`Scraping URL took ${duration}ms`);

  const data: { html: string } = await scraper.json();

  if (!data.html) {
    throw new Error("Scraper returned no HTML.");
  }

  // Load HTML
  const $ = cheerio.load(data.html);

  // Remove tags that don't add useful information
  $("script, style, svg, meta, link, iframe, noscript").remove();

  // Clean up attributes of each element
  $("*").each((i, elem) => {
    // Remove unnecessary attributes
    $(elem)
      .removeAttr("class")
      .removeAttr("id")
      .removeAttr("role")
      .removeAttr("style");

    // Remove 'aria-*', 'data-*', and event handler attributes
    if (elem instanceof Element && elem.attribs) {
      Object.keys(elem.attribs).forEach((attr) => {
        if (
          attr.startsWith("aria-") ||
          attr.startsWith("data-") ||
          attr.startsWith("on")
        ) {
          $(elem).removeAttr(attr);
        }
      });
    }
  });

  // Remove empty tags, comments, and trim excessive whitespace
  $("*").each((i, elem) => {
    if ($(elem).children().length === 0 && !$(elem).text().trim()) {
      $(elem).remove();
    }
  });

  // Remove HTML comments
  $.root()
    .contents()
    .each((i, elem) => {
      if (elem.type === "comment") {
        $(elem).remove();
      }
    });

  // Get the cleaned HTML
  const title = $("title").text();
  const cleanedHtml = $.html().replace(/\n/g, "");

  const text = $.text();
  // .replace(/\n/g, "");

  // Ask GPT to extract the data
  start = Date.now();
  const { result, usageInfo } = await scrapGPT({
    apiKey: openaiApiKey,
    htmlContent: cleanedHtml,
    userPrompt: prompt,
    userJsonSchema: jsonSchema,
  });
  end = Date.now();
  duration = end - start;
  console.log(`Processing URL took ${duration}ms`);

  return {
    result: {
      ...result,
      html: cleanedHtml,
      rawHtml: data.html,
      text,
      title,
    },
    usageInfo,
  };
}
