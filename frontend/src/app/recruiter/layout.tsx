'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useState, useEffect } from 'react';
import { BriefcaseBusiness, Inbox, Mail, Handshake, Users, LayoutDashboard, Sun, Moon } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

export default function RecruiterLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const logout = useAuthStore(state => state.logout);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const navigation = [
    { name: 'Command Center', href: '/recruiter/dashboard', icon: LayoutDashboard },
    { name: 'Jobs', href: '/recruiter/jobs', icon: BriefcaseBusiness },
    { name: 'Applications', href: '/recruiter/applications', icon: Inbox },
    { name: 'Interviews', href: '/recruiter/interviews', icon: Users },
    { name: 'Offers', href: '/recruiter/offers', icon: Handshake },
    { name: 'Email Campaigns', href: '/recruiter/emails', icon: Mail },
  ];

  if (pathname === '/recruiter/signup') {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen bg-zinc-50 dark:bg-zinc-950 overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 flex flex-col justify-between">
         <div>
            <div className="h-16 flex items-center px-6 border-b border-zinc-200 dark:border-zinc-800">
               <span className="font-black text-xl tracking-tight text-blue-600">RecruiterOS</span>
            </div>
            <nav className="p-4 space-y-1">
               {navigation.map((item) => {
                  const isActive = pathname.startsWith(item.href);
                  const Icon = item.icon;
                  return (
                     <Link key={item.name} href={item.href} className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${isActive ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50'}`}>
                        <Icon className="w-5 h-5" />
                        {item.name}
                     </Link>
                  );
               })}
            </nav>
         </div>

         <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 space-y-2">
            {/* Theme Toggle */}
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors"
            >
              {mounted ? (
                theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />
              ) : (
                <span className="w-4 h-4" />
              )}
              {mounted ? (theme === 'dark' ? 'Light Mode' : 'Dark Mode') : 'Theme'}
            </button>

            {/* Logout */}
            <button 
              onClick={() => {
                logout();
                window.location.href = '/login';
              }} 
              className="w-full text-left flex items-center gap-3 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md transition-colors"
            >
               Sign Out Securely
            </button>
         </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto bg-zinc-50 dark:bg-zinc-950 relative">
         <div className="min-h-full">
            {children}
         </div>
      </div>
    </div>
  );
}
