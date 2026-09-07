import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, MoreHorizontal, Mail, CircleUserRound, Sparkles, ArrowUpRight, CheckCircle2, CalendarPlus } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import type { ApplicationResponse } from '@/types/api';

export const PIPELINE_STAGES = [
  { id: 'applied', label: 'New Applied', color: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800' },
  { id: 'screening', label: 'Screening', color: 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400', border: 'border-indigo-200 dark:border-indigo-800' },
  { id: 'interview', label: 'Interviewing', color: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400', border: 'border-purple-200 dark:border-purple-800' },
  { id: 'offer', label: 'Offer Stage', color: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800' },
  { id: 'hired', label: 'Hired', color: 'bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-400', border: 'border-teal-200 dark:border-teal-800' },
  { id: 'rejected', label: 'Rejected', color: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400', border: 'border-red-200 dark:border-red-800' },
];

export const getScoreColor = (score: number | null | undefined) => {
  if (!score) return 'text-zinc-400';
  if (score >= 80) return 'text-emerald-600 dark:text-emerald-400';
  if (score >= 60) return 'text-amber-500 dark:text-amber-400';
  return 'text-orange-500 dark:text-orange-400';
};

interface PipelineKanbanViewProps {
  applications: ApplicationResponse[];
  highlightCandidateId: string | null;
  onStatusChange: (appId: number, status: string) => void;
  onScheduleInterview: (app: ApplicationResponse) => void;
  isStatusUpdating: boolean;
}

export function PipelineKanbanView({ 
  applications, 
  highlightCandidateId, 
  onStatusChange, 
  onScheduleInterview,
  isStatusUpdating 
}: PipelineKanbanViewProps) {
  return (
    <div className="flex-1 overflow-x-auto overflow-y-hidden px-8 py-6">
      <div className="flex gap-6 h-full items-start min-w-max pb-2">
        {PIPELINE_STAGES.map(stage => {
          const columnApps = applications.filter(app => (app.status || 'applied').toLowerCase() === stage.id);
          
          return (
            <div key={stage.id} className="w-[340px] flex flex-col h-full bg-zinc-100/50 dark:bg-zinc-900/20 rounded-xl border border-zinc-200/60 dark:border-zinc-800/60">
              {/* Column Header */}
              <div className={`p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between rounded-t-xl`}>
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${stage.color.split(' ')[0]}`} />
                  <h3 className="font-bold text-sm tracking-wide text-zinc-700 dark:text-zinc-300">{stage.label}</h3>
                </div>
                <Badge variant="secondary" className="bg-white dark:bg-zinc-800 text-xs px-2 py-0 border-zinc-200 dark:border-zinc-700 shadow-sm">
                  {columnApps.length}
                </Badge>
              </div>

              {/* Column Cards Container - Scrollable */}
              <ScrollArea className="flex-1 p-3">
                <div className="flex flex-col gap-3 pb-8">
                  {columnApps.map(app => (
                    <Card 
                      key={app.id} 
                      className={`p-4 hover:shadow-md transition-all duration-200 border cursor-grab active:cursor-grabbing group relative ${
                        highlightCandidateId == app.id.toString() 
                          ? 'ring-2 ring-blue-500 border-blue-500 shadow-blue-100 dark:shadow-blue-900' 
                          : 'border-zinc-200 dark:border-zinc-800 hover:border-blue-300 dark:hover:border-blue-700'
                      }`}
                    >
                      {/* Top Tier Ribbon */}
                      {app.match_score != null && app.match_score >= 80 && (
                        <div className="absolute top-0 right-0 bg-blue-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-bl-lg rounded-tr-xl flex items-center gap-1 shadow-sm">
                          <Sparkles className="w-2.5 h-2.5" /> TOP MATCH
                        </div>
                      )}

                      <div className="flex gap-3 mb-3">
                        <div className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-900 border border-zinc-300 dark:border-zinc-700 flex items-center justify-center text-zinc-600 dark:text-zinc-400 font-bold shadow-inner">
                          {app.candidate_name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div className="flex-1 min-w-0 pr-6">
                          <h4 className="font-semibold text-[15px] truncate text-zinc-900 dark:text-zinc-100 leading-tight mb-1">
                            {app.candidate_name}
                          </h4>
                          <p className="text-xs text-zinc-500 truncate" title={app.candidate_email}>
                            {app.candidate_email}
                          </p>
                        </div>

                        {/* Action Menu */}
                        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                          <DropdownMenu>
                            <DropdownMenuTrigger className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 h-7 w-7 bg-white dark:bg-zinc-900 shadow-sm border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-50">
                              <MoreHorizontal className="w-4 h-4" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <div className="px-2 py-1.5 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Move Stage</div>
                              {PIPELINE_STAGES.map(s => (
                                <DropdownMenuItem 
                                  key={s.id}
                                  disabled={s.id === app.status?.toLowerCase() || isStatusUpdating}
                                  onClick={() => onStatusChange(app.id, s.id)}
                                  className="cursor-pointer text-sm"
                                >
                                  <div className={`w-2 h-2 rounded-full mr-2 ${s.color.split(' ')[0]}`} />
                                  Move to {s.label}
                                </DropdownMenuItem>
                              ))}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-violet-600 font-medium cursor-pointer" onClick={() => onScheduleInterview(app)}>
                                <CalendarPlus className="w-4 h-4 mr-2" /> Schedule Interview
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-blue-600 cursor-pointer" onClick={() => window.location.href=`mailto:${app.candidate_email}`}>
                                <Mail className="w-4 h-4 mr-2" /> Email Candidate
                              </DropdownMenuItem>
                              {app.resume_path && (
                                <DropdownMenuItem className="cursor-pointer" onClick={() => window.open(`http://127.0.0.1:8000/api/proxy/resume/${app.resume_path}`, '_blank')}>
                                  <ArrowUpRight className="w-4 h-4 mr-2" /> View Resume
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      {/* Scores Grid */}
                      <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-lg p-2.5 mb-3 border border-zinc-100 dark:border-zinc-800/80">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Global AI Match</span>
                          <span className={`text-sm font-black ${getScoreColor(app.match_score)}`}>
                            {app.match_score ? `${Math.round(app.match_score)}%` : 'Analysing'}
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${(app.match_score ?? 0) >= 80 ? 'bg-emerald-500' : (app.match_score ?? 0) >= 60 ? 'bg-amber-500' : 'bg-orange-500'}`} 
                            style={{ width: `${app.match_score || 0}%` }} 
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mt-auto">
                         {app.resume_path ? (
                           <Button 
                             variant="outline" 
                             size="sm" 
                             className="w-full text-xs h-7 gap-1.5 text-zinc-600 dark:text-zinc-300"
                             onClick={() => window.open(`http://127.0.0.1:8000/api/proxy/resume/${app.resume_path}`, '_blank')}
                           >
                              <FileText className="w-3 h-3" /> Resume
                           </Button>
                         ) : (
                           <Badge variant="secondary" className="w-full justify-center opacity-50 py-1 text-[10px]">No Resume</Badge>
                         )}
                         
                         {app.status === 'offer' && (
                            <Button 
                              variant="secondary" 
                              size="sm" 
                              className="w-full text-xs h-7 gap-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                            >
                              Offer Sent <CheckCircle2 className="w-3 h-3" />
                            </Button>
                         )}
                      </div>
                    </Card>
                  ))}
                  
                  {columnApps.length === 0 && (
                    <div className="py-10 text-center flex flex-col items-center justify-center">
                      <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-800/50 flex items-center justify-center mb-2">
                        <CircleUserRound className="w-5 h-5 text-zinc-400" />
                      </div>
                      <p className="text-xs font-medium text-zinc-400">No candidates</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          );
        })}
      </div>
    </div>
  );
}
