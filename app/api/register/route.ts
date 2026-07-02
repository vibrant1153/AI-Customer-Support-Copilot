import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

// Admin client uses the service role key — bypasses RLS entirely.
// ONLY used server-side, never exposed to the browser.
function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: NextRequest) {
  const { orgName, fullName, email } = await request.json();

  // Verify the user is actually authenticated via their session cookie
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  // Use the admin client for DB inserts — bypasses RLS so the
  // newly-created user can insert their first org row without
  // the JWT/RLS timing issue.
  const admin = getAdminClient();

  const { data: org, error: orgError } = await admin
    .from('organizations')
    .insert({ name: orgName })
    .select()
    .single();

  if (orgError || !org) {
    return NextResponse.json(
      { error: orgError?.message ?? 'Could not create organization.' },
      { status: 500 }
    );
  }

  const { error: profileError } = await admin.from('profiles').insert({
    id: user.id,
    org_id: org.id,
    full_name: fullName,
    email,
  });

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}