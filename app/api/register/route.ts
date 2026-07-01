import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST /api/auth/register
// Handles the full registration flow on the server where the session
// is always reliably established before any DB inserts happen.
export async function POST(request: NextRequest) {
  const { orgName, fullName, email, password } = await request.json();

  if (!orgName || !fullName || !email || !password) {
    return NextResponse.json({ error: 'All fields are required.' }, { status: 400 });
  }

  const supabase = await createClient();

  // 1. Create the auth user
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (signUpError || !signUpData.user) {
    return NextResponse.json(
      { error: signUpError?.message ?? 'Could not create account.' },
      { status: 400 }
    );
  }

  const userId = signUpData.user.id;

  // 2. Create the organization
  // Using server client means the session is fully available here —
  // no race condition like the browser client had.
  const { data: org, error: orgError } = await supabase
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

  // 3. Create the profile linking user → org
  const { error: profileError } = await supabase.from('profiles').insert({
    id: userId,
    org_id: org.id,
    full_name: fullName,
    email,
  });

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}