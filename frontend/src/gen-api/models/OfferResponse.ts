/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type OfferResponse = {
    id: number;
    application_id: number;
    job_id: number;
    candidate_id: number;
    candidate_name?: (string | null);
    candidate_email?: (string | null);
    position_title: string;
    base_salary: number;
    currency: string;
    start_date: string;
    employment_type: string;
    location: (string | null);
    signing_bonus: number;
    stock_options: number;
    benefits_summary: (string | null);
    status: string;
    created_at: string;
    sent_at: (string | null);
    viewed_at: (string | null);
    expires_at: (string | null);
    responded_at: (string | null);
};

