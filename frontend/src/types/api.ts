/**
 * Shared UI-facing API response types.
 *
 * Strategy:
 *  - Re-export generated types from gen-api when they already match page needs.
 *  - Add manual "display" types only for normalized frontend shapes the
 *    generator doesn't cover (e.g. admin stats, health checks).
 */

import type { ApplicationResponse } from '@/gen-api/models/ApplicationResponse';
import type { NotificationResponse } from '@/gen-api/models/NotificationResponse';
import type { ProfileResponse } from '@/gen-api/models/ProfileResponse';
import type { JobResponse as GenJobResponse } from '@/gen-api/models/JobResponse';
import type { OfferResponse as GenOfferResponse } from '@/gen-api/models/OfferResponse';
import type { InterviewResponse as GenInterviewResponse } from '@/gen-api/models/InterviewResponse';
import type { NegotiationResponse as GenNegotiationResponse } from '@/gen-api/models/NegotiationResponse';

export type { ApplicationResponse, NotificationResponse, ProfileResponse };
export type { GenNegotiationResponse as NegotiationResponse };

export interface JobResponse extends GenJobResponse {
  employment_type?: string | null;
}

export interface OfferResponse extends GenOfferResponse {
  custom_message?: string | null;
  response_action?: string | null;
  response_notes?: string | null;
}

/** Lightweight analytics returned by /offers/analytics/summary */
export interface OfferAnalytics {
  total_offers: number;
  accepted: number;
  declined: number;
  pending: number;
  expired: number;
  acceptance_rate: number;
  avg_response_time_hours?: number | null;
}

export interface InterviewResponse extends GenInterviewResponse {
  interviewer_name?: string | null;
  allow_reschedule?: boolean;
  decline_reason?: string | null;
  reschedule_window_start?: string | null;
  reschedule_window_end?: string | null;
  proposed_time?: string | null;
  reschedule_reason?: string | null;
  application_status?: string | null;
}

// ─── Manual display types (not in gen-api) ─────────────────────────────

/** Job detail page — includes employment_type which the list endpoint may omit. */
export interface JobDetail {
  id: number;
  title: string;
  description: string;
  requirements: string;
  location?: string | null;
  salary_range?: string | null;
  category: string;
  tags: string[];
  recruiter_name: string;
  created_at: string;
  applicant_count?: number | null;
  employment_type?: string | null;
}

/** Admin dashboard statistics. */
export interface AdminStats {
  total_users: number;
  total_recruiters: number;
  pending_recruiters: number;
  approved_recruiters: number;
}

/** User record as returned by admin endpoints. */
export interface AdminUser {
  id: number;
  name: string;
  email: string;
  location?: string | null;
  phone?: string | null;
  company_name?: string | null;
  company_website?: string | null;
  approval_status?: string | null;
  is_approved?: boolean | null;
  created_at: string;
  rejection_reason?: string | null;
}

/** Health check response shape. */
export interface HealthCheck {
  status: string;
  services: {
    api: string;
    redis: { status: string; used_memory_human?: string };
    celery: { status: string; active_workers: number; active_tasks: number; workers: string[] };
    database: { status: string };
    cache: { type: string; status: string; total_keys: number };
  };
}

// ─── Composite display types (merged views) ────────────────────────────

/** Candidate applications page merges apps + interviews + offers into one view. */
export interface UnifiedApplication {
  id: number;
  job_id: number;
  job_title: string;
  recruiter_name: string;
  candidate_name: string;
  candidate_email: string;
  status: string;
  cover_letter: string | null;
  resume_path: string | null;
  applied_at: string;
  updated_at: string;
  match_score?: number | null;
  skill_match_score?: number | null;
  experience_match_score?: number | null;
  semantic_similarity_score?: number | null;
  interview?: InterviewResponse | null;
  offer?: OfferResponse | null;
}

// ─── Email Operations Console types ────────────────────────────────

export interface EmailTemplate {
  id: number;
  recruiter_id: number;
  campaign_name: string;
  subject: string;
  body_content: string;
  category: string;
  created_at: string;
  updated_at: string;
}

export interface EmailCampaignResponse {
  id: number;
  campaign_name: string;
  status: string;
  audience_count: number;
  sent_count: number;
  failed_count: number;
  created_at: string;
  template_name: string | null;
}
