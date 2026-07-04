import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export interface ChunkToEmbed {
  id: string;        // document_chunks row id
  content: string;
}

export interface EmbeddedChunk {
  id: string;
  embedding: number[];
}

/**
 * Batch-embeds all chunk texts for a document in a single Gemini call.
 * taskType: RETRIEVAL_DOCUMENT tells the model these are documents to be
 * searched against later (as opposed to search queries — see retrieve-context
 * route in Phase 6, which uses RETRIEVAL_QUERY instead).
 */
export async function embedChunks(
  chunks: ChunkToEmbed[]
): Promise<EmbeddedChunk[]> {
  if (chunks.length === 0) return [];

  const response = await ai.models.embedContent({
    model: 'gemini-embedding-001',
    contents: chunks.map((c) => c.content),
    config: {
      taskType: 'RETRIEVAL_DOCUMENT',
      outputDimensionality: 768,
    },
  });

  if (!response.embeddings) {
    throw new Error('Gemini returned no embeddings');
  }

  // Gemini returns embeddings in the same order as the input array
  return response.embeddings.map((item, index) => ({
    id: chunks[index].id,
    embedding: item.values ?? [],
  }));
}

/**
 * Embeds a single piece of text — e.g. a customer email body — for use as
 * a SEARCH QUERY against already-embedded document chunks.
 *
 * taskType: RETRIEVAL_QUERY (not RETRIEVAL_DOCUMENT) matters here: Gemini
 * tunes the vector differently depending on which side of the search it's
 * embedding. Using the wrong task type still "works" but measurably hurts
 * retrieval ranking quality.
 */
export async function embedQuery(text: string): Promise<number[]> {
  const response = await ai.models.embedContent({
    model: 'gemini-embedding-001',
    contents: [text],
    config: {
      taskType: 'RETRIEVAL_QUERY',
      outputDimensionality: 768,
    },
  });

  const vector = response.embeddings?.[0]?.values;
  if (!vector) {
    throw new Error('Gemini returned no embedding for the query');
  }
  return vector;
}