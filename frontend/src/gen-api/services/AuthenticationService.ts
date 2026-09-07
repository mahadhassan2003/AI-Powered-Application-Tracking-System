/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ChangePasswordRequest } from '../models/ChangePasswordRequest';
import type { DeleteAccountRequest } from '../models/DeleteAccountRequest';
import type { TokenResponse } from '../models/TokenResponse';
import type { UserLogin } from '../models/UserLogin';
import type { UserResponse } from '../models/UserResponse';
import type { UserSignup } from '../models/UserSignup';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class AuthenticationService {
    /**
     * Signup
     * @param requestBody
     * @returns TokenResponse Successful Response
     * @throws ApiError
     */
    public static signupAuthSignupPost(
        requestBody: UserSignup,
    ): CancelablePromise<TokenResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/auth/signup',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Login
     * @param requestBody
     * @returns TokenResponse Successful Response
     * @throws ApiError
     */
    public static loginAuthLoginPost(
        requestBody: UserLogin,
    ): CancelablePromise<TokenResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/auth/login',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Current User Info
     * Get current authenticated user information
     * @returns UserResponse Successful Response
     * @throws ApiError
     */
    public static getCurrentUserInfoAuthMeGet(): CancelablePromise<UserResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/auth/me',
        });
    }
    /**
     * Change Password
     * Change the current user's password
     * @param requestBody
     * @returns any Successful Response
     * @throws ApiError
     */
    public static changePasswordAuthChangePasswordPut(
        requestBody: ChangePasswordRequest,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/auth/change-password',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Delete Account
     * Permanently delete the current user's account and all associated data
     * @param requestBody
     * @returns any Successful Response
     * @throws ApiError
     */
    public static deleteAccountAuthDeleteAccountDelete(
        requestBody: DeleteAccountRequest,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/auth/delete-account',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Pending Recruiters
     * Get all pending recruiter applications (Admin only)
     * @returns any Successful Response
     * @throws ApiError
     */
    public static getPendingRecruitersAuthAdminPendingRecruitersGet(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/auth/admin/pending-recruiters',
        });
    }
    /**
     * Approve Recruiter
     * Approve a recruiter account (Admin only)
     * @param userId
     * @returns any Successful Response
     * @throws ApiError
     */
    public static approveRecruiterAuthAdminApproveRecruiterUserIdPost(
        userId: number,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/auth/admin/approve-recruiter/{user_id}',
            path: {
                'user_id': userId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Reject Recruiter
     * Reject a recruiter account (Admin only)
     * @param userId
     * @param reason
     * @returns any Successful Response
     * @throws ApiError
     */
    public static rejectRecruiterAuthAdminRejectRecruiterUserIdPost(
        userId: number,
        reason: string = 'Account verification failed',
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/auth/admin/reject-recruiter/{user_id}',
            path: {
                'user_id': userId,
            },
            query: {
                'reason': reason,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get All Recruiters
     * Get all recruiters with their approval status (Admin only)
     * @returns any Successful Response
     * @throws ApiError
     */
    public static getAllRecruitersAuthAdminAllRecruitersGet(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/auth/admin/all-recruiters',
        });
    }
    /**
     * Get Admin Stats
     * Get admin dashboard statistics
     * @returns any Successful Response
     * @throws ApiError
     */
    public static getAdminStatsAuthAdminStatsGet(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/auth/admin/stats',
        });
    }
}
