'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { useAuthStore } from '@/store/authStore';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Target, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.post('/api/auth/login', { email, password });
      const data = response.data;
      
      if (data.success) {
        setAuth(true, data.user);
        if (data.user.role === 'admin') {
          router.push('/admin');
        } else if (data.user.role === 'recruiter') {
          router.push('/recruiter/dashboard');
        } else {
          router.push('/candidate/dashboard');
        }
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full font-inter bg-white dark:bg-zinc-950">
      
      {/* Left Pane - Form */}
      <div className="flex w-full flex-col justify-center px-8 sm:px-12 md:w-1/2 lg:px-24">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-500/20">
              <Target className="h-6 w-6" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Equinox ATS</span>
          </div>
          
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Welcome back</h1>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            Enter your credentials to access your account.
          </p>

          <form onSubmit={handleLogin} className="mt-8 space-y-5">
            {error && (
              <div className="rounded-lg bg-red-50 p-4 text-sm font-medium text-red-600 dark:bg-red-500/10 dark:text-red-400 border border-red-200 dark:border-red-500/20">
                {error}
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Email address</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="you@example.com" 
                required 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="h-11 rounded-lg border-zinc-200 bg-white px-4 text-sm transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-zinc-800 dark:bg-zinc-900 dark:focus:border-blue-500 dark:focus:ring-blue-500/10"
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Password</Label>
                <a href="#" className="text-xs font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 transition-colors">
                  Forgot password?
                </a>
              </div>
              <Input 
                id="password" 
                type="password" 
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="h-11 rounded-lg border-zinc-200 bg-white px-4 text-sm transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-zinc-800 dark:bg-zinc-900 dark:focus:border-blue-500 dark:focus:ring-blue-500/10"
              />
            </div>

            <Button type="submit" className="group mt-6 h-11 w-full rounded-lg bg-blue-600 font-medium text-white transition-all hover:bg-blue-700 active:scale-[0.98]" disabled={loading}>
              {loading ? 'Signing in...' : (
                <span className="flex items-center justify-center gap-2">
                  Sign in
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              )}
            </Button>
          </form>

          <div className="mt-8 flex items-center justify-center">
            <span className="h-px w-full bg-zinc-200 dark:bg-zinc-800"></span>
            <span className="px-4 text-xs font-medium uppercase text-zinc-400 whitespace-nowrap">Or continue with</span>
            <span className="h-px w-full bg-zinc-200 dark:bg-zinc-800"></span>
          </div>

          <div className="mt-6">
            <Button variant="outline" className="h-11 w-full rounded-lg border-zinc-200 bg-white hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800 dark:text-zinc-100 transition-all font-medium">
              <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Google
            </Button>
          </div>

          <p className="mt-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
            Don&apos;t have an account?{' '}
            <button onClick={() => router.push('/signup')} className="font-semibold text-blue-600 hover:text-blue-500 dark:text-blue-400 transition-colors">
              Sign up
            </button>
          </p>
        </div>
      </div>
      
      {/* Right Pane - Visuals */}
      <div className="hidden md:flex md:w-1/2 items-center justify-center bg-zinc-50 dark:bg-zinc-900/50 p-12">
         <div className="relative h-full w-full max-w-2xl overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-800 shadow-2xl">
            {/* Decorative background elements */}
            <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-white/10 blur-3xl"></div>
            <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-blue-400/20 blur-3xl"></div>
            
            {/* Abstract UI representation */}
            <div className="absolute inset-x-8 inset-y-16 flex flex-col gap-6 rounded-2xl bg-white/10 p-8 shadow-2xl backdrop-blur-md border border-white/10 transform rotate-2 transition-transform hover:rotate-0 duration-700">
               <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-white/20"></div>
                  <div className="space-y-2">
                     <div className="h-3 w-32 rounded-full bg-white/80"></div>
                     <div className="h-2 w-20 rounded-full bg-white/40"></div>
                  </div>
               </div>
               <div className="grid grid-cols-2 gap-4 mt-6">
                  <div className="h-24 rounded-xl bg-white/10 border border-white/5"></div>
                  <div className="h-24 rounded-xl bg-white/10 border border-white/5"></div>
               </div>
               <div className="h-32 rounded-xl bg-white/10 border border-white/5 mt-auto"></div>
            </div>
            
            {/* Overlay Text */}
            <div className="absolute bottom-12 left-12 right-12 z-10">
               <h2 className="text-3xl font-bold text-white mb-2">Build your dream team.</h2>
               <p className="text-white/80 text-lg font-medium leading-relaxed">
                 Streamline your hiring process with AI-powered candidate matching and seamless recruiting workflows.
               </p>
            </div>
         </div>
      </div>
      
    </div>
  );
}
