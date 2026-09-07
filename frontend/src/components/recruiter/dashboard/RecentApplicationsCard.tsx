import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { ApplicationResponse } from '@/types/api';

interface Props {
  recentApplications: ApplicationResponse[];
}

const statusStyle = (status?: string | null) => {
  switch (status) {
    case 'applied': return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800';
    case 'interview': return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800';
    case 'rejected': return 'bg-red-50 text-red-600 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800';
    case 'offer': return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800';
    default: return 'bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700';
  }
};

export function RecentApplicationsCard({ recentApplications }: Props) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Recent Applications</CardTitle>
        <CardDescription>Latest candidates entering your pipeline</CardDescription>
      </CardHeader>
      <CardContent>
        {recentApplications.length === 0 ? (
          <p className="text-sm text-zinc-400 italic py-4 text-center">No applications received yet.</p>
        ) : (
          <div className="space-y-2.5">
            {recentApplications.map(app => (
              <Link key={app.id} href={`/recruiter/jobs/${app.job_id}/applications?candidate=${app.id}`}>
                <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 hover:border-blue-200 dark:hover:border-blue-800 transition-colors cursor-pointer">
                  <div>
                    <div className="text-sm font-semibold">{app.candidate_name}</div>
                    <div className="text-xs text-zinc-500">{app.job_title}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full border ${statusStyle(app.status)}`}>
                      {app.status}
                    </span>
                    {app.match_score != null && (
                      <span className="text-sm font-bold">{Math.round(app.match_score)}%</span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
