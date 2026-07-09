import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { embedQuery } from '@/lib/processing/embedChunks';
import { generateDraft } from '@/lib/ai/generateDraft';

export async function POST(req: NextRequest) {
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

  const { emailId } = await req.json();
  if (!emailId) {
    return NextResponse.json({ error: 'emailId is required' }, { status: 400 });
  }

  // Org-scoped fetch — same belt-and-suspenders pattern as retrieve-context.
  const { data: email, error: emailError } = await supabase
    .from('customer_emails')
    .select('id, subject, body')
    .eq('id', emailId)
    .eq('org_id', profile.org_id)
    .single();

  if (emailError || !email) {
    return NextResponse.json({ error: 'Email not found' }, { status: 404 });
  }

  try {
    // 1. Retrieve relevant knowledge base chunks (same logic as Phase 6)
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

    // 2. Generate the draft using only that retrieved context
    const generated = await generateDraft(
      orgName,
      { subject: email.subject, body: email.body },
      matches ?? [],
      geminiApiKey
    );

    // 3. Save it — RLS insert policy scopes this to the user's own org.
    const { data: saved, error: insertError } = await supabase
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

    return NextResponse.json({ draft: saved });
  } catch (err) {
    console.error('Draft generation failed:', err);
    return NextResponse.json({ error: 'Draft generation failed' }, { status: 500 });
  }
}