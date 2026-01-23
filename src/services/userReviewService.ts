// =====================================================
// Story 11.3.9: User Review Insights - Service Layer
// =====================================================

import { supabase } from '../lib/supabase';
import type { UserReviewActivity, BusinessReviewWithDetails } from '../types/review';

export interface UserReviewWithImpact extends BusinessReviewWithDetails {
    view_count: number;
}

/**
 * Log a view for a review (called when review card is visible for 2+ seconds)
 * Automatically deduplicates - same user viewing same review within 24h = no new log
 */
export async function logReviewView(reviewId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return; // Only log for authenticated users

    // Check if user is the review author (don't count own views)
    const { data: review } = await supabase
        .from('business_reviews')
        .select('user_id')
        .eq('id', reviewId)
        .single();

    if (review?.user_id === user.id) return; // Skip own reviews

    // Insert view (unique constraint will prevent duplicates within same day)
    try {
        await supabase
            .from('review_views')
            .insert({
                review_id: reviewId,
                viewer_id: user.id,
                view_date: new Date().toISOString().split('T')[0] // YYYY-MM-DD format
            });
    } catch (error) {
        // Silently ignore duplicate key errors
        console.log('[UserReviewService] View already logged today or error:', error);
    }
}

/**
 * Get current user's review statistics with impact metrics
 */
export async function getMyReviewStats(): Promise<UserReviewActivity | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
        .from('user_review_activity')
        .select('*')
        .eq('user_id', user.id)
        .single();

    if (error && error.code !== 'PGRST116') {
        console.error('[UserReviewService] Get stats error:', error);
        return null;
    }

    if (!data) {
        // Return default stats for users with no reviews
        return {
            user_id: user.id,
            total_reviews: 0,
            positive_reviews: 0,
            negative_reviews: 0,
            reviews_with_text: 0,
            reviews_with_photos: 0,
            last_review_date: null,
            total_helpful_votes: 0,
            responses_received: 0,
            total_views: 0
        };
    }

    return data;
}

/**
 * Get user's reviews with impact data (helpful count, view count, response status)
 */
export async function getMyReviewsWithImpact(options?: {
    year?: number;
    month?: number;
}): Promise<UserReviewWithImpact[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    let query = supabase
        .from('business_reviews_with_details')
        .select(`
      *,
      helpful_votes:review_helpful_votes(count),
      views:review_views(count)
    `)
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

    // Filter by year/month if provided
    if (options?.year) {
        const startDate = new Date(options.year, options.month ?? 0, 1);
        const endDate = options.month !== undefined
            ? new Date(options.year, options.month + 1, 0, 23, 59, 59)
            : new Date(options.year + 1, 0, 0, 23, 59, 59);

        query = query
            .gte('created_at', startDate.toISOString())
            .lte('created_at', endDate.toISOString());
    }

    const { data, error } = await query;

    if (error) {
        console.error('[UserReviewService] Get reviews error:', error);
        throw error;
    }

    return (data || []).map(review => ({
        ...review,
        helpful_count: review.helpful_votes?.[0]?.count || 0,
        view_count: review.views?.[0]?.count || 0
    }));
}

export default {
    logReviewView,
    getMyReviewStats,
    getMyReviewsWithImpact
};
