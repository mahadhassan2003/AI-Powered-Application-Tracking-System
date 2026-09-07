'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import clientApi from '@/lib/client-api';
import { useAuthStore } from '@/store/authStore';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Briefcase, ArrowRight, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default function RecruiterSignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companyWebsite, setCompanyWebsite] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await clientApi.post('/auth/signup', { 
        name, 
        email, 
        password, 
        company_name: companyName,
        company_website: companyWebsite,
        role: 'recruiter' 
      });
      
      // Attempt login immediately to see if they got approved instantly (unlikely by design, but checking)
      try {
        const loginRes = await axios.post('/api/auth/login', { email, password });
        const data = loginRes.data;

        if (data.success) {
          setAuth(true, data.user);
          router.push('/recruiter/dashboard');
          return;
        }
      } catch (loginErr: any) {
         // If login fails (due to pending status), handle gracefully
         if (loginErr.response?.data?.error?.includes('pending admin approval') || loginErr.response?.status === 403) {
            setSuccess(true);
            return;
         }
      }
      
      setSuccess(true);
      
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.detail || 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center font-inter bg-zinc-50 dark:bg-zinc-950">
        <div className="mx-auto flex w-full max-w-lg flex-col items-center justify-center text-center px-4">
           <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 mb-6">
              <CheckCircle2 className="h-10 w-10" />
           </div>
           <h1 className="text-3xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">Application Received</h1>
           <p className="mt-4 text-zinc-600 dark:text-zinc-400 max-w-sm mx-auto">
              Your employer account has been created. An administrator will review your application and approve your access shortly.
           </p>
           <Button className="mt-8 bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900" onClick={() => router.push('/')}>
             Return to home
           </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full font-inter bg-white dark:bg-zinc-950">
      
      {/* Left Pane - Form */}
      <div className="flex w-full flex-col justify-center px-8 sm:px-12 md:w-1/2 lg:px-24 py-12">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-0 flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2 mb-8 hover:opacity-80 transition-opacity">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-lg shadow-emerald-500/20">
                <Briefcase className="h-5 w-5" />
              </div>
              <span className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Equinox <span className="text-emerald-600 font-extrabold uppercase text-xs align-top ml-1">For Employers</span></span>
            </Link>
          </div>
          
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 leading-[1.1]">Join the enterprise network</h1>
          <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
            Source unparalleled talent. All in one place.
          </p>

          <form onSubmit={handleSignup} className="mt-8 space-y-4">
            {error && (
              <div className="rounded-lg bg-red-50 p-4 text-sm font-medium text-red-600 dark:bg-red-500/10 dark:text-red-400 border border-red-200 dark:border-red-500/20">
                {error}
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="companyName" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Company Name *</Label>
              <Input 
                id="companyName" 
                type="text" 
                placeholder="Acme Corp" 
                required 
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                disabled={loading}
                className="h-11 rounded-lg border-zinc-200 bg-white px-4 text-sm transition-all focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="companyWebsite" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Company Website</Label>
              <Input 
                id="companyWebsite" 
                type="url" 
                placeholder="https://acmecorp.com" 
                value={companyWebsite}
                onChange={(e) => setCompanyWebsite(e.target.value)}
                disabled={loading}
                className="h-11 rounded-lg border-zinc-200 bg-white px-4 text-sm transition-all focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
              />
            </div>

            <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 my-4"></div>

            <div className="grid grid-cols-1 gap-4">
               <div className="space-y-2">
                 <Label htmlFor="name" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Your Full Name *</Label>
                 <Input 
                   id="name" 
                   type="text" 
                   placeholder="Jane Manager" 
                   required 
                   value={name}
                   onChange={(e) => setName(e.target.value)}
                   disabled={loading}
                   className="h-11 rounded-lg border-zinc-200 bg-white px-4 text-sm transition-all focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                 />
               </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Work Email *</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="jane@acmecorp.com" 
                required 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="h-11 rounded-lg border-zinc-200 bg-white px-4 text-sm transition-all focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Password *</Label>
              <Input 
                id="password" 
                type="password" 
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="h-11 rounded-lg border-zinc-200 bg-white px-4 text-sm transition-all focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
              />
            </div>

            <Button type="submit" className="group mt-6 h-11 w-full rounded-lg bg-emerald-600 font-medium text-white transition-all hover:bg-emerald-700 active:scale-[0.98]" disabled={loading}>
              {loading ? 'Submitting Application...' : (
                <span className="flex items-center justify-center gap-2">
                  Request Employer Account
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              )}
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-zinc-500 dark:text-zinc-400 pb-12">
            Looking for a job?{' '}
            <button onClick={() => router.push('/signup')} className="font-semibold text-blue-600 hover:text-blue-500 dark:text-blue-400 transition-colors">
              Sign up as a Candidate
            </button>
          </p>
        </div>
      </div>
      
      {/* Right Pane - Visuals (Employer Vibe) */}
      <div className="hidden md:flex md:w-1/2 items-center justify-center bg-zinc-50 dark:bg-zinc-900/50 p-12">
         <div className="relative h-full w-full max-w-2xl overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-800 to-teal-600 shadow-2xl">
            {/* Decorative background elements */}
            <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-white/10 blur-3xl"></div>
            <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-emerald-400/20 blur-3xl"></div>
            
            {/* Abstract UI representation */}
            <div className="absolute inset-x-8 inset-y-16 flex flex-col gap-6 rounded-2xl bg-white/10 p-8 shadow-2xl backdrop-blur-md border border-white/10 transform rotate-2 transition-transform hover:rotate-0 duration-700">
               <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-lg bg-white/20"></div>
                  <div className="space-y-2">
                     <div className="h-3 w-48 rounded-full bg-white/80"></div>
                     <div className="h-2 w-32 rounded-full bg-white/40"></div>
                  </div>
               </div>
               
               {/* Dashboard metrics mockup */}
               <div className="grid grid-cols-3 gap-4 mt-8">
                  <div className="h-24 rounded-xl bg-white/10 border border-white/5 flex flex-col justify-end p-4">
                     <div className="h-2 w-8 bg-white/40 rounded-full mb-2"></div>
                     <div className="h-4 w-12 bg-white/80 rounded-full"></div>
                  </div>
                  <div className="h-24 rounded-xl bg-white/10 border border-white/5 flex flex-col justify-end p-4">
                     <div className="h-2 w-10 bg-white/40 rounded-full mb-2"></div>
                     <div className="h-4 w-16 bg-white/80 rounded-full"></div>
                  </div>
                  <div className="h-24 rounded-xl bg-white/10 border border-white/5 flex flex-col justify-end p-4">
                     <div className="h-2 w-6 bg-white/40 rounded-full mb-2"></div>
                     <div className="h-4 w-10 bg-white/80 rounded-full"></div>
                  </div>
               </div>
               
               <div className="h-32 rounded-xl bg-white/10 border border-white/5 mt-auto"></div>
            </div>
            
            {/* Overlay Text */}
            <div className="absolute bottom-12 left-12 right-12 z-10 text-white">
              <h2 className="text-3xl font-black mb-2 tracking-tight">Hire with data.</h2>
              <p className="text-emerald-100 font-medium">Equinox analyzes thousands of candidates semantic profiles to find your perfect match in milliseconds.</p>
            </div>
         </div>
      </div>
    </div>
  );
}
