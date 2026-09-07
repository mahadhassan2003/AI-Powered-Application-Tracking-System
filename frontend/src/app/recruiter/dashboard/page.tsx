import { serverFetch } from '@/lib/server-api';
import { redirect } from 'next/navigation';
import { Users, Calendar, HandshakeIcon, Clock, Mail } from 'lucide-react';
import type { ApplicationResponse, JobResponse, OfferResponse, InterviewResponse } from '@/types/api';

import {
  NeedsAttentionPanel,
  QuickActionsBar,
  CommandKpiGrid,
  TodaysInterviewsCard,
  PendingNegotiationsCard,
  ExpiringOffersCard,
  TopCandidatesCard,
  RecentApplicationsCard,
  ActiveJobsCard,
} from '@/components/recruiter/dashboard';

export const revalidate = 0; // Never cache — always fresh data

async function fetchDashboardData() {
  try {
    const [jobs, applications, offers, interviews] = await Promise.allSettled([
      serverFetch<JobResponse[]>('/jobs/recruiter/my-jobs'),
      serverFetch<ApplicationResponse[]>('/applications/recruiter/all-applications'),
      serverFetch<OfferResponse[]>('/offers/'),
      serverFetch<InterviewResponse[]>('/interviews/my-interviews'),
    ]);

    return {
      jobs: jobs.status === 'fulfilled' ? jobs.value : [],
      applications: applications.status === 'fulfilled' ? applications.value : [],
      offers: offers.status === 'fulfilled' ? offers.value : [],
      interviews: interviews.status === 'fulfilled' ? interviews.value : [],
    };
  } catch (err: any) {
    if (err.message?.includes('Unauthorized')) redirect('/login');
    return { jobs: [], applications: [], offers: [], interviews: [] };
  }
}

export default async function RecruiterDashboard() {
  const { jobs, applications, offers, interviews } = await fetchDashboardData();

  // ── Derive all dashboard state ──────────────────────────────────────

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
  const in2Days = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Applications
  const totalApplications = applications.length;
  const pendingReview = applications.filter(a => a.status === 'applied').length;
  const interviewStage = applications.filter(a => a.status === 'interview').length;
  const rejected = applications.filter(a => a.status === 'rejected').length;
  const scoredApps = applications.filter(a => a.match_score != null);
  const avgScore = scoredApps.length > 0
    ? Math.round(scoredApps.reduce((sum, a) => sum + (a.match_score ?? 0), 0) / scoredApps.length)
    : 0;
  const topCandidates = applications
    .filter(a => a.match_score != null && (a.match_score ?? 0) >= 70)
    .sort((a, b) => (b.match_score ?? 0) - (a.match_score ?? 0))
    .slice(0, 5);
  const recentApplications = applications.slice(0, 6);

  // Interviews
  const todaysInterviews = interviews.filter(iv => {
    const d = new Date(iv.scheduled_at);
    return d >= todayStart && d < todayEnd && iv.status !== 'cancelled';
  });
  const pendingConfirmations = interviews.filter(iv =>
    iv.status === 'scheduled' && !iv.candidate_confirmed
  );
  const rescheduleRequests = interviews.filter(iv =>
    iv.status === 'reschedule_requested'
  );

  // Offers
  const pendingOffers = offers.filter(o =>
    o.status === 'pending' || o.status === 'sent' || o.status === 'negotiation'
  );
  const expiringSoon = offers.filter(o => {
    if (!o.expires_at || o.status === 'accepted' || o.status === 'declined') return false;
    const exp = new Date(o.expires_at);
    return exp > now && exp <= in7Days;
  });
  const expiringCritical = expiringSoon.filter(o => {
    const exp = new Date(o.expires_at!);
    return exp <= in2Days;
  });
  const viewedNoResponse = offers.filter(o =>
    o.viewed_at && !o.responded_at && (o.status === 'sent' || o.status === 'pending')
  );
  const pendingNegotiations = offers.filter(o => o.status === 'negotiation').length;

  // ── Attention items ──────────────────────────────────────────────────

  const attentionItems = [
    {
      label: 'Candidates Awaiting Review',
      count: pendingReview,
      href: '/recruiter/applications',
      icon: <Users className="w-5 h-5" />,
      urgency: pendingReview > 10 ? 'critical' as const : 'info' as const,
    },
    {
      label: 'Interviews Need Action Today',
      count: todaysInterviews.length,
      href: '/recruiter/interviews',
      icon: <Calendar className="w-5 h-5" />,
      urgency: 'warning' as const,
    },
    {
      label: 'Reschedule Requests',
      count: rescheduleRequests.length,
      href: '/recruiter/interviews',
      icon: <Clock className="w-5 h-5" />,
      urgency: 'critical' as const,
    },
    {
      label: 'Offers Expiring Soon',
      count: expiringSoon.length,
      href: '/recruiter/offers',
      icon: <Clock className="w-5 h-5" />,
      urgency: expiringCritical.length > 0 ? 'critical' as const : 'warning' as const,
    },
    {
      label: 'Negotiations Awaiting Response',
      count: pendingNegotiations,
      href: '/recruiter/offers',
      icon: <HandshakeIcon className="w-5 h-5" />,
      urgency: 'warning' as const,
    },
  ];

  // ── Render ───────────────────────────────────────────────────────────

  return (
    <div className="py-8 px-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight">Command Center</h1>
        <p className="text-zinc-500 mt-1">What needs your attention right now.</p>
      </div>

      {/* 1. Needs Attention */}
      <NeedsAttentionPanel items={attentionItems} />

      {/* 2. Quick Actions */}
      <QuickActionsBar />

      {/* 3. KPI Grid */}
      <CommandKpiGrid
        activeJobs={jobs.length}
        totalApplicants={totalApplications}
        pendingReview={pendingReview}
        inInterview={interviewStage}
        rejected={rejected}
        avgScore={avgScore}
        topTierCount={topCandidates.length}
        pendingNegotiations={pendingNegotiations}
        expiringOffers={expiringSoon.length}
      />

      {/* 4. Operational Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <TodaysInterviewsCard
          todaysInterviews={todaysInterviews}
          pendingConfirmations={pendingConfirmations}
          rescheduleRequests={rescheduleRequests}
        />
        <PendingNegotiationsCard pendingOffers={pendingOffers} />
        <ExpiringOffersCard
          expiringSoon={expiringSoon}
          expiringCritical={expiringCritical}
          viewedNoResponse={viewedNoResponse}
        />
      </div>

      {/* 5. Existing detail panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <TopCandidatesCard topCandidates={topCandidates} />
        <RecentApplicationsCard recentApplications={recentApplications} />
      </div>

      {/* 6. Active Jobs */}
      <ActiveJobsCard jobs={jobs} />
    </div>
  );
}
