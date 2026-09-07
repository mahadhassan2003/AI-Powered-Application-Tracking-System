import React from 'react';
import { InterviewResponse } from '@/types/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Calendar as CalendarIcon, CheckCircle2, MonitorPlay, XCircle, Clock } from 'lucide-react';

interface InterviewRequestsViewProps {
  interviews: InterviewResponse[];
  onApproveReschedule: (id: number) => void;
  onDeclineReschedule: (id: number) => void;
  onOpen: (interview: InterviewResponse) => void;
  isMutating: boolean;
}

export function InterviewRequestsView({
  interviews,
  onApproveReschedule,
  onDeclineReschedule,
  onOpen,
  isMutating
}: InterviewRequestsViewProps) {
  
  if (interviews.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white/50 dark:bg-zinc-900/30 m-4">
         <CheckCircle2 className="w-12 h-12 text-emerald-400 mb-4 opacity-50" />
         <h3 className="text-lg font-semibold text-zinc-700 dark:text-zinc-300">Inbox Zero</h3>
         <p className="text-zinc-500 text-sm mt-1">There are no pending reschedule requests from candidates.</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 max-w-5xl mx-auto">
      {interviews.map(interview => (
        <Card 
          key={interview.id} 
          className="overflow-hidden border-amber-200 dark:border-amber-500/20 bg-amber-50/30 dark:bg-amber-900/10 cursor-pointer hover:shadow-md transition-shadow group"
          onClick={() => onOpen(interview)}
        >
          <div className="p-5">
             <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                   <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-500" />
                   <h3 className="text-lg font-bold text-amber-900 dark:text-amber-100">{interview.candidate_name}</h3>
                   <span className="text-sm font-medium text-amber-700/70 dark:text-amber-500/70">— {interview.job_title}</span>
                </div>
                <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-500/20 dark:text-amber-400">
                  Reschedule Requested
                </Badge>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                <div className="bg-white/60 dark:bg-zinc-900/50 p-4 rounded-lg border border-amber-100 dark:border-amber-500/10">
                   <p className="text-[10px] uppercase text-zinc-500 font-bold mb-1">Original Time</p>
                   <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5 line-through opacity-70">
                      <Clock className="w-4 h-4" />
                      {new Date(interview.scheduled_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                   </p>
                </div>
                <div className="bg-white/80 dark:bg-zinc-900/80 p-4 rounded-lg border border-amber-200 dark:border-amber-500/30 shadow-sm ring-1 ring-amber-500/10">
                   <p className="text-[10px] uppercase text-amber-600 font-bold mb-1">Proposed New Time</p>
                   <p className="text-base font-bold text-amber-900 dark:text-amber-100 flex items-center gap-1.5">
                      <CalendarIcon className="w-4 h-4 text-amber-600" />
                      {interview.proposed_time 
                        ? new Date(interview.proposed_time).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) 
                        : 'No time proposed'}
                   </p>
                </div>
             </div>

             {interview.reschedule_reason && (
                <div className="mb-5 bg-white/40 dark:bg-zinc-900/30 p-3 rounded-md italic text-sm text-zinc-600 dark:text-zinc-400 border-l-2 border-amber-400">
                   "{interview.reschedule_reason}"
                </div>
             )}

             <div className="flex gap-3 justify-end pt-4 border-t border-amber-200/50 dark:border-amber-500/10" onClick={(e) => e.stopPropagation()}>
                <Button 
                   size="sm" 
                   variant="outline" 
                   className="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10"
                   disabled={isMutating}
                   onClick={() => onDeclineReschedule(interview.id)}
                >
                   <XCircle className="w-4 h-4 mr-1.5" /> Decline
                </Button>
                <Button 
                   size="sm" 
                   className="bg-emerald-600 hover:bg-emerald-700 text-white"
                   disabled={isMutating}
                   onClick={() => onApproveReschedule(interview.id)}
                >
                   <CheckCircle2 className="w-4 h-4 mr-1.5" /> Approve Proposed Time
                </Button>
             </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
