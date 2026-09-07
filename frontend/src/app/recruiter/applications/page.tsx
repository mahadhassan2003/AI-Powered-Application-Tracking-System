'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import clientApi from '@/lib/client-api';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import Link from 'next/link';
import { ExternalLink, Inbox, Trash2 } from 'lucide-react';
import { FilterToolbar } from '@/components/shared/FilterToolbar';
import { ApplicationDataTable } from '@/components/shared/ApplicationDataTable';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import type { ApplicationResponse } from '@/types/api';
import toast from 'react-hot-toast';

export default function GlobalApplicationsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [deleteTarget, setDeleteTarget] = useState<ApplicationResponse | null>(null);
  const queryClient = useQueryClient();

  const { data: applications, isLoading } = useQuery<ApplicationResponse[]>({
    queryKey: ['recruiter-all-applications'],
    queryFn: () => clientApi.get('/applications/recruiter/all-applications'),
  });

  const deleteMutation = useMutation({
    mutationFn: (applicationId: number) => clientApi.delete(`/applications/${applicationId}`),
    onSuccess: () => {
      toast.success('Application deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['recruiter-all-applications'] });
      setDeleteTarget(null);
    },
    onError: () => {
      toast.error('Failed to delete application');
    },
  });

  const filtered = (applications || []).filter(app => {
    const matchesSearch = !search || 
      app.candidate_name?.toLowerCase().includes(search.toLowerCase()) || 
      app.job_title?.toLowerCase().includes(search.toLowerCase()) ||
      app.candidate_email?.toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = statusFilter === 'All' || app.status?.toLowerCase() === statusFilter.toLowerCase();
    
    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return (
      <div className="py-24 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-r-transparent" />
        <p className="mt-4 text-zinc-500">Loading applications directory...</p>
      </div>
    );
  }

  const statusOptions = [
    { value: 'All', label: 'All Statuses' },
    { value: 'applied', label: 'Applied' },
    { value: 'screening', label: 'Screening' },
    { value: 'interview', label: 'Interviewing' },
    { value: 'offer', label: 'Offered' },
    { value: 'hired', label: 'Hired' },
    { value: 'rejected', label: 'Rejected' }
  ];

  const emptyMessage = (
    <>
      <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-4">
        <Inbox className="w-8 h-8 text-zinc-400" />
      </div>
      <h3 className="text-lg font-semibold mb-1">No applications found</h3>
      <p className="text-zinc-500 text-sm">
        {search || statusFilter !== 'All' ? 'Try clearing your filters.' : 'Your jobs haven\'t received any applications yet.'}
      </p>
      {(search || statusFilter !== 'All') && (
        <Button variant="outline" className="mt-6" onClick={() => { setSearch(''); setStatusFilter('All'); }}>
          Clear Filters
        </Button>
      )}
    </>
  );

  return (
    <div className="py-8 px-8">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Global Applications</h1>
          <p className="text-zinc-500 mt-1">Review candidates across all your active job postings.</p>
        </div>
        
        <FilterToolbar 
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search names, email, or jobs..."
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          statusOptions={statusOptions}
        />
      </div>

      <ApplicationDataTable 
        applications={filtered}
        emptyMessage={emptyMessage}
        renderActions={(app) => (
          <div className="flex items-center gap-1">
            <Link href={`/recruiter/jobs/${app.job_id}/applications?candidate=${app.id}`}>
              <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity gap-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30">
                Review <ExternalLink className="w-3.5 h-3.5" />
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30"
              onClick={() => setDeleteTarget(app)}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Application</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete the application from{' '}
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">{deleteTarget?.candidate_name}</span>{' '}
              for <span className="font-semibold text-zinc-900 dark:text-zinc-100">{deleteTarget?.job_title}</span>?
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
