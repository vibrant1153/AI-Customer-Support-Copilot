import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createDraftReply } from '@/lib/google/gmail';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id, organizations(reply_mode)')
    .eq('id', user.id)
    .single();

  if (!profile?.org_id) {
    return NextResponse.json({ error: 'No organization found' }, { status: 400 });
  }

  const replyMode =
    (profile.organizations as unknown as { reply_mode: string } | null)?.reply_mode ?? 'hosted';

  const { id } = await params;
  const { status, draft_body } = await req.json();

  if (!['approved', 'rejected'].includes(status)) {
    return NextResponse.json({ error: 'status must be "approved" or "rejected"' }, { status: 400 });
  }

  // Org-scoped fetch first — confirms this draft belongs to the caller's
  // org before touching anything (RLS also enforces this, but we need the
  // row's email_id regardless, so we fetch it either way).
  const { data: draft, error: fetchError } = await supabase
    .from('ai_drafts')
    .select('id, email_id, org_id')
    .eq('id', id)
    .eq('org_id', profile.org_id)
    .single();

  if (fetchError || !draft) {
    return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
  }

  const updatePayload: { status: string; draft_body?: string } = { status };
  if (typeof draft_body === 'string' && draft_body.trim().length > 0) {
    updatePayload.draft_body = draft_body;
  }

  const { data: updatedDraft, error: updateError } = await supabase
    .from('ai_drafts')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  let pushedToGmail = false;
  let gmailPushError: string | null = null;

  // Approving a draft signals the ticket is actively being worked —
  // matches the same status meaning used elsewhere in the inbox.
  if (status === 'approved') {
    await supabase
      .from('customer_emails')
      .update({ status: 'in_progress' })
      .eq('id', draft.email_id);

    if (replyMode === 'gmail_native') {
      const { data: email } = await supabase
        .from('customer_emails')
        .select('sender_email, subject, gmail_thread_id, gmail_message_id_header')
        .eq('id', draft.email_id)
        .single();

      if (!email?.gmail_thread_id) {
        // This email didn't originate from a Gmail sync (e.g. seeded test
        // data), so there's no real thread to reply into. Not a failure —
        // just nothing to push.
        gmailPushError = 'This email has no linked Gmail thread to reply into.';
      } else {
        const { data: connection } = await supabase
          .from('email_connections')
          .select('refresh_token')
          .eq('org_id', profile.org_id)
          .eq('provider', 'gmail')
          .maybeSingle();

        if (!connection) {
          gmailPushError = 'Gmail is not connected for this organization.';
        } else {
          try {
            await createDraftReply(connection.refresh_token, {
              threadId: email.gmail_thread_id,
              toEmail: email.sender_email,
              subject: email.subject,
              bodyText: updatedDraft.draft_body,
              inReplyToMessageIdHeader: email.gmail_message_id_header,
            });
            pushedToGmail = true;
          } catch (err) {
            console.error('Failed to push draft to Gmail:', err);
            gmailPushError = 'Approved here, but pushing to Gmail failed.';
          }
        }
      }
    }
  }

  return NextResponse.json({ draft: updatedDraft, pushedToGmail, gmailPushError });
}