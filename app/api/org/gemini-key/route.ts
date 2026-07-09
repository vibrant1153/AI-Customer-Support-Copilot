import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('id', user.id)
    .single();

  if (!profile?.org_id) {
    return NextResponse.json({ error: 'No organization found' }, { status: 400 });
  }

  const { gemini_api_key } = await req.json();
  if (typeof gemini_api_key !== 'string') {
    return NextResponse.json({ error: 'gemini_api_key must be a string' }, { status: 400 });
  }

  // Empty string clears it (falls back to the shared key)
  const { error } = await supabase
    .from('organizations')
    .update({ gemini_api_key: gemini_api_key.trim() || null })
    .eq('id', profile.org_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}