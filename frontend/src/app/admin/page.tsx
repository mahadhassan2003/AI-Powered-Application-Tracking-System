'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import clientApi from '@/lib/client-api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Users, Building2, Hourglass, CheckCircle2, ShieldBan, ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { AdminStats, AdminUser } from '@/types/api';

export default function AdminDashboardPage() {
  const queryClient = useQueryClient();
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [rejectingUser, setRejectingUser] = useState<AdminUser | null>(null);
  const [rejectReason, setRejectReason] = useState('We could not verify your organizational details.');

  // Fetch metrics top-level
  const { data: stats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const res = await clientApi.get('/auth/admin/stats');
      return res as unknown as AdminStats;
    }
  });

  // Fetch pending recruiters
  const { data: pendingUsers, isLoading: pendingLoading } = useQuery<AdminUser[]>({
    queryKey: ['admin-pending-recruiters'],
    queryFn: async () => {
      const res = await clientApi.get('/auth/admin/pending-recruiters');
      return (res as unknown as AdminUser[]) || [];
    }
  });

  const approveMutation = useMutation({
    mutationFn: (userId: number) => clientApi.post(`/auth/admin/approve-recruiter/${userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pending-recruiters'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    }
  });

  const rejectMutation = useMutation({
    mutationFn: (data: { userId: number, reason: string }) => 
      clientApi.post(`/auth/admin/reject-recruiter/${data.userId}?reason=${encodeURIComponent(data.reason)}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pending-recruiters'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      setIsRejectOpen(false);
      setRejectingUser(null);
    }
  });

  const handleOpenReject = (user: AdminUser) => {
    setRejectingUser(user);
    setRejectReason('We could not verify your organizational details.');
    setIsRejectOpen(true);
  };

  const submitReject = () => {
    if (rejectingUser) {
      rejectMutation.mutate({ userId: rejectingUser.id, reason: rejectReason });
    }
  };

  return (
    <div className="p-8 w-full min-h-screen">
      <div className="flex flex-col gap-2 mb-8">
        <h1 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">Admin Center</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Manage platform access and monitor general system health.</p>
      </div>

      {/* METRICS ROW */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Users className="w-16 h-16 text-indigo-500" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-zinc-900 dark:text-zinc-50">
              {statsLoading ? '...' : stats?.total_users || 0}
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Building2 className="w-16 h-16 text-emerald-500" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Total Employers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-zinc-900 dark:text-zinc-50">
              {statsLoading ? '...' : stats?.total_recruiters || 0}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <CheckCircle2 className="w-16 h-16 text-emerald-500" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Approved Employers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-emerald-600 dark:text-emerald-500">
              {statsLoading ? '...' : stats?.approved_recruiters || 0}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Hourglass className="w-16 h-16 text-amber-500" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Pending Approvals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-amber-600 dark:text-amber-500">
              {statsLoading ? '...' : stats?.pending_recruiters || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* PENDING TABLE */}
      <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm">
        <CardHeader className="border-b border-zinc-100 dark:border-zinc-800/50 bg-zinc-50/50 dark:bg-zinc-900/20">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-bold">Pending Employer Approvals</CardTitle>
            <div className="bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400 px-3 py-1 rounded-full text-xs font-bold">
              {pendingUsers?.length || 0} Action{pendingUsers?.length === 1 ? '' : 's'} Required
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {pendingLoading ? (
             <div className="p-8 text-center text-zinc-500 dark:text-zinc-400">Loading pending applications...</div>
          ) : pendingUsers?.length === 0 ? (
             <div className="p-12 text-center flex flex-col items-center">
                <ShieldBan className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mb-4" />
                <h3 className="text-sm font-bold text-zinc-700 dark:text-zinc-300">All caught up!</h3>
                <p className="text-xs text-zinc-500 mt-1">There are no pending employer applications waiting to be reviewed.</p>
             </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-zinc-500 bg-zinc-50/50 dark:bg-zinc-900/50 uppercase border-b border-zinc-100 dark:border-zinc-800">
                  <tr>
                    <th className="px-6 py-4 font-bold">Organization</th>
                    <th className="px-6 py-4 font-bold">Contact Person</th>
                    <th className="px-6 py-4 font-bold">Applied</th>
                    <th className="px-6 py-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {pendingUsers?.map((user) => (
                    <tr key={user.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-zinc-900 dark:text-zinc-50">{user.company_name || 'N/A'}</div>
                        {user.company_website && (
                          <a href={user.company_website.startsWith('http') ? user.company_website : `https://${user.company_website}`} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 mt-0.5">
                            {user.company_website} <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-zinc-800 dark:text-zinc-200">{user.name}</div>
                        <div className="text-xs text-zinc-500 mt-0.5">{user.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-zinc-500 dark:text-zinc-400">
                         {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleOpenReject(user)}
                          disabled={approveMutation.isPending || rejectMutation.isPending}
                          className="h-8 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900/50 dark:hover:bg-red-900/20"
                        >
                          Reject
                        </Button>
                        <Button 
                          size="sm" 
                          onClick={() => approveMutation.mutate(user.id)}
                          disabled={approveMutation.isPending || rejectMutation.isPending}
                          className="h-8 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                        >
                          Approve Platform Access
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* REJECTION REASON DIALOG */}
      <Dialog open={isRejectOpen} onOpenChange={setIsRejectOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-red-600 dark:text-red-500">Reject Employer Application</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting {rejectingUser?.company_name || rejectingUser?.name}. They will see this message if they try to log in.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Rejection Reason</Label>
              <Textarea 
                id="reason" 
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="min-h-[100px] border-zinc-200 focus:border-red-500 focus:ring-red-500/20"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejectOpen(false)}>Cancel</Button>
            <Button 
               variant="destructive"
               onClick={submitReject}
               disabled={!rejectReason || rejectMutation.isPending}
            >
              {rejectMutation.isPending ? 'Rejecting...' : 'Reject Application'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
