/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type ApplicationResponse = {
    id: number;
    job_id: number;
    job_title: string;
    recruiter_name: string;
    candidate_name: string;
    candidate_email: string;
    status: string;
    cover_letter: (string | null);
    resume_path: (string | null);
    applied_at: string;
    updated_at: string;
    match_score?: (number | null);
    skill_match_score?: (number | null);
    experience_match_score?: (number | null);
    semantic_similarity_score?: (number | null);
};

