/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AdminRescheduleData } from '../models/AdminRescheduleData';
import type { InterviewCreate } from '../models/InterviewCreate';
import type { InterviewResponse } from '../models/InterviewResponse';
import type { RescheduleApproveData } from '../models/RescheduleApproveData';
import type { RescheduleRequestData } from '../models/RescheduleRequestData';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class InterviewsService {
    /**
     * Schedule Interview
     * Schedule an interview
     * @param requestBody
     * @returns InterviewResponse Successful Response
     * @throws ApiError
     */
    public static scheduleInterviewInterviewsSchedulePost(
        requestBody: InterviewCreate,
    ): CancelablePromise<InterviewResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/interviews/schedule',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get My Interviews
     * Get interviews for current user
     * @returns InterviewResponse Successful Response
     * @throws ApiError
     */
    public static getMyInterviewsInterviewsMyInterviewsGet(): CancelablePromise<Array<InterviewResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/interviews/my-interviews',
        });
    }
    /**
     * Confirm Interview
     * Candidate confirms interview attendance
     * @param interviewId
     * @returns any Successful Response
     * @throws ApiError
     */
    public static confirmInterviewInterviewsInterviewIdConfirmPut(
        interviewId: number,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/interviews/{interview_id}/confirm',
            path: {
                'interview_id': interviewId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Complete Interview
     * Mark interview as completed with notes
     * @param interviewId
     * @param notes
     * @returns any Successful Response
     * @throws ApiError
     */
    public static completeInterviewInterviewsInterviewIdCompletePut(
        interviewId: number,
        notes?: (string | null),
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/interviews/{interview_id}/complete',
            path: {
                'interview_id': interviewId,
            },
            query: {
                'notes': notes,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Cancel Interview
     * Cancel an interview
     * @param interviewId
     * @returns any Successful Response
     * @throws ApiError
     */
    public static cancelInterviewInterviewsInterviewIdCancelPut(
        interviewId: number,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/interviews/{interview_id}/cancel',
            path: {
                'interview_id': interviewId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Request Reschedule
     * Candidate requests to reschedule an interview
     * @param interviewId
     * @param requestBody
     * @returns any Successful Response
     * @throws ApiError
     */
    public static requestRescheduleInterviewsInterviewIdRescheduleRequestPut(
        interviewId: number,
        requestBody: RescheduleRequestData,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/interviews/{interview_id}/reschedule/request',
            path: {
                'interview_id': interviewId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Approve Reschedule
     * Recruiter approves a candidate's reschedule request
     * @param interviewId
     * @param requestBody
     * @returns any Successful Response
     * @throws ApiError
     */
    public static approveRescheduleInterviewsInterviewIdRescheduleApprovePut(
        interviewId: number,
        requestBody: RescheduleApproveData,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/interviews/{interview_id}/reschedule/approve',
            path: {
                'interview_id': interviewId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Admin Reschedule
     * Recruiter forcefully reschedules candidate without request
     * @param interviewId
     * @param requestBody
     * @returns any Successful Response
     * @throws ApiError
     */
    public static adminRescheduleInterviewsInterviewIdRescheduleAdminPut(
        interviewId: number,
        requestBody: AdminRescheduleData,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/interviews/{interview_id}/reschedule/admin',
            path: {
                'interview_id': interviewId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
