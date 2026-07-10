'use client';

import { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, XCircle, Loader2, RefreshCw, Inbox as InboxIcon } from 'lucide-react';

type PendingDraft = {
  id: string;
  draft_body: string;
  confidence_score: number;
  reasoning: string | null;
  customer_emails: { id: string; sender_name: string; sender_email: string; subject: string } | null;
};

function ConfidenceBadge({ score }: { score: number }) {
  const classes =
    score > 80
      ? 'bg-green-500/10 text-green-400'
      : score >= 50
      ? 'bg-yellow-500/10 text-yellow-400'
      : 'bg-red-500/10 text-red-400';
  return (
    <span className={`text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0 ${classes}`}>
      {score}% confidence
    </span>
  );
}

export default function PendingDraftsList({
  refreshTrigger,
  onDraftActioned,
}: {
  refreshTrigger?: number;
  onDraftActioned?: () => void;
} = {}) {
  const [drafts, setDrafts] = useState<PendingDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ id: string; message: string; isError: boolean } | null>(null);

  const loadDrafts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/drafts/pending');
      const data = await res.json();
      if (res.ok) setDrafts(data.drafts ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDrafts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadDrafts, refreshTrigger]);

  const handleAction = async (draftId: string, action: 'approved' | 'rejected') => {
    setActionId(draftId);
    setFeedback(null);
    try {
      const res = await fetch(`/api/drafts/${draftId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Action failed');

      if (action === 'approved') {
        setFeedback({
          id: draftId,
          message: data.pushedToGmail
            ? 'Pushed to Gmail — open Gmail to review and send.'
            : data.gmailPushError ?? 'Approved.',
          isError: !data.pushedToGmail && !!data.gmailPushError,
        });
      }

      // Remove it from the pending list either way — it's no longer pending
      setDrafts((prev) => prev.filter((d) => d.id !== draftId));

      if (action === 'rejected') {
        onDraftActioned?.();
      }
    } catch (err) {
      setFeedback({
        id: draftId,
        message: err instanceof Error ? err.message : 'Action failed',
        isError: true,
      });
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="mt-6 bg-white/10 backdrop-blur-2xl border border-white/20 rounded-[2rem] p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)]">
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="font-semibold text-white">Pending Drafts</p>
          <p className="text-sm text-slate-400">
            Review the confidence score, then approve to push into Gmail.
          </p>
        </div>
        <button
          onClick={loadDrafts}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {loading && drafts.length === 0 && (
        <p className="text-sm text-slate-500">Loading...</p>
      )}

      {!loading && drafts.length === 0 && (
        <div className="text-center py-8 text-slate-500">
          <InboxIcon className="mx-auto mb-2 h-8 w-8 text-slate-600" />
          <p className="text-sm">No pending drafts right now.</p>
        </div>
      )}

      <div className="space-y-3">
        {drafts.map((draft) => (
          <div key={draft.id} className="border border-white/10 rounded-xl p-4 bg-white/[0.02]">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {draft.customer_emails?.sender_name ?? 'Unknown sender'}
                </p>
                <p className="text-xs text-slate-500 truncate">{draft.customer_emails?.subject}</p>
              </div>
              <ConfidenceBadge score={draft.confidence_score} />
            </div>

            <p className="text-sm text-slate-300 leading-relaxed mb-2 line-clamp-3">{draft.draft_body}</p>

            {draft.reasoning && (
              <p className="text-xs text-slate-500 italic mb-3">{draft.reasoning}</p>
            )}

            {feedback?.id === draft.id && (
              <p className={`text-xs mb-3 ${feedback.isError ? 'text-red-400' : 'text-green-400'}`}>
                {feedback.message}
              </p>
            )}

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleAction(draft.id, 'approved')}
                disabled={actionId === draft.id}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {actionId === draft.id ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                Approve &amp; Push to Gmail
              </button>
              <button
                onClick={() => handleAction(draft.id, 'rejected')}
                disabled={actionId === draft.id}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 transition-colors disabled:opacity-50"
              >
                <XCircle size={13} /> Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}