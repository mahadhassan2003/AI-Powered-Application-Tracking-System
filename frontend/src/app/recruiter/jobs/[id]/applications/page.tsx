'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import clientApi from '@/lib/client-api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import type { ApplicationResponse } from '@/types/api';
import { TableProperties, LayoutDashboard, LineChart } from 'lucide-react';

import { PipelineTableView } from '@/components/recruiter/pipeline/PipelineTableView';
import { PipelineKanbanView } from '@/components/recruiter/pipeline/PipelineKanbanView';
import { PipelineInsightsView } from '@/components/recruiter/pipeline/PipelineInsightsView';
import { AdvanceTopCandidatesDialog } from '@/components/recruiter/pipeline/AdvanceTopCandidatesDialog';
import { Zap } from 'lucide-react';

function ApplicationPipelinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const currentTab = searchParams.get('tab') || 'table';
  const highlightCandidateId = searchParams.get('candidate');

  const { data: applications, isLoading, error } = useQuery<ApplicationResponse[]>({
    queryKey: ['applications', id],
    queryFn: async () => {
      const res = await clientApi.get(`/applications/job/${id}/applications`);
      return (res as unknown as ApplicationResponse[]) || [];
    },
    refetchInterval: 15000,
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ appId, status }: { appId: number, status: string }) => 
      clientApi.put(`/applications/${appId}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications', id] });
    }
  });

  const [schedulingApp, setSchedulingApp] = useState<ApplicationResponse | null>(null);
  const [advanceDialogOpen, setAdvanceDialogOpen] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({ 
     date: '', time: '10:00', duration: 60, type: 'technical', 
     meeting_link: '', location: '',
     allow_reschedule: true, reschedule_window_start: '', reschedule_window_end: '' 
  });

  const scheduleMutation = useMutation({
    mutationFn: (data: {
      application_id: number;
      scheduled_at: string;
      duration_minutes: number;
      interview_type: string;
      meeting_link: string | null;
      location: string | null;
      allow_reschedule: boolean;
      reschedule_window_start: string | null;
      reschedule_window_end: string | null;
    }) => clientApi.post(`/interviews/schedule`, data),
    onSuccess: () => {
      setSchedulingApp(null);
      queryClient.invalidateQueries({ queryKey: ['applications', id] });
      if (schedulingApp && schedulingApp.status !== 'interview') {
        updateStatusMutation.mutate({ appId: schedulingApp.id, status: 'interview' });
      }
    }
  });

  const handleStatusChange = (appId: number, status: string) => {
    updateStatusMutation.mutate({ appId, status });
  };

  const handleTabChange = (tab: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('tab', tab);
    router.replace(`${pathname}?${params.toString()}`);
  };

  if (isLoading) return <div className="p-24 text-center text-zinc-500 animate-pulse font-medium text-lg">Loading Pipeline...</div>;
  if (error) return <div className="p-24 text-center text-red-500 font-medium">Failed to load pipeline connection.</div>;

  const jobTitle = applications && applications.length > 0 ? applications[0].job_title : 'Job Pipeline';
  const apps = applications || [];

  return (
    <div className="h-[calc(100vh-theme(spacing.16))] flex flex-col pt-8 bg-zinc-50/50 dark:bg-zinc-950">
      {/* Header */}
      <div className="px-8 pb-4 border-b border-zinc-200 dark:border-zinc-800 bg-transparent flex items-end justify-between">
        <div>
          <Badge variant="outline" className="mb-2 uppercase text-[10px] tracking-wider font-bold bg-white dark:bg-zinc-900">
            Pipeline Orchestration
          </Badge>
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
            {jobTitle}
          </h1>
          <p className="text-zinc-500 mt-1.5 flex items-center gap-2">
            <span className="font-semibold text-zinc-700 dark:text-zinc-300">{apps.length}</span> candidates total
          </p>
        </div>

        <div className="flex items-center gap-3">
          {apps.filter(a => a.status === 'applied').length > 0 && (
            <Button
              onClick={() => setAdvanceDialogOpen(true)}
              className="gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-md"
            >
              <Zap className="w-4 h-4" /> Advance Top Candidates
            </Button>
          )}
        
        {/* Tab Switcher */}
        <div className="flex bg-zinc-100 dark:bg-zinc-900 p-1 rounded-lg">
          <button 
            onClick={() => handleTabChange('table')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md transition-all ${
              currentTab === 'table' ? 'bg-white dark:bg-zinc-800 shadow-sm text-zinc-900 dark:text-white' : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            <TableProperties className="w-4 h-4" /> Table View
          </button>
          <button 
            onClick={() => handleTabChange('kanban')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md transition-all ${
               currentTab === 'kanban' ? 'bg-white dark:bg-zinc-800 shadow-sm text-zinc-900 dark:text-white' : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" /> Kanban Overview
          </button>
          <button 
            onClick={() => handleTabChange('insights')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md transition-all ${
               currentTab === 'insights' ? 'bg-white dark:bg-zinc-800 shadow-sm text-zinc-900 dark:text-white' : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            <LineChart className="w-4 h-4" /> Insights
          </button>
        </div>
        </div>
      </div>

      {/* Main Content Area */}
      {currentTab === 'table' && (
        <PipelineTableView 
          applications={apps}
          highlightCandidateId={highlightCandidateId}
          onStatusChange={handleStatusChange}
          onScheduleInterview={setSchedulingApp}
          isStatusUpdating={updateStatusMutation.isPending}
          jobId={id}
        />
      )}

      {currentTab === 'kanban' && (
        <PipelineKanbanView 
          applications={apps}
          highlightCandidateId={highlightCandidateId}
          onStatusChange={handleStatusChange}
          onScheduleInterview={setSchedulingApp}
          isStatusUpdating={updateStatusMutation.isPending}
        />
      )}

      {currentTab === 'insights' && (
        <PipelineInsightsView applications={apps} />
      )}

      {/* Advance Top Candidates Dialog */}
      <AdvanceTopCandidatesDialog
        jobId={id}
        eligibleCount={apps.filter(a => a.status === 'applied').length}
        open={advanceDialogOpen}
        onOpenChange={setAdvanceDialogOpen}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['applications', id] })}
      />

      {/* Schedule Interview Dialog */}
      <Dialog open={!!schedulingApp} onOpenChange={(open) => !open && setSchedulingApp(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule Interview</DialogTitle>
            <DialogDescription>
              Set up an interview with <strong>{schedulingApp?.candidate_name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={scheduleForm.date} onChange={e => setScheduleForm({...scheduleForm, date: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Time</Label>
                <Input type="time" value={scheduleForm.time} onChange={e => setScheduleForm({...scheduleForm, time: e.target.value})} />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Duration (Minutes)</Label>
                <Input type="number" value={scheduleForm.duration} onChange={e => setScheduleForm({...scheduleForm, duration: parseInt(e.target.value)})} />
              </div>
              <div className="space-y-2">
                <Label>Interview Type</Label>
                <select 
                  className="w-full rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2 text-sm"
                  value={scheduleForm.type}
                  onChange={e => setScheduleForm({...scheduleForm, type: e.target.value})}
                >
                  <option value="phone">Phone Screen</option>
                  <option value="video">Video Call</option>
                  <option value="in_person">In Person</option>
                  <option value="technical">Technical</option>
                </select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Meeting Link</Label>
              <Input placeholder="https://meet.google.com/..." value={scheduleForm.meeting_link} onChange={e => setScheduleForm({...scheduleForm, meeting_link: e.target.value})} />
            </div>

            <div className="space-y-2">
              <Label>Location</Label>
              <Input placeholder="HQ Conference Room B..." value={scheduleForm.location} onChange={e => setScheduleForm({...scheduleForm, location: e.target.value})} />
            </div>

            <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
               <label className="flex items-center gap-2 cursor-pointer mb-3">
                  <input 
                     type="checkbox" 
                     className="w-4 h-4 rounded border-zinc-300 text-blue-600" 
                     checked={scheduleForm.allow_reschedule}
                     onChange={e => setScheduleForm({...scheduleForm, allow_reschedule: e.target.checked})}
                  />
                  <span className="text-sm font-semibold">Allow Reschedule?</span>
               </label>

               {scheduleForm.allow_reschedule && (
                  <div className="grid grid-cols-2 gap-4 bg-zinc-50 dark:bg-zinc-900/50 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800">
                    <div className="space-y-2">
                      <Label className="text-xs">From</Label>
                      <Input type="datetime-local" value={scheduleForm.reschedule_window_start} onChange={e => setScheduleForm({...scheduleForm, reschedule_window_start: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Until</Label>
                      <Input type="datetime-local" value={scheduleForm.reschedule_window_end} onChange={e => setScheduleForm({...scheduleForm, reschedule_window_end: e.target.value})} />
                    </div>
                  </div>
               )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSchedulingApp(null)}>Cancel</Button>
            <Button 
              disabled={!scheduleForm.date || !scheduleForm.time || scheduleMutation.isPending}
              onClick={() => {
                const combinedDate = new Date(`${scheduleForm.date}T${scheduleForm.time}`);
                scheduleMutation.mutate({
                  application_id: schedulingApp!.id,
                  scheduled_at: combinedDate.toISOString(),
                  duration_minutes: scheduleForm.duration,
                  interview_type: scheduleForm.type,
                  meeting_link: scheduleForm.meeting_link || null,
                  location: scheduleForm.location || null,
                  allow_reschedule: scheduleForm.allow_reschedule,
                  reschedule_window_start: scheduleForm.reschedule_window_start ? new Date(scheduleForm.reschedule_window_start).toISOString() : null,
                  reschedule_window_end: scheduleForm.reschedule_window_end ? new Date(scheduleForm.reschedule_window_end).toISOString() : null
                });
              }}
            >
              {scheduleMutation.isPending ? 'Scheduling...' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function Page(props: { params: Promise<{ id: string }> }) {
  return (
    <React.Suspense fallback={<div className="p-24 text-center text-zinc-500 animate-pulse">Loading Pipeline...</div>}>
      <ApplicationPipelinePage params={props.params} />
    </React.Suspense>
  );
}
