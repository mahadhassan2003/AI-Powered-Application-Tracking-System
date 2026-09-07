'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import clientApi from '@/lib/client-api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuthStore } from '@/store/authStore';

export default function ApplyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [coverLetter, setCoverLetter] = useState('');
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const router = useRouter();
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      if (!isLoggedIn) {
        if (!name || !email) {
            setError('Name and Email are required for guest applications.');
            setLoading(false);
            return;
        }
        formData.append('name', name);
        formData.append('email', email);
      }
      
      if (coverLetter) formData.append('cover_letter', coverLetter);
      if (resumeFile) formData.append('resume', resumeFile);

      // We determine endpoint based on logged-in status
      // We route to our dynamic Next.js BFF Proxy
      const endpoint = isLoggedIn 
            ? `/applications/apply/${id}` 
            : `/applications/apply/${id}/guest`;

      // axios automatically detects FormData and sets appropriate multipart headers WITH the boundary
      const response: any = await clientApi.post(endpoint, formData);
      
      setSuccess(true);
      
      // Navigate appropriately after applying
      setTimeout(() => {
        if (isLoggedIn) {
          router.push('/candidate/dashboard');
        } else {
          router.push('/');
        }
      }, 3500);

    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || err.response?.data?.detail || 'Application failed to submit. Please check your resume size.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
     return (
        <div className="flex h-[80vh] w-full items-center justify-center font-inter">
            <div className="text-center space-y-4 max-w-md mx-auto p-6">
              <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20 shadow-sm border border-green-200 dark:border-green-800">
                 <svg className="h-10 w-10 text-green-600 dark:text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                 </svg>
              </div>
              <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Application Received!</h2>
              {isLoggedIn ? (
                 <p className="text-zinc-500 dark:text-zinc-400 font-medium">Your resume is securely queued. Redirecting to your dashboard...</p>
              ) : (
                 <p className="text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed">
                   Great job! We have queued your resume for AI matching and dispatched a confirmation email. 
                   Redirecting to the homepage...
                 </p>
              )}
            </div>
        </div>
     );
  }

  return (
    <div className="max-w-2xl mx-auto py-12 px-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Apply for Job #{id}</CardTitle>
          <CardDescription>
            {isLoggedIn 
               ? "Submit your application. Your profile details will be attached automatically."
               : "You are applying as a Guest. Consider creating an account to track your status live!"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleApply} className="space-y-6">
            {error && (
              <div className="p-3 text-sm text-red-500 bg-red-100 rounded-md">
                {error}
              </div>
            )}
            
            {!isLoggedIn && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <input
                    id="name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950 dark:ring-offset-zinc-950 dark:focus-visible:ring-zinc-300"
                    placeholder="John Doe"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950 dark:ring-offset-zinc-950 dark:focus-visible:ring-zinc-300"
                    placeholder="john@example.com"
                  />
                </div>
              </div>
            )}
            
            <div className="space-y-2 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg p-6 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors">
               <Label htmlFor="resume" className="text-base">Upload Resume (PDF / DOCX)</Label>
               <input
                 type="file"
                 id="resume"
                 ref={fileInputRef}
                 accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                 className="block w-full text-sm text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                 onChange={(e: React.ChangeEvent<HTMLInputElement>) => setResumeFile(e.target.files?.[0] || null)}
               />
               {resumeFile && (
                  <p className="text-sm font-medium text-green-600 mt-2">
                     Selected: {resumeFile.name} ({(resumeFile.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
               )}
            </div>

            <div className="space-y-2">
               <Label htmlFor="coverLetter">Cover Letter (Optional)</Label>
               <Textarea 
                 id="coverLetter" 
                 placeholder="Why are you a great fit?" 
                 className="h-32"
                 value={coverLetter}
                 onChange={(e) => setCoverLetter(e.target.value)}
               />
            </div>

            <Button type="submit" size="lg" className="w-full" disabled={loading || (!resumeFile && !isLoggedIn)}>
              {loading ? 'Transmitting Securely...' : 'Submit Final Application'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
