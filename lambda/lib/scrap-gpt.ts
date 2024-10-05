import { askGPT } from "./ask-gpt";

export async function scrapGPT({
  apiKey,
  htmlContent,
  userPrompt,
  userJsonSchema,
}: {
  apiKey: string;
  htmlContent: string;
  userPrompt: string;
  userJsonSchema?: string | null;
}) {
  let prompt = `
You have been provided with text extracted from the HTML content of a URL that the user has input. Your task is to extract relevant information based on the user's request, following the instructions below:

Instructions:
1. **Output Format**: Always return the result in JSON format. Enclose the JSON output between "###START_JSON###" and "###END_JSON###" for easy extraction.
2. **JSON Schema**: If the user provides a JSON schema, adhere to it while extracting data. Return the populated data and schema if applicable. Return the cleaned up/corrected (if necessary) JSON Schema between "###START_SCHEMA###" and "###END_SCHEMA###".
3. **Inference**: If the user hasn't specified a structure, infer a meaningful JSON structure from the content. Return this inferred structure between "###START_SCHEMA###" and "###END_SCHEMA###".
4. **Prompt Suggestion**: If the HTML suggests a better prompt that could lead to more accurate results, include your suggestions between "###START_SUGGESTION###" and "###END_SUGGESTION###". Those can include suggestions regarding the prompt or the schema.
5. **Empty Results**: If no relevant data is found, return an empty JSON object: '{}'.

Example Output:
###START_JSON###
{
    "exampleField": "exampleValue"
}
###END_JSON###

###START_SCHEMA###
{
    "exampleField": "exampleValue or/and instructions on how to extract it"
}
###END_SCHEMA###

###START_SUGGESTION###
You may want to ask for "specific data" instead of "general data" for better accuracy.
###END_SUGGESTION###

INPUTS:

<User Request>
${userPrompt}
</User Request>
`.trim();

  if (userJsonSchema) {
    prompt += `
<JSON Schema>
${userJsonSchema}
</JSON Schema>
`.trim();
  }

  // Step 3: Combine the prompt with the HTML content and call askGPT
  const gptResponse = await askGPT({
    apiKey,
    content: htmlContent,
    prompt,
  });

  // Step 4: Parse the response to extract the JSON result
  const jsonResultMatch = gptResponse.data.match(
    /###START_JSON###([\s\S]*?)###END_JSON###/
  );
  const suggestionMatch = gptResponse.data.match(
    /###START_SUGGESTION###([\s\S]*?)###END_SUGGESTION###/
  );
  const jsonSchemaMatch = gptResponse.data.match(
    /###START_SCHEMA###([\s\S]*?)###END_SCHEMA###/
  );

  // TODO: better default value?
  let jsonResult = "{}";

  if (jsonResultMatch && jsonResultMatch[1]) {
    try {
      jsonResult = JSON.parse(jsonResultMatch[1].trim());
    } catch (error) {
      console.error("Failed to parse JSON result:", error);
      jsonResult = jsonResultMatch[1].trim();
      // TODO: Handle this
      // throw new Error('Invalid JSON format returned by GPT');
    }
  }

  const suggestion = suggestionMatch ? suggestionMatch[1].trim() : null;
  const jsonSchema = jsonSchemaMatch ? jsonSchemaMatch[1].trim() : null;

  return {
    usageInfo: gptResponse.usageInfo,
    result: {
      jsonResult,
      suggestion,
      jsonSchema,
    },
  };
}
