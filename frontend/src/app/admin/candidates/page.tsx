'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import clientApi from '@/lib/client-api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, FileUser, MapPin, Phone } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import type { AdminUser } from '@/types/api';

export default function AdminCandidatesPage() {
  const { data: candidates, isLoading } = useQuery<AdminUser[]>({
    queryKey: ['admin-all-candidates'],
    queryFn: async () => {
      const res = await clientApi.get('/auth/admin/all-candidates');
      return (res as unknown as AdminUser[]) || [];
    }
  });

  return (
    <div className="p-8 w-full min-h-screen relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/10 via-zinc-950 to-zinc-950 -z-10 pointer-events-none"></div>

      <div className="flex flex-col gap-2 mb-8">
        <h1 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-3">
          <Users className="w-8 h-8 text-indigo-500" />
          Talent Pool Directory
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">View all applicant and candidate accounts registered in the database.</p>
      </div>

      <Card className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-zinc-200 dark:border-zinc-800/50 shadow-2xl">
        <CardHeader className="border-b border-zinc-100 dark:border-zinc-800/50 bg-zinc-50/50 dark:bg-zinc-900/30">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-bold">Registered Candidates</CardTitle>
            <div className="bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400 px-3 py-1 rounded-full text-xs font-bold shadow-inner">
              {candidates?.length || 0} Total Output
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
             <div className="p-12 text-center flex flex-col items-center animate-pulse">
                <div className="w-12 h-12 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin mb-4"></div>
                <div className="text-zinc-500 dark:text-zinc-400 font-medium">Loading talent network...</div>
             </div>
          ) : candidates?.length === 0 ? (
             <div className="p-16 text-center">
                <div className="text-zinc-500">No candidates found.</div>
             </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-zinc-500/80 bg-zinc-50/30 dark:bg-zinc-900/30 uppercase border-b border-zinc-100 dark:border-zinc-800">
                  <tr>
                    <th className="px-6 py-4 font-bold tracking-wider">Candidate Profile</th>
                    <th className="px-6 py-4 font-bold tracking-wider">Contact Info</th>
                    <th className="px-6 py-4 font-bold tracking-wider">Demographics</th>
                    <th className="px-6 py-4 font-bold tracking-wider">Joined Platform</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                  {candidates?.map((user) => (
                    <tr key={user.id} className="hover:bg-zinc-50/80 dark:hover:bg-indigo-900/5 transition-colors group">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 flex items-center justify-center font-bold">
                              {user.name?.charAt(0).toUpperCase()}
                           </div>
                           <div>
                              <div className="font-bold text-zinc-900 dark:text-zinc-100 text-base">{user.name}</div>
                              <Badge variant="outline" className="mt-1 bg-zinc-100/50 dark:bg-zinc-800/50 text-zinc-500 font-mono text-[10px]">
                                 ID: {user.id.toString().padStart(6, '0')}
                              </Badge>
                           </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="font-medium text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
                           <FileUser className="w-4 h-4" /> {user.email}
                        </div>
                        {user.phone && (
                          <div className="text-xs text-zinc-500 dark:text-zinc-500 mt-1.5 flex items-center gap-2">
                             <Phone className="w-3.5 h-3.5" /> {user.phone}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-5">
                        {user.location ? (
                           <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-300 font-medium w-max">
                              <MapPin className="w-4 h-4 text-rose-500" /> {user.location}
                           </div>
                        ) : (
                           <span className="text-zinc-400 italic">Not specified</span>
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
