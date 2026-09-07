'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import clientApi from '@/lib/client-api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  FileText, Search, CalendarDays, Target, Building2,
  Video, DollarSign, Clock, Handshake, CheckCircle2, XCircle
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { FilterToolbar } from '@/components/shared/FilterToolbar';
import { ScoreRing } from '@/components/shared/ScoreRing';
import { Textarea } from '@/components/ui/textarea';
import type { UnifiedApplication, OfferResponse, InterviewResponse } from '@/types/api';

export default function CandidateApplicationsPage() {
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();

  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
  const [rescheduleInterviewObj, setRescheduleInterviewObj] = useState<InterviewResponse | null>(null);
  const [proposedTime, setProposedTime] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');

  // --- NEW OFFER MODAL/MUTATION STATE ---
  const [isOfferNegotiating, setIsOfferNegotiating] = useState(false);
  const [negotiatingOffer, setNegotiatingOffer] = useState<OfferResponse | null>(null);
  const [negSalary, setNegSalary] = useState('');
  const [negBonus, setNegBonus] = useState('');
  const [negEquity, setNegEquity] = useState('');
  const [negReason, setNegReason] = useState('');

  const acceptOfferMutation = useMutation({
    mutationFn: (offerId: number) => clientApi.post(`/offers/${offerId}/accept`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-applications-unified'] })
  });

  const declineOfferMutation = useMutation({
    mutationFn: (offerId: number) => clientApi.post(`/offers/${offerId}/decline`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-applications-unified'] })
  });

  const negotiateOfferMutation = useMutation({
    mutationFn: (data: { offerId: number; salary: string; bonus: string; equity: string; reasoning: string }) => clientApi.post(`/offers/${data.offerId}/negotiate`, {
      initiated_by: 'candidate',
      proposed_salary: data.salary ? parseFloat(data.salary) : undefined,
      proposed_signing_bonus: data.bonus ? parseFloat(data.bonus) : undefined,
      proposed_stock_options: data.equity ? parseFloat(data.equity) : undefined,
      reasoning: data.reasoning
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-applications-unified'] });
      setIsOfferNegotiating(false);
      setNegotiatingOffer(null);
    }
  });

  const openNegotiate = (offer: OfferResponse) => {
    setNegotiatingOffer(offer);
    setNegSalary(offer.base_salary?.toString() || '');
    setNegBonus(offer.signing_bonus?.toString() || '');
    setNegEquity(offer.stock_options?.toString() || '');
    setNegReason('');
    setIsOfferNegotiating(true);
  };

  const { data: applications, isLoading } = useQuery<UnifiedApplication[]>({
    queryKey: ['my-applications-unified'],
    queryFn: async () => {
      const [apps, inters, offs] = await Promise.all([
        clientApi.get('/applications/my-applications').catch(() => []),
        clientApi.get('/interviews/my-interviews').catch(() => []),
        clientApi.get('/offers').catch(() => [])
      ]) as [UnifiedApplication[], InterviewResponse[], OfferResponse[]];

      return (apps || []).map((app) => {
        const appInterviews = (inters || []).filter((i) => i.application_id === app.id);
        const activeInterview = appInterviews.find((i) => ['scheduled', 'reschedule_requested', 'rescheduled'].includes(i.status)) || appInterviews[0];
        const offer = (offs || []).find((o) => o.application_id === app.id);
        
        return {
          ...app,
          interview: activeInterview,
          offer
        };
      });
    }
  });

  const confirmInterviewMutation = useMutation({
    mutationFn: (interviewId: number) => clientApi.put(`/interviews/${interviewId}/confirm`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-applications-unified'] })
  });

  const rescheduleMutation = useMutation({
    mutationFn: (data: {id: number, time: string, reason: string}) => 
       clientApi.put(`/interviews/${data.id}/reschedule/request`, {
           proposed_time: data.time,
           reason: data.reason
       }),
    onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['my-applications-unified'] });
       setIsRescheduleOpen(false);
       setProposedTime('');
       setRescheduleReason('');
    }
  });

  const openRescheduleModal = (interviewObj: InterviewResponse) => {
      setRescheduleInterviewObj(interviewObj);
      setProposedTime('');
      setRescheduleReason('');
      setIsRescheduleOpen(true);
  };

  const filtered = React.useMemo(() => {
    if (!applications) return [];
    if (!search) return applications;
    return applications.filter((a) => a.job_title?.toLowerCase().includes(search.toLowerCase()));
  }, [applications, search]);

  const statusColor = (status: string) => {
    switch(status) {
      case 'shortlisted': return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20';
      case 'interview': return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20';
      case 'hired': return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20';
      case 'rejected': return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20';
      default: return 'bg-zinc-50 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700';
    }
  };

  const statusIcon = (status: string) => {
    switch(status) {
      case 'applied': return '📨';
      case 'shortlisted': return '⭐';
      case 'interview': return '🎯';
      case 'hired': return '🎉';
      case 'rejected': return '❌';
      default: return '📋';
    }
  };

  // Inline Offer Action renderer based on candidate/offers/page.tsx
  const renderOfferDetails = (offer: OfferResponse | null | undefined) => {
    if (!offer) return null;
    return (
      <div className="mt-4 pt-4 border-t border-emerald-100 dark:border-emerald-900/30">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h4 className="flex items-center gap-2 text-sm font-bold text-emerald-700 dark:text-emerald-400 mb-3">
              <Handshake className="w-4 h-4" /> Action Required: Job Offer
            </h4>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-emerald-50 dark:bg-emerald-500/5 rounded-lg p-3 border border-emerald-100 dark:border-emerald-500/10">
                <p className="text-[10px] uppercase text-emerald-600/70 dark:text-emerald-400/70 font-bold mb-0.5">Base Salary</p>
                <p className="text-sm font-black flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                  <DollarSign className="w-3.5 h-3.5" />
                  {offer.base_salary?.toLocaleString() || '—'}
                </p>
                <p className="text-[10px] text-emerald-600/60 dark:text-emerald-400/60">{offer.currency || 'USD'}/yr</p>
              </div>
              <div className="bg-emerald-50 dark:bg-emerald-500/5 rounded-lg p-3 border border-emerald-100 dark:border-emerald-500/10">
                <p className="text-[10px] uppercase text-emerald-600/70 dark:text-emerald-400/70 font-bold mb-0.5">Start Date</p>
                <p className="text-sm font-bold flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                  <CalendarDays className="w-3.5 h-3.5" />
                  {offer.start_date ? new Date(offer.start_date).toLocaleDateString() : '—'}
                </p>
              </div>
            </div>
            
            {offer.custom_message && (
              <div className="mt-3 p-3 bg-emerald-50/50 dark:bg-emerald-500/5 rounded-lg">
                <p className="text-xs text-emerald-700 dark:text-emerald-400 leading-relaxed whitespace-pre-wrap">"{offer.custom_message}"</p>
              </div>
            )}
          </div>
          
          {(offer.status === 'sent' || offer.status === 'viewed') && (
            <div className="flex md:flex-col gap-2 shrink-0 mt-3 md:mt-0">
              <Button size="sm" onClick={() => acceptOfferMutation.mutate(offer.id)} disabled={acceptOfferMutation.isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white flex-1 md:flex-none w-full md:w-32">
                <CheckCircle2 className="w-4 h-4 mr-1" /> Accept
              </Button>
              <Button size="sm" onClick={() => declineOfferMutation.mutate(offer.id)} disabled={declineOfferMutation.isPending} variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 dark:border-red-900/50 dark:hover:bg-red-900/20 flex-1 md:flex-none w-full md:w-32">
                <XCircle className="w-4 h-4 mr-1" /> Decline
              </Button>
              <Button size="sm" onClick={() => openNegotiate(offer)} variant="outline" className="text-blue-600 border-blue-200 hover:bg-blue-50 hover:text-blue-700 dark:border-blue-900/50 dark:hover:bg-blue-900/20 flex-1 md:flex-none w-full md:w-32">
                Negotiate
              </Button>
            </div>
          )}
          {offer.status === 'accepted' && (
             <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 max-w-fit px-3 py-1.5 rounded-full dark:bg-emerald-500/10 text-sm mt-3 md:mt-0">
                <CheckCircle2 className="w-4 h-4" /> Offer Accepted
             </div>
          )}
          {offer.status === 'declined' && (
             <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-bold bg-red-50 max-w-fit px-3 py-1.5 rounded-full dark:bg-red-500/10 text-sm mt-3 md:mt-0">
                <XCircle className="w-4 h-4" /> Offer Declined
             </div>
          )}
          {offer.status === 'negotiating' && (
             <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold bg-blue-50 max-w-fit px-3 py-1.5 rounded-full dark:bg-blue-500/10 text-sm mt-3 md:mt-0">
                <Clock className="w-4 h-4" /> Counter-Offer Sent
             </div>
          )}
        </div>
      </div>
    );
  };

  // Inline Interview Action renderer
  const renderInterviewDetails = (interview: InterviewResponse | null | undefined) => {
    if (!interview) return null;
    return (
      <div className="mt-4 pt-4 border-t border-blue-100 dark:border-blue-900/30">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h4 className="flex items-center gap-2 text-sm font-bold text-blue-700 dark:text-blue-400 mb-3">
              <CalendarDays className="w-4 h-4" /> Next Steps: Interview Scheduled
            </h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
              <div className="bg-blue-50 dark:bg-blue-500/5 rounded-lg p-3 border border-blue-100 dark:border-blue-500/10">
                 <p className="text-[10px] uppercase text-blue-600/70 dark:text-blue-400/70 font-bold mb-0.5">Date & Time</p>
                 <p className="text-sm font-bold text-blue-700 dark:text-blue-400">
                    {new Date(interview.scheduled_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                 </p>
                 <p className="text-[10px] text-blue-600/60 dark:text-blue-400/60 mt-0.5">{interview.duration_minutes} minutes</p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-500/5 rounded-lg p-3 border border-blue-100 dark:border-blue-500/10">
                 <p className="text-[10px] uppercase text-blue-600/70 dark:text-blue-400/70 font-bold mb-0.5">Location / Link</p>
                 {interview.meeting_link ? (
                    <a href={interview.meeting_link} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1.5">
                      <Video className="w-3.5 h-3.5" /> Join Meeting
                    </a>
                 ) : (
                    <p className="text-sm font-bold text-blue-700 dark:text-blue-400">{interview.location || 'TBA'}</p>
                 )}
                 <p className="text-[10px] text-blue-600/60 dark:text-blue-400/60 mt-0.5 capitalize">{interview.interview_type} Interview</p>
              </div>
            </div>
            {interview.notes && (
                <p className="text-xs text-blue-600/80 dark:text-blue-400/80 mt-2 font-medium italic">"{interview.notes}"</p>
            )}
          </div>
          
          {['scheduled', 'rescheduled'].includes(interview.status) && !interview.candidate_confirmed && (
            <div className="flex md:flex-col gap-2 shrink-0">
              <Button 
                onClick={() => confirmInterviewMutation.mutate(interview.id)} 
                disabled={confirmInterviewMutation.isPending}
                size="sm" 
                className="bg-blue-600 hover:bg-blue-700 text-white w-full md:w-32"
              >
                 <CheckCircle2 className="w-4 h-4 mr-1" /> Confirm Time
              </Button>
              {interview.allow_reschedule && (
                 <Button size="sm" variant="outline" onClick={() => openRescheduleModal(interview)} className="w-full md:w-32 border-blue-200 text-blue-600 hover:bg-blue-50 hover:text-blue-700 dark:border-blue-900/50 dark:hover:bg-blue-900/20">
                   Reschedule
                 </Button>
              )}
            </div>
          )}
          {interview.candidate_confirmed && (
             <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-bold bg-blue-50 max-w-fit px-3 py-1.5 rounded-full dark:bg-blue-500/10 text-sm">
                <CheckCircle2 className="w-4 h-4" /> Attendance Confirmed
             </div>
          )}
          {interview.status === 'reschedule_requested' && (
             <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold bg-amber-50 max-w-fit px-3 py-1.5 rounded-full dark:bg-amber-500/10 text-sm">
                <Clock className="w-4 h-4" /> Reschedule Approval Pending
             </div>
          )}
          {interview.status === 'rescheduled' && !interview.candidate_confirmed && (
             <div className="mt-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
                <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-bold text-sm mb-1">
                   <CheckCircle2 className="w-4 h-4" /> Reschedule Request Accepted!
                </div>
                <p className="text-xs text-emerald-600/80 dark:text-emerald-400/80">Your interview has been rescheduled to the new time shown above. Please confirm your attendance.</p>
             </div>
          )}
          {interview.decline_reason && interview.status !== 'reschedule_requested' && (
             <div className="mt-2 p-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
                <div className="flex items-center gap-1.5 text-red-700 dark:text-red-400 font-bold text-sm mb-1">
                   <XCircle className="w-4 h-4" /> Reschedule Request Declined
                </div>
                <p className="text-xs text-red-600/70 dark:text-red-400/60 mb-1">Reason from recruiter:</p>
                <p className="text-sm text-red-700 dark:text-red-400 italic">"{interview.decline_reason}"</p>
             </div>
          )}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <div className="animate-pulse text-zinc-400 flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          <span className="text-sm font-medium">Loading applications...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6 md:py-12 px-4 md:px-6 w-full">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-1">My Applications</h1>
          <p className="text-zinc-500 text-sm">{filtered.length} application{filtered.length !== 1 ? 's' : ''} submitted</p>
        </div>
        <FilterToolbar 
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search by job title..."
          statusFilter="All"
          onStatusFilterChange={() => {}}
          statusOptions={[]}
          className="w-full md:w-72"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-zinc-400 bg-white dark:bg-zinc-900 rounded-xl border">
          <FileText className="w-12 h-12 mx-auto text-zinc-300 mb-3" />
          <p className="text-sm font-medium">No applications found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((app) => (
            <Card key={app.id} className="bg-white dark:bg-zinc-900 shadow-sm border-zinc-200 dark:border-zinc-800">
              <CardContent className="p-4 md:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0 text-lg">
                      {statusIcon(app.status)}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-base md:text-lg font-bold truncate">{app.job_title}</h3>
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-zinc-500">
                        <span className="flex items-center gap-1">
                          <CalendarDays className="w-3.5 h-3.5" />
                          {new Date(app.applied_at).toLocaleDateString()}
                        </span>
                        {app.recruiter_name && (
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5" />
                            {app.recruiter_name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 sm:gap-6 mt-2 sm:mt-0">
                    <div className="hidden sm:block">
                      <ScoreRing score={app.match_score} className="items-end text-right" />
                    </div>

                    <span className={`px-3 py-1.5 text-xs font-bold rounded-full border capitalize whitespace-nowrap ${statusColor(app.status)}`}>
                      {app.status}
                    </span>
                  </div>
                </div>

                {app.match_score != null && (
                  <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-between gap-2 sm:hidden">
                    <div className="text-center flex-1">
                      <p className="text-[10px] text-zinc-400 uppercase font-medium">Skills</p>
                      <p className="text-sm font-bold">{app.skill_match_score ? Math.round(app.skill_match_score) : '—'}%</p>
                    </div>
                    <div className="text-center flex-1 border-l border-r border-zinc-100 dark:border-zinc-800">
                      <p className="text-[10px] text-zinc-400 uppercase font-medium">Experience</p>
                      <p className="text-sm font-bold">{app.experience_match_score ? Math.round(app.experience_match_score) : '—'}%</p>
                    </div>
                    <div className="text-center flex-1">
                      <p className="text-[10px] text-zinc-400 uppercase font-medium">Semantic</p>
                      <p className="text-sm font-bold">{app.semantic_similarity_score ? Math.round(app.semantic_similarity_score) : '—'}%</p>
                    </div>
                  </div>
                )}
                
                {/* Dynamically render unified steps based on relations */}
                {(app.status === 'interview' || app.interview) && renderInterviewDetails(app.interview)}
                {(['offered', 'hired'].includes(app.status) || app.offer) && renderOfferDetails(app.offer)}

              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Reschedule Modal */}
      <Dialog open={isRescheduleOpen} onOpenChange={setIsRescheduleOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Request Reschedule</DialogTitle>
            <DialogDescription>
              Suggest a new time and provide a brief reason. The recruiter will be notified.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="proposed-time">Proposed Date & Time</Label>
              <Input
                id="proposed-time"
                type="datetime-local"
                value={proposedTime}
                onChange={(e) => setProposedTime(e.target.value)}
                min={rescheduleInterviewObj?.reschedule_window_start ? new Date(rescheduleInterviewObj.reschedule_window_start).toISOString().slice(0, 16) : undefined}
                max={rescheduleInterviewObj?.reschedule_window_end ? new Date(rescheduleInterviewObj.reschedule_window_end).toISOString().slice(0, 16) : undefined}
              />
              {(rescheduleInterviewObj?.reschedule_window_start || rescheduleInterviewObj?.reschedule_window_end) && (
                 <p className="text-[10px] text-zinc-500 mt-1">
                    Allowed Window: {rescheduleInterviewObj?.reschedule_window_start ? new Date(rescheduleInterviewObj.reschedule_window_start).toLocaleString([], {dateStyle:'short'}) : 'Anytime'} 
                    {' - '} 
                    {rescheduleInterviewObj?.reschedule_window_end ? new Date(rescheduleInterviewObj.reschedule_window_end).toLocaleString([], {dateStyle:'short'}) : 'Anytime'}
                 </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="reason">Reason (Optional)</Label>
              <Textarea
                id="reason"
                placeholder="e.g. Schedule conflict with..."
                value={rescheduleReason}
                onChange={(e) => setRescheduleReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRescheduleOpen(false)}>Cancel</Button>
            <Button 
               onClick={() => rescheduleInterviewObj && proposedTime && rescheduleMutation.mutate({ id: rescheduleInterviewObj.id, time: new Date(proposedTime).toISOString(), reason: rescheduleReason })}
               disabled={!proposedTime || rescheduleMutation.isPending}
            >
              {rescheduleMutation.isPending ? 'Submitting...' : 'Submit Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Offer Negotiation Modal */}
      <Dialog open={isOfferNegotiating} onOpenChange={setIsOfferNegotiating}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Counter-offer / Negotiate</DialogTitle>
            <DialogDescription>
              Propose adjustments to the offer below. You must provide reasoning for your requested numbers.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="neg-salary">Base Salary ({negotiatingOffer?.currency || 'USD'})</Label>
                <div className="relative">
                  <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
                  <Input id="neg-salary" type="number" className="pl-8" placeholder="100000" value={negSalary} onChange={e => setNegSalary(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="neg-bonus">Sign-On Bonus</Label>
                <div className="relative">
                  <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
                  <Input id="neg-bonus" type="number" className="pl-8" placeholder="5000" value={negBonus} onChange={e => setNegBonus(e.target.value)} />
                </div>
              </div>
            </div>
            {negotiatingOffer?.stock_options !== null && (
               <div className="space-y-2">
                 <Label htmlFor="neg-equity">Stock Options / Equity</Label>
                 <Input id="neg-equity" type="number" placeholder="Options count" value={negEquity} onChange={e => setNegEquity(e.target.value)} />
               </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="neg-reason">Justification & Comments</Label>
              <Textarea 
                id="neg-reason" 
                placeholder="Market rates, counter-offers, or other reasoning..."
                className="min-h-[100px]"
                value={negReason}
                onChange={e => setNegReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOfferNegotiating(false)}>Cancel</Button>
            <Button 
               className="bg-blue-600 hover:bg-blue-700 text-white"
               onClick={() => negotiatingOffer && negotiateOfferMutation.mutate({ offerId: negotiatingOffer.id, salary: negSalary, bonus: negBonus, equity: negEquity, reasoning: negReason })}
               disabled={!negotiatingOffer || !negReason || negotiateOfferMutation.isPending}
            >
              {negotiateOfferMutation.isPending ? 'Sending...' : 'Submit Counter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
