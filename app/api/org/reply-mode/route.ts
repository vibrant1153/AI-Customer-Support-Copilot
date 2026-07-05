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

  const { reply_mode } = await req.json();
  if (!['hosted', 'gmail_native'].includes(reply_mode)) {
    return NextResponse.json({ error: 'reply_mode must be "hosted" or "gmail_native"' }, { status: 400 });
  }

  const { error } = await supabase
    .from('organizations')
    .update({ reply_mode })
    .eq('id', profile.org_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ reply_mode });
}