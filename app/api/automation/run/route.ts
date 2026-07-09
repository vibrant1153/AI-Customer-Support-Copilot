import { NextRequest, NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { syncOrgInbox, processEmailAndNotify } from '@/lib/automation/pipeline';

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Runs sync -> generate for every org currently in gmail_native mode with
 * a connected Gmail account. Drafts are saved as 'pending' — nothing gets
 * pushed to Gmail here; that happens when a human approves in Settings.
 *
 * This has no user session — it's meant to be called by a scheduled job
 * (e.g. Vercel Cron once deployed), not from the browser. Protected by
 * CRON_SECRET instead of Supabase auth.
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = getAdminClient();

  const { data: orgs, error } = await admin
    .from('organizations')
    .select('id, name, gemini_api_key, email_connections(refresh_token, email_address)')
    .eq('reply_mode', 'gmail_native');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results: { orgId: string; imported: number; processed: number; error?: string }[] = [];

  for (const org of orgs ?? []) {
    const connection = (org.email_connections as unknown as { refresh_token: string; email_address: string }[])?.[0];
    if (!connection) continue; // gmail_native but never actually connected — skip

    try {
      const importedEmailIds = await syncOrgInbox(admin, org.id, connection.refresh_token);
      const { processed } = await processEmailAndNotify(admin, org.id, org.name, org.gemini_api_key ?? undefined);
      results.push({ orgId: org.id, imported: importedEmailIds.length, processed });
    } catch (err) {
      console.error(`Automation failed for org ${org.id}:`, err);
      results.push({
        orgId: org.id,
        imported: 0,
        processed: 0,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  return NextResponse.json({ results });
}