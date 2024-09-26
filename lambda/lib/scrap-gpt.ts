import { askGPT } from "./ask-gpt";

export async function scrapGPT({
  apiKey,
  htmlContent,
  userPrompt,
}: {
  apiKey: string;
  htmlContent: string;
  userPrompt: string;
}) {
  const prompt = `
You have been provided with TEXT content retrieved from the HTML content of a URL that the user has input. The user wants to extract specific information from this HTML.

Instructions:
1. Always output the result in JSON format. The JSON output should be enclosed between "###START_JSON###" and "###END_JSON###" to allow for easy extraction.
2. If the user has not provided specific details on the structure, infer the structure based on the content. Do your best to present the data in a meaningful way.
3. If the HTML suggests a better or more specific prompt that the user could have used, include this suggestion after the JSON output, enclosed between "###START_SUGGESTION###" and "###END_SUGGESTION###".
4. If no relevant data can be extracted, return an empty JSON object: {}.

Example Output:
###START_JSON###
{
    "exampleField": "exampleValue"
}
###END_JSON###

###START_SUGGESTION###
You might want to ask for "specific data" instead of "general data" to improve accuracy.
###END_SUGGESTION###

User Request:
${userPrompt}
`.trim();

  // Step 3: Combine the prompt with the HTML content and call askGPT
  const gptResponse = await askGPT({
    apiKey,
    content: htmlContent,
    prompt,
  });

  // Step 4: Parse the response to extract the JSON result
  const jsonResultMatch = gptResponse.match(
    /###START_JSON###([\s\S]*?)###END_JSON###/
  );
  const suggestionMatch = gptResponse.match(
    /###START_SUGGESTION###([\s\S]*?)###END_SUGGESTION###/
  );

  let jsonResult = {};

  if (jsonResultMatch && jsonResultMatch[1]) {
    try {
      jsonResult = JSON.parse(jsonResultMatch[1].trim());
    } catch (error) {
      console.error("Failed to parse JSON result:", error);
      jsonResult = jsonResultMatch[1].trim();
      // throw new Error('Invalid JSON format returned by GPT');
    }
  }

  const suggestion = suggestionMatch ? suggestionMatch[1].trim() : null;

  return { gptResponse, jsonResult, suggestion };
}
