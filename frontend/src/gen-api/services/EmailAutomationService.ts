/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { BulkRejectionRequest } from '../models/BulkRejectionRequest';
import type { InterviewReminderRequest } from '../models/InterviewReminderRequest';
import type { TestEmailRequest } from '../models/TestEmailRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class EmailAutomationService {
    /**
     * Send Interview Reminders
     * Send interview reminders to selected candidates
     * @param requestBody
     * @returns any Successful Response
     * @throws ApiError
     */
    public static sendInterviewRemindersEmailsSendInterviewRemindersPost(
        requestBody: InterviewReminderRequest,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/emails/send-interview-reminders',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Send Bulk Rejections
     * Send rejection emails to selected candidates
     * @param requestBody
     * @returns any Successful Response
     * @throws ApiError
     */
    public static sendBulkRejectionsEmailsSendBulkRejectionsPost(
        requestBody: BulkRejectionRequest,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/emails/send-bulk-rejections',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Send Individual Reminder
     * Send interview reminder to individual candidate
     * @param applicationId
     * @param interviewDatetime
     * @param interviewType
     * @param additionalDetails
     * @returns any Successful Response
     * @throws ApiError
     */
    public static sendIndividualReminderEmailsSendIndividualReminderApplicationIdPost(
        applicationId: number,
        interviewDatetime: string,
        interviewType: string = 'interview',
        additionalDetails: string = '',
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/emails/send-individual-reminder/{application_id}',
            path: {
                'application_id': applicationId,
            },
            query: {
                'interview_datetime': interviewDatetime,
                'interview_type': interviewType,
                'additional_details': additionalDetails,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Test Email
     * Send test email to verify email configuration
     * @param requestBody
     * @returns any Successful Response
     * @throws ApiError
     */
    public static testEmailEmailsTestEmailPost(
        requestBody: TestEmailRequest,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/emails/test-email',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Email Stats
     * Get email statistics for recruiter's jobs
     * @returns any Successful Response
     * @throws ApiError
     */
    public static getEmailStatsEmailsEmailStatsGet(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/emails/email-stats',
        });
    }
}
