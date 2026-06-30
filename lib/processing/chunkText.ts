// Splits a long piece of text into smaller overlapping chunks.
// Overlap helps avoid losing context when a sentence/idea gets cut
// right at a chunk boundary.

const CHUNK_SIZE = 1000;   // characters per chunk
const CHUNK_OVERLAP = 150; // characters shared between consecutive chunks

export function chunkText(text: string): string[] {
  const cleaned = text.replace(/\s+/g, ' ').trim();

  if (cleaned.length === 0) return [];
  if (cleaned.length <= CHUNK_SIZE) return [cleaned];

  const chunks: string[] = [];
  let start = 0;

  while (start < cleaned.length) {
    const end = Math.min(start + CHUNK_SIZE, cleaned.length);
    chunks.push(cleaned.slice(start, end));

    if (end === cleaned.length) break;
    start = end - CHUNK_OVERLAP; // step back slightly for overlap
  }

  return chunks;
}