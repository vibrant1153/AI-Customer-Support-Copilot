import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { embedQuery } from '@/lib/processing/embedChunks';
import { generateDraft } from '@/lib/ai/generateDraft';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id, organizations(name, gemini_api_key)')
    .eq('id', user.id)
    .single();

  if (!profile?.org_id) {
    return NextResponse.json({ error: 'No organization found' }, { status: 400 });
  }

  const orgData = profile.organizations as unknown as { name: string; gemini_api_key: string | null } | null;
  const orgName = orgData?.name ?? 'our team';
  const geminiApiKey = orgData?.gemini_api_key ?? undefined;

  const { id } = await params;

  // Org-scoped fetch — confirms this draft belongs to the caller's org.
  const { data: oldDraft, error: draftError } = await supabase
    .from('ai_drafts')
    .select('email_id')
    .eq('id', id)
    .eq('org_id', profile.org_id)
    .single();

  if (draftError || !oldDraft) {
    return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
  }

  const { data: email, error: emailError } = await supabase
    .from('customer_emails')
    .select('id, subject, body')
    .eq('id', oldDraft.email_id)
    .eq('org_id', profile.org_id)
    .single();

  if (emailError || !email) {
    return NextResponse.json({ error: 'Original email not found' }, { status: 404 });
  }

  try {
    // Same retrieve -> generate pipeline as the original draft, re-run fresh
    // — useful after adding new knowledge base content, for example.
    const queryText = `${email.subject}\n\n${email.body}`;
    const queryEmbedding = await embedQuery(queryText, geminiApiKey);

    const { data: matches, error: matchError } = await supabase.rpc(
      'match_document_chunks',
      {
        query_embedding: queryEmbedding,
        match_org_id: profile.org_id,
        match_count: 5,
      }
    );
    if (matchError) throw new Error(matchError.message);

    const generated = await generateDraft(
      orgName,
      { subject: email.subject, body: email.body },
      matches ?? [],
      geminiApiKey
    );

    // Creates a NEW pending draft rather than overwriting the old
    // rejected one — keeps the rejection as a record. Note: if the same
    // email is rejected and regenerated multiple times, more than one
    // pending draft can end up pointing at it; approving one still works
    // fine, the others just sit unused.
    const { data: newDraft, error: insertError } = await supabase
      .from('ai_drafts')
      .insert({
        email_id: email.id,
        org_id: profile.org_id,
        draft_body: generated.draft,
        confidence_score: generated.confidence,
        reasoning: generated.reasoning,
      })
      .select()
      .single();

    if (insertError) throw new Error(insertError.message);

    return NextResponse.json({ draft: newDraft });
  } catch (err) {
    console.error('Regenerate failed:', err);
    return NextResponse.json({ error: 'Regenerate failed' }, { status: 500 });
  }
}