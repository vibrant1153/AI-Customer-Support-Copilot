import { pdf } from 'pdf-parse';

// Extracts plain text from a file buffer, based on its mime type.
// Returns an empty string (rather than throwing) for unsupported
// types, so the caller can decide how to mark the document as failed.
export async function extractText(buffer: Buffer, mimeType: string): Promise<string> {
  if (mimeType === 'text/plain') {
    return buffer.toString('utf-8');
  }

  if (mimeType === 'application/pdf') {
    const result = await pdf(buffer);
    return result.text;
  }

  throw new Error(`Unsupported file type for extraction: ${mimeType}`);
}