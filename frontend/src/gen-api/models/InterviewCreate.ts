/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { InterviewType } from './InterviewType';
export type InterviewCreate = {
    application_id: number;
    scheduled_at: string;
    duration_minutes?: number;
    interview_type: InterviewType;
    meeting_link?: (string | null);
    location?: (string | null);
    notes?: (string | null);
};

