import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { JobResponse } from '@/types/api';

interface Props {
  jobs: JobResponse[];
}

export function ActiveJobsCard({ jobs }: Props) {
  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg">Your Active Postings</CardTitle>
          <CardDescription>{jobs.length} job{jobs.length !== 1 ? 's' : ''} currently live</CardDescription>
        </div>
        <Link href="/recruiter/jobs">
          <Button variant="outline" size="sm">Manage All</Button>
        </Link>
      </CardHeader>
      <CardContent>
        {jobs.length === 0 ? (
          <p className="text-sm text-zinc-400 italic py-4 text-center">No active jobs posted yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {jobs.slice(0, 6).map(job => (
              <div key={job.id} className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
                <div className="font-semibold mb-1">{job.title}</div>
                <div className="text-xs text-zinc-500 mb-3">{job.location}</div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-500">{job.applicant_count || 0} applicants</span>
                  <Link href={`/recruiter/jobs/${job.id}/applications`} className="text-blue-600 font-semibold hover:underline">
                    View →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
