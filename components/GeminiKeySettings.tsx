'use client';

import { useState } from 'react';
import { KeyRound, CheckCircle2 } from 'lucide-react';

export default function GeminiKeySettings({ hasKeySet }: { hasKeySet: boolean }) {
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(hasKeySet);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/org/gemini-key', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gemini_api_key: value }),
      });
      if (!res.ok) throw new Error('Failed to save key');
      setSaved(value.trim().length > 0);
      setValue('');
    } catch {
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-6 bg-white/10 backdrop-blur-2xl border border-white/20 rounded-[2rem] p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)]">
      <div className="flex items-center gap-3 mb-1">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-r from-blue-600/20 to-purple-600/20 flex items-center justify-center flex-shrink-0">
          <KeyRound className="text-blue-400" size={16} />
        </div>
        <p className="font-semibold text-white">Your own Gemini API key</p>
      </div>
      <p className="text-sm text-slate-400 mb-4 ml-12">
        Optional — free at{' '}
        <a
          href="https://aistudio.google.com/apikey"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:underline"
        >
          aistudio.google.com
        </a>
        . Using your own key means your usage never competes with anyone else&apos;s.
      </p>

      {saved && (
        <p className="text-xs text-green-400 mb-3 ml-12 flex items-center gap-1.5">
          <CheckCircle2 size={12} /> A key is currently set for this organization.
        </p>
      )}

      <div className="ml-12 flex items-center gap-3">
        <input
          type="password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={saved ? 'Enter a new key to replace it' : 'Paste your Gemini API key'}
          className="flex-1 bg-slate-900/50 border border-slate-700 rounded-xl py-2.5 px-4 text-sm text-slate-200 focus:outline-none focus:border-blue-500/50"
        />
        <button
          onClick={handleSave}
          disabled={saving || value.trim().length === 0}
          className="px-4 py-2.5 text-sm font-medium rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:opacity-90 transition-opacity disabled:opacity-50 flex-shrink-0"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
      {error && <p className="text-xs text-red-400 mt-2 ml-12">{error}</p>}
    </div>
  );
}