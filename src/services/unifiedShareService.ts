// src/services/unifiedShareService.ts
// Unified Share Service for Story 10.1.1
// Provides consistent sharing functionality across all entity types

import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { supabase } from '../lib/supabase';
import { messagingService } from './messagingService';
import {
    ShareOptions,
    ShareMethod,
    ShareResult,
    ShareStats,
    ShareError,
    ShareErrorType,
    RateLimitResult,
    SocialPlatform,
    UTMParams,
} from '@/types/sharing';

/**
 * Social platform share URL templates
 */
const SOCIAL_SHARE_URLS: Record<SocialPlatform, (url: string, title: string, text: string) => string> = {
    facebook: (url) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    twitter: (url, title, text) =>
        `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text || title)}`,
    whatsapp: (url, title, text) =>
        `https://wa.me/?text=${encodeURIComponent(`${text || title} ${url}`)}`,
    email: (url, title, text) =>
        `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${text}\n\n${url}`)}`,
};

/**
 * Rate limiter for preventing spam
 */
class ShareRateLimiter {
    private shareTimestamps: Map<string, number[]> = new Map();

    // Limits
    private readonly ENTITY_LIMIT = 5; // Max 5 shares of same entity per minute
    private readonly USER_LIMIT = 20; // Max 20 shares total per minute
    private readonly WINDOW_MS = 60 * 1000; // 1 minute window

    canShare(userId: string | undefined, entityKey: string): RateLimitResult {
        const now = Date.now();

        // Check entity-specific limit
        const entityTimestamps = this.getRecentTimestamps(entityKey, now);
        if (entityTimestamps.length >= this.ENTITY_LIMIT) {
            const oldestInWindow = entityTimestamps[0];
            const retryAfter = Math.ceil((oldestInWindow + this.WINDOW_MS - now) / 1000);
            return { allowed: false, retryAfter, reason: 'Too many shares of this item' };
        }

        // Check user-wide limit
        if (userId) {
            const userTimestamps = this.getRecentTimestamps(`user:${userId}`, now);
            if (userTimestamps.length >= this.USER_LIMIT) {
                const oldestInWindow = userTimestamps[0];
                const retryAfter = Math.ceil((oldestInWindow + this.WINDOW_MS - now) / 1000);
                return { allowed: false, retryAfter, reason: 'Share limit reached' };
            }
        }

        return { allowed: true };
    }

    recordShare(userId: string | undefined, entityKey: string): void {
        const now = Date.now();
        this.addTimestamp(entityKey, now);
        if (userId) {
            this.addTimestamp(`user:${userId}`, now);
        }
    }

    private getRecentTimestamps(key: string, now: number): number[] {
        const timestamps = this.shareTimestamps.get(key) || [];
        // Filter to only recent timestamps
        const recent = timestamps.filter(t => now - t < this.WINDOW_MS);
        this.shareTimestamps.set(key, recent);
        return recent;
    }

    private addTimestamp(key: string, timestamp: number): void {
        const timestamps = this.shareTimestamps.get(key) || [];
        timestamps.push(timestamp);
        this.shareTimestamps.set(key, timestamps);
    }
}

/**
 * Unified Share Service
 * Central service for all sharing operations
 */
class UnifiedShareService {
    private rateLimiter = new ShareRateLimiter();

    /**
     * Generate share URL with UTM parameters
     */
    generateShareUrl(options: ShareOptions, method: ShareMethod, shareEventId?: string): string {
        const baseUrl = options.entityData.url.startsWith('http')
            ? options.entityData.url
            : `${window.location.origin}${options.entityData.url}`;

        const url = new URL(baseUrl);

        // Add UTM parameters
        url.searchParams.set('utm_source', 'sync');
        url.searchParams.set('utm_medium', 'share');
        url.searchParams.set('utm_campaign', `${options.entityType}_${options.entityId.substring(0, 8)}`);
        url.searchParams.set('utm_content', method);

        // Add tracking ref if we have a share event ID
        if (shareEventId) {
            url.searchParams.set('ref', shareEventId);
        }

        return url.toString();
    }

    /**
     * Get UTM parameters for a share
     */
    getUTMParams(options: ShareOptions, method: ShareMethod, shareEventId: string): UTMParams {
        return {
            utm_source: 'sync',
            utm_medium: 'share',
            utm_campaign: `${options.entityType}_${options.entityId.substring(0, 8)}`,
            utm_content: method,
            ref: shareEventId,
        };
    }

    /**
     * Track a share event in the database
     */
    async trackShare(
        options: ShareOptions,
        method: ShareMethod,
        recipientUserId?: string
    ): Promise<string> {
        const { data: { user } } = await supabase.auth.getUser();

        // Generate URL with UTM (we'll update with ref after insert)
        const shareUrl = this.generateShareUrl(options, method);

        const { data, error } = await supabase
            .from('share_events')
            .insert({
                user_id: user?.id || null,
                entity_type: options.entityType,
                entity_id: options.entityId,
                share_method: method,
                recipient_user_id: recipientUserId || null,
                utm_source: 'sync',
                utm_medium: 'share',
                utm_campaign: `${options.entityType}_${options.entityId.substring(0, 8)}`,
                utm_content: method,
                shared_url: shareUrl,
            })
            .select('id')
            .single();

        if (error) {
            console.error('Failed to track share:', error);
            throw error;
        }

        // Record for rate limiting
        this.rateLimiter.recordShare(user?.id, `${options.entityType}:${options.entityId}`);

        return data.id;
    }

    /**
     * Track a click on a shared link
     */
    async trackClick(shareEventId: string, ipHash?: string, userAgent?: string): Promise<void> {
        // Check for duplicate within 24 hours
        if (ipHash) {
            const { data: existing } = await supabase
                .from('share_clicks_unified')
                .select('id')
                .eq('share_event_id', shareEventId)
                .eq('ip_hash', ipHash)
                .gte('clicked_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
                .maybeSingle();

            if (existing) {
                console.log('Duplicate click ignored');
                return;
            }
        }

        const { error } = await supabase
            .from('share_clicks_unified')
            .insert({
                share_event_id: shareEventId,
                ip_hash: ipHash,
                user_agent: userAgent || navigator.userAgent,
                referrer: document.referrer || null,
            });

        if (error) {
            console.error('Failed to track click:', error);
        }
    }

    /**
     * Track a conversion from a shared link
     */
    async trackConversion(
        shareEventId: string,
        conversionType: 'favorite' | 'follow' | 'add_friend' | 'signup' | 'purchase',
        userId: string
    ): Promise<void> {
        const { error } = await supabase
            .from('share_conversions')
            .insert({
                share_event_id: shareEventId,
                conversion_type: conversionType,
                converted_user_id: userId,
            });

        if (error) {
            console.error('Failed to track conversion:', error);
        }
    }

    /**
     * Share via native share sheet (Capacitor or Web Share API)
     */
    async shareNative(options: ShareOptions): Promise<ShareResult> {
        const { data: { user } } = await supabase.auth.getUser();

        // Check rate limit
        const rateLimitCheck = this.rateLimiter.canShare(
            user?.id,
            `${options.entityType}:${options.entityId}`
        );
        if (!rateLimitCheck.allowed) {
            return {
                success: false,
                method: 'native_share',
                error: rateLimitCheck.reason
            };
        }

        try {
            // Track first to get share event ID
            const shareEventId = await this.trackShare(options, 'native_share');
            const shareUrl = this.generateShareUrl(options, 'native_share', shareEventId);

            if (Capacitor.isNativePlatform()) {
                // Mobile: Use Capacitor Share
                await Share.share({
                    title: options.entityData.title,
                    text: options.entityData.description,
                    url: shareUrl,
                    dialogTitle: `Share ${options.entityType}`,
                });
            } else if (navigator.share) {
                // Web: Use Web Share API
                await navigator.share({
                    title: options.entityData.title,
                    text: options.entityData.description,
                    url: shareUrl,
                });
            } else {
                // Fallback to clipboard
                return this.shareClipboard(options);
            }

            return { success: true, method: 'native_share', shareEventId };
        } catch (error) {
            const shareError = this.handleShareError(error);
            if (shareError.type === 'cancelled') {
                return { success: false, method: 'native_share', error: 'Cancelled' };
            }
            throw error;
        }
    }

    /**
     * Share via clipboard copy
     */
    async shareClipboard(options: ShareOptions): Promise<ShareResult> {
        try {
            // Track first
            const shareEventId = await this.trackShare(options, 'copy_link');
            const shareUrl = this.generateShareUrl(options, 'copy_link', shareEventId);

            await navigator.clipboard.writeText(shareUrl);

            return { success: true, method: 'copy_link', shareEventId };
        } catch (error) {
            console.error('Clipboard copy failed:', error);
            return { success: false, method: 'copy_link', error: 'Failed to copy' };
        }
    }

    /**
     * Share to a specific social platform
     */
    async shareToPlatform(options: ShareOptions, platform: SocialPlatform): Promise<ShareResult> {
        const { data: { user } } = await supabase.auth.getUser();

        // Check rate limit
        const rateLimitCheck = this.rateLimiter.canShare(
            user?.id,
            `${options.entityType}:${options.entityId}`
        );
        if (!rateLimitCheck.allowed) {
            return { success: false, method: platform, error: rateLimitCheck.reason };
        }

        try {
            // Track first
            const shareEventId = await this.trackShare(options, platform);
            const shareUrl = this.generateShareUrl(options, platform, shareEventId);

            // Get platform-specific share URL
            const platformUrl = SOCIAL_SHARE_URLS[platform](
                shareUrl,
                options.entityData.title,
                options.entityData.description
            );

            // Open in new window
            window.open(platformUrl, '_blank', 'width=600,height=400');

            return { success: true, method: platform, shareEventId };
        } catch (error) {
            console.error(`Share to ${platform} failed:`, error);
            return { success: false, method: platform, error: 'Share failed' };
        }
    }

    /**
     * Share via in-app chat to one or more friends
     */
    async shareToChat(
        options: ShareOptions,
        friendIds: string[],
        message?: string
    ): Promise<ShareResult> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return { success: false, method: 'chat', error: 'Not authenticated' };
        }

        // Check rate limit
        const rateLimitCheck = this.rateLimiter.canShare(
            user.id,
            `${options.entityType}:${options.entityId}`
        );
        if (!rateLimitCheck.allowed) {
            return { success: false, method: 'chat', error: rateLimitCheck.reason };
        }

        try {
            // Track for each recipient
            const shareEventIds: string[] = [];
            for (const friendId of friendIds) {
                const shareEventId = await this.trackShare(options, 'chat', friendId);
                shareEventIds.push(shareEventId);
            }

            // Generate share URL
            const shareUrl = this.generateShareUrl(options, 'chat', shareEventIds[0]);

            // Send message to each friend
            for (let i = 0; i < friendIds.length; i++) {
                const friendId = friendIds[i];

                // Create or get conversation with this friend
                const conversationId = await messagingService.createOrGetConversation(friendId);

                // Prepare link preview - matches Story 10.1.2 AC-5 message structure
                const linkPreview = {
                    url: shareUrl,
                    title: options.entityData.title,
                    description: options.entityData.description || '',
                    image: options.entityData.imageUrl || null,
                    type: `sync-${options.entityType}` as const, // e.g. 'sync-storefront', 'sync-product'
                    metadata: {
                        entityType: options.entityType,
                        entityId: options.entityId,
                        ...(options.entityData.metadata || {}),
                    }
                };

                // Send message with link preview
                await messagingService.sendMessage({
                    conversationId,
                    content: message || `Check out ${options.entityData.title}!`,
                    type: 'link',
                    linkPreviews: [linkPreview],
                });
            }

            console.log('✅ Share to chat completed:', { friendIds, shareUrl, message });

            return {
                success: true,
                method: 'chat',
                shareEventId: shareEventIds[0]
            };
        } catch (error) {
            console.error('Share to chat failed:', error);
            return { success: false, method: 'chat', error: 'Failed to share' };
        }
    }

    /**
     * Check if native share is available
     */
    isNativeShareSupported(): boolean {
        return Capacitor.isNativePlatform() || 'share' in navigator;
    }

    /**
     * Check rate limit status
     */
    checkRateLimit(userId: string | undefined, entityType: string, entityId: string): RateLimitResult {
        return this.rateLimiter.canShare(userId, `${entityType}:${entityId}`);
    }

    /**
     * Get share statistics for an entity
     */
    async getShareStats(entityType: string, entityId: string): Promise<ShareStats> {
        const { data, error } = await supabase
            .rpc('get_share_analytics', {
                p_entity_type: entityType,
                p_entity_id: entityId,
            });

        if (error) {
            console.error('Failed to get share stats:', error);
            return {
                totalShares: 0,
                uniqueSharers: 0,
                totalClicks: 0,
                totalConversions: 0,
                clickThroughRate: 0,
                conversionRate: 0,
                methodBreakdown: {},
                dailyShares: [],
            };
        }

        return data as ShareStats;
    }

    /**
     * Handle share errors and categorize them
     */
    private handleShareError(error: unknown): ShareError {
        if (error instanceof Error) {
            if (error.name === 'AbortError' || error.message.includes('cancel')) {
                return { type: 'cancelled', message: 'Share cancelled', retryable: false };
            }
            if (error.message.includes('Permission')) {
                return { type: 'permission', message: 'Permission denied', retryable: true };
            }
            if (!navigator.onLine) {
                return { type: 'network', message: 'No network connection', retryable: true };
            }
        }
        return { type: 'unknown', message: 'Share failed', retryable: true };
    }
}

// Export singleton instance
export const unifiedShareService = new UnifiedShareService();
export default unifiedShareService;
