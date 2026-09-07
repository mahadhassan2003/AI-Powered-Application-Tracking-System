/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { JobCategory } from '../models/JobCategory';
import type { JobCreate } from '../models/JobCreate';
import type { JobResponse } from '../models/JobResponse';
import type { JobUpdate } from '../models/JobUpdate';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class JobsService {
    /**
     * Get Jobs
     * Get all jobs - Public endpoint for landing page and authenticated users
     * @param skip
     * @param limit
     * @param category
     * @param search
     * @returns any Successful Response
     * @throws ApiError
     */
    public static getJobsJobsGet(
        skip?: number,
        limit: number = 100,
        category?: (JobCategory | null),
        search?: (string | null),
    ): CancelablePromise<Array<Record<string, any>>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/jobs/',
            query: {
                'skip': skip,
                'limit': limit,
                'category': category,
                'search': search,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Create Job
     * @param requestBody
     * @returns JobResponse Successful Response
     * @throws ApiError
     */
    public static createJobJobsPost(
        requestBody: JobCreate,
    ): CancelablePromise<JobResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/jobs/',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Job
     * @param jobId
     * @returns JobResponse Successful Response
     * @throws ApiError
     */
    public static getJobJobsJobIdGet(
        jobId: number,
    ): CancelablePromise<JobResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/jobs/{job_id}',
            path: {
                'job_id': jobId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Update Job
     * @param jobId
     * @param requestBody
     * @returns JobResponse Successful Response
     * @throws ApiError
     */
    public static updateJobJobsJobIdPut(
        jobId: number,
        requestBody: JobUpdate,
    ): CancelablePromise<JobResponse> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/jobs/{job_id}',
            path: {
                'job_id': jobId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Delete Job
     * @param jobId
     * @returns any Successful Response
     * @throws ApiError
     */
    public static deleteJobJobsJobIdDelete(
        jobId: number,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/jobs/{job_id}',
            path: {
                'job_id': jobId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get My Jobs
     * @returns JobResponse Successful Response
     * @throws ApiError
     */
    public static getMyJobsJobsRecruiterMyJobsGet(): CancelablePromise<Array<JobResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/jobs/recruiter/my-jobs',
        });
    }
}
