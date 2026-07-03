import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AnimatedBackground from '@/components/AnimatedBackground';
import Sidebar from '@/components/Sidebar';
import InboxClient from '@/components/InboxClient';

export default async function InboxPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, org_id, organizations(name)')
    .eq('id', user.id)
    .single();

  if (!profile?.org_id) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-200">
        <div className="text-center">
          <p className="text-xl font-bold text-white mb-2">No organization found</p>
          <p className="text-slate-400">Your profile isn&apos;t linked to an organization yet. Try logging out and back in.</p>
        </div>
      </div>
    );
  }

  const userName = profile.full_name ?? 'Agent';
  const orgName = (profile.organizations as unknown as { name: string } | null)?.name ?? 'Your Workspace';

  const { data: emails } = await supabase
    .from('customer_emails')
    .select('id, sender_name, sender_email, subject, body, status, created_at')
    .eq('org_id', profile.org_id)
    .order('created_at', { ascending: false });

  return (
    <div className="min-h-screen bg-slate-950 flex font-sans text-slate-200 relative overflow-hidden">
      <AnimatedBackground />
      <Sidebar orgName={orgName} userName={userName} activePage="inbox" />

      <div className="flex-1 flex flex-col overflow-hidden relative z-10 py-4 pr-4 pl-4 md:pl-0">
        <main className="flex-1 overflow-y-auto bg-white/[0.02] backdrop-blur-3xl border border-white/10 rounded-3xl shadow-2xl p-6 md:p-10 relative">
          <div className="max-w-6xl mx-auto">

            <header className="mb-8">
              <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 tracking-tight">
                Inbox
              </h1>
              <p className="text-slate-400 mt-2 text-lg">
                Customer support emails for your organization.
              </p>
            </header>

            <InboxClient initialEmails={emails ?? []} />

          </div>
        </main>
      </div>
    </div>
  );
}