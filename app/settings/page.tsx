import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AnimatedBackground from '@/components/AnimatedBackground';
import Sidebar from '@/components/Sidebar';
import ReplyModeSettings from '@/components/ReplyModeSettings';
import { Mail, CheckCircle2 } from 'lucide-react';

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ gmail?: string }>;
}) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, org_id, organizations(name, reply_mode)')
    .eq('id', user.id)
    .single();

  if (!profile?.org_id) redirect('/login');

  const userName = profile.full_name ?? 'Agent';
  const orgData = profile.organizations as unknown as { name: string; reply_mode: 'hosted' | 'gmail_native' } | null;
  const orgName = orgData?.name ?? 'Your Workspace';
  const replyMode = orgData?.reply_mode ?? 'hosted';

  const { data: connection } = await supabase
    .from('email_connections')
    .select('email_address, connected_at')
    .eq('org_id', profile.org_id)
    .eq('provider', 'gmail')
    .maybeSingle();

  const { gmail: gmailStatus } = await searchParams;

  return (
    <div className="min-h-screen bg-slate-950 flex font-sans text-slate-200 relative overflow-hidden">
      <AnimatedBackground />
      <Sidebar orgName={orgName} userName={userName} activePage="settings" />

      <div className="flex-1 flex flex-col overflow-hidden relative z-10 py-4 pr-4 pl-4 md:pl-0">
        <main className="flex-1 overflow-y-auto bg-white/[0.02] backdrop-blur-3xl border border-white/10 rounded-3xl shadow-2xl p-6 md:p-10 relative">
          <div className="max-w-3xl mx-auto">

            <header className="mb-8">
              <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 tracking-tight">
                Settings
              </h1>
              <p className="text-slate-400 mt-2 text-lg">
                Connect your support inbox so replies can be drafted automatically.
              </p>
            </header>

            {gmailStatus === 'connected' && (
              <div className="mb-6 px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
                Gmail connected successfully.
              </div>
            )}
            {gmailStatus === 'error' && (
              <div className="mb-6 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                Something went wrong connecting Gmail. Please try again.
              </div>
            )}

            <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-[2rem] p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-r from-blue-600/20 to-purple-600/20 flex items-center justify-center">
                    <Mail className="text-blue-400" size={22} />
                  </div>
                  <div>
                    <p className="font-semibold text-white">Gmail</p>
                    {connection ? (
                      <p className="text-sm text-slate-400">
                        Connected as <span className="text-slate-300">{connection.email_address}</span>
                      </p>
                    ) : (
                      <p className="text-sm text-slate-400">Not connected</p>
                    )}
                  </div>
                </div>

                {connection ? (
                  <span className="inline-flex items-center gap-1.5 text-sm text-green-400">
                    <CheckCircle2 size={16} />
                    Connected
                  </span>
                ) : (
                  <a
                    href="/api/auth/gmail/connect"
                    className="px-4 py-2 text-sm font-medium rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-[0_0_20px_rgba(79,70,229,0.4)] hover:opacity-90 transition-opacity"
                  >
                    Connect Gmail
                  </a>
                )}
              </div>
            </div>

            <ReplyModeSettings initialReplyMode={replyMode} gmailConnected={!!connection} />

          </div>
        </main>
      </div>
    </div>
  );
}