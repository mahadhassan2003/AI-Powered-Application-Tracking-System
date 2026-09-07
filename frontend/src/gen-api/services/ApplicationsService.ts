/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApplicationResponse } from '../models/ApplicationResponse';
import type { Body_apply_to_job_applications_apply__job_id__post } from '../models/Body_apply_to_job_applications_apply__job_id__post';
import type { Body_apply_to_job_guest_applications_apply__job_id__guest_post } from '../models/Body_apply_to_job_guest_applications_apply__job_id__guest_post';
import type { BulkStatusUpdate } from '../models/BulkStatusUpdate';
import type { CandidateSearchResponse } from '../models/CandidateSearchResponse';
import type { StatusUpdate } from '../models/StatusUpdate';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class ApplicationsService {
    /**
     * Apply To Job Guest
     * Quick apply without account: name, email, resume, optional cover letter. Creates or reuses candidate user.
     * @param jobId
     * @param formData
     * @returns ApplicationResponse Successful Response
     * @throws ApiError
     */
    public static applyToJobGuestApplicationsApplyJobIdGuestPost(
        jobId: number,
        formData: Body_apply_to_job_guest_applications_apply__job_id__guest_post,
    ): CancelablePromise<ApplicationResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/applications/apply/{job_id}/guest',
            path: {
                'job_id': jobId,
            },
            formData: formData,
            mediaType: 'multipart/form-data',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Apply To Job
     * @param jobId
     * @param coverLetter
     * @param formData
     * @returns ApplicationResponse Successful Response
     * @throws ApiError
     */
    public static applyToJobApplicationsApplyJobIdPost(
        jobId: number,
        coverLetter?: (string | null),
        formData?: Body_apply_to_job_applications_apply__job_id__post,
    ): CancelablePromise<ApplicationResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/applications/apply/{job_id}',
            path: {
                'job_id': jobId,
            },
            query: {
                'cover_letter': coverLetter,
            },
            formData: formData,
            mediaType: 'multipart/form-data',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get My Applications
     * @returns ApplicationResponse Successful Response
     * @throws ApiError
     */
    public static getMyApplicationsApplicationsMyApplicationsGet(): CancelablePromise<Array<ApplicationResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/applications/my-applications',
        });
    }
    /**
     * Get Job Applications
     * @param jobId
     * @returns ApplicationResponse Successful Response
     * @throws ApiError
     */
    public static getJobApplicationsApplicationsJobJobIdApplicationsGet(
        jobId: number,
    ): CancelablePromise<Array<ApplicationResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/applications/job/{job_id}/applications',
            path: {
                'job_id': jobId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get All Applications For Recruiter
     * @returns ApplicationResponse Successful Response
     * @throws ApiError
     */
    public static getAllApplicationsForRecruiterApplicationsRecruiterAllApplicationsGet(): CancelablePromise<Array<ApplicationResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/applications/recruiter/all-applications',
        });
    }
    /**
     * Update Application Status
     * @param applicationId
     * @param requestBody
     * @returns ApplicationResponse Successful Response
     * @throws ApiError
     */
    public static updateApplicationStatusApplicationsApplicationIdStatusPut(
        applicationId: number,
        requestBody: StatusUpdate,
    ): CancelablePromise<ApplicationResponse> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/applications/{application_id}/status',
            path: {
                'application_id': applicationId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Bulk Update Application Status
     * Bulk-update the status of multiple applications (recruiter only).
     * Only applications that belong to jobs owned by this recruiter are updated.
     * @param requestBody
     * @returns any Successful Response
     * @throws ApiError
     */
    public static bulkUpdateApplicationStatusApplicationsBulkUpdatePatch(
        requestBody: BulkStatusUpdate,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/applications/bulk-update',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Application
     * Fetch a single application by ID.
     * Candidates can only retrieve their own applications.
     * Recruiters can retrieve any application on a job they own.
     * @param applicationId
     * @returns ApplicationResponse Successful Response
     * @throws ApiError
     */
    public static getApplicationApplicationsApplicationIdGet(
        applicationId: number,
    ): CancelablePromise<ApplicationResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/applications/{application_id}',
            path: {
                'application_id': applicationId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Download Resume
     * Authenticated endpoint to download resume files
     * @param applicationId
     * @returns any Successful Response
     * @throws ApiError
     */
    public static downloadResumeApplicationsDownloadResumeApplicationIdGet(
        applicationId: number,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/applications/download-resume/{application_id}',
            path: {
                'application_id': applicationId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Ranked Candidates
     * Get ranked candidates for a specific job
     * @param jobId
     * @returns any Successful Response
     * @throws ApiError
     */
    public static getRankedCandidatesApplicationsJobJobIdRankedCandidatesGet(
        jobId: number,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/applications/job/{job_id}/ranked-candidates',
            path: {
                'job_id': jobId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Recalculate Job Scores
     * Recalculate match scores for all applications to a specific job
     * @param jobId
     * @returns any Successful Response
     * @throws ApiError
     */
    public static recalculateJobScoresApplicationsJobJobIdRecalculateScoresPost(
        jobId: number,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/applications/job/{job_id}/recalculate-scores',
            path: {
                'job_id': jobId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Recalculate Single Application Score
     * Recalculate match score for a single application (recruiter only).
     * @param applicationId
     * @returns any Successful Response
     * @throws ApiError
     */
    public static recalculateSingleApplicationScoreApplicationsApplicationIdRecalculateScorePost(
        applicationId: number,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/applications/{application_id}/recalculate-score',
            path: {
                'application_id': applicationId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Search Candidates
     * Search for candidates based on skills, experience, and other criteria
     * @param skills Search by skills (comma-separated)
     * @param minExperience Minimum years of experience
     * @param maxExperience Maximum years of experience
     * @param educationLevel Filter by education level (bachelor, master, phd, other)
     * @param location Search by location (from user profile)
     * @param hasResume Filter candidates with/without resumes
     * @returns CandidateSearchResponse Successful Response
     * @throws ApiError
     */
    public static searchCandidatesApplicationsSearchCandidatesGet(
        skills?: (string | null),
        minExperience?: (number | null),
        maxExperience?: (number | null),
        educationLevel?: (string | null),
        location?: (string | null),
        hasResume?: (boolean | null),
    ): CancelablePromise<Array<CandidateSearchResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/applications/search-candidates',
            query: {
                'skills': skills,
                'min_experience': minExperience,
                'max_experience': maxExperience,
                'education_level': educationLevel,
                'location': location,
                'has_resume': hasResume,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Available Skills
     * Get a list of all available skills from candidate profiles and resumes for search suggestions
     * @returns any Successful Response
     * @throws ApiError
     */
    public static getAvailableSkillsApplicationsAvailableSkillsGet(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/applications/available-skills',
        });
    }
    /**
     * Export Candidate Rankings
     * Export candidate rankings for a job as CSV or Excel
     * @param jobId
     * @param format Export format: csv or excel
     * @returns any Successful Response
     * @throws ApiError
     */
    public static exportCandidateRankingsApplicationsJobJobIdExportRankingsGet(
        jobId: number,
        format: string = 'csv',
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/applications/job/{job_id}/export-rankings',
            path: {
                'job_id': jobId,
            },
            query: {
                'format': format,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Export All Applications
     * Export all applications for recruiter's jobs
     * @param format Export format: csv
     * @returns any Successful Response
     * @throws ApiError
     */
    public static exportAllApplicationsApplicationsExportAllApplicationsGet(
        format: string = 'csv',
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/applications/export-all-applications',
            query: {
                'format': format,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Delete Application
     * Delete a single application (recruiter only).
     * @param applicationId
     * @returns any Successful Response
     * @throws ApiError
     */
    public static deleteApplicationApplicationsApplicationIdDelete(
        applicationId: number,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/applications/{application_id}',
            path: {
                'application_id': applicationId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
