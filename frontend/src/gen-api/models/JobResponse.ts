/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type JobResponse = {
    id: number;
    title: string;
    description: string;
    requirements: string;
    location: (string | null);
    salary_range: (string | null);
    category: string;
    tags: Array<string>;
    recruiter_name: string;
    created_at: string;
    applicant_count?: (number | null);
};

