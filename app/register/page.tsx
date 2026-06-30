'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, ChevronRight, Building, User, Mail, Lock } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const AnimatedBackground = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none bg-slate-950">
    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/20 blur-[120px] animate-pulse"></div>
    <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-600/20 blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
    <div className="absolute top-[40%] left-[40%] w-[20%] h-[20%] rounded-full bg-indigo-500/10 blur-[80px] animate-bounce" style={{ animationDuration: '8s' }}></div>
  </div>
);

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const orgName = formData.get('orgName') as string;
    const fullName = formData.get('name') as string;
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    // 1. Create the auth user
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError || !signUpData.user) {
      setError(signUpError?.message ?? 'Could not create account.');
      setLoading(false);
      return;
    }

    const userId = signUpData.user.id;

    // signUp() can resolve slightly before the session is fully attached
    // to the client. Explicitly confirm we have an active session before
    // touching any RLS-protected table — otherwise inserts below get
    // rejected as "unauthenticated" even though signup just succeeded.
    if (!signUpData.session) {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        setError('Account created, but session was not established. Please try logging in.');
        setLoading(false);
        return;
      }
    }

    // 2. Create their organization
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({ name: orgName })
      .select()
      .single();

    if (orgError || !org) {
      setError(orgError?.message ?? 'Could not create organization.');
      setLoading(false);
      return;
    }

    // 3. Create their profile, linking the user to the new org
    const { error: profileError } = await supabase.from('profiles').insert({
      id: userId,
      org_id: org.id,
      full_name: fullName,
      email,
    });

    if (profileError) {
      setError(profileError.message);
      setLoading(false);
      return;
    }

    router.push('/dashboard');
    router.refresh();
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden font-sans text-slate-200">
      <AnimatedBackground />

      <div className="relative z-10 w-full max-w-md p-8">
        <div className="bg-white/10 backdrop-blur-2xl border border-white/20 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] rounded-[2rem] p-8
                        transform transition-all duration-500 hover:shadow-[0_16px_48px_0_rgba(79,70,229,0.2)] hover:border-white/30">

          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/30 transform transition-transform hover:rotate-12 duration-300">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
          </div>

          <h2 className="text-3xl font-bold text-center text-white mb-2 tracking-tight">Create Workspace</h2>
          <p className="text-center text-slate-400 mb-8 text-sm">Start your journey with intelligent support</p>

          {error && (
            <div className="mb-5 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
              {error}
            </div>
          )}

          <form className="space-y-5" onSubmit={handleRegister}>
            <div className="group relative">
              <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-400 transition-colors" />
              <input name="orgName" type="text" required placeholder="Organization Name"
                     className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all shadow-inner" />
            </div>
            <div className="group relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-400 transition-colors" />
              <input name="name" type="text" required placeholder="Your Name"
                     className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all shadow-inner" />
            </div>
            <div className="group relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-400 transition-colors" />
              <input name="email" type="email" required placeholder="Email Address"
                     className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all shadow-inner" />
            </div>
            <div className="group relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-400 transition-colors" />
              <input name="password" type="password" required minLength={6} placeholder="Password"
                     className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all shadow-inner" />
            </div>

            <button type="submit" disabled={loading}
                    className="w-full relative overflow-hidden group bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-3 rounded-xl shadow-[0_0_20px_rgba(79,70,229,0.4)] transition-all duration-300 hover:shadow-[0_0_30px_rgba(79,70,229,0.6)] hover:-translate-y-0.5 disabled:opacity-50">
              <span className="relative z-10 flex items-center justify-center">
                {loading ? 'Initializing...' : 'Initialize Workspace'}
                <ChevronRight className="w-5 h-5 ml-1 group-hover:translate-x-1 transition-transform" />
              </span>
              <div className="absolute inset-0 h-full w-full bg-gradient-to-r from-purple-600 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-slate-400">
              Already established?{' '}
              <a href="/login" className="text-blue-400 font-medium hover:text-blue-300 hover:underline transition-all">
                Sign in
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}