import { GoogleGenAI, Type } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export interface GeneratedDraft {
  draft: string;
  confidence: number; // 0-100
  reasoning: string;
}

interface ContextChunk {
  content: string;
  similarity: number;
}

/**
 * Generates a draft support reply using only the retrieved knowledge base
 * chunks as grounding. Uses Gemini 2.5 Flash — free-tier eligible, GA
 * (not preview), and well-suited to this kind of structured drafting task.
 * If a stronger model is ever needed, this is the only place to change.
 */
export async function generateDraft(
  orgName: string,
  customerEmail: { subject: string; body: string },
  contextChunks: ContextChunk[]
): Promise<GeneratedDraft> {
  const contextText = contextChunks.length
    ? contextChunks
        .map((c, i) => `[Source ${i + 1}]\n${c.content}`)
        .join('\n\n')
    : '(No relevant knowledge base content was found for this email.)';

  const systemPrompt = `You are a customer support agent for ${orgName}.
Use ONLY the provided context below to answer the customer's email. If the
context doesn't contain enough information to answer confidently, say so
honestly in the draft rather than guessing or inventing details.

Context from the knowledge base:
${contextText}`;

  const userMessage = `Customer email:
Subject: ${customerEmail.subject}

${customerEmail.body}`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [{ role: 'user', parts: [{ text: userMessage }] }],
    config: {
      systemInstruction: systemPrompt,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          draft: {
            type: Type.STRING,
            description: 'The drafted reply email, ready for a human agent to review.',
          },
          confidence: {
            type: Type.NUMBER,
            description:
              '0-100. How confident the model is that this draft correctly and fully answers the customer, based only on the provided context.',
          },
          reasoning: {
            type: Type.STRING,
            description: 'One or two sentences on why this confidence score was chosen.',
          },
        },
        required: ['draft', 'confidence', 'reasoning'],
      },
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error('Gemini returned no draft content');
  }

  const parsed = JSON.parse(text) as GeneratedDraft;

  // Clamp defensively in case the model drifts outside 0-100 despite the schema.
  parsed.confidence = Math.max(0, Math.min(100, Math.round(parsed.confidence)));

  return parsed;
}