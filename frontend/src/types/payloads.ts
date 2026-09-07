/**
 * Request payload types for API mutations.
 *
 * Strategy:
 *  - Re-export generated payload types from gen-api when they fit.
 *  - Add manual payload types only for shapes the generator doesn't cover.
 */

// ─── Re-exports from generated OpenAPI types ───────────────────────────
export type { JobCreate } from '@/gen-api/models/JobCreate';
export type { JobUpdate } from '@/gen-api/models/JobUpdate';
export type { OfferCreate } from '@/gen-api/models/OfferCreate';
export type { OfferUpdate } from '@/gen-api/models/OfferUpdate';
export type { NegotiationCreate } from '@/gen-api/models/NegotiationCreate';
export type { InterviewCreate } from '@/gen-api/models/InterviewCreate';
export type { UserSignup } from '@/gen-api/models/UserSignup';
export type { UserLogin } from '@/gen-api/models/UserLogin';
export type { ChangePasswordRequest } from '@/gen-api/models/ChangePasswordRequest';
export type { ProfileUpdate } from '@/gen-api/models/ProfileUpdate';
export type { BulkStatusUpdate } from '@/gen-api/models/BulkStatusUpdate';
export type { StatusUpdate } from '@/gen-api/models/StatusUpdate';
export type { SMTPSettingsRequest } from '@/gen-api/models/SMTPSettingsRequest';
export type { TestEmailRequest } from '@/gen-api/models/TestEmailRequest';
export type { BulkRejectionRequest } from '@/gen-api/models/BulkRejectionRequest';

// ─── Manual payload types (not in gen-api) ─────────────────────────────

/** AI salary assessment request. */
export interface SalaryAssessPayload {
  position_title: string;
  base_salary: number;
  currency: string;
  location: string;
}

/** AI offer draft generation request. */
export interface OfferDraftPayload {
  candidate_name: string;
  position_title: string;
  base_salary: number;
  currency: string;
  signing_bonus: number;
  stock_options: number;
  benefits_summary: string;
}

/** AI job content generation request. */
export interface JobContentGeneratePayload {
  title: string;
  location?: string;
  category?: string;
  field: 'description' | 'requirements';
}

// ─── Interview action payloads ─────────────────────────────────────────

/** Payload when marking an interview as completed with feedback notes. */
export interface MarkInterviewCompletePayload {
  id: number;
  notes: string;
}

/** Payload when cancelling an interview. */
export interface CancelInterviewPayload {
  id: number;
}

/** Payload when a recruiter manually reschedules an interview. */
export interface RescheduleInterviewPayload {
  id: number;
  scheduled_at: string;
  notes?: string;
}

/** Payload when declining a candidate's reschedule request. */
export interface DeclineReschedulePayload {
  id: number;
  reason: string;
}

/** Payload when approving a candidate's reschedule request. */
export interface ApproveReschedulePayload {
  id: number;
  notes?: string | null;
}

// ─── Offer action payloads ─────────────────────────────────────────────

/** Payload when a recruiter counter-proposes during negotiation. */
export interface CounterNegotiationPayload {
  offer_id: number;
  initiated_by: 'recruiter';
  proposed_salary?: number | null;
  proposed_benefits?: string | null;
  proposed_signing_bonus?: number | null;
  proposed_stock_options?: number | null;
  reasoning: string;
}

/** Payload when withdrawing an offer. */
export interface WithdrawOfferPayload {
  id: number;
}
