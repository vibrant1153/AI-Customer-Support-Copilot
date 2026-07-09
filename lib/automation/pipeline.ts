import { SupabaseClient } from '@supabase/supabase-js';
import { listRecentInboxMessageIds, getParsedMessage } from '@/lib/google/gmail';
import { embedQuery } from '@/lib/processing/embedChunks';
import { generateDraft } from '@/lib/ai/generateDraft';

/**
 * Pulls recent Gmail inbox messages for one org and inserts any not
 * already imported. Same logic as the manual /api/gmail/sync route, but
 * takes an admin client directly instead of relying on a browser session
 * — this is what lets it run unattended, e.g. from a scheduled job.
 */
export async function syncOrgInbox(
  admin: SupabaseClient,
  orgId: string,
  refreshToken: string
) {
  const messageIds = await listRecentInboxMessageIds(refreshToken, 10);
  const importedEmailIds: string[] = [];

  for (const gmailMessageId of messageIds) {
    const { data: existing } = await admin
      .from('customer_emails')
      .select('id')
      .eq('gmail_message_id', gmailMessageId)
      .maybeSingle();

    if (existing) continue;

    const parsed = await getParsedMessage(refreshToken, gmailMessageId);

    if (parsed.isLikelyBulkMail) continue; // newsletter/notification — not a real customer inquiry

    const { data: inserted, error: insertError } = await admin
      .from('customer_emails')
      .insert({
        org_id: orgId,
        sender_name: parsed.fromName,
        sender_email: parsed.fromEmail,
        subject: parsed.subject,
        body: parsed.bodyText,
        status: 'new',
        gmail_message_id: parsed.gmailMessageId,
        gmail_thread_id: parsed.threadId,
        gmail_message_id_header: parsed.messageIdHeader,
      })
      .select('id')
      .single();

    if (!insertError && inserted) importedEmailIds.push(inserted.id);
  }

  return importedEmailIds;
}

/**
 * Generates a draft (with confidence score) for every new email and saves
 * it as 'pending' — it does NOT push to Gmail or send a notification.
 * A human reviews the confidence score and clicks Approve in Settings,
 * which pushes to Gmail at that point (same /api/drafts/[id] route the
 * Hosted Inbox flow already uses).
 */
export async function processEmailAndNotify(
  admin: SupabaseClient,
  orgId: string,
  orgName: string,
  geminiApiKey?: string
) {
  const { data: email } = await admin
    .from('customer_emails')
    .select('id, subject, body, sender_name, sender_email, gmail_thread_id, gmail_message_id_header')
    .eq('org_id', orgId)
    .eq('status', 'new')
    .not('gmail_thread_id', 'is', null)
    .order('created_at', { ascending: true });

  if (!email || email.length === 0) return { processed: 0 };

  let processed = 0;

  for (const e of email) {
    try {
      // 1. Retrieve
      const queryText = `${e.subject}\n\n${e.body}`;
      const queryEmbedding = await embedQuery(queryText, geminiApiKey);
      const { data: matches } = await admin.rpc('match_document_chunks', {
        query_embedding: queryEmbedding,
        match_org_id: orgId,
        match_count: 5,
      });

      // 2. Generate
      const generated = await generateDraft(
        orgName,
        { subject: e.subject, body: e.body },
        matches ?? [],
        geminiApiKey
      );

      // 3. Save — status defaults to 'pending', which is the actual gate
      // now. Nothing pushes to Gmail until a human approves it.
      await admin.from('ai_drafts').insert({
        email_id: e.id,
        org_id: orgId,
        draft_body: generated.draft,
        confidence_score: generated.confidence,
        reasoning: generated.reasoning,
      });

      // 4. Mark this email as drafted — critical: without this, every
      // future automation run would re-scan this same email (still
      // 'new') and generate a duplicate draft for it, forever.
      await admin.from('customer_emails').update({ status: 'in_progress' }).eq('id', e.id);

      processed++;
    } catch (err) {
      console.error(`Failed to process email ${e.id}:`, err);
      // Leave this one as 'new' so a future run retries it, rather than
      // silently losing it by marking it processed.
    }
  }

  return { processed };
}