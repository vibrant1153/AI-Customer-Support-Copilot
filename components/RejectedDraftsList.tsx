'use client';

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, XCircle } from 'lucide-react';

type RejectedDraft = {
  id: string;
  draft_body: string;
  confidence_score: number;
  customer_emails: { id: string; sender_name: string; subject: string } | null;
};

export default function RejectedDraftsList({
  refreshTrigger,
  onRegenerate,
}: {
  refreshTrigger?: number;
  onRegenerate?: () => void;
} = {}) {
  const [drafts, setDrafts] = useState<RejectedDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadDrafts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/drafts/rejected');
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

  const handleRegenerate = async (draftId: string) => {
    setRegeneratingId(draftId);
    setError(null);
    try {
      const res = await fetch(`/api/drafts/${draftId}/regenerate`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Regenerate failed');

      // Remove from this list — a fresh pending draft now exists instead
      setDrafts((prev) => prev.filter((d) => d.id !== draftId));
      onRegenerate?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Regenerate failed');
    } finally {
      setRegeneratingId(null);
    }
  };

  if (!loading && drafts.length === 0) return null;

  return (
    <div className="mt-6 bg-white/10 backdrop-blur-2xl border border-white/20 rounded-[2rem] p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)]">
      <div className="flex items-center gap-2 mb-1">
        <XCircle size={16} className="text-red-400" />
        <p className="font-semibold text-white">Rejected Drafts</p>
      </div>
      <p className="text-sm text-slate-400 mb-5">
        These were skipped. Regenerate after updating your knowledge base to try again.
      </p>

      {error && <p className="text-sm text-red-400 mb-3">{error}</p>}

      <div className="space-y-3">
        {drafts.map((draft) => (
          <div key={draft.id} className="border border-white/10 rounded-xl p-4 bg-white/[0.02] flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {draft.customer_emails?.sender_name ?? 'Unknown sender'}
              </p>
              <p className="text-xs text-slate-500 truncate">{draft.customer_emails?.subject}</p>
            </div>
            <button
              onClick={() => handleRegenerate(draft.id)}
              disabled={regeneratingId === draft.id}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 transition-colors disabled:opacity-50 flex-shrink-0"
            >
              <RefreshCw size={12} className={regeneratingId === draft.id ? 'animate-spin' : ''} />
              Regenerate
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}