import React from 'react';
import { ArrowUpDown, Calendar, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScoreRing } from '@/components/shared/ScoreRing';
import type { ApplicationResponse } from '@/types/api';

export interface ApplicationDataTableProps {
  applications: ApplicationResponse[];
  emptyMessage?: React.ReactNode;
  renderActions?: (app: ApplicationResponse) => React.ReactNode;
}

export function ApplicationDataTable({
  applications,
  emptyMessage = "No applications found.",
  renderActions,
}: ApplicationDataTableProps) {
  const getStatusColor = (status?: string | null) => {
    if (!status) return 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700';
    switch (status.toLowerCase()) {
      case 'applied': return 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800';
      case 'screening': return 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800';
      case 'interview': return 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800';
      case 'offer': return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
      case 'hired': return 'bg-emerald-500 text-white border-emerald-600 dark:bg-emerald-600 dark:border-emerald-700';
      case 'rejected': return 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800';
      default: return 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700';
    }
  };

  if (applications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 border border-dashed rounded-xl bg-white/50 dark:bg-zinc-900/50">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 font-medium tracking-wide">
            <tr>
              <th className="px-6 py-4 font-medium flex items-center gap-1.5 hover:text-zinc-900 dark:hover:text-zinc-200 cursor-pointer transition-colors">
                Candidate <ArrowUpDown className="w-3.5 h-3.5 opacity-50" />
              </th>
              <th className="px-6 py-4 font-medium">Job Applied For</th>
              <th className="px-6 py-4 font-medium flex items-center gap-1.5 hover:text-zinc-900 dark:hover:text-zinc-200 cursor-pointer transition-colors">
                AI Match <ArrowUpDown className="w-3.5 h-3.5 opacity-50" />
              </th>
              <th className="px-6 py-4 font-medium">Current Status</th>
              <th className="px-6 py-4 font-medium">Date applied</th>
              {renderActions && <th className="px-6 py-4 font-medium text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
            {applications.map((app) => (
              <tr key={app.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/50 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/50 dark:to-indigo-900/50 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-700 dark:text-blue-300 font-bold shadow-sm">
                      {app.candidate_name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div>
                      <div className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                        {app.candidate_name}
                        {(app.match_score ?? 0) >= 80 && (
                          <span title="Top Tier Match" className="flex h-2 w-2 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                          </span>
                        )}
                      </div>
                      <div className="text-zinc-500 text-xs mt-0.5">{app.candidate_email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="font-medium text-zinc-700 dark:text-zinc-300">
                    {app.job_title}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <ScoreRing score={app.match_score} />
                </td>
                <td className="px-6 py-4">
                  <Badge className={`px-2.5 py-0.5 capitalize border ${getStatusColor(app.status)}`} variant="outline">
                    {app.status || 'applied'}
                  </Badge>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1.5 text-zinc-500">
                    <Calendar className="w-4 h-4" />
                    <span>{new Date(app.applied_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                </td>
                {renderActions && (
                  <td className="px-6 py-4 text-right">
                    {renderActions(app)}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="bg-zinc-50 dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800 px-6 py-4 flex items-center justify-between">
        <p className="text-sm text-zinc-500">
          Showing <span className="font-medium text-zinc-900 dark:text-zinc-100">{applications.length}</span> applicants
        </p>
      </div>
    </div>
  );
}
