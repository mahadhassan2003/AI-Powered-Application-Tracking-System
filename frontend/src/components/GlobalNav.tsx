'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function GlobalNav() {
  const pathname = usePathname();
  
  // Hide the Global Nav inside application dashboards, the landing page, and auth pages
  const hiddenPaths = ['/', '/login', '/signup'];
  if (hiddenPaths.includes(pathname) || pathname.startsWith('/recruiter') || pathname.startsWith('/candidate') || pathname.startsWith('/admin') || pathname.startsWith('/jobs')) {
     return null;
  }

  return (
    <nav className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 backdrop-blur-md dark:bg-zinc-950/80 sticky top-0 z-50 transition-all">
      <div className="font-bold text-xl tracking-tight">
        <Link href="/">Elite ATS</Link>
      </div>
      <div className="flex gap-4 font-medium text-sm">
         <Link href="/jobs" className="hover:text-blue-600 transition-colors">Jobs</Link>
         <Link href="/login" className="hover:text-blue-600 transition-colors">Login</Link>
         <Link href="/signup" className="hover:text-blue-600 border border-zinc-200 dark:border-zinc-800 px-3 py-1 rounded-md transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-900">Sign Up</Link>
      </div>
    </nav>
  );
}
