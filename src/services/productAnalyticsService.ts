import { supabase } from '../lib/supabase';

export interface ProductAnalyticsSummary {
    total_views: number;
    total_likes: number;
    total_comments: number;
    total_shares: number;
    period_start: string;
}

export interface TopProductView {
    id: string;
    name: string;
    view_count: number;
    like_count: number;
    comment_count: number;
    image_url: string | null;
}

export interface TopProductEngagement {
    id: string;
    name: string;
    engagement_score: number;
    like_count: number;
    comment_count: number;
    share_count: number;
    image_url: string | null;
}

export const productAnalyticsService = {
    /**
     * Track a view for a product.
     * Handles anonymous session generation if needed.
     */
    async trackProductView(productId: string) {
        try {
            const { data: { user } } = await supabase.auth.getUser();

            // Manage anonymous session ID
            let sessionId = localStorage.getItem('analytics_session_id');
            if (!user && !sessionId) {
                sessionId = crypto.randomUUID();
                localStorage.setItem('analytics_session_id', sessionId);
            }

            const payload = {
                product_id: productId,
                user_id: user?.id || null,
                session_id: user ? null : sessionId
            };

            const { error } = await supabase
                .from('product_views')
                .insert(payload);

            if (error) {
                // Ignore unique constraint violation (deduplication logic in DB index)
                if (!error.message.includes('duplicate key value')) {
                    console.warn('[Analytics] Failed to track view:', error);
                }
            }
        } catch (err) {
            console.warn('[Analytics] Error tracking view:', err);
        }
    },

    /**
     * Get summary metrics for the business dashboard.
     */
    async getBusinessSummary(businessId: string, days: number = 30): Promise<ProductAnalyticsSummary | null> {
        const { data, error } = await supabase.rpc('get_product_analytics_summary', {
            p_business_id: businessId,
            p_days: days
        });

        if (error) {
            console.error('[Analytics] Error fetching summary:', error);
            return null;
        }

        return data ? data[0] : null;
    },

    /**
     * Get top products ranked by view count.
     */
    async getTopProductsByViews(businessId: string, limit: number = 5): Promise<TopProductView[]> {
        const { data, error } = await supabase.rpc('get_top_products_by_views', {
            p_business_id: businessId,
            p_limit: limit
        });

        if (error) {
            console.error('[Analytics] Error fetching top viewed products:', error);
            return [];
        }

        return data || [];
    },

    /**
     * Get top products ranked by engagement (likes + comments + shares).
     */
    async getTopProductsByEngagement(businessId: string, limit: number = 5): Promise<TopProductEngagement[]> {
        const { data, error } = await supabase.rpc('get_top_products_by_engagement', {
            p_business_id: businessId,
            p_limit: limit
        });

        if (error) {
            console.error('[Analytics] Error fetching top engaging products:', error);
            return [];
        }

        return data || [];
    }
};
