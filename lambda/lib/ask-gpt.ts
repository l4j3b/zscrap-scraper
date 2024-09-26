import OpenAI from 'openai';

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
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: prompt,
      },
      {
        role: 'user',
        content,
      },
    ],
  });

  const data = aiResponse.choices[0].message?.content?.trim();

  if (!data) {
    throw new Error('Failed to retrieve data from OpenAI');
  }

  return data;
}
