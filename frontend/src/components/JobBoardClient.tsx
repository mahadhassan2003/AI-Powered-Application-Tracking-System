'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, MapPin, Briefcase, ArrowRight, Sparkles, Building2, LayoutGrid, List, Sun, Moon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';

interface Job {
  id: number;
  title: string;
  company_name?: string;
  location: string;
  employment_type: string;
  description: string;
  created_at?: string;
  salary_range?: string;
}

export default function JobBoardClient({ initialJobs }: { initialJobs: Job[] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [empTypeFilter, setEmpTypeFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch for theme toggle
  useEffect(() => setMounted(true), []);

  // Interactive filtering logic
  const filteredJobs = useMemo(() => {
    return initialJobs.filter((job) => {
      const matchSearch = 
         job.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
         job.location.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchType = empTypeFilter === 'ALL' || job.employment_type === empTypeFilter;
      
      return matchSearch && matchType;
    });
  }, [initialJobs, searchTerm, empTypeFilter]);

  return (
    <div className="min-h-screen w-full relative pb-24 bg-zinc-50 dark:bg-zinc-950">
      {/* Ambient background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-100/60 via-zinc-50 to-zinc-50 dark:from-blue-900/20 dark:via-zinc-950 dark:to-zinc-950 -z-10 pointer-events-none"></div>

      {/* NAVIGATION BAR */}
      <nav className="absolute top-0 w-full z-50 p-6 flex justify-between items-center bg-gradient-to-b from-white/80 to-transparent dark:from-zinc-950/80 dark:to-transparent">
        <div className="font-black text-xl tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
           <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
           </div>
           Equinox
        </div>
        <div className="flex items-center gap-4">
           {/* THEME TOGGLE */}
           {mounted && (
              <button
                 onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                 className="p-2 rounded-lg bg-zinc-200/80 hover:bg-zinc-300 dark:bg-white/10 dark:hover:bg-white/20 backdrop-blur-md border border-zinc-300 dark:border-white/10 transition-all duration-300 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white"
                 aria-label="Toggle theme"
              >
                 {theme === 'dark' ? (
                    <Sun className="w-4 h-4" />
                 ) : (
                    <Moon className="w-4 h-4" />
                 )}
              </button>
           )}
           <Link href="/login" className="text-sm font-bold text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white transition-colors">Sign In</Link>
           <Link href="/signup">
              <Button variant="outline" className="border-zinc-300 bg-white/50 hover:bg-white dark:border-zinc-700 dark:bg-white/5 dark:hover:bg-white/10 text-zinc-800 dark:text-white backdrop-blur-md font-bold shadow-lg">
                 Get Started
              </Button>
           </Link>
        </div>
      </nav>

      {/* HERO SECTION */}
      <header className="pt-32 pb-16 px-6 relative overflow-hidden flex flex-col items-center text-center">
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-blue-400/10 dark:bg-blue-600/10 blur-[120px] rounded-full pointer-events-none"></div>
         <Badge variant="outline" className="mb-6 bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 px-4 py-1.5 rounded-full text-sm font-medium tracking-wide flex items-center gap-2">
            <Sparkles className="w-4 h-4" /> Discover Premium Opportunities
         </Badge>
         <h1 className="text-5xl md:text-7xl font-black tracking-tight text-zinc-900 dark:text-white mb-6 leading-tight">
            Elevate Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-400 dark:to-blue-500">Career Trajectory</span>
         </h1>
         <p className="text-lg md:text-xl text-zinc-500 dark:text-zinc-400 max-w-2xl font-medium">
            Explore exclusive openings hand-picked by elite technology companies. Apply directly through the portal and track your success.
         </p>

         {/* MODERN SEARCH CONSOLE */}
         <div className="mt-12 w-full max-w-3xl relative z-10">
            <div className="bg-white dark:bg-zinc-900 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 rounded-full shadow-xl shadow-blue-500/5 dark:shadow-blue-900/10 flex items-center gap-0 transition-all hover:border-blue-400/40 dark:hover:border-blue-500/30 hover:shadow-2xl pr-2">
               <div className="relative flex-1">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 dark:text-zinc-500" />
                  <input 
                     placeholder="Search by job title or city..." 
                     className="w-full pl-14 pr-4 h-14 bg-transparent text-base text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none rounded-l-full"
                     value={searchTerm}
                     onChange={(e) => setSearchTerm(e.target.value)}
                  />
               </div>
               <div className="h-8 w-px bg-zinc-200 dark:bg-zinc-800 shrink-0"></div>
               <div className="shrink-0">
                  <Select value={empTypeFilter} onValueChange={(val) => { if (val) setEmpTypeFilter(val); }}>
                     <SelectTrigger className="h-14 bg-transparent border-none text-zinc-600 dark:text-zinc-300 focus:ring-0 focus:ring-offset-0 w-40 text-sm font-medium">
                        <SelectValue placeholder="All Types" />
                     </SelectTrigger>
                     <SelectContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl">
                        <SelectItem value="ALL">All Types</SelectItem>
                        <SelectItem value="full-time">Full-Time</SelectItem>
                        <SelectItem value="part-time">Part-Time</SelectItem>
                        <SelectItem value="contract">Contract</SelectItem>
                     </SelectContent>
                  </Select>
               </div>
            </div>
         </div>
      </header>

      {/* JOBS GRID */}
      <main className="max-w-7xl mx-auto px-6 relative z-10">
         <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold tracking-tight text-zinc-800 dark:text-zinc-100 hidden md:block">
               {filteredJobs.length} {filteredJobs.length === 1 ? 'Opportunity' : 'Opportunities'} Matching
            </h2>
            
            {/* VIEW TOGGLE */}
            <div className="flex items-center bg-white/80 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded-lg p-1 backdrop-blur-md">
               <button 
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
               >
                  <LayoutGrid className="w-4 h-4" />
               </button>
               <button 
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
               >
                  <List className="w-4 h-4" />
               </button>
            </div>
         </div>

         {filteredJobs.length === 0 ? (
            <div className="text-center py-24 bg-white/50 dark:bg-zinc-900/30 backdrop-blur-md border border-dashed border-zinc-300 dark:border-zinc-800 rounded-3xl">
               <Briefcase className="w-12 h-12 text-zinc-400 dark:text-zinc-600 mx-auto mb-4 opacity-50" />
               <h3 className="text-xl font-bold text-zinc-500 dark:text-zinc-400 mb-2">No matching positions</h3>
               <p className="text-zinc-400 dark:text-zinc-500">We couldn&apos;t find any roles matching your precise filters. Try broadening your search.</p>
               <Button variant="outline" className="mt-6 border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300" onClick={() => { setSearchTerm(''); setEmpTypeFilter('ALL'); }}>
                  Clear Filters
               </Button>
            </div>
         ) : (
            <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "flex flex-col gap-3"}>
               {filteredJobs.map((job) => viewMode === 'grid' ? (
                  /* ═══════ GRID CARD ═══════ */
                  <Link href={`/jobs/${job.id}`} key={job.id} className="group">
                     <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 hover:shadow-xl hover:shadow-blue-500/5 dark:hover:shadow-blue-900/15 transition-all duration-400 hover:border-blue-400/50 dark:hover:border-blue-500/40 hover:-translate-y-1 flex flex-col h-full">
                        {/* Top Row: Icon + Timestamp */}
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

                        {/* Title */}
                        <h3 className="text-lg font-bold text-zinc-800 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-snug mb-2">
                           {job.title}
                        </h3>

                        {/* Location */}
                        <div className="flex items-center text-zinc-500 dark:text-zinc-400 text-sm font-medium mb-4">
                           <MapPin className="w-3.5 h-3.5 mr-1.5 text-rose-500" /> {job.location}
                        </div>

                        {/* Tags */}
                        <div className="flex flex-wrap gap-2 mb-4">
                           <span className="bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full">
                              {job.employment_type}
                           </span>
                           {job.salary_range && (
                              <span className="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full">
                                 {job.salary_range}
                              </span>
                           )}
                        </div>

                        {/* Description */}
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed flex-1">
                           {job.description}
                        </p>

                        {/* CTA */}
                        <div className="mt-5 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                           <span className="text-sm font-bold text-blue-600 dark:text-blue-400 flex items-center group-hover:gap-2 transition-all">
                              View Details <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                           </span>
                        </div>
                     </div>
                  </Link>
               ) : (
                  /* ═══════ LIST ROW ═══════ */
                  <Link href={`/jobs/${job.id}`} key={job.id} className="group">
                     <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 px-6 py-4 hover:shadow-lg hover:shadow-blue-500/5 dark:hover:shadow-blue-900/15 transition-all duration-300 hover:border-blue-400/50 dark:hover:border-blue-500/40 flex items-center gap-5">
                        {/* Icon */}
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-blue-600 to-blue-500 flex items-center justify-center shadow-md shrink-0 group-hover:scale-110 transition-transform duration-500">
                           <Building2 className="w-5 h-5 text-white" />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                           <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                              {job.title}
                           </h3>
                           <div className="flex items-center gap-3 mt-1">
                              <span className="flex items-center text-zinc-500 dark:text-zinc-400 text-sm">
                                 <MapPin className="w-3.5 h-3.5 mr-1 text-rose-500" /> {job.location}
                              </span>
                              {job.created_at && (
                                 <span className="text-xs text-zinc-400 dark:text-zinc-500 hidden sm:block">
                                    {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
                                 </span>
                              )}
                           </div>
                        </div>

                        {/* Tags */}
                        <div className="flex items-center gap-2 shrink-0 hidden md:flex">
                           <span className="bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full">
                              {job.employment_type}
                           </span>
                           {job.salary_range && (
                              <span className="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full">
                                 {job.salary_range}
                              </span>
                           )}
                        </div>

                        {/* Arrow */}
                        <ArrowRight className="w-5 h-5 text-zinc-300 dark:text-zinc-600 group-hover:text-blue-500 group-hover:translate-x-1 transition-all shrink-0" />
                     </div>
                  </Link>
               ))}
            </div>
         )}
      </main>
    </div>
  );
}
