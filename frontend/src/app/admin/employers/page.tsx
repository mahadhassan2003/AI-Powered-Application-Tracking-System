'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import clientApi from '@/lib/client-api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, ExternalLink, ShieldAlert, ShieldCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import type { AdminUser } from '@/types/api';

export default function AdminEmployersPage() {
  const { data: employers, isLoading } = useQuery<AdminUser[]>({
    queryKey: ['admin-all-employers'],
    queryFn: async () => {
      const res = await clientApi.get('/auth/admin/all-recruiters');
      return (res as unknown as AdminUser[]) || [];
    }
  });

  return (
    <div className="p-8 w-full min-h-screen relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/10 via-zinc-950 to-zinc-950 -z-10 pointer-events-none"></div>

      <div className="flex flex-col gap-2 mb-8">
        <h1 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-3">
          <Building2 className="w-8 h-8 text-emerald-500" />
          Employers Directory
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">View and audit all organizations registered on the platform.</p>
      </div>

      <Card className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-zinc-200 dark:border-zinc-800/50 shadow-2xl">
        <CardHeader className="border-b border-zinc-100 dark:border-zinc-800/50 bg-zinc-50/50 dark:bg-zinc-900/30">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-bold">Registered Organizations</CardTitle>
            <div className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 px-3 py-1 rounded-full text-xs font-bold shadow-inner">
              {employers?.length || 0} Total Output
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
             <div className="p-12 text-center flex flex-col items-center animate-pulse">
                <div className="w-12 h-12 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin mb-4"></div>
                <div className="text-zinc-500 dark:text-zinc-400 font-medium">Syncing directory data...</div>
             </div>
          ) : employers?.length === 0 ? (
             <div className="p-16 text-center">
                <div className="text-zinc-500">No employers found.</div>
             </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-zinc-500/80 bg-zinc-50/30 dark:bg-zinc-900/30 uppercase border-b border-zinc-100 dark:border-zinc-800">
                  <tr>
                    <th className="px-6 py-4 font-bold tracking-wider">Organization</th>
                    <th className="px-6 py-4 font-bold tracking-wider">Primary Contact</th>
                    <th className="px-6 py-4 font-bold tracking-wider">Status</th>
                    <th className="px-6 py-4 font-bold tracking-wider">Registered</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                  {employers?.map((user) => (
                    <tr key={user.id} className="hover:bg-zinc-50/80 dark:hover:bg-emerald-900/5 transition-colors group">
                      <td className="px-6 py-5">
                        <div className="font-bold text-zinc-900 dark:text-zinc-100 text-base flex items-center gap-2">
                           {user.company_name || 'Unspecified Org'}
                        </div>
                        {user.company_website && (
                          <a href={user.company_website.startsWith('http') ? user.company_website : `https://${user.company_website}`} target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1 mt-1 font-medium w-max">
                            {user.company_website} <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </a>
                        )}
                      </td>
                      <td className="px-6 py-5">
                        <div className="font-medium text-zinc-800 dark:text-zinc-200">{user.name}</div>
                        <div className="text-xs text-zinc-500 mt-1 font-mono">{user.email}</div>
                      </td>
                      <td className="px-6 py-5">
                        {user.approval_status === 'approved' ? (
                           <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20 py-1 flex items-center gap-1.5 w-max">
                              <ShieldCheck className="w-3.5 h-3.5" /> Approved
                           </Badge>
                        ) : user.approval_status === 'pending' ? (
                           <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20 py-1 w-max">
                              Pending Review
                           </Badge>
                        ) : (
                           <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20 py-1 flex items-center gap-1.5 w-max cursor-help" title={user.rejection_reason || 'Rejected'}>
                              <ShieldAlert className="w-3.5 h-3.5" /> Rejected
                           </Badge>
                        )}
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-zinc-500 dark:text-zinc-400 font-medium">
                         {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
