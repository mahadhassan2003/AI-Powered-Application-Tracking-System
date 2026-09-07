'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import clientApi from '@/lib/client-api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Database, Server, Cpu, HardDrive, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { HealthCheck } from '@/types/api';

export default function AdminHealthPage() {
  const { data: health, isLoading, refetch, isFetching } = useQuery<HealthCheck>({
    queryKey: ['admin-system-health'],
    queryFn: async () => {
      const res = await clientApi.get('/health');
      return res as unknown as HealthCheck;
    },
    refetchInterval: 30000 // auto-refresh every 30s
  });

  const getStatusColor = (status: string | undefined | null) => {
    if (!status) return 'bg-zinc-500';
    if (status.toLowerCase() === 'healthy') return 'bg-emerald-500 shadow-emerald-500/50';
    if (status.toLowerCase() === 'degraded') return 'bg-amber-500 shadow-amber-500/50';
    return 'bg-red-500 shadow-red-500/50';
  };

  return (
    <div className="p-8 w-full min-h-screen relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-900/5 via-zinc-950 to-zinc-950 -z-10 pointer-events-none"></div>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 border-b border-zinc-200 dark:border-zinc-800/50 pb-6">
        <div>
           <h1 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-3">
             <Activity className="w-8 h-8 text-amber-500" />
             Infrastructure Health
           </h1>
           <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">Monitor database connectivity, cache memory, and asynchronous worker nodes.</p>
        </div>
        <div className="flex items-center gap-4 bg-white/50 dark:bg-zinc-900/50 px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm backdrop-blur-md">
           <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Global Status</span>
              <div className={`w-3 h-3 rounded-full flex-shrink-0 animate-pulse shadow-lg ${getStatusColor(health?.status)}`}></div>
           </div>
           <div className="h-6 w-px bg-zinc-200 border-zinc-200 dark:bg-zinc-800 dark:border-zinc-800"></div>
           <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isFetching} className="h-8 text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800">
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isFetching ? 'animate-spin' : ''}`} />
              Sync Telemetry
           </Button>
        </div>
      </div>

      {isLoading ? (
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
            {[1,2,3,4].map(i => (
               <div key={i} className="h-48 bg-zinc-100 dark:bg-zinc-900/50 rounded-2xl border border-zinc-200 dark:border-zinc-800"></div>
            ))}
         </div>
      ) : (
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Core API Server */}
            <Card className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-zinc-200 dark:border-zinc-800 shadow-xl overflow-hidden relative group">
               <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Server className="w-32 h-32 text-indigo-500" />
               </div>
               <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-zinc-500 flex items-center justify-between">
                     <span className="flex items-center gap-2"><Server className="w-4 h-4" /> Core API</span>
                     <div className={`w-2 h-2 rounded-full ${getStatusColor(health?.services?.api)}`}></div>
                  </CardTitle>
               </CardHeader>
               <CardContent>
                  <div className="text-3xl font-black text-zinc-900 dark:text-zinc-50 mt-2 mb-1">
                     {health?.services?.api === 'healthy' ? 'Online' : 'Offline'}
                  </div>
                  <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-500/10 w-max px-2 py-0.5 rounded">All systems operational</div>
               </CardContent>
            </Card>

            {/* PostgreSQL Database */}
            <Card className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-zinc-200 dark:border-zinc-800 shadow-xl overflow-hidden relative group">
               <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Database className="w-32 h-32 text-blue-500" />
               </div>
               <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-zinc-500 flex items-center justify-between">
                     <span className="flex items-center gap-2"><Database className="w-4 h-4" /> PostgreSQL</span>
                     <div className={`w-2 h-2 rounded-full ${getStatusColor(health?.services?.database?.status)}`}></div>
                  </CardTitle>
               </CardHeader>
               <CardContent>
                  <div className="text-3xl font-black text-zinc-900 dark:text-zinc-50 mt-2 mb-1">
                     {health?.services?.database?.status === 'healthy' ? 'Connected' : 'Disconnected'}
                  </div>
                  <div className="text-xs text-blue-600 dark:text-blue-400 font-medium bg-blue-50 dark:bg-blue-500/10 w-max px-2 py-0.5 rounded">Primary cluster</div>
               </CardContent>
            </Card>

            {/* Celery Task Queue */}
            <Card className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-zinc-200 dark:border-zinc-800 shadow-xl overflow-hidden relative group">
               <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Cpu className="w-32 h-32 text-amber-500" />
               </div>
               <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-zinc-500 flex items-center justify-between">
                     <span className="flex items-center gap-2"><Cpu className="w-4 h-4" /> Celery Workers</span>
                     <div className={`w-2 h-2 rounded-full ${getStatusColor(health?.services?.celery?.status)}`}></div>
                  </CardTitle>
               </CardHeader>
               <CardContent>
                  <div className="flex items-baseline gap-2 mt-2 mb-1">
                     <div className="text-3xl font-black text-zinc-900 dark:text-zinc-50">
                        {health?.services?.celery?.active_tasks || 0}
                     </div>
                     <span className="text-sm font-bold text-zinc-500">jobs active</span>
                  </div>
                  <div className="text-xs text-amber-600 dark:text-amber-400 font-medium bg-amber-50 dark:bg-amber-500/10 w-max px-2 py-0.5 rounded">
                     {health?.services?.celery?.active_workers || 0} compute nodes
                  </div>
               </CardContent>
            </Card>

            {/* Redis Cache */}
            <Card className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-zinc-200 dark:border-zinc-800 shadow-xl overflow-hidden relative group">
               <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <HardDrive className="w-32 h-32 text-rose-500" />
               </div>
               <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-zinc-500 flex items-center justify-between">
                     <span className="flex items-center gap-2"><HardDrive className="w-4 h-4" /> Redis Cache</span>
                     <div className={`w-2 h-2 rounded-full ${getStatusColor(health?.services?.redis?.status || 'unhealthy')}`}></div>
                  </CardTitle>
               </CardHeader>
               <CardContent>
                  <div className="text-3xl font-black text-zinc-900 dark:text-zinc-50 mt-2 mb-1">
                     {health?.services?.redis?.used_memory_human || '0B'}
                  </div>
                  <div className="text-xs text-rose-600 dark:text-rose-400 font-medium bg-rose-50 dark:bg-rose-500/10 w-max px-2 py-0.5 rounded">Memory utilized</div>
               </CardContent>
            </Card>
         </div>
      )}
    </div>
  );
}
