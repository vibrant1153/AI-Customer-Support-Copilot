import { SupabaseClient } from '@supabase/supabase-js';
import { listRecentInboxMessageIds, getParsedMessage, createDraftReply } from '@/lib/google/gmail';
import { embedQuery } from '@/lib/processing/embedChunks';
import { generateDraft } from '@/lib/ai/generateDraft';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

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
 * Full headless pipeline for one email: retrieve context, generate a
 * draft, push it into Gmail as a threaded reply, and email the connected
 * inbox a notification with the confidence score. No human interaction —
 * this is the "never leave Gmail" flow.
 */
export async function processEmailAndNotify(
  admin: SupabaseClient,
  orgId: string,
  orgName: string,
  refreshToken: string,
  notifyEmail: string
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
      const queryEmbedding = await embedQuery(queryText);
      const { data: matches } = await admin.rpc('match_document_chunks', {
        query_embedding: queryEmbedding,
        match_org_id: orgId,
        match_count: 5,
      });

      // 2. Generate
      const generated = await generateDraft(
        orgName,
        { subject: e.subject, body: e.body },
        matches ?? []
      );

      // 3. Save (status starts 'pending' but nothing here waits on approval —
      // saved mainly for record-keeping/analytics, not as a gate)
      const { data: savedDraft } = await admin
        .from('ai_drafts')
        .insert({
          email_id: e.id,
          org_id: orgId,
          draft_body: generated.draft,
          confidence_score: generated.confidence,
          reasoning: generated.reasoning,
        })
        .select()
        .single();

      // 4. Push into Gmail as a threaded reply
      if (e.gmail_thread_id) {
        await createDraftReply(refreshToken, {
          threadId: e.gmail_thread_id,
          toEmail: e.sender_email,
          subject: e.subject,
          bodyText: generated.draft,
          inReplyToMessageIdHeader: e.gmail_message_id_header,
        });
      }

      // 5. Mark as in_progress — a draft now exists and is waiting in Gmail
      await admin.from('customer_emails').update({ status: 'in_progress' }).eq('id', e.id);

      // 6. Notify — best-effort, doesn't block the pipeline if it fails
      try {
        await resend.emails.send({
          from: 'AI Customer Support Copilot <onboarding@resend.dev>',
          to: notifyEmail,
          subject: `Draft ready: ${e.subject} (${generated.confidence}% confidence)`,
          html: `
            <p>A reply draft was generated for <strong>${e.sender_name}</strong> (${e.sender_email}) and is waiting in your Gmail.</p>
            <p><strong>Confidence:</strong> ${generated.confidence}%</p>
            <p><strong>Reasoning:</strong> ${generated.reasoning}</p>
            <p>Open Gmail to review and send.</p>
          `,
        });
      } catch (notifyErr) {
        console.error('Notification email failed (draft still created):', notifyErr);
      }

      processed++;
      void savedDraft; // referenced for clarity; not otherwise used here
    } catch (err) {
      console.error(`Failed to process email ${e.id}:`, err);
      // Leave this one as 'new' so a future run retries it, rather than
      // silently losing it by marking it processed.
    }
  }

  return { processed };
}