'use client';

import { useState } from 'react';
import { RefreshCw, Inbox, Send, Zap } from 'lucide-react';

type ReplyMode = 'hosted' | 'gmail_native';

export default function ReplyModeSettings({
  initialReplyMode,
  gmailConnected,
}: {
  initialReplyMode: ReplyMode;
  gmailConnected: boolean;
}) {
  const [replyMode, setReplyMode] = useState<ReplyMode>(initialReplyMode);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [automating, setAutomating] = useState(false);
  const [automationResult, setAutomationResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleModeChange = async (mode: ReplyMode) => {
    if (mode === replyMode) return;
    setSaving(true);
    setError(null);
    const previous = replyMode;
    setReplyMode(mode); // optimistic

    try {
      const res = await fetch('/api/org/reply-mode', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reply_mode: mode }),
      });
      if (!res.ok) throw new Error('Failed to update reply mode');
    } catch {
      setReplyMode(previous); // roll back
      setError('Failed to update reply mode. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    setError(null);
    try {
      const res = await fetch('/api/gmail/sync', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Sync failed');
      setSyncResult(`Imported ${data.importedCount} new email${data.importedCount === 1 ? '' : 's'} (checked ${data.checked}).`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const handleRunAutomation = async () => {
    setAutomating(true);
    setAutomationResult(null);
    setError(null);
    try {
      const res = await fetch('/api/automation/run-for-org', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Automation run failed');
      setAutomationResult(
        `Synced ${data.imported} new email${data.imported === 1 ? '' : 's'}, drafted and pushed to Gmail for ${data.processed} of them.`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Automation run failed');
    } finally {
      setAutomating(false);
    }
  };

  if (!gmailConnected) return null;

  return (
    <div className="mt-6 bg-white/10 backdrop-blur-2xl border border-white/20 rounded-[2rem] p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)]">
      <p className="font-semibold text-white mb-1">Reply Mode</p>
      <p className="text-sm text-slate-400 mb-5">
        Choose where approved AI drafts should go.
      </p>

      {error && <p className="text-sm text-red-400 mb-4">{error}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        <button
          onClick={() => handleModeChange('hosted')}
          disabled={saving}
          className={`text-left p-4 rounded-xl border transition-colors ${
            replyMode === 'hosted'
              ? 'border-blue-500/50 bg-blue-500/10'
              : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.05]'
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <Inbox size={15} className={replyMode === 'hosted' ? 'text-blue-400' : 'text-slate-500'} />
            <span className="text-sm font-medium text-white">Hosted Inbox</span>
          </div>
          <p className="text-xs text-slate-400">Review and approve drafts here, in your Inbox page.</p>
        </button>

        <button
          onClick={() => handleModeChange('gmail_native')}
          disabled={saving}
          className={`text-left p-4 rounded-xl border transition-colors ${
            replyMode === 'gmail_native'
              ? 'border-purple-500/50 bg-purple-500/10'
              : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.05]'
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <Send size={15} className={replyMode === 'gmail_native' ? 'text-purple-400' : 'text-slate-500'} />
            <span className="text-sm font-medium text-white">Gmail Native</span>
          </div>
          <p className="text-xs text-slate-400">Approved drafts are pushed into Gmail as replies — send from there.</p>
        </button>
      </div>

      {replyMode === 'gmail_native' && (
        <div className="border-t border-white/10 pt-5 mb-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white flex items-center gap-1.5">
                <Zap size={14} className="text-purple-400" />
                Run Automation Now
              </p>
              <p className="text-xs text-slate-400">
                Syncs new emails, drafts replies, pushes them to Gmail, and emails you a summary — no approval step.
              </p>
            </div>
            <button
              onClick={handleRunAutomation}
              disabled={automating}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-[0_0_20px_rgba(79,70,229,0.4)] hover:opacity-90 transition-opacity disabled:opacity-50 flex-shrink-0"
            >
              <Zap size={14} className={automating ? 'animate-pulse' : ''} />
              {automating ? 'Running...' : 'Run now'}
            </button>
          </div>
          {automationResult && <p className="text-xs text-green-400 mt-3">{automationResult}</p>}
        </div>
      )}

      <div className="border-t border-white/10 pt-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-white">Sync Gmail</p>
            <p className="text-xs text-slate-400">Pull recent inbox messages in manually.</p>
          </div>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Syncing...' : 'Sync now'}
          </button>
        </div>
        {syncResult && <p className="text-xs text-green-400 mt-3">{syncResult}</p>}
      </div>
    </div>
  );
}