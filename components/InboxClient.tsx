'use client';

import { useState } from 'react';
import { Mail, Clock, CheckCircle2, Loader2, CircleDot, Sparkles, RefreshCw, XCircle, Pencil } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type EmailStatus = 'new' | 'in_progress' | 'resolved';

type CustomerEmail = {
  id: string;
  sender_name: string;
  sender_email: string;
  subject: string;
  body: string;
  status: EmailStatus;
  created_at: string;
};

type AiDraft = {
  id: string;
  draft_body: string;
  confidence_score: number;
  reasoning: string | null;
  status: 'pending' | 'approved' | 'rejected';
};

function timeAgo(dateStr: string) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const statusConfig: Record<EmailStatus, { label: string; classes: string; icon: React.ReactNode }> = {
  new: {
    label: 'New',
    classes: 'bg-blue-500/10 text-blue-400',
    icon: <CircleDot size={12} />,
  },
  in_progress: {
    label: 'In Progress',
    classes: 'bg-yellow-500/10 text-yellow-400',
    icon: <Loader2 size={12} />,
  },
  resolved: {
    label: 'Resolved',
    classes: 'bg-green-500/10 text-green-400',
    icon: <CheckCircle2 size={12} />,
  },
};

function StatusBadge({ status }: { status: EmailStatus }) {
  const config = statusConfig[status];
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0 ${config.classes}`}>
      {config.icon}
      {config.label}
    </span>
  );
}

function ConfidenceBadge({ score }: { score: number }) {
  const classes =
    score > 80
      ? 'bg-green-500/10 text-green-400'
      : score >= 50
      ? 'bg-yellow-500/10 text-yellow-400'
      : 'bg-red-500/10 text-red-400';
  return (
    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${classes}`}>
      {score}% confidence
    </span>
  );
}

