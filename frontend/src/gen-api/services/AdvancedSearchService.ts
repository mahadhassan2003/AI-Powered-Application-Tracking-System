/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class AdvancedSearchService {
    /**
     * Advanced Job Search
     * Advanced job search with multiple filters
     * @param keywords Job title or description keywords
     * @param location
     * @param salaryMin
     * @param salaryMax
     * @param experienceLevel entry,mid,senior,executive
     * @param jobType full-time,part-time,contract,remote
     * @param companySize startup,small,medium,large
     * @param postedWithinDays Jobs posted within X days
     * @param skills Comma-separated required skills
     * @param sortBy relevance,date,salary
     * @returns any Successful Response
     * @throws ApiError
     */
    public static advancedJobSearchSearchJobsAdvancedSearchGet(
        keywords?: (string | null),
        location?: (string | null),
        salaryMin?: (number | null),
        salaryMax?: (number | null),
        experienceLevel?: (string | null),
        jobType?: (string | null),
        companySize?: (string | null),
        postedWithinDays?: (number | null),
        skills?: (string | null),
        sortBy?: (string | null),
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/search/jobs/advanced-search',
            query: {
                'keywords': keywords,
                'location': location,
                'salary_min': salaryMin,
                'salary_max': salaryMax,
                'experience_level': experienceLevel,
                'job_type': jobType,
                'company_size': companySize,
                'posted_within_days': postedWithinDays,
                'skills': skills,
                'sort_by': sortBy,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Advanced Candidate Search
     * Advanced candidate search for recruiters
     * @param skills Required skills
     * @param experienceMin
     * @param experienceMax
     * @param education
     * @param location
     * @param availability available,employed,not_looking
     * @param lastActiveDays
     * @returns any Successful Response
     * @throws ApiError
     */
    public static advancedCandidateSearchSearchCandidatesAdvancedSearchGet(
        skills?: (string | null),
        experienceMin?: (number | null),
        experienceMax?: (number | null),
        education?: (string | null),
        location?: (string | null),
        availability?: (string | null),
        lastActiveDays?: (number | null),
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/search/candidates/advanced-search',
            query: {
                'skills': skills,
                'experience_min': experienceMin,
                'experience_max': experienceMax,
                'education': education,
                'location': location,
                'availability': availability,
                'last_active_days': lastActiveDays,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
