import OpenAI from "openai";

// Constants for 'gpt-4o-mini' pricing per 1M tokens
const PROMPT_COST_PER_1M = 0.15;
const COMPLETION_COST_PER_1M = 0.6;

export async function askGPT({
  apiKey,
  content,
  prompt,
}: {
  apiKey: string;
  content: string;
  prompt: string;
}) {
  const openai = new OpenAI({
    apiKey,
  });

  const aiResponse = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: prompt,
      },
      {
        role: "user",
        content,
      },
    ],
  });

  const data = aiResponse.choices[0]?.message?.content?.trim();

  if (!data) {
    throw new Error("Failed to retrieve data from OpenAI");
  }

  // Extract usage information
  const usage = aiResponse.usage;
  const promptTokens = usage?.prompt_tokens || 0;
  const completionTokens = usage?.completion_tokens || 0;
  const totalTokens = usage?.total_tokens || 0;

  // Calculate the cost using per 1M tokens pricing
  const promptCost = (promptTokens / 1_000_000) * PROMPT_COST_PER_1M;
  const completionCost =
    (completionTokens / 1_000_000) * COMPLETION_COST_PER_1M;
  const totalCost = promptCost + completionCost;

  // Prepare the usage information object
  const usageInfo = {
    version: "v0",
    promptTokens,
    completionTokens,
    totalTokens,
    promptCost,
    completionCost,
    totalCost,
  };

  return {
    data,
    usageInfo,
  };
}
