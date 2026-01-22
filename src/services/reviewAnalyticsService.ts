import { supabase } from '@/lib/supabase';

export interface ReviewAnalytics {
    recommendationRate: number;
    previousRate: number;
    trend: 'improving' | 'declining' | 'stable';
    responseRate: number;
    avgResponseHours: number;
    unrepliedCount: number;
}

export interface TagAnalysis {
    tag: string;
    count: number;
    isPositive: boolean;
}

export interface TimeHeatmapData {
    dayOfWeek: number;
    hourOfDay: number;
    reviewCount: number;
}

export interface DailyStats {
    date: string;
    reviewCount: number;
    recommendCount: number;
    notRecommendCount: number;
    recommendationRate: number;
}

/**
 * Get overall analytics for a business
 */
export async function getBusinessReviewAnalytics(
    businessId: string,
    days = 30
): Promise<ReviewAnalytics> {
    const { data, error } = await supabase
        .rpc('get_business_review_analytics', {
            p_business_id: businessId,
            p_days: days
        });

    if (error) throw error;

    return {
        recommendationRate: data.recommendation_rate,
        previousRate: data.previous_rate,
        trend: data.trend,
        responseRate: data.response_rate,
        avgResponseHours: data.avg_response_hours,
        unrepliedCount: data.unreplied_count
    };
}

/**
 * Get daily review stats for charts
 */
export async function getDailyReviewStats(
    businessId: string,
    days = 30
): Promise<DailyStats[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
        .from('mv_daily_review_stats')
        .select('*')
        .eq('business_id', businessId)
        .gte('review_date', startDate.toISOString().split('T')[0])
        .order('review_date', { ascending: true });

    if (error) throw error;

    return (data || []).map((d: any) => ({
        date: d.review_date,
        reviewCount: d.review_count,
        recommendCount: d.recommend_count,
        notRecommendCount: d.not_recommend_count,
        recommendationRate: d.recommendation_rate
    }));
}

/**
 * Get tag analysis
 */
export async function getTagAnalysis(
    businessId: string,
    days = 90
): Promise<{ positive: TagAnalysis[]; negative: TagAnalysis[] }> {
    const { data, error } = await supabase
        .rpc('get_business_tag_analysis', {
            p_business_id: businessId,
            p_days: days
        });

    if (error) throw error;

    const positive = (data || [])
        .filter((t: any) => t.is_positive)
        .slice(0, 5);

    const negative = (data || [])
        .filter((t: any) => !t.is_positive)
        .slice(0, 5);

    return { positive, negative };
}

/**
 * Get category averages for comparison
 */
export async function getCategoryAverages(category: string) {
    const { data, error } = await supabase
        .rpc('get_category_averages', { p_category: category });

    if (error) throw error;
    return data;
}

/**
 * Get time heatmap data
 */
export async function getReviewTimeHeatmap(businessId: string): Promise<TimeHeatmapData[]> {
    const { data, error } = await supabase
        .rpc('get_review_time_heatmap', { p_business_id: businessId });

    if (error) throw error;

    return (data || []).map((d: any) => ({
        dayOfWeek: d.day_of_week,
        hourOfDay: d.hour_of_day,
        reviewCount: d.review_count
    }));
}
