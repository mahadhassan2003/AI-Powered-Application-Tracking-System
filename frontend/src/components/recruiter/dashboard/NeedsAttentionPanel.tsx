import Link from 'next/link';
import { AlertTriangle, Users, Calendar, HandshakeIcon, Clock, Mail, ChevronRight } from 'lucide-react';

interface AttentionItem {
  label: string;
  count: number;
  href: string;
  icon: React.ReactNode;
  urgency: 'critical' | 'warning' | 'info';
}

export function NeedsAttentionPanel({ items }: { items: AttentionItem[] }) {
  const active = items.filter(i => i.count > 0);

  if (active.length === 0) {
    return (
      <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/30 p-5 mb-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center">
            <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
          </div>
          <div>
            <h3 className="font-semibold text-emerald-800 dark:text-emerald-300">All Clear</h3>
            <p className="text-sm text-emerald-600 dark:text-emerald-400">No urgent items need your attention right now.</p>
          </div>
        </div>
      </div>
    );
  }

  const urgencyConfig = {
    critical: { 
      bg: 'bg-red-50 dark:bg-red-950/40', 
      border: 'border-red-200 dark:border-red-800 hover:border-red-300 dark:hover:border-red-700', 
      icon: 'bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400',
      text: 'text-red-700 dark:text-red-300',
      count: 'text-red-600 dark:text-red-400'
    },
    warning: { 
      bg: 'bg-amber-50 dark:bg-amber-950/40', 
      border: 'border-amber-200 dark:border-amber-800 hover:border-amber-300 dark:hover:border-amber-700', 
      icon: 'bg-amber-100 dark:bg-amber-900 text-amber-600 dark:text-amber-400',
      text: 'text-amber-700 dark:text-amber-300',
      count: 'text-amber-600 dark:text-amber-400'
    },
    info: { 
      bg: 'bg-blue-50 dark:bg-blue-950/40', 
      border: 'border-blue-200 dark:border-blue-800 hover:border-blue-300 dark:hover:border-blue-700', 
      icon: 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400',
      text: 'text-blue-700 dark:text-blue-300',
      count: 'text-blue-600 dark:text-blue-400'
    },
  };

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="w-4 h-4 text-amber-500" />
        <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Needs Your Attention</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {active.map((item) => {
          const c = urgencyConfig[item.urgency];
          return (
            <Link key={item.label} href={item.href}>
              <div className={`rounded-xl border ${c.border} ${c.bg} p-4 flex items-center gap-4 transition-all duration-200 hover:shadow-md group cursor-pointer`}>
                <div className={`h-10 w-10 rounded-lg ${c.icon} flex items-center justify-center flex-shrink-0`}>
                  {item.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-2xl font-black ${c.count}`}>{item.count}</div>
                  <div className={`text-xs font-medium ${c.text} truncate`}>{item.label}</div>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors flex-shrink-0" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export { Users, Calendar, HandshakeIcon, Clock, Mail };
