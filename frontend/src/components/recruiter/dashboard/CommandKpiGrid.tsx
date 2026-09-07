import React from 'react';

interface MetricProps {
  label: string;
  value: string | number;
  subtitle?: string;
  accent: 'blue' | 'violet' | 'amber' | 'emerald' | 'rose' | 'cyan';
  icon?: React.ReactNode;
}

const config: Record<string, { bg: string; text: string; iconBg: string; border: string }> = {
  blue: {
    bg: 'bg-white dark:bg-zinc-900',
    text: 'text-blue-600 dark:text-blue-400',
    iconBg: 'bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400',
    border: 'border-zinc-200 dark:border-zinc-800 hover:border-blue-300 dark:hover:border-blue-700',
  },
  violet: {
    bg: 'bg-white dark:bg-zinc-900',
    text: 'text-violet-600 dark:text-violet-400',
    iconBg: 'bg-violet-100 text-violet-600 dark:bg-violet-950 dark:text-violet-400',
    border: 'border-zinc-200 dark:border-zinc-800 hover:border-violet-300 dark:hover:border-violet-700',
  },
  amber: {
    bg: 'bg-white dark:bg-zinc-900',
    text: 'text-amber-600 dark:text-amber-400',
    iconBg: 'bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400',
    border: 'border-zinc-200 dark:border-zinc-800 hover:border-amber-300 dark:hover:border-amber-700',
  },
  emerald: {
    bg: 'bg-white dark:bg-zinc-900',
    text: 'text-emerald-600 dark:text-emerald-400',
    iconBg: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400',
    border: 'border-zinc-200 dark:border-zinc-800 hover:border-emerald-300 dark:hover:border-emerald-700',
  },
  rose: {
    bg: 'bg-white dark:bg-zinc-900',
    text: 'text-rose-600 dark:text-rose-400',
    iconBg: 'bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400',
    border: 'border-zinc-200 dark:border-zinc-800 hover:border-rose-300 dark:hover:border-rose-700',
  },
  cyan: {
    bg: 'bg-white dark:bg-zinc-900',
    text: 'text-cyan-600 dark:text-cyan-400',
    iconBg: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-950 dark:text-cyan-400',
    border: 'border-zinc-200 dark:border-zinc-800 hover:border-cyan-300 dark:hover:border-cyan-700',
  },
};

function MetricCard({ label, value, subtitle, accent, icon }: MetricProps) {
  const c = config[accent] || config.blue;
  return (
    <div className={`rounded-xl border ${c.border} ${c.bg} p-5 transition-all duration-200 hover:shadow-md group`}>
      <div className="flex items-start justify-between mb-4">
        <div className={`p-2.5 rounded-lg ${c.iconBg} transition-transform duration-200 group-hover:scale-110`}>
          {icon}
        </div>
      </div>
      <div className={`text-3xl font-black ${c.text} mb-1 tracking-tight`}>{value}</div>
      <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{label}</div>
      {subtitle && (
        <div className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">{subtitle}</div>
      )}
    </div>
  );
}

interface KpiGridProps {
  activeJobs: number;
  totalApplicants: number;
  pendingReview: number;
  inInterview: number;
  rejected: number;
  avgScore: number;
  topTierCount: number;
  pendingNegotiations: number;
  expiringOffers: number;
}

export function CommandKpiGrid({
  activeJobs, totalApplicants, pendingReview,
  inInterview, rejected, avgScore, topTierCount,
  pendingNegotiations, expiringOffers
}: KpiGridProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
      <MetricCard
        label="Active Jobs"
        value={activeJobs}
        subtitle={activeJobs > 0 ? 'Receiving applications' : 'Post your first job'}
        accent="blue"
        icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>}
      />
      <MetricCard
        label="Total Applicants"
        value={totalApplicants}
        subtitle={`${pendingReview} awaiting review`}
        accent="violet"
        icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
      />
      <MetricCard
        label="In Interview"
        value={inInterview}
        subtitle={`${rejected} rejected`}
        accent="amber"
        icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
      />
      <MetricCard
        label="Avg. AI Score"
        value={`${avgScore}%`}
        subtitle={`${topTierCount} top-tier matches`}
        accent="emerald"
        icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>}
      />
      <MetricCard
        label="Pending Negotiations"
        value={pendingNegotiations}
        subtitle="Awaiting recruiter response"
        accent="rose"
        icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>}
      />
      <MetricCard
        label="Expiring Offers"
        value={expiringOffers}
        subtitle="Within next 7 days"
        accent="cyan"
        icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
      />
    </div>
  );
}
