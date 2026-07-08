import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { syncOrgInbox, processEmailAndNotify } from '@/lib/automation/pipeline';

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Runs the same automation pipeline as /api/automation/run, but scoped to
 * just the logged-in user's own org, triggered by a button click. This is
 * what lets you test full automation today, before any real cron job is
 * deployed.
 */
export async function POST() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id, organizations(name, reply_mode)')
    .eq('id', user.id)
    .single();

  if (!profile?.org_id) {
    return NextResponse.json({ error: 'No organization found' }, { status: 400 });
  }

  const org = profile.organizations as unknown as { name: string; reply_mode: string } | null;
  if (org?.reply_mode !== 'gmail_native') {
    return NextResponse.json({ error: 'Automation only applies in Gmail Native mode' }, { status: 400 });
  }

  const admin = getAdminClient();

  const { data: connection } = await admin
    .from('email_connections')
    .select('refresh_token, email_address')
    .eq('org_id', profile.org_id)
    .eq('provider', 'gmail')
    .maybeSingle();

  if (!connection) {
    return NextResponse.json({ error: 'Gmail is not connected for this organization' }, { status: 400 });
  }

  try {
    const importedEmailIds = await syncOrgInbox(admin, profile.org_id, connection.refresh_token);
    const { processed } = await processEmailAndNotify(admin, profile.org_id, org.name);
    return NextResponse.json({ imported: importedEmailIds.length, processed });
  } catch (err) {
    console.error('Automation run failed:', err);
    return NextResponse.json({ error: 'Automation run failed' }, { status: 500 });
  }
}