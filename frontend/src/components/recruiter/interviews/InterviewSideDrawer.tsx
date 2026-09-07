import React, { useState, useEffect, useRef } from 'react';
import { InterviewResponse } from '@/types/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, Calendar as CalendarIcon, Clock, Video, Phone, Users, MapPin, Sparkles, ClipboardCheck, XCircle, FileText, Loader2, UserRound, Briefcase, CalendarClock } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import axios from 'axios';

interface InterviewSideDrawerProps {
  interview: InterviewResponse | null;
  open: boolean;
  onClose: () => void;
  onMarkCompleted: (id: number, notes: string) => void;
  onCancel: (id: number) => void;
  onManualReschedule: (id: number, scheduled_at: string, notes?: string) => void;
  isMutating: boolean;
}

// Simple per-session cache for AI prep results
const aiPrepCache = new Map<number, string>();

export function InterviewSideDrawer({
  interview,
  open,
  onClose,
  onMarkCompleted,
  onCancel,
  onManualReschedule,
  isMutating
}: InterviewSideDrawerProps) {
  const [completeMode, setCompleteMode] = useState(false);
  const [completionNotes, setCompletionNotes] = useState('');

  const [rescheduleMode, setRescheduleMode] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleNotes, setRescheduleNotes] = useState('');
  
  const [aiQuestions, setAiQuestions] = useState('');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  // Reset state when interview changes, restore cached AI prep
  useEffect(() => {
    setCompleteMode(false);
    setCompletionNotes('');
    setRescheduleMode(false);
    setRescheduleDate('');
    setRescheduleNotes('');
    if (interview) {
      const cached = aiPrepCache.get(interview.id);
      setAiQuestions(cached || '');
    } else {
      setAiQuestions('');
    }
  }, [interview?.id]);

  if (!open || !interview) return null;

  const handleGenerateAi = async () => {
    setIsGeneratingAi(true);
    setAiQuestions('');
    try {
      const res = await axios.post('/api/ai/generate-questions', {
        jobTitle: interview.job_title,
        candidateName: interview.candidate_name,
      });
      if (res.data.content) {
         setAiQuestions(res.data.content);
         aiPrepCache.set(interview.id, res.data.content);
      }
    } catch (err) {
      console.error("AI Gen Failed:", err);
      setAiQuestions("Failed to generate questions. Please verify your AI service configuration.");
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleSubmitReschedule = () => {
    if (!rescheduleDate) return;
    onManualReschedule(interview.id, rescheduleDate, rescheduleNotes || undefined);
  };

  const getStatusColor = (status: string) => {
    switch(status?.toLowerCase()) {
      case 'scheduled': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'confirmed': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'rescheduled': return 'bg-violet-50 text-violet-700 border-violet-200';
      case 'completed': return 'bg-zinc-100 text-zinc-700 border-zinc-200';
      case 'cancelled': return 'bg-red-50 text-red-700 border-red-200';
      default: return 'bg-zinc-50 text-zinc-700 border-zinc-200';
    }
  };

  const isActive = !['completed', 'cancelled'].includes(interview.status);

  return (
    <>
      <div className={`absolute inset-0 bg-black/20 dark:bg-black/40 z-40 transition-opacity ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={onClose} />
      <div className={`absolute top-0 right-0 h-full w-full sm:w-[500px] bg-white dark:bg-zinc-950 shadow-2xl z-50 border-l border-zinc-200 dark:border-zinc-800 flex flex-col transform transition-transform duration-300 ease-in-out ${open ? 'translate-x-0' : 'translate-x-[100%]'}`}>
        
        {/* Header */}
        <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex items-start justify-between bg-zinc-50/50 dark:bg-zinc-900/50 shrink-0">
          <div>
            <Badge variant="outline" className={`mb-2 capitalize border ${getStatusColor(interview.status)}`}>
               {interview.status.replace('_', ' ')}
            </Badge>
            <h2 className="text-2xl font-bold flex items-center gap-2">
               <UserRound className="w-5 h-5 text-zinc-400" />
               {interview.candidate_name}
            </h2>
            <p className="text-zinc-500 font-medium flex items-center gap-1.5 mt-1">
               <Briefcase className="w-4 h-4" /> {interview.job_title}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <ScrollArea className="flex-1 p-6">
           <div className="space-y-8">

              {/* ── Summary Section ── */}
              <section>
                 <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-4 border-b border-zinc-100 dark:border-zinc-800 pb-2">Logistics</h3>
                 
                 <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-zinc-50 dark:bg-zinc-800/30 p-3 rounded-lg border border-zinc-100 dark:border-zinc-800 flex flex-col">
                       <span className="text-xs text-zinc-500 flex items-center gap-1.5 mb-1"><CalendarIcon className="w-3.5 h-3.5" /> Date & Time</span>
                       <span className="font-semibold text-sm">
                         {new Date(interview.scheduled_at).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric'})}
                       </span>
                       <span className="text-sm font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                         {new Date(interview.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({interview.duration_minutes}m)
                       </span>
                    </div>

                    <div className="bg-zinc-50 dark:bg-zinc-800/30 p-3 rounded-lg border border-zinc-100 dark:border-zinc-800 flex flex-col">
                       <span className="text-xs text-zinc-500 flex items-center gap-1.5 mb-1">
                         {interview.interview_type === 'video' ? <Video className="w-3.5 h-3.5" /> : interview.interview_type === 'phone' ? <Phone className="w-3.5 h-3.5" /> : <Users className="w-3.5 h-3.5" />}
                         Format
                       </span>
                       <span className="font-semibold text-sm capitalize">{interview.interview_type.replace('_', ' ')}</span>
                       {interview.meeting_link && (
                          <a href={interview.meeting_link} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline mt-1 truncate block">Open Link &rarr;</a>
                       )}
                    </div>
                 </div>

                 {interview.location && (
                    <div className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300 mb-3">
                       <MapPin className="w-4 h-4 mt-0.5 text-zinc-400 shrink-0" />
                       <p><span className="font-semibold">Location:</span> {interview.location}</p>
                    </div>
                 )}
                 {interview.notes && (
                    <div className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                       <FileText className="w-4 h-4 mt-0.5 text-zinc-400 shrink-0" />
                       <p className="italic whitespace-pre-wrap">{interview.notes}</p>
                    </div>
                 )}
              </section>

              {/* ── Completion Inline Form ── */}
              {completeMode && (
                 <section className="bg-zinc-50 dark:bg-zinc-900 p-4 rounded-xl border border-blue-200 dark:border-blue-800 animate-in slide-in-from-top-2">
                    <h3 className="text-sm font-bold flex items-center gap-2 mb-3 text-zinc-900 dark:text-zinc-100">
                       <ClipboardCheck className="w-4 h-4 text-blue-500" /> Complete Interview
                    </h3>
                    <Textarea 
                       placeholder="Log post-interview feedback, strengths, and weaknesses..."
                       value={completionNotes}
                       onChange={(e) => setCompletionNotes(e.target.value)}
                       className="mb-3 resize-none h-24 bg-white dark:bg-zinc-950"
                    />
                    <div className="flex justify-end gap-2">
                       <Button variant="ghost" size="sm" onClick={() => setCompleteMode(false)}>Cancel</Button>
                       <Button 
                         size="sm" 
                         className="bg-blue-600 hover:bg-blue-700 text-white" 
                         disabled={isMutating}
                         onClick={() => onMarkCompleted(interview.id, completionNotes)}
                       >
                         {isMutating ? 'Saving...' : 'Save Feedback'}
                       </Button>
                    </div>
                 </section>
              )}

              {/* ── Reschedule Inline Form ── */}
              {rescheduleMode && (
                 <section className="bg-zinc-50 dark:bg-zinc-900 p-4 rounded-xl border border-violet-200 dark:border-violet-800 animate-in slide-in-from-top-2">
                    <h3 className="text-sm font-bold flex items-center gap-2 mb-3 text-zinc-900 dark:text-zinc-100">
                       <CalendarClock className="w-4 h-4 text-violet-500" /> Reschedule Interview
                    </h3>
                    <div className="space-y-3 mb-3">
                       <div>
                          <Label htmlFor="reschedule-datetime" className="text-xs text-zinc-500">New Date & Time</Label>
                          <Input 
                            id="reschedule-datetime"
                            type="datetime-local" 
                            value={rescheduleDate} 
                            onChange={(e) => setRescheduleDate(e.target.value)} 
                            className="bg-white dark:bg-zinc-950"
                          />
                       </div>
                       <div>
                          <Label htmlFor="reschedule-notes" className="text-xs text-zinc-500">Notes (optional)</Label>
                          <Textarea 
                            id="reschedule-notes"
                            placeholder="Reason for rescheduling..."
                            value={rescheduleNotes}
                            onChange={(e) => setRescheduleNotes(e.target.value)}
                            className="resize-none h-16 bg-white dark:bg-zinc-950"
                          />
                       </div>
                    </div>
                    <div className="flex justify-end gap-2">
                       <Button variant="ghost" size="sm" onClick={() => setRescheduleMode(false)}>Cancel</Button>
                       <Button 
                         size="sm" 
                         className="bg-violet-600 hover:bg-violet-700 text-white" 
                         disabled={isMutating || !rescheduleDate}
                         onClick={handleSubmitReschedule}
                       >
                         {isMutating ? 'Rescheduling...' : 'Confirm Reschedule'}
                       </Button>
                    </div>
                 </section>
              )}

              {/* ── AI Prep Section ── */}
              <section className="bg-gradient-to-br from-violet-50 to-fuchsia-50 dark:from-violet-900/10 dark:to-fuchsia-900/10 rounded-xl border border-violet-100 dark:border-violet-500/20 p-1">
                 <div className="p-3 flex items-center justify-between border-b border-violet-200/50 dark:border-violet-500/20">
                    <h3 className="text-sm font-bold text-violet-900 dark:text-violet-300 flex items-center gap-2">
                       <Sparkles className="w-4 h-4 text-violet-500" /> AI Prep Copilot
                    </h3>
                    {aiQuestions && !isGeneratingAi && (
                       <Button variant="ghost" size="sm" className="h-6 text-xs text-violet-600 px-2" onClick={handleGenerateAi}>Regenerate</Button>
                    )}
                 </div>

                 <div className="p-4">
                    {!aiQuestions && !isGeneratingAi ? (
                       <div className="text-center py-6">
                          <p className="text-xs text-violet-600/70 dark:text-violet-400/70 mb-4 max-w-[250px] mx-auto">
                            Instantly generate a tailored technical and behavioral question bank for {interview.job_title}.
                          </p>
                          <Button size="sm" onClick={handleGenerateAi} className="bg-violet-600 hover:bg-violet-700 text-white w-full shadow-sm">
                             Generate Questions
                          </Button>
                       </div>
                    ) : isGeneratingAi ? (
                       <div className="flex flex-col items-center justify-center py-8 text-center text-violet-600">
                          <Loader2 className="w-6 h-6 animate-spin mb-2" />
                          <p className="text-xs font-semibold animate-pulse">Llama 3.3 is thinking...</p>
                       </div>
                    ) : (
                       <div className="prose prose-sm dark:prose-invert prose-violet max-w-none text-sm text-zinc-700 dark:text-zinc-300">
                          <ReactMarkdown>{aiQuestions}</ReactMarkdown>
                       </div>
                    )}
                 </div>
              </section>

           </div>
        </ScrollArea>

        {/* Footer Actions */}
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex justify-between shrink-0">
           {isActive ? (
              <>
                <div className="flex gap-2">
                   <Button 
                      variant="outline" 
                      size="sm"
                      className="text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-900/30 dark:hover:bg-red-900/10"
                      disabled={isMutating}
                      onClick={() => onCancel(interview.id)}
                   >
                      <XCircle className="w-4 h-4 mr-1.5" /> Cancel
                   </Button>
                   {!rescheduleMode && !completeMode && (
                      <Button 
                         variant="outline" 
                         size="sm"
                         className="text-violet-600 border-violet-200 hover:bg-violet-50 dark:text-violet-400 dark:border-violet-900/30 dark:hover:bg-violet-900/10"
                         disabled={isMutating}
                         onClick={() => { setRescheduleMode(true); setCompleteMode(false); }}
                      >
                         <CalendarClock className="w-4 h-4 mr-1.5" /> Reschedule
                      </Button>
                   )}
                </div>
                
                {!completeMode && !rescheduleMode && (
                   <Button 
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                      disabled={isMutating}
                      onClick={() => { setCompleteMode(true); setRescheduleMode(false); }}
                   >
                      <ClipboardCheck className="w-4 h-4 mr-1.5" /> Mark Completed
                   </Button>
                )}
              </>
           ) : (
              <Button className="w-full" variant="secondary" onClick={onClose}>Close panel</Button>
           )}
        </div>
        
      </div>
    </>
  );
}
