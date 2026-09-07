/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { NegotiationCreate } from '../models/NegotiationCreate';
import type { NegotiationResponse } from '../models/NegotiationResponse';
import type { OfferCreate } from '../models/OfferCreate';
import type { OfferResponse } from '../models/OfferResponse';
import type { OfferUpdate } from '../models/OfferUpdate';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class OfferManagementService {
    /**
     * Create Offer
     * Create a new job offer (recruiter only)
     * @param requestBody
     * @returns OfferResponse Successful Response
     * @throws ApiError
     */
    public static createOfferOffersCreatePost(
        requestBody: OfferCreate,
    ): CancelablePromise<OfferResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/offers/create',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * List Offers
     * List offers - Recruiter sees their offers, candidates see their received offers
     * @param skip
     * @param limit
     * @param statusFilter
     * @returns OfferResponse Successful Response
     * @throws ApiError
     */
    public static listOffersOffersGet(
        skip?: number,
        limit: number = 100,
        statusFilter?: (string | null),
    ): CancelablePromise<Array<OfferResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/offers/',
            query: {
                'skip': skip,
                'limit': limit,
                'status_filter': statusFilter,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Offer
     * Get specific offer details
     * @param offerId
     * @returns OfferResponse Successful Response
     * @throws ApiError
     */
    public static getOfferOffersOfferIdGet(
        offerId: number,
    ): CancelablePromise<OfferResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/offers/{offer_id}',
            path: {
                'offer_id': offerId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Update Offer
     * Update offer details (draft only)
     * @param offerId
     * @param requestBody
     * @returns OfferResponse Successful Response
     * @throws ApiError
     */
    public static updateOfferOffersOfferIdPut(
        offerId: number,
        requestBody: OfferUpdate,
    ): CancelablePromise<OfferResponse> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/offers/{offer_id}',
            path: {
                'offer_id': offerId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Send Offer
     * Send offer to candidate
     * @param offerId
     * @returns any Successful Response
     * @throws ApiError
     */
    public static sendOfferOffersOfferIdSendPost(
        offerId: number,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/offers/{offer_id}/send',
            path: {
                'offer_id': offerId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Accept Offer
     * Candidate accepts offer
     * @param offerId
     * @returns any Successful Response
     * @throws ApiError
     */
    public static acceptOfferOffersOfferIdAcceptPost(
        offerId: number,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/offers/{offer_id}/accept',
            path: {
                'offer_id': offerId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Decline Offer
     * Candidate declines offer
     * @param offerId
     * @param reason
     * @returns any Successful Response
     * @throws ApiError
     */
    public static declineOfferOffersOfferIdDeclinePost(
        offerId: number,
        reason: string = '',
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/offers/{offer_id}/decline',
            path: {
                'offer_id': offerId,
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
     * Propose Negotiation
     * Propose salary/benefits negotiation
     * @param offerId
     * @param requestBody
     * @returns NegotiationResponse Successful Response
     * @throws ApiError
     */
    public static proposeNegotiationOffersOfferIdNegotiatePost(
        offerId: number,
        requestBody: NegotiationCreate,
    ): CancelablePromise<NegotiationResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/offers/{offer_id}/negotiate',
            path: {
                'offer_id': offerId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Negotiations
     * Get negotiation history for an offer
     * @param offerId
     * @returns NegotiationResponse Successful Response
     * @throws ApiError
     */
    public static getNegotiationsOffersOfferIdNegotiationsGet(
        offerId: number,
    ): CancelablePromise<Array<NegotiationResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/offers/{offer_id}/negotiations',
            path: {
                'offer_id': offerId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Accept Negotiation
     * Recruiter accepts a candidate's negotiation proposal
     * @param offerId
     * @param negotiationId
     * @returns any Successful Response
     * @throws ApiError
     */
    public static acceptNegotiationOffersOfferIdNegotiationsNegotiationIdAcceptPost(
        offerId: number,
        negotiationId: number,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/offers/{offer_id}/negotiations/{negotiation_id}/accept',
            path: {
                'offer_id': offerId,
                'negotiation_id': negotiationId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Decline Negotiation
     * Recruiter declines a candidate's negotiation proposal
     * @param offerId
     * @param negotiationId
     * @returns any Successful Response
     * @throws ApiError
     */
    public static declineNegotiationOffersOfferIdNegotiationsNegotiationIdDeclinePost(
        offerId: number,
        negotiationId: number,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/offers/{offer_id}/negotiations/{negotiation_id}/decline',
            path: {
                'offer_id': offerId,
                'negotiation_id': negotiationId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Mark Offer Viewed
     * Mark offer as viewed (tracked from email link)
     * @param offerId
     * @returns any Successful Response
     * @throws ApiError
     */
    public static markOfferViewedOffersOfferIdMarkViewedPost(
        offerId: number,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/offers/{offer_id}/mark-viewed',
            path: {
                'offer_id': offerId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Offers Analytics
     * Get offer analytics for recruiter
     * @returns any Successful Response
     * @throws ApiError
     */
    public static getOffersAnalyticsOffersAnalyticsSummaryGet(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/offers/analytics/summary',
        });
    }
}
