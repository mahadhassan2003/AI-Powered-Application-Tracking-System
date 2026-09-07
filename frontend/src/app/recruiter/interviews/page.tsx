'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import clientApi from '@/lib/client-api';
import { Badge } from '@/components/ui/badge';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Calendar as CalendarIcon, Inbox, History, Send, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

import { InterviewResponse } from '@/types/api';
import type { MarkInterviewCompletePayload, DeclineReschedulePayload, RescheduleInterviewPayload } from '@/types/payloads';
import { InterviewTableView } from '@/components/recruiter/interviews/InterviewTableView';
import { InterviewRequestsView } from '@/components/recruiter/interviews/InterviewRequestsView';
import { InterviewSideDrawer } from '@/components/recruiter/interviews/InterviewSideDrawer';

function InterviewOperationsConsole() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const queryClient = useQueryClient();

  const currentTab = searchParams.get('tab') || 'upcoming';
  
  // Local States
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const [drawerInterview, setDrawerInterview] = useState<InterviewResponse | null>(null);
  const [sortKey, setSortKey] = useState('scheduled_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Decline Dialog State
  const [declineDialogOpen, setDeclineDialogOpen] = useState(false);
  const [decliningInterviewId, setDecliningInterviewId] = useState<number | null>(null);
  const [declineReason, setDeclineReason] = useState('');

  // Bulk result banner
  const [bulkResult, setBulkResult] = useState<{ sent: number; failed: number } | null>(null);

  // Fetch Data — single query, derive subsets
  const { data: interviews, isLoading, error } = useQuery<InterviewResponse[]>({
    queryKey: ['recruiter-interviews'],
    queryFn: async () => {
       const res = await clientApi.get('/interviews/my-interviews');
       return res as unknown as InterviewResponse[];
    },
    refetchInterval: 30000,
  });

  const apps = interviews || [];

  // Derivations — no extra fetch on tab switch
  const upcomingInterviews = apps.filter(i => ['scheduled', 'confirmed', 'rescheduled'].includes(i.status));
  const requestInterviews = apps.filter(i => i.status === 'reschedule_requested');
  const historyInterviews = apps.filter(i => ['completed', 'cancelled'].includes(i.status));

  // Determine active dataset for table
  let activeDataset = upcomingInterviews;
  if (currentTab === 'history') activeDataset = historyInterviews;

  // ── Optimistic helper ──
  const optimisticStatusUpdate = (interviewId: number, newStatus: string) => {
    queryClient.setQueryData<InterviewResponse[]>(['recruiter-interviews'], (old) => {
      if (!old) return old;
      return old.map(i => i.id === interviewId ? { ...i, status: newStatus } : i);
    });
  };

  // ── Mutations ──
  const approveMutation = useMutation({
    mutationFn: (id: number) => clientApi.put(`/interviews/${id}/reschedule/approve`, { notes: null }),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['recruiter-interviews'] });
      const previous = queryClient.getQueryData<InterviewResponse[]>(['recruiter-interviews']);
      optimisticStatusUpdate(id, 'rescheduled');
      setDrawerInterview(null);
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) queryClient.setQueryData(['recruiter-interviews'], context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['recruiter-interviews'] })
  });

  const declineMutation = useMutation({
    mutationFn: (data: DeclineReschedulePayload) => clientApi.put(`/interviews/${data.id}/reschedule/decline`, { reason: data.reason }),
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: ['recruiter-interviews'] });
      const previous = queryClient.getQueryData<InterviewResponse[]>(['recruiter-interviews']);
      optimisticStatusUpdate(data.id, 'scheduled');
      return { previous };
    },
    onError: (_err, _data, context) => {
      if (context?.previous) queryClient.setQueryData(['recruiter-interviews'], context.previous);
    },
    onSuccess: () => {
      setDeclineDialogOpen(false);
      setDeclineReason('');
      setDrawerInterview(null);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['recruiter-interviews'] })
  });

  const completeMutation = useMutation({
    mutationFn: (data: MarkInterviewCompletePayload) => clientApi.put(`/interviews/${data.id}/complete`, { notes: data.notes }),
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: ['recruiter-interviews'] });
      const previous = queryClient.getQueryData<InterviewResponse[]>(['recruiter-interviews']);
      optimisticStatusUpdate(data.id, 'completed');
      setDrawerInterview(null);
      return { previous };
    },
    onError: (_err, _data, context) => {
      if (context?.previous) queryClient.setQueryData(['recruiter-interviews'], context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['recruiter-interviews'] })
  });

  const cancelMutation = useMutation({
    mutationFn: (id: number) => clientApi.put(`/interviews/${id}/cancel`, {}),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['recruiter-interviews'] });
      const previous = queryClient.getQueryData<InterviewResponse[]>(['recruiter-interviews']);
      optimisticStatusUpdate(id, 'cancelled');
      setDrawerInterview(null);
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) queryClient.setQueryData(['recruiter-interviews'], context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['recruiter-interviews'] })
  });

  const manualRescheduleMutation = useMutation({
    mutationFn: (data: RescheduleInterviewPayload) => clientApi.put(`/interviews/${data.id}/reschedule/admin`, { scheduled_at: data.scheduled_at, notes: data.notes }),
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: ['recruiter-interviews'] });
      const previous = queryClient.getQueryData<InterviewResponse[]>(['recruiter-interviews']);
      optimisticStatusUpdate(data.id, 'rescheduled');
      setDrawerInterview(null);
      return { previous };
    },
    onError: (_err, _data, context) => {
      if (context?.previous) queryClient.setQueryData(['recruiter-interviews'], context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['recruiter-interviews'] })
  });

  const bulkReminderMutation = useMutation({
     mutationFn: async (ids: number[]) => {
       // No dedicated backend bulk endpoint — iterate via Promise.allSettled
       const results = await Promise.allSettled(
         ids.map(id => clientApi.put(`/interviews/${id}/confirm`, {}))
       );
       const sent = results.filter(r => r.status === 'fulfilled').length;
       const failed = results.filter(r => r.status === 'rejected').length;
       setBulkResult({ sent, failed });
       setTimeout(() => setBulkResult(null), 5000);
     },
     onSuccess: () => setSelectedIds(new Set())
  });

  // ── Helpers ──
  const handleTabChange = (tab: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('tab', tab);
    router.replace(`${pathname}?${params.toString()}`);
    setSelectedIds(new Set());
    setFocusedIndex(-1);
    setDrawerInterview(null);
  };

  const handleSortChange = (key: string) => {
     if (sortKey === key) {
        setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
     } else {
        setSortKey(key);
        setSortDirection('asc');
     }
  };

  // ── Loading / Error ──
  if (isLoading) return <div className="p-24 text-center text-zinc-500 animate-pulse font-medium text-lg">Loading Console...</div>;
  if (error) return <div className="p-24 text-center text-red-500 font-medium">Failed to load interviews.</div>;

  const isMutating = approveMutation.isPending || declineMutation.isPending || completeMutation.isPending || cancelMutation.isPending || manualRescheduleMutation.isPending;

  return (
    <div className="h-[calc(100vh-theme(spacing.16))] flex flex-col pt-8 bg-zinc-50/50 dark:bg-zinc-950 relative">
      {/* Header */}
      <div className="px-8 pb-4 border-b border-zinc-200 dark:border-zinc-800 bg-transparent flex items-end justify-between shrink-0">
        <div>
          <Badge variant="outline" className="mb-2 uppercase text-[10px] tracking-wider font-bold bg-white dark:bg-zinc-900 border-zinc-200/50 shadow-sm">
             Operations Console
          </Badge>
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
            Interviews
          </h1>
          <p className="text-zinc-500 mt-1.5 font-medium flex items-center gap-2">
            Schedule logistics, AI prep, and request triage.
          </p>
        </div>
        
        {/* Tab Switcher */}
        <div className="flex bg-zinc-100 dark:bg-zinc-900 p-1 rounded-lg">
          <button 
            onClick={() => handleTabChange('upcoming')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md transition-all ${
              currentTab === 'upcoming' ? 'bg-white dark:bg-zinc-800 shadow-sm text-zinc-900 dark:text-white' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
            }`}
          >
            <CalendarIcon className="w-4 h-4" /> Upcoming
            <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px]">{upcomingInterviews.length}</Badge>
          </button>
          <button 
            onClick={() => handleTabChange('requests')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md transition-all ${
               currentTab === 'requests' ? 'bg-white dark:bg-zinc-800 shadow-sm text-zinc-900 dark:text-white' : 'text-amber-600/70 hover:text-amber-700 dark:text-amber-500/70 dark:hover:text-amber-500'
            }`}
          >
            <Inbox className="w-4 h-4" /> Requests
            {requestInterviews.length > 0 && <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-pulse" />}
          </button>
          <button 
            onClick={() => handleTabChange('history')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md transition-all ${
               currentTab === 'history' ? 'bg-white dark:bg-zinc-800 shadow-sm text-zinc-900 dark:text-white' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
            }`}
          >
            <History className="w-4 h-4" /> History
          </button>
        </div>
      </div>

      {/* ── Bulk Result Banner ── */}
      {bulkResult && (
        <div className="mx-8 mt-4 px-4 py-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-sm font-medium text-blue-700 dark:text-blue-300 flex items-center justify-between animate-in slide-in-from-top-2">
          <span>{bulkResult.sent} reminder{bulkResult.sent !== 1 ? 's' : ''} sent{bulkResult.failed > 0 ? `, ${bulkResult.failed} failed` : ''}.</span>
          <button onClick={() => setBulkResult(null)} className="text-blue-500 hover:text-blue-700"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Main Content Area */}
      {currentTab === 'requests' ? (
         <div className="flex-1 overflow-auto bg-zinc-50/50 dark:bg-zinc-950">
            <InterviewRequestsView 
              interviews={requestInterviews} 
              onApproveReschedule={(id) => approveMutation.mutate(id)}
              onDeclineReschedule={(id) => { setDecliningInterviewId(id); setDeclineDialogOpen(true); }}
              onOpen={setDrawerInterview}
              isMutating={isMutating}
            />
         </div>
      ) : (
         <InterviewTableView 
           interviews={activeDataset}
           selectedIds={selectedIds}
           focusedIndex={focusedIndex}
           onToggleSelect={(id) => {
              const next = new Set(selectedIds);
              if (next.has(id)) next.delete(id); else next.add(id);
              setSelectedIds(next);
           }}
           onSelectAll={(ids) => setSelectedIds(new Set(ids))}
           onFocusChange={setFocusedIndex}
           onOpen={setDrawerInterview}
           sortKey={sortKey}
           sortDirection={sortDirection}
           onSortChange={handleSortChange}
         />
      )}

      {/* Bulk Action Toolbar */}
      {selectedIds.size > 0 && currentTab !== 'requests' && (
         <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-6 py-3 rounded-full shadow-2xl flex items-center gap-2 z-40 animate-in slide-in-from-bottom-5">
            <Badge className="bg-zinc-800 dark:bg-zinc-200 text-white dark:text-zinc-900 px-2 py-0.5 border-none">
              {selectedIds.size} Selected
            </Badge>
            <button onClick={() => setSelectedIds(new Set())} className="text-zinc-400 hover:text-white dark:hover:text-black flex items-center text-xs ml-1 mr-3 transition-colors">
              <X className="w-3 h-3 mr-1" /> Clear
            </button>
            <div className="h-4 w-px bg-zinc-700 dark:bg-zinc-300 mx-2"></div>
            <Button 
              size="sm" 
              variant="ghost" 
              className="text-blue-400 hover:text-blue-300 hover:bg-zinc-800 dark:hover:bg-zinc-200 h-8" 
              disabled={bulkReminderMutation.isPending}
              onClick={() => bulkReminderMutation.mutate(Array.from(selectedIds))}
            >
               <Send className="w-4 h-4 mr-2" /> {bulkReminderMutation.isPending ? 'Sending...' : 'Send Reminder'}
            </Button>
         </div>
      )}

      {/* Side Drawer Component */}
      <InterviewSideDrawer 
        interview={drawerInterview}
        open={!!drawerInterview}
        onClose={() => setDrawerInterview(null)}
        onCancel={(id) => cancelMutation.mutate(id)}
        onMarkCompleted={(id, notes) => completeMutation.mutate({ id, notes })}
        onManualReschedule={(id, scheduled_at, notes) => manualRescheduleMutation.mutate({ id, scheduled_at, notes })}
        isMutating={isMutating}
      />

      {/* Decline Dialog Modal */}
      <Dialog open={declineDialogOpen} onOpenChange={setDeclineDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600"><AlertCircle className="w-5 h-5" /> Decline Reschedule Request</DialogTitle>
            <DialogDescription>
              Provide a reason so the candidate understands why the reschedule was declined. The interview will stay on the calendar at its original scheduled time.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Textarea
                id="decline-reason"
                className="resize-none h-24"
                placeholder="e.g. Unfortunately, the interview panel is fully booked next week..."
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeclineDialogOpen(false)}>Cancel</Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={!declineReason.trim() || declineMutation.isPending}
              onClick={() => decliningInterviewId && declineMutation.mutate({ id: decliningInterviewId, reason: declineReason })}
            >
              {declineMutation.isPending ? 'Declining...' : 'Confirm Decline'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function Page() {
  return (
    <React.Suspense fallback={<div className="p-24 text-center text-zinc-500 animate-pulse">Loading Operations Console...</div>}>
      <InterviewOperationsConsole />
    </React.Suspense>
  );
}
