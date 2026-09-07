/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class HealthService {
    /**
     * Health Check
     * Comprehensive health check for all backend services.
     *
     * Returns:
     * JSON with overall status ('healthy' | 'degraded') and per-service details.
     * @returns any Successful Response
     * @throws ApiError
     */
    public static healthCheckHealthGet(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/health',
        });
    }
    /**
     * Get Task Status
     * Get the status of an async Celery task by its ID.
     *
     * Useful for polling resume parsing progress from the frontend.
     *
     * Returns:
     * task_id, status (PENDING|STARTED|SUCCESS|FAILURE|RETRY), result if ready.
     * @param taskId
     * @returns any Successful Response
     * @throws ApiError
     */
    public static getTaskStatusHealthTaskStatusTaskIdGet(
        taskId: string,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/health/task-status/{task_id}',
            path: {
                'task_id': taskId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
