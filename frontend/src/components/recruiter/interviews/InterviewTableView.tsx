import React, { useRef, useMemo, useState } from 'react';
import { InterviewResponse } from '@/types/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckSquare, Square, ArrowUpDown, ArrowUp, ArrowDown, Filter, Video, Phone, Users, Eye, XCircle, ClipboardCheck, CalendarIcon } from 'lucide-react';

interface InterviewTableViewProps {
  interviews: InterviewResponse[];
  selectedIds: Set<number>;
  focusedIndex: number;
  onToggleSelect: (id: number) => void;
  onSelectAll: (ids: number[]) => void;
  onFocusChange: (idx: number) => void;
  onOpen: (interview: InterviewResponse) => void;
  sortKey: string;
  sortDirection: 'asc' | 'desc';
  onSortChange: (key: string) => void;
}

export function InterviewTableView({
  interviews,
  selectedIds,
  focusedIndex,
  onToggleSelect,
  onSelectAll,
  onFocusChange,
  onOpen,
  sortKey,
  sortDirection,
  onSortChange
}: InterviewTableViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Filters ──
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');

  // ── Filter logic ──
  const filteredInterviews = useMemo(() => {
    let result = interviews;
    if (filterStatus !== 'all') {
      result = result.filter(i => i.status === filterStatus);
    }
    if (filterType !== 'all') {
      result = result.filter(i => i.interview_type === filterType);
    }
    return result;
  }, [interviews, filterStatus, filterType]);

  // ── Sort logic ──
  const sortedInterviews = useMemo(() => {
    const sorted = [...filteredInterviews];
    sorted.sort((a, b) => {
      let aVal: string | number = '';
      let bVal: string | number = '';

      switch (sortKey) {
        case 'scheduled_at':
          aVal = new Date(a.scheduled_at).getTime();
          bVal = new Date(b.scheduled_at).getTime();
          break;
        case 'candidate_name':
          aVal = (a.candidate_name || '').toLowerCase();
          bVal = (b.candidate_name || '').toLowerCase();
          break;
        case 'job_title':
          aVal = (a.job_title || '').toLowerCase();
          bVal = (b.job_title || '').toLowerCase();
          break;
        case 'interview_type':
          aVal = (a.interview_type || '').toLowerCase();
          bVal = (b.interview_type || '').toLowerCase();
          break;
        case 'status':
          aVal = (a.status || '').toLowerCase();
          bVal = (b.status || '').toLowerCase();
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [filteredInterviews, sortKey, sortDirection]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (sortedInterviews.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      onFocusChange(Math.min(focusedIndex + 1, sortedInterviews.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      onFocusChange(Math.max(focusedIndex - 1, 0));
    } else if (e.key === ' ') {
      if (focusedIndex >= 0 && focusedIndex < sortedInterviews.length) {
        e.preventDefault();
        onToggleSelect(sortedInterviews[focusedIndex].id);
      }
    } else if (e.key === 'Enter') {
      if (focusedIndex >= 0 && focusedIndex < sortedInterviews.length) {
        e.preventDefault();
        onOpen(sortedInterviews[focusedIndex]);
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch(status?.toLowerCase()) {
      case 'scheduled': return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800';
      case 'confirmed': return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800';
      case 'rescheduled': return 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/20 dark:text-violet-400 dark:border-violet-800';
      case 'completed': return 'bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700';
      case 'cancelled': return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800';
      default: return 'bg-zinc-50 text-zinc-700 border-zinc-200 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-800';
    }
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (sortKey !== column) return <ArrowUpDown className="w-3 h-3 text-zinc-300 dark:text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity" />;
    return sortDirection === 'asc' 
      ? <ArrowUp className="w-3.5 h-3.5 text-blue-500" /> 
      : <ArrowDown className="w-3.5 h-3.5 text-blue-500" />;
  };

  // Derive unique statuses and types for filter dropdowns
  const uniqueStatuses = useMemo(() => [...new Set(interviews.map(i => i.status))], [interviews]);
  const uniqueTypes = useMemo(() => [...new Set(interviews.map(i => i.interview_type))], [interviews]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Filter Bar */}
      <div className="px-6 py-3 flex items-center gap-3 border-b border-zinc-100 dark:border-zinc-800/50 bg-white dark:bg-zinc-950 shrink-0">
        <Filter className="w-4 h-4 text-zinc-400" />
        <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v ?? 'all')}>
          <SelectTrigger className="w-[160px] h-8 text-xs">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {uniqueStatuses.map(s => (
              <SelectItem key={s} value={s} className="capitalize">{s.replace('_', ' ')}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={(v) => setFilterType(v ?? 'all')}>
          <SelectTrigger className="w-[160px] h-8 text-xs">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {uniqueTypes.map(t => (
              <SelectItem key={t} value={t} className="capitalize">{t.replace('_', ' ')}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(filterStatus !== 'all' || filterType !== 'all') && (
          <button 
            onClick={() => { setFilterStatus('all'); setFilterType('all'); }}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium ml-1"
          >
            Clear filters
          </button>
        )}
        <span className="ml-auto text-xs text-zinc-400">{sortedInterviews.length} interview{sortedInterviews.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Table */}
      <div 
        className="flex-1 overflow-auto outline-none focus-within:ring-1 focus-within:ring-inset focus-within:ring-blue-500/20"
        tabIndex={0}
        ref={containerRef}
        onKeyDown={handleKeyDown}
      >
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="sticky top-0 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 font-medium z-10 shadow-sm">
            <tr>
              <th className="px-4 py-3 w-12 text-center">
                <button 
                  onClick={() => {
                    if (sortedInterviews.length > 0 && selectedIds.size === sortedInterviews.length) onSelectAll([]);
                    else onSelectAll(sortedInterviews.map(i => i.id));
                  }} 
                  className="hover:text-blue-500 focus:outline-none"
                >
                  {selectedIds.size > 0 && selectedIds.size === sortedInterviews.length ? (
                    <CheckSquare className="w-4 h-4 text-blue-600" />
                  ) : selectedIds.size > 0 ? (
                    <CheckSquare className="w-4 h-4 text-blue-400 opacity-50" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                </button>
              </th>
              <th className="px-4 py-3 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800 group" onClick={() => onSortChange('scheduled_at')}>
                 <div className="flex items-center gap-1.5">Date & Time <SortIcon column="scheduled_at" /></div>
              </th>
              <th className="px-4 py-3 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800 group" onClick={() => onSortChange('candidate_name')}>
                 <div className="flex items-center gap-1.5">Candidate <SortIcon column="candidate_name" /></div>
              </th>
              <th className="px-4 py-3 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800 group" onClick={() => onSortChange('job_title')}>
                 <div className="flex items-center gap-1.5">Job Title <SortIcon column="job_title" /></div>
              </th>
              <th className="px-4 py-3 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800 group" onClick={() => onSortChange('interview_type')}>
                 <div className="flex items-center gap-1.5">Type <SortIcon column="interview_type" /></div>
              </th>
              <th className="px-4 py-3">Interviewer</th>
              <th className="px-4 py-3 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800 group" onClick={() => onSortChange('status')}>
                 <div className="flex items-center gap-1.5">Status <SortIcon column="status" /></div>
              </th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50 bg-white dark:bg-zinc-950">
            {sortedInterviews.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-12 py-24 text-center">
                   <div className="flex flex-col items-center justify-center">
                     <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800/50 rounded-full flex items-center justify-center mb-4">
                       <Filter className="w-8 h-8 text-zinc-400" />
                     </div>
                     <h3 className="text-lg font-semibold mb-1">No interviews found</h3>
                     <p className="text-sm text-zinc-500">
                       {filterStatus !== 'all' || filterType !== 'all' 
                         ? 'No interviews match your current filters.' 
                         : 'There are no interviews in this view yet.'}
                     </p>
                   </div>
                </td>
              </tr>
            ) : null}
            {sortedInterviews.map((interview, index) => {
              const isSelected = selectedIds.has(interview.id);
              const isFocused = focusedIndex === index;
              
              return (
                <tr 
                  key={interview.id}
                  className={`transition-all duration-150 group cursor-pointer ${
                    isSelected ? 'bg-blue-50/50 dark:bg-blue-900/10' : 'hover:bg-zinc-50/80 dark:hover:bg-zinc-900/50'
                  } ${isFocused ? 'ring-2 ring-inset ring-blue-500 shadow-[inset_4px_0_0_0_#3b82f6] bg-blue-50/30 dark:bg-blue-900/20' : ''}`}
                  onClick={() => { onFocusChange(index); onOpen(interview); }}
                >
                  <td className="px-4 py-3 text-center" onClick={(e) => { e.stopPropagation(); onToggleSelect(interview.id); onFocusChange(index); }}>
                     <div className="flex justify-center w-full focus:outline-none" tabIndex={-1}>
                       {isSelected ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4 text-zinc-300 dark:text-zinc-700 group-hover:text-zinc-400" />}
                     </div>
                  </td>
                  <td className="px-4 py-3">
                     <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                        {new Date(interview.scheduled_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric'})}
                     </div>
                     <div className="text-xs text-zinc-500">
                        {new Date(interview.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({interview.duration_minutes}m)
                     </div>
                  </td>
                  <td className="px-4 py-3 font-semibold text-zinc-900 dark:text-zinc-100">
                     {interview.candidate_name}
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-300">
                     {interview.job_title}
                  </td>
                  <td className="px-4 py-3">
                     <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400 capitalize">
                        {interview.interview_type === 'video' ? <Video className="w-3.5 h-3.5" /> : 
                         interview.interview_type === 'phone' ? <Phone className="w-3.5 h-3.5" /> : 
                         <Users className="w-3.5 h-3.5" />}
                        {interview.interview_type.replace('_', ' ')}
                     </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-500">
                     {interview.interviewer_name || '—'}
                  </td>
                  <td className="px-4 py-3">
                     <Badge variant="outline" className={`capitalize border ${getStatusColor(interview.status)}`}>
                       {interview.status.replace('_', ' ')}
                     </Badge>
                  </td>
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                     <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          className="p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-blue-600 transition-colors"
                          title="View details"
                          onClick={() => { onFocusChange(index); onOpen(interview); }}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                     </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
