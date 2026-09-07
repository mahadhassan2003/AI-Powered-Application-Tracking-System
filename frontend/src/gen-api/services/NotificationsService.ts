/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { NotificationResponse } from '../models/NotificationResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class NotificationsService {
    /**
     * Get Notifications
     * Get user notifications
     * @param unreadOnly
     * @param limit
     * @returns NotificationResponse Successful Response
     * @throws ApiError
     */
    public static getNotificationsNotificationsGet(
        unreadOnly: boolean = false,
        limit: number = 50,
    ): CancelablePromise<Array<NotificationResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/notifications/',
            query: {
                'unread_only': unreadOnly,
                'limit': limit,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Mark As Read
     * Mark notification as read
     * @param notificationId
     * @returns any Successful Response
     * @throws ApiError
     */
    public static markAsReadNotificationsNotificationIdReadPut(
        notificationId: number,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/notifications/{notification_id}/read',
            path: {
                'notification_id': notificationId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Mark All Read
     * Mark all notifications as read
     * @returns any Successful Response
     * @throws ApiError
     */
    public static markAllReadNotificationsMarkAllReadPut(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/notifications/mark-all-read',
        });
    }
}
