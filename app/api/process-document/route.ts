import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { extractText } from '@/lib/processing/extractText';
import { chunkText } from '@/lib/processing/chunkText';

// POST /api/process-document
// Body: { documentId: string }
//
// Runs right after a file is uploaded. Downloads the file from
// Supabase Storage, extracts its text, splits it into chunks,
// saves the chunks, and flips the document's status to
// 'ready' or 'failed'.
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { documentId } = await request.json();
  if (!documentId) {
    return NextResponse.json({ error: 'documentId is required' }, { status: 400 });
  }

  // Look up the document (RLS already ensures this only returns
  // the row if it belongs to the caller's own org)
  const { data: doc, error: docError } = await supabase
    .from('documents')
    .select('id, org_id, file_path, filename')
    .eq('id', documentId)
    .single();

  if (docError || !doc) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }

  try {
    // 1. Download the raw file bytes from Storage
    const { data: fileBlob, error: downloadError } = await supabase.storage
      .from('documents')
      .download(doc.file_path);

    if (downloadError || !fileBlob) {
      throw new Error(downloadError?.message ?? 'Could not download file');
    }

    const mimeType = doc.filename.toLowerCase().endsWith('.pdf')
      ? 'application/pdf'
      : 'text/plain';

    const buffer = Buffer.from(await fileBlob.arrayBuffer());

    // 2. Extract text
    const text = await extractText(buffer, mimeType);

    if (!text || text.trim().length === 0) {
      throw new Error('No extractable text found (file may be scanned/image-based)');
    }

    // 3. Split into chunks
    const chunks = chunkText(text);

    // 4. Save chunks to the database
    const rows = chunks.map((content, index) => ({
      document_id: doc.id,
      org_id: doc.org_id,
      chunk_index: index,
      content,
    }));

    const { error: insertError } = await supabase.from('document_chunks').insert(rows);
    if (insertError) throw new Error(insertError.message);

    // 5. Mark the document as ready
    await supabase.from('documents').update({ status: 'ready' }).eq('id', doc.id);

    return NextResponse.json({ success: true, chunkCount: chunks.length });
  } catch (err) {
    // Mark as failed so the UI can show a clear error state
    await supabase.from('documents').update({ status: 'failed' }).eq('id', doc.id);

    const message = err instanceof Error ? err.message : 'Unknown processing error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}