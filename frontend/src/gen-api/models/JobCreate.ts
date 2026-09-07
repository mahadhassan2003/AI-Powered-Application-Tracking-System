/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { JobCategory } from './JobCategory';
export type JobCreate = {
    title: string;
    description: string;
    requirements: string;
    location?: (string | null);
    salary_range?: (string | null);
    category?: JobCategory;
    tags?: (Array<string> | null);
};

