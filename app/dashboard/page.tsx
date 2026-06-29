import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Library, Cpu } from 'lucide-react';
import AnimatedBackground from '@/components/AnimatedBackground';
import Sidebar from '@/components/Sidebar';

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Fetch this user's profile, joined with their organization name
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, organizations(name)')
    .eq('id', user.id)
    .single();

  const userName = profile?.full_name ?? 'Agent';
  const orgName = (profile?.organizations as { name: string } | null)?.name ?? 'Your Workspace';

  return (
    <div className="min-h-screen bg-slate-950 flex font-sans text-slate-200 relative overflow-hidden">
      <AnimatedBackground />
      <Sidebar orgName={orgName} userName={userName} activePage="dashboard" />

      <div className="flex-1 flex flex-col overflow-hidden relative z-10 py-4 pr-4 pl-4 md:pl-0">
        <main className="flex-1 overflow-y-auto bg-white/[0.02] backdrop-blur-3xl border border-white/10 rounded-3xl shadow-2xl p-6 md:p-10 relative">
          <div className="max-w-5xl mx-auto">

            <header className="mb-10">
              <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 tracking-tight">
                Welcome to Command Center
              </h1>
              <p className="text-slate-400 mt-2 text-lg">
                System initialized for agent {userName.split(' ')[0]}.
              </p>
            </header>

            <div className="relative group perspective-1000">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-3xl blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>

              <div className="relative bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl p-12 text-center transform transition-all duration-500 group-hover:scale-[1.01] group-hover:-translate-y-2">
                <div className="mx-auto w-24 h-24 mb-6 relative">
                  <div className="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-20"></div>
                  <div className="relative w-full h-full bg-gradient-to-br from-slate-800 to-slate-950 border border-slate-700 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(59,130,246,0.3)]">
                    <Cpu className="h-10 w-10 text-blue-400" />
                  </div>
                </div>

                <h3 className="text-2xl font-bold text-white mb-3 tracking-wide">Foundation Established</h3>
                <p className="text-slate-400 max-w-lg mx-auto mb-8 leading-relaxed">
                  The SaaS shell is active. Your workspace <strong className="text-white">{orgName}</strong> is ready to ingest knowledge. To proceed with the AI Copilot architecture, we must begin uploading documents.
                </p>

                <a href="/knowledge-base"
                   className="relative overflow-hidden inline-flex items-center px-8 py-4 shadow-[0_0_20px_rgba(79,70,229,0.3)] text-base font-bold rounded-2xl text-white bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(79,70,229,0.5)]">
                  <Library className="mr-2 h-5 w-5 text-purple-400" />
                  Go to Knowledge Base
                </a>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
              {[
                { label: 'System Status', value: 'Online', color: 'text-green-400' },
                { label: 'Database', value: 'Supabase Connected', color: 'text-blue-400' },
                { label: 'Neural Core', value: 'Awaiting Data', color: 'text-purple-400' },
              ].map((stat, i) => (
                <div key={i} className="bg-white/5 border border-white/5 rounded-2xl p-5 backdrop-blur-sm transform transition-all duration-300 hover:-translate-y-1 hover:bg-white/10">
                  <p className="text-slate-500 text-sm font-medium mb-1">{stat.label}</p>
                  <p className={`text-xl font-bold tracking-tight ${stat.color}`}>{stat.value}</p>
                </div>
              ))}
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}