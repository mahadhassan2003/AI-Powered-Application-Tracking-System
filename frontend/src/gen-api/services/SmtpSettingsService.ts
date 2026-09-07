/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { SMTPSettingsRequest } from '../models/SMTPSettingsRequest';
import type { SMTPSettingsResponse } from '../models/SMTPSettingsResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class SmtpSettingsService {
    /**
     * Get Smtp Settings
     * Get SMTP settings for recruiter
     * @returns SMTPSettingsResponse Successful Response
     * @throws ApiError
     */
    public static getSmtpSettingsSmtpSettingsGet(): CancelablePromise<SMTPSettingsResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/smtp/settings',
        });
    }
    /**
     * Save Smtp Settings
     * Save SMTP settings for recruiter
     * @param requestBody
     * @returns any Successful Response
     * @throws ApiError
     */
    public static saveSmtpSettingsSmtpSettingsPost(
        requestBody: SMTPSettingsRequest,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/smtp/settings',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Test Smtp Connection
     * Test SMTP connection with current settings
     * @returns any Successful Response
     * @throws ApiError
     */
    public static testSmtpConnectionSmtpTestPost(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/smtp/test',
        });
    }
}
