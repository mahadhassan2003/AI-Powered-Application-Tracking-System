'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import clientApi from '@/lib/client-api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { useState } from 'react';
import Link from 'next/link';
import { Plus, Search, MapPin, Users, Trash2, Pencil, ExternalLink, BriefcaseBusiness, Sparkles, Loader2 } from 'lucide-react';
import axios from 'axios';
import type { JobResponse } from '@/types/api';
import type { JobCreate } from '@/types/payloads';
import type { JobCategory } from '@/gen-api/models/JobCategory';

export default function RecruiterJobsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  // Form state
  const [form, setForm] = useState({ title: '', description: '', requirements: '', location: '', salary_range: '', category: 'other', tags: '' });
  const [generating, setGenerating] = useState<'description' | 'requirements' | null>(null);

  const handleAIGenerate = async (field: 'description' | 'requirements') => {
    if (!form.title) { alert('Please enter a Job Title first so the AI knows what to generate.'); return; }
    setGenerating(field);
    try {
      const res = await axios.post('/api/ai/generate-job-content', {
        title: form.title,
        location: form.location,
        category: form.category,
        field,
      });
      if (res.data.content) {
        setForm(prev => ({ ...prev, [field]: res.data.content }));
      }
    } catch (err) {
      alert('AI generation failed. Please check your GROQ_API_KEY.');
    } finally {
      setGenerating(null);
    }
  };

  const { data: jobs, isLoading } = useQuery<JobResponse[]>({
    queryKey: ['recruiter-jobs'],
    queryFn: () => clientApi.get('/jobs/recruiter/my-jobs'),
  });

  const createMutation = useMutation({
    mutationFn: (data: JobCreate) => clientApi.post('/jobs/', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recruiter-jobs'] });
      setCreateOpen(false);
      setForm({ title: '', description: '', requirements: '', location: '', salary_range: '', category: 'other', tags: '' });
    },
    onError: (error: any) => {
      const detail = error?.response?.data?.detail || error?.message || 'Failed to create job. Please try again.';
      alert(`Error: ${detail}`);
    },
  });

  const [editingJob, setEditingJob] = useState<any>(null);
  const [editForm, setEditForm] = useState({ title: '', description: '', requirements: '', location: '', salary_range: '', category: '', tags: '' });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: JobCreate }) => clientApi.put(`/jobs/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recruiter-jobs'] });
      setEditingJob(null);
    },
    onError: (error: any) => {
      const detail = error?.response?.data?.detail || error?.message || 'Failed to update job. Please try again.';
      alert(`Error: ${detail}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (jobId: number) => clientApi.delete(`/jobs/${jobId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recruiter-jobs'] }),
  });

  const handleCreate = () => {
    createMutation.mutate({
      ...form,
      category: form.category as JobCategory,
      tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
    });
  };

  const filtered = (jobs || []).filter((job) =>
    !search || job.title.toLowerCase().includes(search.toLowerCase()) || job.location?.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="py-24 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-r-transparent" />
        <p className="mt-4 text-zinc-500">Loading your postings...</p>
      </div>
    );
  }

  return (
    <div className="py-8 px-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Jobs</h1>
          <p className="text-zinc-500 mt-1">{filtered.length} active posting{filtered.length !== 1 ? 's' : ''}</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <Input
              placeholder="Search jobs..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 w-64"
            />
          </div>

          {/* Create Dialog */}
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger>
              <span className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors cursor-pointer">
                <Plus className="w-4 h-4" /> New Job
              </span>
            </DialogTrigger>
            <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Job Posting</DialogTitle>
                <DialogDescription>Fill in the details below. Candidates will see this on the public job board.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Job Title *</Label>
                  <Input id="title" placeholder="e.g. Senior AI Engineer" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input id="location" placeholder="e.g. Islamabad, Pakistan" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="salary">Salary Range</Label>
                    <Input id="salary" placeholder="e.g. $80k - $120k" value={form.salary_range} onChange={e => setForm({ ...form, salary_range: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <select
                    id="category"
                    className="w-full rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2 text-sm"
                    value={form.category}
                    onChange={e => setForm({ ...form, category: e.target.value })}
                  >
                    <option value="it">IT</option>
                    <option value="engineering">Engineering</option>
                    <option value="design">Design</option>
                    <option value="marketing">Marketing</option>
                    <option value="sales">Sales</option>
                    <option value="operations">Operations</option>
                    <option value="hr">HR</option>
                    <option value="finance">Finance</option>
                    <option value="healthcare">Healthcare</option>
                    <option value="education">Education</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="description">Description *</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1.5 text-xs text-violet-600 hover:text-violet-700 hover:bg-violet-50 dark:text-violet-400 dark:hover:bg-violet-950"
                      disabled={generating !== null}
                      onClick={() => handleAIGenerate('description')}
                    >
                      {generating === 'description' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                      {generating === 'description' ? 'Generating...' : 'Generate with AI'}
                    </Button>
                  </div>
                  <Textarea id="description" placeholder="Describe the role, responsibilities, and what makes it exciting..." className="h-32" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="requirements">Requirements *</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1.5 text-xs text-violet-600 hover:text-violet-700 hover:bg-violet-50 dark:text-violet-400 dark:hover:bg-violet-950"
                      disabled={generating !== null}
                      onClick={() => handleAIGenerate('requirements')}
                    >
                      {generating === 'requirements' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                      {generating === 'requirements' ? 'Generating...' : 'Generate with AI'}
                    </Button>
                  </div>
                  <Textarea id="requirements" placeholder="List qualifications, skills, and experience needed..." className="h-32" value={form.requirements} onChange={e => setForm({ ...form, requirements: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tags">Tags (comma-separated)</Label>
                  <Input id="tags" placeholder="e.g. python, react, ai" value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                <Button onClick={handleCreate} disabled={!form.title || !form.description || !form.requirements || createMutation.isPending}>
                  {createMutation.isPending ? 'Publishing...' : 'Publish Job'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Jobs Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-24 border border-dashed rounded-xl bg-white dark:bg-zinc-900">
          <BriefcaseBusiness className="w-12 h-12 mx-auto text-zinc-300 dark:text-zinc-700 mb-4" />
          <h3 className="text-lg font-semibold mb-1">No jobs found</h3>
          <p className="text-zinc-500 text-sm mb-6">{search ? 'Try adjusting your search.' : 'Create your first job posting to start attracting talent.'}</p>
          {!search && (
            <Button onClick={() => setCreateOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" /> Create First Job
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((job) => (
            <Card key={job.id} className="group hover:shadow-lg transition-all duration-200 border-zinc-200 dark:border-zinc-800 hover:border-blue-300 dark:hover:border-blue-700">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg leading-snug group-hover:text-blue-600 transition-colors truncate">
                      {job.title}
                    </CardTitle>
                    <div className="flex items-center gap-1.5 mt-1.5 text-xs text-zinc-500">
                      <MapPin className="w-3 h-3" />
                      <span>{job.location || 'Remote'}</span>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-[10px] shrink-0 uppercase">
                    {job.category}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 line-clamp-2 mb-4">
                  {job.description}
                </p>

                {/* Tags */}
                {job.tags && job.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {job.tags.slice(0, 4).map((tag: string) => (
                      <span key={tag} className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400 border border-blue-100 dark:border-blue-900">
                        {tag}
                      </span>
                    ))}
                    {job.tags.length > 4 && (
                      <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                        +{job.tags.length - 4}
                      </span>
                    )}
                  </div>
                )}

                {/* Stats Row */}
                <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800">
                  <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                    <Users className="w-3.5 h-3.5" />
                    <span>{job.applicant_count || 0} applicants</span>
                  </div>
                  <div className="text-[10px] text-zinc-400">
                    {job.salary_range || 'Salary undisclosed'}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-4">
                  <Link href={`/recruiter/jobs/${job.id}/applications`} className="flex-1">
                    <Button variant="default" size="sm" className="w-full gap-1.5 text-xs">
                      <ExternalLink className="w-3 h-3" /> Pipeline
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1 text-xs"
                    onClick={() => {
                      setEditingJob(job);
                      setEditForm({
                        title: job.title,
                        description: job.description,
                        requirements: job.requirements,
                        location: job.location || '',
                        salary_range: job.salary_range || '',
                        category: job.category || 'other',
                        tags: job.tags ? job.tags.join(', ') : '',
                      });
                    }}
                  >
                    <Pencil className="w-3 h-3" /> Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950 border-zinc-200 dark:border-zinc-800"
                    onClick={() => {
                      if (confirm(`Delete "${job.title}"? This cannot be undone.`)) {
                        deleteMutation.mutate(job.id);
                      }
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {/* Edit Job Dialog */}
      <Dialog open={!!editingJob} onOpenChange={(open) => { if (!open) setEditingJob(null); }}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Job Posting</DialogTitle>
            <DialogDescription>Update the job details below. Changes will be reflected on the public job board.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Job Title *</Label>
              <Input id="edit-title" value={editForm.title} onChange={e => setEditForm({ ...editForm, title: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-location">Location</Label>
                <Input id="edit-location" value={editForm.location} onChange={e => setEditForm({ ...editForm, location: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-salary">Salary Range</Label>
                <Input id="edit-salary" value={editForm.salary_range} onChange={e => setEditForm({ ...editForm, salary_range: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-category">Category</Label>
              <select
                id="edit-category"
                className="w-full rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2 text-sm"
                value={editForm.category}
                onChange={e => setEditForm({ ...editForm, category: e.target.value })}
              >
                <option value="it">IT</option>
                <option value="engineering">Engineering</option>
                <option value="design">Design</option>
                <option value="marketing">Marketing</option>
                <option value="sales">Sales</option>
                <option value="operations">Operations</option>
                <option value="hr">HR</option>
                <option value="finance">Finance</option>
                <option value="healthcare">Healthcare</option>
                <option value="education">Education</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="edit-description">Description *</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1.5 text-xs text-violet-600 hover:text-violet-700 hover:bg-violet-50 dark:text-violet-400 dark:hover:bg-violet-950"
                  disabled={generating !== null}
                  onClick={async () => {
                    if (!editForm.title) return;
                    setGenerating('description');
                    try {
                      const res = await axios.post('/api/ai/generate-job-content', { title: editForm.title, location: editForm.location, category: editForm.category, field: 'description' });
                      if (res.data.content) setEditForm(prev => ({ ...prev, description: res.data.content }));
                    } catch { } finally { setGenerating(null); }
                  }}
                >
                  {generating === 'description' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                  {generating === 'description' ? 'Generating...' : 'Generate with AI'}
                </Button>
              </div>
              <Textarea id="edit-description" className="h-32" value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="edit-requirements">Requirements *</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1.5 text-xs text-violet-600 hover:text-violet-700 hover:bg-violet-50 dark:text-violet-400 dark:hover:bg-violet-950"
                  disabled={generating !== null}
                  onClick={async () => {
                    if (!editForm.title) return;
                    setGenerating('requirements');
                    try {
                      const res = await axios.post('/api/ai/generate-job-content', { title: editForm.title, location: editForm.location, category: editForm.category, field: 'requirements' });
                      if (res.data.content) setEditForm(prev => ({ ...prev, requirements: res.data.content }));
                    } catch { } finally { setGenerating(null); }
                  }}
                >
                  {generating === 'requirements' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                  {generating === 'requirements' ? 'Generating...' : 'Generate with AI'}
                </Button>
              </div>
              <Textarea id="edit-requirements" className="h-32" value={editForm.requirements} onChange={e => setEditForm({ ...editForm, requirements: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-tags">Tags (comma-separated)</Label>
              <Input id="edit-tags" value={editForm.tags} onChange={e => setEditForm({ ...editForm, tags: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingJob(null)}>Cancel</Button>
            <Button
              onClick={() => {
                if (!editingJob) return;
                updateMutation.mutate({
                  id: editingJob.id,
                  data: {
                    ...editForm,
                    category: editForm.category as JobCategory,
                    tags: editForm.tags ? editForm.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
                  },
                });
              }}
              disabled={!editForm.title || !editForm.description || !editForm.requirements || updateMutation.isPending}
            >
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
