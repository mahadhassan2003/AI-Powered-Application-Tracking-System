import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ApplicationResponse } from '@/types/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getScoreColor, PIPELINE_STAGES } from './PipelineKanbanView';
import { ArrowUpDown, Mail, CalendarPlus, CheckSquare, Square, X, MoreHorizontal, Sparkles, Filter, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import clientApi from '@/lib/client-api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import toast from 'react-hot-toast';

interface PipelineTableViewProps {
  applications: ApplicationResponse[];
  highlightCandidateId: string | null;
  onStatusChange: (appId: number, status: string) => void;
  onScheduleInterview: (app: ApplicationResponse) => void;
  isStatusUpdating: boolean;
  jobId: string;
}

export function PipelineTableView({ 
  applications, 
  highlightCandidateId, 
  onStatusChange, 
  onScheduleInterview, 
  isStatusUpdating,
  jobId
}: PipelineTableViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  
  const quickFilter = searchParams.get('filter');
  const sortKey = searchParams.get('sortKey') || 'match_score';
  const sortDirection = (searchParams.get('sortDir') as 'asc' | 'desc') || 'desc';

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const [drawerApp, setDrawerApp] = useState<ApplicationResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ApplicationResponse | null>(null);
  
  const queryClient = useQueryClient();
  const tableContainerRef = useRef<HTMLDivElement>(null);

  const deleteMutation = useMutation({
    mutationFn: (applicationId: number) => clientApi.delete(`/applications/${applicationId}`),
    onSuccess: () => {
      toast.success('Application deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['applications', jobId] });
      setDeleteTarget(null);
      setDrawerApp(null);
    },
    onError: () => {
      toast.error('Failed to delete application');
    },
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: ({ ids, status }: { ids: number[], status: string }) => 
      clientApi.patch(`/applications/bulk-update`, { ids, status }),
    onMutate: async ({ ids, status }) => {
      await queryClient.cancelQueries({ queryKey: ['applications', jobId] });
      const previousApps = queryClient.getQueryData<ApplicationResponse[]>(['applications', jobId]);
      
      queryClient.setQueryData(['applications', jobId], (old: ApplicationResponse[] | undefined) => {
        if (!old) return old;
        return old.map(app => ids.includes(app.id) ? { ...app, status } : app);
      });
      
      setSelectedIds(new Set());
      setFocusedIndex(-1);
      return { previousApps };
    },
    onError: (err, variables, context) => {
      if (context?.previousApps) {
        queryClient.setQueryData(['applications', jobId], context.previousApps);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['applications', jobId] });
    }
  });

  const setQuickFilter = (filter: string | null) => {
    const params = new URLSearchParams(searchParams);
    if (filter) params.set('filter', filter);
    else params.delete('filter');
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const setSortConfig = (key: string, direction: 'asc' | 'desc') => {
    const params = new URLSearchParams(searchParams);
    params.set('sortKey', key);
    params.set('sortDir', direction);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredApplications.length && filteredApplications.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredApplications.map(a => a.id)));
    }
  };

  const toggleSelect = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortKey === key && sortDirection === 'asc') direction = 'desc';
    setSortConfig(key, direction);
  };

  const filteredApplications = useMemo(() => {
    let result = [...applications];
    if (quickFilter === 'top_10') {
      result.sort((a, b) => (b.match_score || 0) - (a.match_score || 0));
      result = result.slice(0, 10);
    } else if (quickFilter === 'interview') {
      result = result.filter(a => a.status === 'screening' || a.status === 'interview');
    } else if (quickFilter === 'review') {
      result = result.filter(a => (a.match_score || 0) < 60 && a.status === 'applied');
    }

    result.sort((a, b) => {
      let aVal: any = a[sortKey as keyof ApplicationResponse];
      let bVal: any = b[sortKey as keyof ApplicationResponse];

      if (sortKey === 'stage') {
        aVal = PIPELINE_STAGES.findIndex(s => s.id === a.status);
        bVal = PIPELINE_STAGES.findIndex(s => s.id === b.status);
      } else if (sortKey === 'candidate_name') {
        aVal = a.candidate_name?.toLowerCase();
        bVal = b.candidate_name?.toLowerCase();
      } else if (sortKey === 'applied_at') {
        aVal = new Date(a.applied_at).getTime();
        bVal = new Date(b.applied_at).getTime();
      }

      if (aVal === bVal) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      
      const comparison = aVal < bVal ? -1 : 1;
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [applications, quickFilter, sortKey, sortDirection]);

  // Keyboard navigation targeted to the container
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (drawerApp) {
      if (e.key === 'Escape') setDrawerApp(null);
      return;
    }
    
    if (filteredApplications.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex(prev => Math.min(prev + 1, filteredApplications.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === ' ') {
      if (focusedIndex >= 0 && focusedIndex < filteredApplications.length) {
        e.preventDefault(); // prevents page scroll
        toggleSelect(filteredApplications[focusedIndex].id);
      }
    } else if (e.key === 'Enter') {
      if (focusedIndex >= 0 && focusedIndex < filteredApplications.length) {
        e.preventDefault();
        setDrawerApp(filteredApplications[focusedIndex]);
      }
    }
  };

  const bulkStatusUpdate = (statusId: string) => {
    bulkUpdateMutation.mutate({ ids: Array.from(selectedIds), status: statusId });
  };

  return (
    <div className="flex flex-col h-full bg-zinc-50 dark:bg-zinc-950 relative">
      {/* Quick Filters */}
      <div className="px-8 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex gap-2 overflow-x-auto min-h-[64px]">
        <Button 
          variant={quickFilter === 'top_10' ? 'default' : 'outline'} 
          size="sm" 
          className="gap-2"
          onClick={() => setQuickFilter(quickFilter === 'top_10' ? null : 'top_10')}
        >
          <Sparkles className="w-4 h-4 text-amber-500" /> Top 10 by Match Score
        </Button>
        <Button 
          variant={quickFilter === 'interview' ? 'default' : 'outline'} 
          size="sm" 
          onClick={() => setQuickFilter(quickFilter === 'interview' ? null : 'interview')}
        >
          Ready for Interview
        </Button>
        <Button 
          variant={quickFilter === 'review' ? 'default' : 'outline'} 
          size="sm" 
          onClick={() => setQuickFilter(quickFilter === 'review' ? null : 'review')}
        >
          Needs Review
        </Button>
        {quickFilter && (
          <Button variant="ghost" size="sm" onClick={() => setQuickFilter(null)} className="text-zinc-500 hover:text-zinc-900 ml-auto flex items-center">
            <X className="w-4 h-4 mr-1" /> Clear Filters
          </Button>
        )}
      </div>

      {/* Table Container */}
      <div 
        ref={tableContainerRef}
        className="flex-1 overflow-auto w-full relative outline-none focus-within:ring-1 focus-within:ring-inset focus-within:ring-blue-500/20" 
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        <table className="w-full text-sm text-left whitespace-nowrap outline-none">
          <thead className="sticky top-0 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 font-medium z-10 shadow-sm">
            <tr>
              <th className="px-4 py-3 w-12 text-center">
                <button onClick={toggleSelectAll} className="hover:text-blue-500 focus:outline-none">
                  {selectedIds.size > 0 && selectedIds.size === filteredApplications.length ? (
                    <CheckSquare className="w-4 h-4 text-blue-600" />
                  ) : selectedIds.size > 0 ? (
                    <CheckSquare className="w-4 h-4 text-blue-400 opacity-50" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                </button>
              </th>
              <th className="px-4 py-3 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors group" onClick={() => handleSort('candidate_name')}>
                <div className="flex items-center gap-1.5">Candidate {sortKey === 'candidate_name' && <ArrowUpDown className="w-3.5 h-3.5 text-blue-500" />}</div>
              </th>
              <th className="px-4 py-3 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors" onClick={() => handleSort('match_score')}>
                <div className="flex items-center gap-1.5">Match Score {sortKey === 'match_score' && <ArrowUpDown className="w-3.5 h-3.5 text-blue-500" />}</div>
              </th>
              <th className="px-4 py-3 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors" onClick={() => handleSort('stage')}>
                <div className="flex items-center gap-1.5">Stage {sortKey === 'stage' && <ArrowUpDown className="w-3.5 h-3.5 text-blue-500" />}</div>
              </th>
              <th className="px-4 py-3 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors" onClick={() => handleSort('applied_at')}>
                <div className="flex items-center gap-1.5">Date Applied {sortKey === 'applied_at' && <ArrowUpDown className="w-3.5 h-3.5 text-blue-500" />}</div>
              </th>
              <th className="px-4 py-3 text-right">Row Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50 bg-white dark:bg-zinc-950">
            {filteredApplications.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-12 py-24 text-center">
                  <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                    <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800/50 rounded-full flex items-center justify-center mb-4 border border-zinc-200 dark:border-zinc-700/50">
                      <Filter className="w-8 h-8 text-zinc-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-1">No Candidates Found</h3>
                    <p className="text-sm text-zinc-500 text-center mb-4">
                      {quickFilter 
                        ? `There are no candidates matching the "${quickFilter.replace('_', ' ')}" criteria.` 
                        : "There are no applications matching your current view."}
                    </p>
                    {quickFilter && (
                      <Button variant="outline" onClick={() => setQuickFilter(null)}>
                        Clear Filters
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ) : null}
            {filteredApplications.map((app, index) => {
              const isSelected = selectedIds.has(app.id);
              const isFocused = focusedIndex === index;
              const stageConfig = PIPELINE_STAGES.find(s => s.id === app.status) || PIPELINE_STAGES[0];
              
              return (
                <tr 
                  key={app.id} 
                  className={`transition-all duration-150 group cursor-pointer ${
                    isSelected ? 'bg-blue-50/50 dark:bg-blue-900/10' : 'hover:bg-zinc-50/80 dark:hover:bg-zinc-900/50'
                  } ${isFocused ? 'ring-2 ring-inset ring-blue-500 shadow-[inset_4px_0_0_0_#3b82f6] bg-blue-50/30' : ''}`}
                  onClick={() => { setFocusedIndex(index); setDrawerApp(app); }}
                >
                  <td className="px-4 py-3 text-center" onClick={(e) => { e.stopPropagation(); toggleSelect(app.id); setFocusedIndex(index); }}>
                    <button className="focus:outline-none flex items-center justify-center w-full" tabIndex={-1}>
                      {isSelected ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4 text-zinc-300 dark:text-zinc-700 group-hover:text-zinc-400" />}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                        {app.candidate_name}
                      </div>
                      <div className="text-zinc-500 text-xs hidden sm:block">{app.candidate_email}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`font-bold ${getScoreColor(app.match_score)}`}>
                      {app.match_score ? `${Math.round(app.match_score)}%` : 'Analysing'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={`border ${stageConfig.color} ${stageConfig.border}`}>
                      {stageConfig.label}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400 text-xs shadow-none border-none outline-none">
                    {new Date(app.applied_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger className="opacity-0 group-hover:opacity-100 focus:opacity-100 inline-flex items-center justify-center rounded-md transition-colors h-7 w-7 bg-white dark:bg-zinc-900 shadow-sm border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 hover:text-zinc-900">
                        <MoreHorizontal className="w-4 h-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <div className="px-2 py-1.5 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Quick Actions</div>
                        <DropdownMenuItem onClick={() => onStatusChange(app.id, 'screening')} disabled={app.status === 'screening' || isStatusUpdating}>Move to Screening</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onScheduleInterview(app)} className="text-violet-600"><CalendarPlus className="w-4 h-4 mr-2" /> Schedule Interview</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onStatusChange(app.id, 'offer')} disabled={app.status === 'offer' || isStatusUpdating}>Move to Offer</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onStatusChange(app.id, 'rejected')} className="text-red-600" disabled={app.status === 'rejected' || isStatusUpdating}>Reject Candidate</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setDeleteTarget(app)} className="text-red-600"><Trash2 className="w-4 h-4 mr-2" />Delete Application</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Floating Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-6 py-3 rounded-full shadow-2xl flex items-center gap-2 z-50 animate-in slide-in-from-bottom-5 duration-300">
          <Badge className="bg-zinc-800 dark:bg-zinc-200 text-white dark:text-zinc-900 hover:bg-zinc-800 px-2 py-0.5 border-none">
            {selectedIds.size} Selected
          </Badge>
          
          <button onClick={() => setSelectedIds(new Set())} className="text-zinc-400 hover:text-white dark:hover:text-black flex items-center text-xs ml-1 mr-3 transition-colors">
            <X className="w-3 h-3 mr-1" /> Clear
          </button>
          
          <div className="h-4 w-px bg-zinc-700 dark:bg-zinc-300 mx-2"></div>
          
          <DropdownMenu>
            <DropdownMenuTrigger 
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 h-8 px-3"
              disabled={bulkUpdateMutation.isPending}
            >
              Move Stages
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-48">
              {PIPELINE_STAGES.map(s => (
                <DropdownMenuItem key={s.id} onClick={() => bulkStatusUpdate(s.id)}>
                  {s.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button 
            size="sm" 
            variant="ghost" 
            className="text-red-400 hover:text-red-300 hover:bg-red-900/30 h-8 disabled:opacity-50" 
            onClick={() => bulkStatusUpdate('rejected')}
            disabled={bulkUpdateMutation.isPending}
          >
            Reject All
          </Button>
        </div>
      )}

      {/* Right Side Drawer Preview */}
      {drawerApp && (
        <>
          <div className="absolute inset-0 bg-black/20 dark:bg-black/40 z-40" onClick={() => setDrawerApp(null)} />
          <div className="absolute top-0 right-0 h-full w-full max-w-md bg-white dark:bg-zinc-900 shadow-2xl z-50 border-l border-zinc-200 dark:border-zinc-800 flex flex-col transform transition-transform animate-in slide-in-from-right">
            <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold">{drawerApp.candidate_name}</h2>
                <p className="text-zinc-500">{drawerApp.candidate_email}</p>
              </div>
              <button onClick={() => setDrawerApp(null)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 flex-1 overflow-y-auto space-y-6">
              <div>
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Current Status</h3>
                <Badge variant="secondary" className="text-sm px-3 py-1 bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700">{drawerApp.status}</Badge>
              </div>
              <div>
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Match Analysis</h3>
                <div className="text-4xl font-black text-blue-600">{drawerApp.match_score ? `${Math.round(drawerApp.match_score)}%` : 'N/A'}</div>
                <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                  <div className="bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-lg border border-zinc-100 dark:border-zinc-800/80">
                    <span className="block text-zinc-500 mb-1">Skills</span>
                    <span className="font-semibold text-lg">{Math.round(drawerApp.skill_match_score || 0)}%</span>
                  </div>
                  <div className="bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-lg border border-zinc-100 dark:border-zinc-800/80">
                    <span className="block text-zinc-500 mb-1">Experience</span>
                    <span className="font-semibold text-lg">{Math.round(drawerApp.experience_match_score || 0)}%</span>
                  </div>
                </div>
              </div>
              <div className="pt-4 flex flex-col gap-2">
                <Button className="w-full" variant="outline" onClick={() => onScheduleInterview(drawerApp)}>
                  <CalendarPlus className="w-4 h-4 mr-2" /> Schedule Interview
                </Button>
                {drawerApp.resume_path && (
                  <Button className="w-full" variant="outline" onClick={() => window.open(`http://127.0.0.1:8000/api/proxy/resume/${drawerApp.resume_path}`, '_blank')}>
                    View Original Resume
                  </Button>
                )}
                <Button className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20" variant="outline" onClick={() => setDeleteTarget(drawerApp)}>
                  <Trash2 className="w-4 h-4 mr-2" /> Delete Application
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Application</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete the application from{' '}
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">{deleteTarget?.candidate_name}</span>?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleteMutation.isPending}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete Application'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
