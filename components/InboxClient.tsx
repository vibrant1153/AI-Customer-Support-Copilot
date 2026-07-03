'use client';

import { useState } from 'react';
import { Mail, Clock, CheckCircle2, Loader2, CircleDot } from 'lucide-react';
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

export default function InboxClient({ initialEmails }: { initialEmails: CustomerEmail[] }) {
  const supabase = createClient();
  const [emails, setEmails] = useState<CustomerEmail[]>(initialEmails);
  const [selectedId, setSelectedId] = useState<string | null>(initialEmails[0]?.id ?? null);

  const selected = emails.find((e) => e.id === selectedId) ?? null;

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

            {/* Phase 7 will insert the AI draft generator here, below the
                original email — reading this same `selected` email. */}
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