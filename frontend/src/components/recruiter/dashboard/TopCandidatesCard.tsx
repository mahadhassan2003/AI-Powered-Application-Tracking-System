import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import type { ApplicationResponse } from '@/types/api';

interface Props {
  topCandidates: ApplicationResponse[];
}

export function TopCandidatesCard({ topCandidates }: Props) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Top Candidates</CardTitle>
        <CardDescription>Highest AI match scores across all roles</CardDescription>
      </CardHeader>
      <CardContent>
        {topCandidates.length === 0 ? (
          <p className="text-sm text-zinc-400 italic py-4 text-center">No scored candidates yet. Resume parsing in progress.</p>
        ) : (
          <div className="space-y-2.5">
            {topCandidates.map((app, idx) => (
              <Link key={app.id} href={`/recruiter/jobs/${app.job_id}/applications?candidate=${app.id}`}>
                <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 hover:border-blue-200 dark:hover:border-blue-800 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${idx === 0 ? 'bg-amber-500' : idx === 1 ? 'bg-zinc-400' : 'bg-orange-700'}`}>
                      #{idx + 1}
                    </div>
                    <div>
                      <div className="text-sm font-semibold">{app.candidate_name}</div>
                      <div className="text-xs text-zinc-500">{app.job_title}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-black text-emerald-600">{Math.round(app.match_score ?? 0)}%</div>
                    <div className="text-[10px] text-zinc-400 uppercase tracking-wider">Match</div>
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
