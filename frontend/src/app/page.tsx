import { serverFetch } from '@/lib/server-api';
import JobBoardClient from '@/components/JobBoardClient';

// Force fully dynamic rendering so new jobs appear immediately
export const dynamic = 'force-dynamic';

export default async function LandingPage() {
  let jobs: any[] = [];
  let errorStr = '';

  try {
    // We are running on the server here.
    jobs = await serverFetch<any[]>('/jobs');
  } catch (err: any) {
    errorStr = err.message || 'Failed to fetch jobs';
  }

  if (errorStr) {
     return (
        <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-zinc-950 to-zinc-950">
           <div className="bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl p-8 max-w-lg w-full shadow-2xl backdrop-blur-md text-center">
              <h2 className="text-xl font-bold mb-2">Network Disconnect</h2>
              <p className="text-sm opacity-80">{errorStr}</p>
           </div>
        </div>
     );
  }

  // Pass server-fetched jobs cleanly down to our interactive client filter engine
  return <JobBoardClient initialJobs={jobs} />;
}
