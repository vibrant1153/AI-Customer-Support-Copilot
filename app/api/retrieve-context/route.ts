import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { embedQuery } from '@/lib/processing/embedChunks';

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id, organizations(gemini_api_key)')
    .eq('id', user.id)
    .single();

  if (!profile?.org_id) {
    return NextResponse.json({ error: 'No organization found' }, { status: 400 });
  }

  const geminiApiKey = (profile.organizations as unknown as { gemini_api_key: string | null } | null)?.gemini_api_key ?? undefined;

  const { emailId } = await req.json();
  if (!emailId) {
    return NextResponse.json({ error: 'emailId is required' }, { status: 400 });
  }

  // Fetch the email — scoped by org_id as a belt-and-suspenders check on
  // top of RLS, so this route can never be used to pull another org's data
  // even if emailId is guessed or leaked.
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
    // Embed the email's subject + body together as the search query.
    const queryText = `${email.subject}\n\n${email.body}`;
    const queryEmbedding = await embedQuery(queryText, geminiApiKey);

    // pgvector similarity search, filtered by org_id INSIDE the SQL
    // function — see match_document_chunks in phase6-match-function.sql.
    const { data: matches, error: matchError } = await supabase.rpc(
      'match_document_chunks',
      {
        query_embedding: queryEmbedding,
        match_org_id: profile.org_id,
        match_count: 5,
      }
    );

    if (matchError) throw new Error(matchError.message);

    return NextResponse.json({
      emailId: email.id,
      context: matches ?? [],
    });
  } catch (err) {
    console.error('Retrieval failed:', err);
    return NextResponse.json({ error: 'Retrieval failed' }, { status: 500 });
  }
}