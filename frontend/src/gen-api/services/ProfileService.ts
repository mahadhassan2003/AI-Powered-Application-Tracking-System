/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ProfileResponse } from '../models/ProfileResponse';
import type { ProfileUpdate } from '../models/ProfileUpdate';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class ProfileService {
    /**
     * Get My Profile
     * @returns ProfileResponse Successful Response
     * @throws ApiError
     */
    public static getMyProfileProfileMeGet(): CancelablePromise<ProfileResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/profile/me',
        });
    }
    /**
     * Update My Profile
     * @param requestBody
     * @returns ProfileResponse Successful Response
     * @throws ApiError
     */
    public static updateMyProfileProfileMePut(
        requestBody: ProfileUpdate,
    ): CancelablePromise<ProfileResponse> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/profile/me',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
