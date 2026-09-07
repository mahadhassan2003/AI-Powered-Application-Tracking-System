'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Search, MapPin, Building2, Briefcase, LayoutGrid, List, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import clientApi from '@/lib/client-api';
import { formatDistanceToNow } from 'date-fns';
import type { JobResponse } from '@/types/api';

export default function CandidateJobBoard() {
  const [jobs, setJobs] = useState<JobResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [empTypeFilter, setEmpTypeFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const data = await clientApi.get('/jobs') as JobResponse[];
        setJobs(data);
      } catch (err: any) {
        setError('Failed to load open positions. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    fetchJobs();
  }, []);

  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      const matchesSearch = 
        job.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
        job.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.category.toLowerCase().includes(searchTerm.toLowerCase());
      
      const empTypeMatch = empTypeFilter === 'ALL' || (job.employment_type && job.employment_type.toLowerCase() === empTypeFilter.toLowerCase());
      
      return matchesSearch && empTypeMatch;
    });
  }, [jobs, searchTerm, empTypeFilter]);

  if (loading) {
    return (
      <div className="flex-1 min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 p-8 flex items-center justify-center">
        <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 rounded-2xl p-8 max-w-md w-full text-center">
          <h2 className="text-xl font-bold mb-2">Error</h2>
          <p className="text-sm opacity-80">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 lg:p-10 w-full">
      
      {/* Header section */}
      <div className="mb-10">
        <h1 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight mb-2">
          Find Your Next Role
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 text-lg">
          Browse through {jobs.length} exclusive opportunities hand-picked for our network.
        </p>
      </div>

      {/* Filter and View Toggle Row */}
      <div className="flex flex-col xl:flex-row gap-4 mb-8 items-start xl:items-center justify-between">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-full flex items-center shadow-sm w-full xl:max-w-2xl px-2 h-14">
           <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 dark:text-zinc-500" />
              <input 
                 placeholder="Search by job title or city..." 
                 className="w-full pl-12 pr-4 h-full bg-transparent text-sm text-zinc-900 dark:text-white placeholder:text-zinc-500 focus:outline-none rounded-l-full"
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
              />
           </div>
           <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-800 shrink-0"></div>
           <div className="shrink-0 pl-1">
              <Select value={empTypeFilter} onValueChange={(val) => { if (val) setEmpTypeFilter(val); }}>
                 <SelectTrigger className="h-10 bg-transparent border-none text-zinc-600 dark:text-zinc-300 focus:ring-0 focus:ring-offset-0 w-36 text-sm font-medium">
                    <SelectValue placeholder="All Types" />
                 </SelectTrigger>
                 <SelectContent className="rounded-xl">
                    <SelectItem value="ALL">All Types</SelectItem>
                    <SelectItem value="full-time">Full-Time</SelectItem>
                    <SelectItem value="part-time">Part-Time</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                 </SelectContent>
              </Select>
           </div>
        </div>

        <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 rounded-lg p-1 border border-zinc-200 dark:border-zinc-800 shadow-sm shrink-0">
           <button 
              onClick={() => setViewMode('list')} 
              className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
              title="List View"
           >
              <List className="w-5 h-5" />
           </button>
           <button 
              onClick={() => setViewMode('grid')} 
              className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
              title="Grid View"
           >
              <LayoutGrid className="w-5 h-5" />
           </button>
        </div>
      </div>

      {/* Results */}
      {filteredJobs.length === 0 ? (
        <div className="text-center py-20 bg-white/50 dark:bg-zinc-900/30 border border-dashed border-zinc-300 dark:border-zinc-800 rounded-3xl">
           <Briefcase className="w-12 h-12 text-zinc-400 dark:text-zinc-600 mx-auto mb-4 opacity-50" />
           <h3 className="text-lg font-bold text-zinc-700 dark:text-zinc-300 mb-2">No matching positions</h3>
           <p className="text-sm text-zinc-500 dark:text-zinc-400">Try broadening your search criteria.</p>
           <Button variant="outline" className="mt-4" onClick={() => { setSearchTerm(''); setEmpTypeFilter('ALL'); }}>
              Clear Filters
           </Button>
        </div>
      ) : (
        <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "flex flex-col gap-3"}>
           {filteredJobs.map((job) => viewMode === 'grid' ? (
              /* GRID CARD */
              <Link href={`/candidate/jobs/${job.id}`} key={job.id} className="group">
                 <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 hover:shadow-xl hover:shadow-blue-500/5 dark:hover:shadow-blue-900/15 transition-all duration-400 hover:border-blue-400/50 dark:hover:border-blue-500/40 hover:-translate-y-1 flex flex-col h-full">
                    <div className="flex items-start justify-between mb-5">
                       <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-blue-600 to-blue-500 flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-500">
                          <Building2 className="w-5 h-5 text-white" />
                       </div>
                       {job.created_at && (
                          <span className="text-xs font-medium text-zinc-400 dark:text-zinc-500">
                             {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
                          </span>
                       )}
                    </div>

                    <h3 className="text-lg font-bold text-zinc-800 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-snug mb-2">
                       {job.title}
                    </h3>

                    <div className="flex items-center text-zinc-500 dark:text-zinc-400 text-sm font-medium mb-4">
                       <MapPin className="w-3.5 h-3.5 mr-1.5 text-rose-500" /> {job.location || 'Remote'}
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4">
                       {job.employment_type && (
                          <span className="bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                             {job.employment_type}
                          </span>
                       )}
                       {job.salary_range && (
                          <span className="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                             {job.salary_range}
                          </span>
                       )}
                    </div>

                    <p className="text-sm text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed flex-1">
                       {job.description}
                    </p>

                    <div className="mt-5 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                       <span className="text-sm font-bold text-blue-600 dark:text-blue-400 flex items-center group-hover:gap-2 transition-all">
                          View Details <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                       </span>
                    </div>
                 </div>
              </Link>
           ) : (
              /* LIST ROW */
              <Link href={`/candidate/jobs/${job.id}`} key={job.id} className="group">
                 <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 px-6 py-4 hover:shadow-lg hover:shadow-blue-500/5 dark:hover:shadow-blue-900/15 transition-all duration-300 hover:border-blue-400/50 dark:hover:border-blue-500/40 flex items-center gap-5">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-blue-600 to-blue-500 flex items-center justify-center shadow-md shrink-0 group-hover:scale-110 transition-transform duration-500">
                       <Building2 className="w-5 h-5 text-white" />
                    </div>

                    <div className="flex-1 min-w-0">
                       <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                          {job.title}
                       </h3>
                       <div className="flex items-center gap-3 mt-1">
                          <span className="flex items-center text-zinc-500 dark:text-zinc-400 text-sm">
                             <MapPin className="w-3.5 h-3.5 mr-1 text-rose-500" /> {job.location || 'Remote'}
                          </span>
                          {job.created_at && (
                             <span className="text-xs text-zinc-400 dark:text-zinc-500 hidden sm:block">
                                {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
                             </span>
                          )}
                       </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 hidden md:flex">
                       {job.employment_type && (
                          <span className="bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[11px] font-bold uppercase tracking-wider px-2 py-1 rounded-full">
                             {job.employment_type}
                          </span>
                       )}
                       {job.salary_range && (
                          <span className="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold uppercase tracking-wider px-2 py-1 rounded-full">
                             {job.salary_range}
                          </span>
                       )}
                    </div>

                    <ArrowRight className="w-5 h-5 text-zinc-300 dark:text-zinc-600 group-hover:text-blue-500 group-hover:translate-x-1 transition-all shrink-0 ml-2" />
                 </div>
              </Link>
           ))}
        </div>
      )}
    </div>
  );
}
