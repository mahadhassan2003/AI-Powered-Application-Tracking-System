'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import clientApi from '@/lib/client-api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import {
  FileText, CheckCircle2, Clock, XCircle, Briefcase,
  TrendingUp, CalendarDays, ArrowRight, Sparkles, Target
} from 'lucide-react';
import type { ApplicationResponse } from '@/types/api';

export default function CandidateDashboard() {
  const { data: applications, isLoading } = useQuery<ApplicationResponse[]>({
    queryKey: ['my-applications'],
    queryFn: () => clientApi.get('/applications/my-applications').then((data: any) => data || []),
    refetchInterval: 5000, // Poll every 5 seconds to catch background scoring updates
  });

  const stats = React.useMemo(() => {
    if (!applications) return { total: 0, shortlisted: 0, interview: 0, rejected: 0, hired: 0, avgScore: 0 };
    const total = applications.length;
    const shortlisted = applications.filter(a => a.status === 'shortlisted').length;
    const interview = applications.filter(a => a.status === 'interview').length;
    const hired = applications.filter(a => a.status === 'hired').length;
    const rejected = applications.filter(a => a.status === 'rejected').length;
    const scores = applications.filter(a => a.match_score != null).map(a => a.match_score ?? 0);
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length) : 0;
    return { total, shortlisted, interview, hired, rejected, avgScore };
  }, [applications]);

  const recentApps = applications?.slice(0, 5) || [];

  const statusColor = (status: string) => {
    switch(status) {
      case 'shortlisted': return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20';
      case 'interview': return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20';
      case 'hired': return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20';
      case 'rejected': return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20';
      default: return 'bg-zinc-50 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <div className="animate-pulse text-zinc-400 flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          <span className="text-sm font-medium">Loading your career hub...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6 md:py-12 px-4 md:px-6 w-full">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-1">Welcome back 👋</h1>
        <p className="text-zinc-500 text-sm md:text-base">Here&apos;s an overview of your job search progress.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8">
        <Card className="bg-white dark:bg-zinc-900">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between mb-2">
              <FileText className="w-5 h-5 text-blue-500" />
              <span className="text-2xl md:text-3xl font-black">{stats.total}</span>
            </div>
            <p className="text-xs md:text-sm text-zinc-500 font-medium">Applications</p>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-zinc-900">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between mb-2">
              <CalendarDays className="w-5 h-5 text-blue-500" />
              <span className="text-2xl md:text-3xl font-black">{stats.interview}</span>
            </div>
            <p className="text-xs md:text-sm text-zinc-500 font-medium">Interviews</p>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-zinc-900">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              <span className="text-2xl md:text-3xl font-black">{stats.hired}</span>
            </div>
            <p className="text-xs md:text-sm text-zinc-500 font-medium">Offers</p>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-zinc-900">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between mb-2">
              <Target className="w-5 h-5 text-amber-500" />
              <span className="text-2xl md:text-3xl font-black">{stats.avgScore}%</span>
            </div>
            <p className="text-xs md:text-sm text-zinc-500 font-medium">Avg Match</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Applications */}
        <div className="lg:col-span-2">
          <Card className="bg-white dark:bg-zinc-900">
            <CardHeader className="border-b border-zinc-100 dark:border-zinc-800 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-bold">Recent Applications</CardTitle>
                <Link href="/candidate/applications">
                  <Button variant="ghost" size="sm" className="text-blue-600 dark:text-blue-400">
                    View All <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {recentApps.length === 0 ? (
                <div className="text-center py-12 text-zinc-400 space-y-3">
                  <Briefcase className="w-10 h-10 mx-auto text-zinc-300" />
                  <p className="text-sm">No applications yet.</p>
                  <Link href="/jobs">
                    <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                      Browse Open Positions
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {recentApps.map((app) => (
                    <div key={app.id} className="flex items-center justify-between p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-semibold truncate">{app.job_title}</h4>
                        <p className="text-xs text-zinc-400 mt-0.5">
                          Applied {new Date(app.applied_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 ml-4">
                        {app.match_score != null && (
                          <span className="text-xs font-bold text-blue-600 dark:text-blue-400 hidden sm:inline">
                            {Math.round(app.match_score)}% fit
                          </span>
                        )}
                        <span className={`px-2.5 py-1 text-[10px] md:text-xs font-semibold rounded-full border capitalize ${statusColor(app.status)}`}>
                          {app.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions + AI Tips */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card className="bg-white dark:bg-zinc-900">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-bold">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href="/jobs" className="block">
                <Button variant="outline" className="w-full justify-start text-sm">
                  <Briefcase className="w-4 h-4 mr-3 text-blue-500" />
                  Browse Open Positions
                </Button>
              </Link>
              <Link href="/candidate/applications" className="block">
                <Button variant="outline" className="w-full justify-start text-sm">
                  <FileText className="w-4 h-4 mr-3 text-blue-500" />
                  Track Applications
                </Button>
              </Link>
              <Link href="/candidate/interviews" className="block">
                <Button variant="outline" className="w-full justify-start text-sm">
                  <CalendarDays className="w-4 h-4 mr-3 text-amber-500" />
                  View Interview Schedule
                </Button>
              </Link>
              <Link href="/candidate/profile" className="block">
                <Button variant="outline" className="w-full justify-start text-sm">
                  <TrendingUp className="w-4 h-4 mr-3 text-emerald-500" />
                  Update Profile
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* AI Tips Card */}
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800">
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg shrink-0">
                  <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-blue-900 dark:text-blue-300 mb-1">AI Career Tip</h4>
                  <p className="text-xs text-blue-700 dark:text-blue-400 leading-relaxed">
                    Tailor your resume keywords to each job description. Our AI matching engine scores higher when your skills vocabulary aligns with the posting.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
