/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type InterviewResponse = {
    id: number;
    application_id: number;
    candidate_name: string;
    job_title: string;
    scheduled_at: string;
    duration_minutes: number;
    interview_type: string;
    status: string;
    meeting_link: (string | null);
    location: (string | null);
    notes: (string | null);
    candidate_confirmed: boolean;
};

