'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import clientApi from '@/lib/client-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Zap, Users, Mail, AlertTriangle, ChevronRight, Loader2, CheckCircle2, XCircle, ArrowRight, Settings2, SlidersHorizontal } from 'lucide-react';
import toast from 'react-hot-toast';

interface AdvancePreview {
  job_id: number;
  job_title: string;
  eligible_count: number;
  selected_count: number;
  rejected_count: number;
  emails_queued: number;
  skipped_count: number;
  unchanged_count: number;
  selected_candidates: {
    application_id: number;
    candidate_name: string;
    candidate_email: string;
    match_score: number;
    applied_at: string;
  }[];
  warnings: string[];
}

interface AdvanceResult {
  job_id: number;
  selected_count: number;
  rejected_count: number;
  emails_queued: number;
  skipped_count: number;
  unchanged_count: number;
  status: string;
}

interface Props {
  jobId: string;
  eligibleCount: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

type Step = 'configure' | 'preview' | 'result';
type Mode = 'top_n' | 'threshold';
type RejectMode = 'all_remaining' | 'below_threshold' | 'none';

export function AdvanceTopCandidatesDialog({ jobId, eligibleCount, open, onOpenChange, onSuccess }: Props) {
  const queryClient = useQueryClient();

  // State
  const [step, setStep] = useState<Step>('configure');
  const [mode, setMode] = useState<Mode>('top_n');
  const [topCount, setTopCount] = useState(5);
  const [interviewThreshold, setInterviewThreshold] = useState(75);
  
  const [rejectMode, setRejectMode] = useState<RejectMode>('all_remaining');
  const [rejectThreshold, setRejectThreshold] = useState(50);
  
  const [sendInterviewEmails, setSendInterviewEmails] = useState(true);
  const [sendRejectionEmails, setSendRejectionEmails] = useState(true);
  
  const [preview, setPreview] = useState<AdvancePreview | null>(null);
  const [result, setResult] = useState<AdvanceResult | null>(null);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setStep('configure');
      setTopCount(Math.min(5, eligibleCount));
      setInterviewThreshold(75);
      setRejectMode('all_remaining');
      setRejectThreshold(50);
      setSendInterviewEmails(true);
      setSendRejectionEmails(true);
      setPreview(null);
      setResult(null);
    }
  }, [open, eligibleCount]);

  const buildPayload = () => ({
    mode,
    top_count: topCount,
    interview_threshold: interviewThreshold,
    reject_mode: rejectMode,
    reject_threshold: rejectThreshold,
    ranking_basis: 'match_score',
    send_interview_emails: sendInterviewEmails,
    send_rejection_emails: sendRejectionEmails,
  });

  // Preview mutation
  const previewMutation = useMutation({
    mutationFn: (data: any) => clientApi.post(`/applications/job/${jobId}/advance-top-candidates/preview`, data),
    onSuccess: (data: any) => {
      setPreview(data as AdvancePreview);
      setStep('preview');
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Failed to generate preview');
    }
  });

  // Execute mutation
  const executeMutation = useMutation({
    mutationFn: (data: any) => clientApi.post(`/applications/job/${jobId}/advance-top-candidates`, data),
    onSuccess: (data: any) => {
      setResult(data as AdvanceResult);
      setStep('result');
      queryClient.invalidateQueries({ queryKey: ['applications', jobId] });
      toast.success('Batch decision executed!');
      onSuccess();
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Failed to execute batch decision');
    }
  });

  const handlePreview = () => {
    if (mode === 'top_n' && (topCount <= 0 || topCount > eligibleCount)) return;
    previewMutation.mutate(buildPayload());
  };

  const handleExecute = () => {
    executeMutation.mutate(buildPayload());
  };

  const presets = [5, 10, 20].filter(p => p <= eligibleCount);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        {/* ──────────── STEP 1: CONFIGURE ──────────── */}
        {step === 'configure' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <Zap className="w-5 h-5 text-amber-500" /> Advance Top Candidates
              </DialogTitle>
              <DialogDescription>
                Process the <strong>Applied</strong> pool ({eligibleCount} candidates) in one motion.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-2">
              {/* Decision Mode Toggle */}
              <div className="grid grid-cols-2 gap-3 p-1 bg-zinc-100 dark:bg-zinc-900 rounded-lg">
                <button
                  onClick={() => setMode('top_n')}
                  className={`flex items-center justify-center gap-2 py-2 text-sm font-semibold rounded-md transition-all ${
                    mode === 'top_n' ? 'bg-white dark:bg-zinc-800 shadow-sm text-zinc-900 dark:text-zinc-100' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                  }`}
                >
                  <Users className="w-4 h-4" /> Top N
                </button>
                <button
                  onClick={() => setMode('threshold')}
                  className={`flex items-center justify-center gap-2 py-2 text-sm font-semibold rounded-md transition-all ${
                    mode === 'threshold' ? 'bg-white dark:bg-zinc-800 shadow-sm text-zinc-900 dark:text-zinc-100' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                  }`}
                >
                  <SlidersHorizontal className="w-4 h-4" /> AI Score Threshold
                </button>
              </div>

              {/* Mode Specific Config */}
              {mode === 'top_n' ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Advance Top Candidates (by Match Score)</Label>
                    <div className="flex items-center gap-2">
                      {presets.map(p => (
                        <button
                          key={p}
                          onClick={() => setTopCount(p)}
                          className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all ${
                            topCount === p
                              ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                              : 'bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-blue-300'
                          }`}
                        >
                          Top {p}
                        </button>
                      ))}
                      <Input
                        type="number"
                        min={1}
                        max={eligibleCount}
                        value={topCount}
                        onChange={e => setTopCount(Math.max(1, Math.min(eligibleCount, parseInt(e.target.value) || 1)))}
                        className="w-24 text-center font-semibold"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-3 bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-lg border dark:border-zinc-800">
                    <Label className="text-sm font-semibold block mb-2">Rejection Handling</Label>
                    <RadioGroup value={rejectMode === 'all_remaining' ? 'reject' : 'keep'} onValueChange={v => setRejectMode(v === 'reject' ? 'all_remaining' : 'none')}>
                      <div className="flex items-start space-x-3">
                        <RadioGroupItem value="reject" id="tn-reject" className="mt-1" />
                        <div>
                          <Label htmlFor="tn-reject" className="font-medium cursor-pointer">Reject everyone else</Label>
                          <p className="text-xs text-zinc-500">Move all {Math.max(0, eligibleCount - topCount)} remaining candidates to Rejected status.</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3 mt-3">
                        <RadioGroupItem value="keep" id="tn-keep" className="mt-1" />
                        <div>
                          <Label htmlFor="tn-keep" className="font-medium cursor-pointer">Do not reject</Label>
                          <p className="text-xs text-zinc-500">Leave the remaining candidates in Applied status.</p>
                        </div>
                      </div>
                    </RadioGroup>
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Advance to Interview</Label>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-zinc-600 dark:text-zinc-400">Match score <strong className="text-emerald-600 dark:text-emerald-400">&ge; {interviewThreshold}%</strong></span>
                      <Input
                        type="number"
                        min={1}
                        max={100}
                        value={interviewThreshold}
                        onChange={e => setInterviewThreshold(parseInt(e.target.value) || 0)}
                        className="w-24 text-center font-semibold border-emerald-200 dark:border-emerald-800 focus-visible:ring-emerald-500"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-3 bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-lg border dark:border-zinc-800">
                    <Label className="text-sm font-semibold block mb-2">Rejection Handling</Label>
                    <RadioGroup value={rejectMode} onValueChange={v => setRejectMode(v as RejectMode)}>
                      <div className="flex items-start space-x-3">
                        <RadioGroupItem value="all_remaining" id="th-all" className="mt-1" />
                        <div>
                          <Label htmlFor="th-all" className="font-medium cursor-pointer">Reject everyone else</Label>
                          <p className="text-xs text-zinc-500">Reject all candidates scoring below {interviewThreshold}%.</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3 mt-4">
                        <RadioGroupItem value="below_threshold" id="th-below" className="mt-1" />
                        <div className="flex-1">
                          <Label htmlFor="th-below" className="font-medium cursor-pointer">Dual Threshold (Recommended)</Label>
                          <p className="text-xs text-zinc-500 mb-2">Reject only the weakest candidates and keep the middle band for manual review.</p>
                          {rejectMode === 'below_threshold' && (
                            <div className="flex items-center gap-3 mt-2 bg-white dark:bg-zinc-950 p-2 rounded border border-zinc-200 dark:border-zinc-800">
                              <span className="text-sm text-zinc-600 dark:text-zinc-400">Reject if score <strong className="text-red-600 dark:text-red-400">&lt; {rejectThreshold}%</strong></span>
                              <Input
                                type="number"
                                min={1}
                                max={interviewThreshold - 1}
                                value={rejectThreshold}
                                onChange={e => setRejectThreshold(parseInt(e.target.value) || 0)}
                                className="w-24 text-center font-semibold h-8"
                              />
                            </div>
                          )}
                          {rejectMode === 'below_threshold' && interviewThreshold > rejectThreshold && (
                            <p className="text-xs text-blue-600 mt-2 font-medium">
                              Candidates scoring between <strong>{rejectThreshold}% - {interviewThreshold - 1}%</strong> will remain untouched.
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-start space-x-3 mt-4">
                        <RadioGroupItem value="none" id="th-none" className="mt-1" />
                        <div>
                          <Label htmlFor="th-none" className="font-medium cursor-pointer">Do not reject</Label>
                          <p className="text-xs text-zinc-500">Only advance top candidates, leave everyone else untouched.</p>
                        </div>
                      </div>
                    </RadioGroup>
                  </div>
                </div>
              )}

              {/* Email Communications */}
              <div className="space-y-3 bg-blue-50/50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-100 dark:border-blue-900/50">
                <Label className="text-sm font-semibold flex items-center gap-1.5 mb-2 text-blue-800 dark:text-blue-300">
                  <Mail className="w-4 h-4" /> Email Dispatch
                </Label>
                
                <label className="flex items-center gap-3 cursor-pointer">
                  <Checkbox checked={sendInterviewEmails} onCheckedChange={(c) => setSendInterviewEmails(!!c)} />
                  <div>
                    <div className="text-sm font-medium">Send interview notifications</div>
                    <div className="text-xs text-zinc-500">Notify advanced candidates they're moving to the interview stage</div>
                  </div>
                </label>

                {rejectMode !== 'none' && (
                  <label className="flex items-center gap-3 cursor-pointer pt-2">
                    <Checkbox checked={sendRejectionEmails} onCheckedChange={(c) => setSendRejectionEmails(!!c)} />
                    <div>
                      <div className="text-sm font-medium">Send rejection emails</div>
                      <div className="text-xs text-zinc-500">Auto-send rejection notifications to rejected candidates</div>
                    </div>
                  </label>
                )}
              </div>
            </div>

            <DialogFooter className="mt-2 text-right">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button
                onClick={handlePreview}
                disabled={previewMutation.isPending || (mode === 'top_n' && topCount <= 0)}
                className="gap-2 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900"
              >
                {previewMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Settings2 className="w-4 h-4" />}
                {previewMutation.isPending ? 'Generating Preview...' : 'Preview Decision'}
              </Button>
            </DialogFooter>
          </>
        )}

        {/* ──────────── STEP 2: PREVIEW ──────────── */}
        {step === 'preview' && preview && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <Users className="w-5 h-5 text-blue-500" /> Review Batch Decision
              </DialogTitle>
              <DialogDescription>
                Confirm the following actions for <strong>{preview.job_title}</strong>.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Warnings */}
              {preview.warnings.length > 0 && (
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 space-y-1">
                  {preview.warnings.map((w, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-400">
                      <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>{w}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Summary cards */}
              <div className={`grid gap-3 ${preview.unchanged_count > 0 ? 'grid-cols-4' : 'grid-cols-3'}`}>
                <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 p-3 text-center">
                  <div className="text-xl sm:text-2xl font-black text-emerald-600">{preview.selected_count}</div>
                  <div className="text-xs font-medium text-emerald-700 dark:text-emerald-400">→ Interview</div>
                </div>
                <div className={`rounded-lg border p-3 text-center ${preview.rejected_count > 0 ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30' : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900'}`}>
                  <div className={`text-xl sm:text-2xl font-black ${preview.rejected_count > 0 ? 'text-red-600' : 'text-zinc-400'}`}>{preview.rejected_count}</div>
                  <div className={`text-xs font-medium ${preview.rejected_count > 0 ? 'text-red-700 dark:text-red-400' : 'text-zinc-500'}`}>→ Rejected</div>
                </div>
                {preview.unchanged_count > 0 && (
                  <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-3 text-center">
                    <div className="text-xl sm:text-2xl font-black text-amber-600">{preview.unchanged_count}</div>
                    <div className="text-xs font-medium text-amber-700 dark:text-amber-400">Untouched</div>
                  </div>
                )}
                <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 p-3 text-center">
                  <div className="text-xl sm:text-2xl font-black text-blue-600">{preview.emails_queued}</div>
                  <div className="text-xs font-medium text-blue-700 dark:text-blue-400">Emails</div>
                </div>
              </div>

              {/* Selected candidates list */}
              <div className="border dark:border-zinc-800 rounded-lg overflow-hidden max-h-52 overflow-y-auto">
                <div className="bg-zinc-100 dark:bg-zinc-900 px-4 py-2 text-xs font-bold uppercase tracking-wider text-zinc-500 sticky top-0 flex justify-between">
                  <span>Advancing to Interview ({preview.selected_count})</span>
                  {mode === 'threshold' && <span>Score &ge; {interviewThreshold}%</span>}
                </div>
                {preview.selected_candidates.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-center text-zinc-500">No candidates met the criteria.</div>
                ) : (
                  preview.selected_candidates.map((c, i) => (
                    <div key={c.application_id} className="flex items-center justify-between px-4 py-2.5 border-t dark:border-zinc-800 text-sm">
                      <div className="flex items-center gap-3">
                        <div className="h-7 w-7 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center text-emerald-700 dark:text-emerald-400 text-xs font-bold">
                          #{i + 1}
                        </div>
                        <div>
                          <div className="font-medium">{c.candidate_name}</div>
                          <div className="text-xs text-zinc-500">{c.candidate_email}</div>
                        </div>
                      </div>
                      <Badge variant="outline" className="font-bold">{c.match_score}%</Badge>
                    </div>
                  ))
                )}
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setStep('configure')}>← Back</Button>
              <Button
                onClick={handleExecute}
                disabled={executeMutation.isPending}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg"
              >
                {executeMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {executeMutation.isPending ? 'Executing...' : 'Confirm Batch Decision'}
              </Button>
            </DialogFooter>
          </>
        )}

        {/* ──────────── STEP 3: RESULT ──────────── */}
        {step === 'result' && result && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" /> Batch Decision Complete
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-6">
              <div className={`grid gap-3 ${result.unchanged_count > 0 ? 'grid-cols-4' : 'grid-cols-3'}`}>
                <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 p-4 text-center">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1" />
                  <div className="text-2xl font-black text-emerald-600">{result.selected_count}</div>
                  <div className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Moved to Interview</div>
                </div>
                <div className={`rounded-lg border p-4 text-center ${result.rejected_count > 0 ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30' : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900'}`}>
                  {result.rejected_count > 0 ? <XCircle className="w-6 h-6 text-red-500 mx-auto mb-1" /> : <div className="w-6 h-6 mx-auto mb-1 opacity-20" />}
                  <div className={`text-2xl font-black ${result.rejected_count > 0 ? 'text-red-600' : 'text-zinc-400'}`}>{result.rejected_count}</div>
                  <div className={`text-xs font-medium ${result.rejected_count > 0 ? 'text-red-700 dark:text-red-400' : 'text-zinc-500'}`}>Rejected</div>
                </div>
                {result.unchanged_count > 0 && (
                  <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4 text-center">
                    <div className="text-2xl font-black text-amber-600">{result.unchanged_count}</div>
                    <div className="text-xs font-medium text-amber-700 dark:text-amber-400">Unchanged</div>
                  </div>
                )}
                <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 p-4 text-center">
                  <Mail className="w-6 h-6 text-blue-500 mx-auto mb-1" />
                  <div className="text-2xl font-black text-blue-600">{result.emails_queued}</div>
                  <div className="text-xs font-medium text-blue-700 dark:text-blue-400">Emails Queued</div>
                </div>
              </div>

              <p className="text-sm text-zinc-500 text-center">
                The pipeline has been updated. Required emails are being dispatched in the background.
              </p>
            </div>

            <DialogFooter>
              <Button onClick={() => onOpenChange(false)} className="w-full gap-2">
                Done <ArrowRight className="w-4 h-4" />
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
