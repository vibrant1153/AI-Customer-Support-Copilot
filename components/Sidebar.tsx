'use client';

import { useRouter } from 'next/navigation';
import { LayoutDashboard, Inbox, Library, Settings, LogOut, ChevronRight, Sparkles, Cpu } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type SidebarProps = {
  orgName: string;
  userName: string;
  activePage: 'dashboard' | 'inbox' | 'knowledge-base' | 'settings';
};

export default function Sidebar({ orgName, userName, activePage }: SidebarProps) {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const navItems = [
    { key: 'dashboard', name: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
    { key: 'inbox', name: 'Inbox', icon: Inbox, href: '/inbox' },
    { key: 'knowledge-base', name: 'Knowledge Base', icon: Library, href: '/knowledge-base' },
    { key: 'settings', name: 'Settings', icon: Settings, href: '/settings' },
  ] as const;

  return (
    <div className="w-72 p-4 hidden md:flex flex-col relative z-10">
      <div className="flex-1 bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl flex flex-col shadow-2xl overflow-hidden">

        <div className="h-20 flex items-center px-6 bg-gradient-to-b from-white/[0.05] to-transparent border-b border-white/5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mr-3 shadow-lg shadow-purple-500/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">
            Copilot<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">AI</span>
          </span>
        </div>

        <div className="p-4 border-b border-white/5">
          <div className="flex items-center justify-between bg-black/20 border border-white/5 p-3 rounded-2xl cursor-pointer transition-all duration-300 hover:bg-white/10 hover:shadow-lg hover:-translate-y-0.5">
            <div className="flex flex-col truncate">
              <span className="text-sm font-bold text-white truncate">{orgName}</span>
              <span className="text-xs text-purple-400 font-medium flex items-center mt-0.5">
                <Cpu size={12} className="mr-1" /> Enterprise
              </span>
            </div>
            <ChevronRight size={16} className="text-slate-500" />
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = item.key === activePage;
            return (
              <a
                key={item.key}
                href={item.href}
                className={
                  isActive
                    ? 'relative group flex items-center px-4 py-3 text-sm font-medium rounded-2xl bg-gradient-to-r from-blue-600/20 to-purple-600/20 text-white border border-white/10 shadow-inner'
                    : 'flex items-center px-4 py-3 text-sm font-medium rounded-2xl text-slate-400 hover:text-white hover:bg-white/5 transition-all duration-300 hover:translate-x-1'
                }
              >
                {isActive && <div className="absolute left-0 w-1 h-8 bg-blue-500 rounded-r-full"></div>}
                <item.icon className={`mr-3 flex-shrink-0 h-5 w-5 ${isActive ? 'text-blue-400' : 'text-slate-500'}`} />
                {item.name}
              </a>
            );
          })}
        </nav>

        <div className="p-4 bg-gradient-to-t from-black/40 to-transparent">
          <div className="flex items-center p-3 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-md">
            <div className="flex-shrink-0">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 border border-slate-600 flex items-center justify-center font-bold text-white shadow-inner">
                {userName.charAt(0)}
              </div>
            </div>
            <div className="ml-3 truncate flex-1">
              <p className="text-sm font-medium text-white truncate">{userName}</p>
              <button onClick={handleLogout} className="text-xs font-medium text-slate-400 hover:text-red-400 flex items-center mt-1 transition-colors">
                <LogOut size={12} className="mr-1" /> Disconnect
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}