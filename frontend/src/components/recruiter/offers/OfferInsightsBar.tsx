import React from 'react';
import { OfferAnalytics } from '@/types/api';
import { TrendingUp, Clock, MessageSquare, FileSignature } from 'lucide-react';

interface OfferInsightsBarProps {
  analytics: OfferAnalytics | null;
  isLoading: boolean;
  pendingNegotiations: number;
  expiringThisWeek: number;
}

export function OfferInsightsBar({ analytics, isLoading, pendingNegotiations, expiringThisWeek }: OfferInsightsBarProps) {
  if (isLoading || !analytics) {
    return (
      <div className="px-8 py-3 border-b border-zinc-100 dark:border-zinc-800/50 bg-white/50 dark:bg-zinc-950/50 flex gap-6 animate-pulse">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-4 bg-zinc-100 dark:bg-zinc-800 rounded w-24" />
        ))}
      </div>
    );
  }

  const activeCount = analytics.pending || 0;
  const acceptanceRate = analytics.acceptance_rate ?? 0;

  const stats = [
    { label: 'Active Offers', value: activeCount, icon: <FileSignature className="w-3.5 h-3.5" />, color: 'text-blue-600' },
    { label: 'Acceptance Rate', value: `${acceptanceRate.toFixed(0)}%`, icon: <TrendingUp className="w-3.5 h-3.5" />, color: acceptanceRate >= 50 ? 'text-emerald-600' : 'text-amber-600' },
    { label: 'Expiring This Week', value: expiringThisWeek, icon: <Clock className="w-3.5 h-3.5" />, color: expiringThisWeek > 0 ? 'text-red-600' : 'text-zinc-500' },
    { label: 'Negotiations Pending', value: pendingNegotiations, icon: <MessageSquare className="w-3.5 h-3.5" />, color: pendingNegotiations > 0 ? 'text-violet-600' : 'text-zinc-500' },
  ];

  return (
    <div className="px-8 py-3 border-b border-zinc-100 dark:border-zinc-800/50 bg-white/50 dark:bg-zinc-950/50 flex items-center gap-8 overflow-x-auto shrink-0">
      {stats.map((stat, i) => (
        <div key={i} className="flex items-center gap-2 whitespace-nowrap">
          <span className={`${stat.color}`}>{stat.icon}</span>
          <span className="text-xs text-zinc-500">{stat.label}</span>
          <span className={`text-sm font-bold ${stat.color}`}>{stat.value}</span>
        </div>
      ))}
    </div>
  );
}
