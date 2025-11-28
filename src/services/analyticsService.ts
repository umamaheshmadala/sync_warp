import { supabase } from '../lib/supabase';

/**
 * Sharing Analytics Service
 * Story 9.7.6: Deal Sharing Analytics
 * 
 * Provides functions to track and retrieve deal sharing analytics
 */

export interface SharingAnalytics {
    total_shares: number;
    shares_by_method: Record<string, number>;
    click_through_rate: number;
    conversion_rate: number;
    most_shared_offers: Array<{
        id: string;
        title: string;
        image_url: string;
        share_count: number;
    }>;
    most_engaged_friends: Array<{
        id: string;
        full_name: string;
        avatar_url: string;
        shares_received: number;
        clicks: number;
        conversions: number;
    }>;
}

/**
 * Get comprehensive sharing analytics for the current user
 */
export async function getUserSharingAnalytics(): Promise<SharingAnalytics> {
    const { data, error } = await supabase.rpc('get_user_sharing_analytics');

    if (error) {
        console.error('Error fetching sharing analytics:', error);
        // Return empty analytics instead of throwing
        return {
            total_shares: 0,
            shares_by_method: {},
            click_through_rate: 0,
            conversion_rate: 0,
            most_shared_offers: [],
            most_engaged_friends: [],
        };
    }

    return data as SharingAnalytics;
}

/**
 * Track when a shared deal link is clicked
 * @param shareId - ID of the share record
 * @param dealId - ID of the deal/offer
 */
export async function trackShareClick(shareId: string, dealId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from('share_clicks').insert({
        share_id: shareId,
        deal_id: dealId,
        user_id: user?.id || null,
        user_agent: navigator.userAgent,
        referrer: document.referrer || null,
    });

    if (error) {
        console.error('Failed to track share click:', error);
    }
}

/**
 * Track when a recipient converts (favorites/saves) a shared deal
 * @param shareId - ID of the share record
 * @param dealId - ID of the deal/offer
 * @param conversionType - Type of conversion (favorite, save, purchase)
 */
export async function trackShareConversion(
    shareId: string,
    dealId: string,
    conversionType: 'favorite' | 'save' | 'purchase'
): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        console.warn('Cannot track conversion: user not authenticated');
        return;
    }

    const { error } = await supabase.from('share_conversions').insert({
        share_id: shareId,
        deal_id: dealId,
        user_id: user.id,
        conversion_type: conversionType,
    });

    if (error) {
        console.error('Failed to track share conversion:', error);
    }
}

/**
 * Get share ID from URL parameters (for tracking clicks from shared links)
 */
export function getShareIdFromUrl(): string | null {
    const params = new URLSearchParams(window.location.search);
    return params.get('share_id');
}

/**
 * Create a share record in the database
 * @param dealId - ID of the deal being shared
 * @param method - Share method (link, email, message, notification)
 * @param recipientId - Optional recipient ID (null for link/email)
 * @returns The created share ID or null if failed
 */
export async function createShareRecord(
    dealId: string,
    method: 'link' | 'email' | 'message' | 'notification',
    recipientId?: string
): Promise<string | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
        .from('deal_shares')
        .insert({
            deal_id: dealId,
            sender_id: user.id,
            recipient_id: recipientId || null,
            share_method: method,
        })
        .select('id')
        .single();

    if (error) {
        console.error('Failed to create share record:', error);
        return null;
    }

    return data.id;
}