export default function InboxClient({ initialEmails }: { initialEmails: CustomerEmail[] }) {
  const supabase = createClient();
  const [emails, setEmails] = useState<CustomerEmail[]>(initialEmails);
  const [selectedId, setSelectedId] = useState<string | null>(initialEmails[0]?.id ?? null);
  const [drafts, setDrafts] = useState<Record<string, AiDraft>>({});
  const [editedBody, setEditedBody] = useState<Record<string, string>>({});
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [pushSuccess, setPushSuccess] = useState<string | null>(null);

  const selected = emails.find((e) => e.id === selectedId) ?? null;
  const selectedDraft = selected ? drafts[selected.id] : null;

  const handleGenerateDraft = async (emailId: string) => {
    setGeneratingId(emailId);
    setDraftError(null);
    try {
      const res = await fetch('/api/generate-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to generate draft');
      setDrafts((prev) => ({ ...prev, [emailId]: data.draft }));
      setEditedBody((prev) => ({ ...prev, [emailId]: data.draft.draft_body }));
    } catch (err) {
      setDraftError(err instanceof Error ? err.message : 'Failed to generate draft');
    } finally {
      setGeneratingId(null);
    }
  };

  const handleDraftAction = async (emailId: string, action: 'approved' | 'rejected') => {
    const draft = drafts[emailId];
    if (!draft) return;

    setActionId(emailId);
    setDraftError(null);
    setPushSuccess(null);
    try {
      const res = await fetch(`/api/drafts/${draft.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: action,
          draft_body: editedBody[emailId],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Failed to ${action === 'approved' ? 'approve' : 'reject'} draft`);
      setDrafts((prev) => ({ ...prev, [emailId]: data.draft }));

      if (action === 'approved') {
        if (data.pushedToGmail) {
          setPushSuccess('Draft pushed to Gmail — open Gmail to review and send.');
        } else if (data.gmailPushError) {
          setDraftError(data.gmailPushError);
        }
      }

      // Approving mirrors the same 'in_progress' transition the server
      // already applied to customer_emails, so the list badge stays in sync.
      if (action === 'approved') {
        setEmails((prev) =>
          prev.map((e) => (e.id === emailId ? { ...e, status: 'in_progress' } : e))
        );
      }
    } catch (err) {
      setDraftError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionId(null);
    }
  };

  const handleSelect = (email: CustomerEmail) => {
    setSelectedId(email.id);
    // Opening a 'new' email moves it to 'in_progress' — mirrors a real
    // inbox where opening a ticket signals someone's picked it up.
    if (email.status === 'new') {
      updateStatus(email.id, 'in_progress');
    }
  };

  const updateStatus = async (emailId: string, status: EmailStatus) => {
    // Optimistic UI update first, then persist.
    setEmails((prev) => prev.map((e) => (e.id === emailId ? { ...e, status } : e)));

    const { error } = await supabase
      .from('customer_emails')
      .update({ status })
      .eq('id', emailId);

    if (error) {
      // Roll back on failure
      setEmails((prev) =>
        prev.map((e) => (e.id === emailId ? { ...e, status: e.status } : e))
      );
      console.error('Failed to update email status:', error.message);
    }
  };

  if (emails.length === 0) {
    return (
      <div className="p-16 text-center text-slate-500">
        <Mail className="mx-auto mb-4 h-10 w-10 text-slate-600" />
        <p className="text-sm">No customer emails yet.</p>
      </div>
    );
  }

  return (
    <div className="flex gap-4 h-[calc(100vh-14rem)] min-h-[500px]">
      {/* Email list */}
      <div className="w-full md:w-[380px] flex-shrink-0 bg-white/[0.02] border border-white/10 rounded-2xl overflow-y-auto">
        {emails.map((email) => {
          const isSelected = email.id === selectedId;
          return (
            <button
              key={email.id}
              onClick={() => handleSelect(email)}
              className={`w-full text-left px-5 py-4 border-b border-white/5 last:border-b-0 transition-colors
                ${isSelected ? 'bg-white/[0.06]' : 'hover:bg-white/[0.03]'}`}
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <p className="text-sm font-semibold text-white truncate">{email.sender_name}</p>
                <span className="text-xs text-slate-500 flex-shrink-0 flex items-center gap-1">
                  <Clock size={10} />
                  {timeAgo(email.created_at)}
                </span>
              </div>
              <p className="text-sm text-slate-300 truncate mb-1">{email.subject}</p>
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-slate-500 truncate">{email.body}</p>
                <StatusBadge status={email.status} />
              </div>
            </button>
          );
        })}
      </div>

      {/* Detail view */}
      <div className="hidden md:flex flex-1 bg-white/[0.02] border border-white/10 rounded-2xl overflow-y-auto">
        {selected ? (
          <div className="p-8 w-full">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">{selected.subject}</h2>
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <span className="font-medium text-slate-300">{selected.sender_name}</span>
                  <span>·</span>
                  <span>{selected.sender_email}</span>
                </div>
              </div>
              <StatusBadge status={selected.status} />
            </div>

            <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-6 mb-6">
              <p className="text-slate-200 leading-relaxed whitespace-pre-wrap">{selected.body}</p>
            </div>

            <div className="flex items-center gap-3">
              {selected.status !== 'resolved' && (
                <button
                  onClick={() => updateStatus(selected.id, 'resolved')}
                  className="px-4 py-2 text-sm font-medium rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-[0_0_20px_rgba(79,70,229,0.4)] hover:opacity-90 transition-opacity"
                >
                  Mark Resolved
                </button>
              )}
              {selected.status === 'resolved' && (
                <button
                  onClick={() => updateStatus(selected.id, 'in_progress')}
                  className="px-4 py-2 text-sm font-medium rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 transition-colors"
                >
                  Reopen
                </button>
              )}
            </div>

            {/* AI Draft */}
            <div className="mt-2">
              {draftError && (
                <p className="text-sm text-red-400 mb-3">{draftError}</p>
              )}
              {pushSuccess && (
                <p className="text-sm text-green-400 mb-3">{pushSuccess}</p>
              )}

              {!selectedDraft && (
                <button
                  onClick={() => handleGenerateDraft(selected.id)}
                  disabled={generatingId === selected.id}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 transition-colors disabled:opacity-50"
                >
                  {generatingId === selected.id ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Sparkles size={14} />
                  )}
                  {generatingId === selected.id ? 'Generating draft...' : 'Generate AI Draft'}
                </button>
              )}

              {selectedDraft && (
                <div className="border border-white/10 rounded-xl p-5 bg-gradient-to-br from-blue-600/5 to-purple-600/5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
                      <Sparkles size={14} className="text-purple-400" />
                      AI Draft Reply
                    </div>
                    <div className="flex items-center gap-2">
                      {selectedDraft.status === 'approved' && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-green-500/10 text-green-400">
                          <CheckCircle2 size={12} /> Approved
                        </span>
                      )}
                      {selectedDraft.status === 'rejected' && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-red-500/10 text-red-400">
                          <XCircle size={12} /> Rejected
                        </span>
                      )}
                      <ConfidenceBadge score={selectedDraft.confidence_score} />
                    </div>
                  </div>

                  {selectedDraft.status === 'pending' ? (
                    <div className="flex items-start gap-2 mb-3">
                      <Pencil size={13} className="text-slate-500 mt-1 flex-shrink-0" />
                      <textarea
                        value={editedBody[selected.id] ?? selectedDraft.draft_body}
                        onChange={(e) =>
                          setEditedBody((prev) => ({ ...prev, [selected.id]: e.target.value }))
                        }
                        rows={6}
                        className="w-full bg-slate-900/50 border border-slate-700 rounded-xl p-3 text-slate-200 leading-relaxed text-sm resize-none focus:outline-none focus:border-blue-500/50"
                      />
                    </div>
                  ) : (
                    <p className="text-slate-200 leading-relaxed whitespace-pre-wrap mb-3">
                      {selectedDraft.draft_body}
                    </p>
                  )}

                  {selectedDraft.reasoning && (
                    <p className="text-xs text-slate-500 italic mb-4">{selectedDraft.reasoning}</p>
                  )}

                  <div className="flex items-center gap-3">
                    {selectedDraft.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleDraftAction(selected.id, 'approved')}
                          disabled={actionId === selected.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                        >
                          <CheckCircle2 size={13} /> Approve
                        </button>
                        <button
                          onClick={() => handleDraftAction(selected.id, 'rejected')}
                          disabled={actionId === selected.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 transition-colors disabled:opacity-50"
                        >
                          <XCircle size={13} /> Reject
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => handleGenerateDraft(selected.id)}
                      disabled={generatingId === selected.id}
                      className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-50"
                    >
                      {generatingId === selected.id ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <RefreshCw size={12} />
                      )}
                      Regenerate
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="m-auto text-center text-slate-500">
            <Mail className="mx-auto mb-4 h-10 w-10 text-slate-600" />
            <p className="text-sm">Select an email to view it</p>
          </div>
        )}
      </div>
    </div>
  );
}