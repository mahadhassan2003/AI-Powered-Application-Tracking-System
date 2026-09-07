import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, ExternalLink } from 'lucide-react';
import type { InterviewResponse } from '@/types/api';

interface Props {
  todaysInterviews: InterviewResponse[];
  pendingConfirmations: InterviewResponse[];
  rescheduleRequests: InterviewResponse[];
}

export function TodaysInterviewsCard({ todaysInterviews, pendingConfirmations, rescheduleRequests }: Props) {
  const hasContent = todaysInterviews.length > 0 || pendingConfirmations.length > 0 || rescheduleRequests.length > 0;

  return (
    <Card className="h-full">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-500" /> Today&apos;s Interviews
          </CardTitle>
          <CardDescription>{todaysInterviews.length} session{todaysInterviews.length !== 1 ? 's' : ''} scheduled today</CardDescription>
        </div>
        <Link href="/recruiter/interviews">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs">Open Console <ExternalLink className="w-3 h-3" /></Button>
        </Link>
      </CardHeader>
      <CardContent>
        {!hasContent ? (
          <p className="text-sm text-zinc-400 italic py-4 text-center">No interviews scheduled for today.</p>
        ) : (
          <div className="space-y-2.5">
            {/* Reschedule requests — highest priority */}
            {rescheduleRequests.length > 0 && (
              <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3">
                <div className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-1">⚠ Reschedule Requested</div>
                {rescheduleRequests.slice(0, 3).map(iv => (
                  <div key={iv.id} className="flex justify-between items-center py-1.5 text-sm">
                    <span className="font-medium text-zinc-800 dark:text-zinc-200">{iv.candidate_name}</span>
                    <span className="text-zinc-500 text-xs">{iv.job_title}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Pending confirmations */}
            {pendingConfirmations.length > 0 && (
              <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-3">
                <div className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider mb-1">Awaiting Confirmation ({pendingConfirmations.length})</div>
                {pendingConfirmations.slice(0, 3).map(iv => (
                  <div key={iv.id} className="flex justify-between items-center py-1.5 text-sm">
                    <span className="font-medium text-zinc-800 dark:text-zinc-200">{iv.candidate_name}</span>
                    <Badge variant="outline" className="text-[10px]">{iv.interview_type}</Badge>
                  </div>
                ))}
              </div>
            )}

            {/* Today's lineup */}
            {todaysInterviews.map(iv => (
              <div key={iv.id} className="flex items-center justify-between p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-400 text-xs font-bold">
                    {iv.candidate_name?.charAt(0)}
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{iv.candidate_name}</div>
                    <div className="text-xs text-zinc-500">{iv.job_title}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium flex items-center gap-1 text-zinc-700 dark:text-zinc-300">
                    <Clock className="w-3.5 h-3.5" />
                    {new Date(iv.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <Badge variant={iv.candidate_confirmed ? 'default' : 'secondary'} className="text-[10px] mt-0.5">
                    {iv.candidate_confirmed ? 'Confirmed' : 'Unconfirmed'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
