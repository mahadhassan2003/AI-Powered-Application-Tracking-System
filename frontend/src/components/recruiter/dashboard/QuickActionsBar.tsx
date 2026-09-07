import Link from 'next/link';
import { Briefcase, GitBranch, Calendar, Gift, Mail, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

const actions = [
  { label: 'Post Job', href: '/recruiter/jobs?action=new', icon: <Plus className="w-4 h-4" />, accent: 'bg-blue-600 hover:bg-blue-700 text-white' },
  { label: 'Open Pipeline', href: '/recruiter/applications', icon: <GitBranch className="w-4 h-4" />, accent: 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800' },
  { label: 'Interviews', href: '/recruiter/interviews', icon: <Calendar className="w-4 h-4" />, accent: 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800' },
  { label: 'Manage Offers', href: '/recruiter/offers', icon: <Gift className="w-4 h-4" />, accent: 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800' },
  { label: 'Email Console', href: '/recruiter/emails', icon: <Mail className="w-4 h-4" />, accent: 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800' },
];

export function QuickActionsBar() {
  return (
    <div className="flex flex-wrap gap-2 mb-8">
      {actions.map((a) => (
        <Link key={a.label} href={a.href}>
          <button className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium shadow-sm transition-all duration-200 ${a.accent}`}>
            {a.icon}
            {a.label}
          </button>
        </Link>
      ))}
    </div>
  );
}
