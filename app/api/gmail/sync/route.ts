import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { listRecentInboxMessageIds, getParsedMessage } from '@/lib/google/gmail';

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST() {
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

  const { data: connection } = await supabase
    .from('email_connections')
    .select('refresh_token')
    .eq('org_id', profile.org_id)
    .eq('provider', 'gmail')
    .maybeSingle();

  if (!connection) {
    return NextResponse.json({ error: 'Gmail is not connected for this organization' }, { status: 400 });
  }

  try {
    const messageIds = await listRecentInboxMessageIds(connection.refresh_token, 10);

    const admin = getAdminClient();
    let importedCount = 0;

    for (const gmailMessageId of messageIds) {
      // Skip messages we've already imported (unique index on
      // gmail_message_id enforces this too, but checking first avoids
      // unnecessary Gmail API calls to fetch full message bodies).
      const { data: existing } = await admin
        .from('customer_emails')
        .select('id')
        .eq('gmail_message_id', gmailMessageId)
        .maybeSingle();

      if (existing) continue;

      const parsed = await getParsedMessage(connection.refresh_token, gmailMessageId);

      const { error: insertError } = await admin.from('customer_emails').insert({
        org_id: profile.org_id,
        sender_name: parsed.fromName,
        sender_email: parsed.fromEmail,
        subject: parsed.subject,
        body: parsed.bodyText,
        status: 'new',
        gmail_message_id: parsed.gmailMessageId,
        gmail_thread_id: parsed.threadId,
        gmail_message_id_header: parsed.messageIdHeader,
      });

      if (!insertError) importedCount++;
    }

    return NextResponse.json({ importedCount, checked: messageIds.length });
  } catch (err) {
    console.error('Gmail sync failed:', err);
    return NextResponse.json({ error: 'Gmail sync failed' }, { status: 500 });
  }
}