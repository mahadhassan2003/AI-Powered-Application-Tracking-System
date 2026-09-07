'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useState, useEffect } from 'react';
import { ShieldCheck, Users, Building2, Activity, Sun, Moon, LogOut } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoggedIn, logout } = useAuthStore();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Basic protection (production would use middleware)
    if (mounted && (!isLoggedIn || user?.role !== 'admin')) {
        router.push('/login');
    }
  }, [isLoggedIn, user, router, mounted]);

  const navigation = [
    { name: 'Dashboard', href: '/admin', icon: ShieldCheck },
    { name: 'Employers', href: '/admin/employers', icon: Building2 },
    { name: 'Candidates', href: '/admin/candidates', icon: Users },
    { name: 'System Health', href: '/admin/health', icon: Activity },
  ];

  if (!mounted || !isLoggedIn || user?.role !== 'admin') {
     return <div className="min-h-screen bg-zinc-950 flex items-center justify-center">Verifying Access...</div>;
  }

  return (
    <div className="flex h-screen bg-zinc-50 dark:bg-zinc-950 overflow-hidden font-inter selection:bg-indigo-500/30">
      
      {/* Admin Sidebar */}
      <div className="w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col justify-between shrink-0 text-zinc-300">
         <div>
            <div className="h-16 flex items-center px-6 border-b border-zinc-800 bg-zinc-950/50">
               <ShieldCheck className="w-5 h-5 text-indigo-500 mr-2" />
               <span className="font-black text-xl tracking-tight text-white">Admin<span className="text-indigo-500 text-xs ml-1 align-top">ROOT</span></span>
            </div>
            
            <nav className="p-4 space-y-1.5 mt-2">
               {navigation.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;
                  return (
                     <Link key={item.name} href={item.href} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${isActive ? 'bg-indigo-500/10 text-indigo-400 font-bold shadow-sm shadow-indigo-900/20' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'}`}>
                        <Icon className={`w-5 h-5 ${isActive ? 'text-indigo-500' : 'text-zinc-500'}`} />
                        {item.name}
                     </Link>
                  );
               })}
            </nav>
         </div>

         <div className="p-4 border-t border-zinc-800 space-y-2 bg-zinc-950/50">
            {/* Theme Toggle */}
            <button
               onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
               className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium w-full text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
            >
               {mounted && theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
               {mounted && theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </button>
            
            {/* User Profile / Logout */}
            <div className="flex items-center justify-between px-3 py-2.5 mt-2">
               <div className="flex items-center gap-2 truncate">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-[10px] font-bold text-white shadow-lg">
                     {user?.name?.charAt(0) || 'A'}
                  </div>
                  <span className="text-xs font-semibold text-zinc-300 truncate">{user?.name}</span>
               </div>
               <button onClick={() => logout()} className="text-zinc-500 hover:text-red-400 transition-colors p-1 rounded-md hover:bg-red-500/10" title="Logout">
                  <LogOut className="w-4 h-4" />
               </button>
            </div>
         </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto w-full">
         {children}
      </div>
      
    </div>
  );
}
