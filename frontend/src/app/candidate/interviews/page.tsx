'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import clientApi from '@/lib/client-api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { 
  CalendarDays, Clock, Video, MapPin, User, ExternalLink, AlertCircle
} from 'lucide-react';
import type { InterviewResponse } from '@/types/api';

export default function CandidateInterviewsPage() {
  const { data: interviews, isLoading } = useQuery<InterviewResponse[]>({
    queryKey: ['my-interviews-candidate'],
    queryFn: () => clientApi.get('/interviews/my-interviews').then((data: any) => data || [])
  });

  const upcoming = React.useMemo(() => {
    if (!interviews) return [];
    return interviews
      .filter((i) => new Date(i.scheduled_at) >= new Date() && i.status !== 'cancelled')
      .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
  }, [interviews]);

  const past = React.useMemo(() => {
    if (!interviews) return [];
    return interviews
      .filter((i) => new Date(i.scheduled_at) < new Date() || i.status === 'cancelled')
      .sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime());
  }, [interviews]);

  const statusStyle = (status: string) => {
    switch(status) {
      case 'scheduled': return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400';
      case 'confirmed': return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400';
      case 'completed': return 'bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400';
      case 'cancelled': return 'bg-red-50 text-red-600 border-red-200 dark:bg-red-500/10 dark:text-red-400';
      default: return 'bg-zinc-100 text-zinc-600 border-zinc-200';
    }
  };

  const typeIcon = (type: string) => {
    if (type?.includes('video') || type?.includes('Video')) return <Video className="w-4 h-4" />;
    if (type?.includes('phone') || type?.includes('Phone')) return <Clock className="w-4 h-4" />;
    return <MapPin className="w-4 h-4" />;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <div className="animate-pulse text-zinc-400 flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          <span className="text-sm font-medium">Loading interviews...</span>
        </div>
      </div>
    );
  }

  const InterviewCard = ({ interview }: { interview: InterviewResponse }) => {
    const date = new Date(interview.scheduled_at);
    const isUpcoming = date >= new Date() && interview.status !== 'cancelled';

    return (
      <Card className={`bg-white dark:bg-zinc-900 transition-all ${isUpcoming ? 'hover:shadow-md hover:border-blue-200 dark:hover:border-blue-800' : 'opacity-75'}`}>
        <CardContent className="p-4 md:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              {/* Date Badge */}
              <div className="w-14 h-14 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex flex-col items-center justify-center shrink-0 border border-blue-100 dark:border-blue-800">
                <span className="text-[10px] uppercase font-bold text-blue-500">
                  {date.toLocaleDateString('en-US', { month: 'short' })}
                </span>
                <span className="text-lg font-black text-blue-700 dark:text-blue-300 leading-none">
                  {date.getDate()}
                </span>
              </div>
              
              <div className="min-w-0">
                <h3 className="text-sm md:text-base font-bold truncate">
                  {interview.job_title || `Interview #${interview.id}`}
                </h3>
                <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-zinc-500">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="flex items-center gap-1">
                    {typeIcon(interview.interview_type)}
                    <span className="capitalize">{interview.interview_type?.replace('_', ' ') || 'Interview'}</span>
                  </span>
                  {interview.duration_minutes && (
                    <span>{interview.duration_minutes} min</span>
                  )}
                </div>
                {interview.interviewer_name && (
                  <p className="text-xs text-zinc-400 mt-1 flex items-center gap-1">
                    <User className="w-3 h-3" /> {interview.interviewer_name}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 text-[10px] md:text-xs font-semibold rounded-full border capitalize ${statusStyle(interview.status)}`}>
                {interview.status}
              </span>
              {interview.meeting_link && isUpcoming && (
                <a href={interview.meeting_link} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white text-xs">
                    <ExternalLink className="w-3 h-3 mr-1" /> Join
                  </Button>
                </a>
              )}
            </div>
          </div>

          {interview.notes && (
            <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
              <p className="text-xs text-zinc-500 line-clamp-2">{interview.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="py-6 md:py-12 px-4 md:px-6 w-full">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-1">Interview Schedule</h1>
        <p className="text-zinc-500 text-sm">Manage your upcoming and past interviews.</p>
      </div>

      {/* Upcoming */}
      <div className="mb-8">
        <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-blue-500" /> Upcoming ({upcoming.length})
        </h2>
        {upcoming.length === 0 ? (
          <Card className="bg-white dark:bg-zinc-900">
            <CardContent className="p-8 text-center text-zinc-400">
              <CalendarDays className="w-10 h-10 mx-auto text-zinc-300 mb-3" />
              <p className="text-sm font-medium">No upcoming interviews scheduled.</p>
              <p className="text-xs mt-1">When recruiters schedule you, interviews will appear here.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {upcoming.map((i) => <InterviewCard key={i.id} interview={i} />)}
          </div>
        )}
      </div>

      {/* Past */}
      {past.length > 0 && (
        <div>
          <h2 className="text-lg font-bold mb-3 flex items-center gap-2 text-zinc-500">
            <Clock className="w-5 h-5" /> Past Interviews ({past.length})
          </h2>
          <div className="space-y-3">
            {past.map((i) => <InterviewCard key={i.id} interview={i} />)}
          </div>
        </div>
      )}
    </div>
  );
}
