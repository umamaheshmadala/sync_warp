// src/types/sharing.ts
// Type definitions for the unified sharing ecosystem (Story 10.1.1)

/**
 * Entity types that can be shared
 */
export type ShareableEntityType = 'storefront' | 'product' | 'offer' | 'profile';

/**
 * Methods of sharing content
 */
export type ShareMethod = 'chat' | 'native_share' | 'copy_link' | 'facebook' | 'twitter' | 'whatsapp' | 'email';

/**
 * Social platforms for direct sharing
 */
export type SocialPlatform = 'facebook' | 'twitter' | 'whatsapp' | 'email';

/**
 * Conversion types from shared links
 */
export type ConversionType = 'favorite' | 'follow' | 'add_friend' | 'signup' | 'purchase';

/**
 * Options for sharing content
 */
export interface ShareOptions {
    entityType: ShareableEntityType;
    entityId: string;
    entityData: {
        title: string;
        description: string;
        imageUrl?: string;
        url: string;
        metadata?: Record<string, any>;
    };
}

/**
 * Result of a share operation
 */
export interface ShareResult {
    success: boolean;
    method: ShareMethod;
    shareEventId?: string;
    error?: string;
}

/**
 * Share analytics statistics
 */
export interface ShareStats {
    totalShares: number;
    uniqueSharers: number;
    totalClicks: number;
    totalConversions: number;
    clickThroughRate: number;
    conversionRate: number;
    methodBreakdown: Partial<Record<ShareMethod, number>>;
    dailyShares: { date: string; count: number }[];
}

/**
 * Share event record in database
 */
export interface ShareEvent {
    id: string;
    user_id: string | null;
    entity_type: ShareableEntityType;
    entity_id: string;
    share_method: ShareMethod;
    recipient_user_id?: string | null;
    utm_source: string;
    utm_medium: string;
    utm_campaign: string;
    utm_content: string;
    shared_url: string;
    created_at: string;
}

/**
 * Share click record in database
 */
export interface ShareClick {
    id: string;
    share_event_id: string;
    clicked_at: string;
    ip_hash?: string;
    user_agent?: string;
    referrer?: string;
}

/**
 * Share conversion record in database
 */
export interface ShareConversion {
    id: string;
    share_event_id: string;
    conversion_type: ConversionType;
    converted_user_id: string;
    converted_at: string;
}

/**
 * Error types for share operations
 */
export type ShareErrorType = 'network' | 'cancelled' | 'permission' | 'rate_limit' | 'database' | 'unknown';

/**
 * Share error with details
 */
export interface ShareError {
    type: ShareErrorType;
    message: string;
    retryable: boolean;
}

/**
 * Rate limit check result
 */
export interface RateLimitResult {
    allowed: boolean;
    retryAfter?: number; // seconds until retry allowed
    reason?: string;
}

/**
 * UTM parameters for tracking
 */
export interface UTMParams {
    utm_source: string;
    utm_medium: string;
    utm_campaign: string;
    utm_content: string;
    ref: string;
}
