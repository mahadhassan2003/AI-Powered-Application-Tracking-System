'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import clientApi from '@/lib/client-api';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, MapPin, DollarSign, Briefcase, Clock, Users, Tag, Building2, Send, Upload, CheckCircle2, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { JobDetail } from '@/types/api';

export default function CandidateJobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Job fetch state
  const [job, setJob] = useState<JobDetail | null>(null);
  const [jobLoading, setJobLoading] = useState(true);
  const [jobError, setJobError] = useState('');

  // Application form state
  const [coverLetter, setCoverLetter] = useState('');
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const fetchJob = async () => {
      try {
        const data = await clientApi.get(`/jobs/${id}`) as JobDetail;
        setJob(data);
      } catch (err: any) {
        setJobError('Failed to load job details');
      } finally {
        setJobLoading(false);
      }
    };
    fetchJob();
  }, [id]);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');

    try {
      const formData = new FormData();
      if (coverLetter) formData.append('cover_letter', coverLetter);
      if (resumeFile) formData.append('resume', resumeFile);

      await clientApi.post(`/applications/apply/${id}`, formData);
      setSuccess(true);

      setTimeout(() => {
        router.push('/candidate/dashboard');
      }, 3500);
    } catch (err: any) {
      setFormError(err.response?.data?.error || err.response?.data?.detail || 'Application failed to submit.');
    } finally {
      setSubmitting(false);
    }
  };

  // Loading state
  if (jobLoading) {
    return (
      <div className="flex-1 min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  // Error state
  if (jobError || !job) {
    return (
      <div className="flex-1 p-8 flex items-center justify-center">
        <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 rounded-2xl p-8 max-w-md w-full text-center">
          <h2 className="text-xl font-bold mb-2">Job Not Found</h2>
          <p className="text-sm opacity-80 mb-4">{jobError || 'This position may no longer be available.'}</p>
          <Link href="/candidate/jobs">
            <Button variant="outline">Back to Jobs</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="flex-1 p-8 flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="bg-white dark:bg-zinc-900 shadow-xl border border-zinc-200 dark:border-zinc-800 rounded-2xl p-10 max-w-md w-full text-center space-y-4">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
            <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-500" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">Application Submitted!</h2>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm">
            Your profile details and resume have been securely attached. Redirecting to your dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 lg:p-10 w-full">
      <Link href="/candidate/jobs" className="inline-flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-white mb-8 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Internal Board
      </Link>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* ═══════ LEFT: JOB DETAIL ═══════ */}
        <div className="xl:col-span-3 space-y-6">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-8">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-blue-500 flex items-center justify-center shadow-md shrink-0">
                <Building2 className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight leading-tight mb-1">
                  {job.title}
                </h1>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Posted by <span className="text-zinc-700 dark:text-zinc-300 font-medium">{job.recruiter_name}</span>
                  {job.created_at && (
                    <span className="ml-1">· {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}</span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 block">
              {job.location && (
                <span className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-3 py-1.5 rounded-full text-xs font-bold">
                  <MapPin className="w-3.5 h-3.5 text-rose-500" /> {job.location}
                </span>
              )}
              {job.salary_range && (
                <span className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-3 py-1.5 rounded-full text-xs font-bold">
                  <DollarSign className="w-3.5 h-3.5" /> {job.salary_range}
                </span>
              )}
              <span className="flex items-center gap-1.5 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 px-3 py-1.5 rounded-full text-xs font-bold">
                <Briefcase className="w-3.5 h-3.5" /> {job.category}
              </span>
              {job.applicant_count !== undefined && (
                <span className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 px-3 py-1.5 rounded-full text-xs font-bold">
                  <Users className="w-3.5 h-3.5" /> {job.applicant_count} applied
                </span>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-8">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-500" /> Job Description
            </h2>
            <div className="text-[15px] text-zinc-600 dark:text-zinc-400 leading-relaxed whitespace-pre-line">
              {job.description}
            </div>
          </div>

          {job.requirements && (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-8">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-blue-500" /> Requirements
              </h2>
              <div className="text-[15px] text-zinc-600 dark:text-zinc-400 leading-relaxed whitespace-pre-line">
                {job.requirements}
              </div>
            </div>
          )}

          {job.tags && job.tags.length > 0 && (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-8">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
                <Tag className="w-5 h-5 text-blue-500" /> Skills & Tags
              </h2>
              <div className="flex flex-wrap gap-2">
                {job.tags.map((tag) => (
                  <span key={tag} className="bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-3 py-1.5 rounded-full text-sm font-medium">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ═══════ RIGHT: APPLICATION FORM ═══════ */}
        <div className="xl:col-span-2">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm sticky top-6">
            <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 bg-blue-50/50 dark:bg-blue-900/10 rounded-t-2xl">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <Send className="w-5 h-5 text-blue-500" /> Apply via Profile
              </h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                Your existing profile parameters (Email, Name, etc) will automatically be attached to this application.
              </p>
            </div>

            <form onSubmit={handleApply} className="p-6 space-y-5">
              {formError && (
                <div className="p-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl">
                  {formError}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="resume" className="text-zinc-700 dark:text-zinc-300 font-semibold text-sm">Updated Resume (Optional)</Label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-xl p-5 text-center cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-500/5 transition-all"
                >
                  <input
                    type="file"
                    id="resume"
                    ref={fileInputRef}
                    accept=".pdf,.docx"
                    className="hidden"
                    onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                  />
                  {resumeFile ? (
                    <div className="flex items-center justify-center gap-2 text-sm font-medium text-green-600 dark:text-green-400">
                      <CheckCircle2 className="w-5 h-5" />
                      <span className="truncate max-w-[180px]">{resumeFile.name}</span>
                      <span className="text-zinc-400">({(resumeFile.size / 1024 / 1024).toFixed(1)} MB)</span>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <Upload className="w-8 h-8 text-zinc-400 mx-auto" />
                      <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">Click to attach a different resume</p>
                      <p className="text-xs text-zinc-400">If blank, your default resume will be used.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="coverLetter" className="text-zinc-700 dark:text-zinc-300 font-semibold text-sm">Cover Letter (Optional)</Label>
                <Textarea
                  id="coverLetter"
                  placeholder="Why are you a great fit for this specific role?"
                  className="h-28 resize-none rounded-xl border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500/50"
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                />
              </div>

              <Button
                type="submit"
                disabled={submitting}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-6 rounded-xl shadow-md hover:shadow-lg transition-all text-base disabled:opacity-50"
              >
                {submitting ? (
                  <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</span>
                ) : (
                  <span className="flex items-center gap-2"><Send className="w-4 h-4" /> Submit Application</span>
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
