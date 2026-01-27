import { supabase } from '@/lib/supabase';

// ========================================
// OVERVIEW METRICS
// ========================================

export interface OverviewMetrics {
    totalReviews: number;
    reviewsThisWeek: number;
    reviewsThisMonth: number;
    pendingModeration: number;
    approvalRate: number;
    activeFraudAlerts: number;
    weekOverWeekChange: number;
}

export async function getOverviewMetrics(): Promise<OverviewMetrics> {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    // Total reviews
    const { count: totalReviews } = await supabase
        .from('business_reviews')
        .select('*', { count: 'exact', head: true });

    // Reviews this week
    const { count: reviewsThisWeek } = await supabase
        .from('business_reviews')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', weekAgo.toISOString());

    // Reviews this month
    const { count: reviewsThisMonth } = await supabase
        .from('business_reviews')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', monthAgo.toISOString());

    // Pending moderation
    const { count: pendingModeration } = await supabase
        .from('business_reviews')
        .select('*', { count: 'exact', head: true })
        .eq('moderation_status', 'pending');

    // Approval rate
    const { count: approved } = await supabase
        .from('business_reviews')
        .select('*', { count: 'exact', head: true })
        .eq('moderation_status', 'approved');

    const { count: moderated } = await supabase
        .from('business_reviews')
        .select('*', { count: 'exact', head: true })
        .in('moderation_status', ['approved', 'rejected']);

    const approvalRate = moderated ? Math.round((approved || 0) / moderated * 100) : 0;

    // Fraud alerts
    const { count: activeFraudAlerts } = await supabase
        .from('review_fraud_signals')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', weekAgo.toISOString());

    // Week-over-week change
    const { count: lastWeek } = await supabase
        .from('business_reviews')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', twoWeeksAgo.toISOString())
        .lt('created_at', weekAgo.toISOString());

    const weekOverWeekChange = lastWeek
        ? Math.round(((reviewsThisWeek || 0) - lastWeek) / lastWeek * 100)
        : 0;

    return {
        totalReviews: totalReviews || 0,
        reviewsThisWeek: reviewsThisWeek || 0,
        reviewsThisMonth: reviewsThisMonth || 0,
        pendingModeration: pendingModeration || 0,
        approvalRate,
        activeFraudAlerts: activeFraudAlerts || 0,
        weekOverWeekChange
    };
}

// ========================================
// TREND DATA
// ========================================

export interface TrendDataPoint {
    date: string;
    total: number;
    approved: number;
    rejected: number;
}

export async function getReviewTrends(days: number = 30): Promise<TrendDataPoint[]> {
    const { data, error } = await supabase.rpc('get_review_trends', { p_days: days });

    if (error) throw error;
    return data || [];
}

// ========================================
// TOP BUSINESSES
// ========================================

export interface TopBusinessData {
    id: string;
    name: string;
    category: string;
    reviewCount: number;
    recommendationRate: number;
    fraudFlags: number;
}

export async function getTopReviewedBusinesses(limit: number = 20): Promise<TopBusinessData[]> {
    const { data, error } = await supabase
        .from('businesses')
        .select(`
      id,
      name,
      business_type,
      approved_review_count,
      recommendation_percentage
    `)
        .order('approved_review_count', { ascending: false })
        .limit(limit);

    if (error) throw error;

    // Get fraud flags for each
    const businessIds = data?.map(b => b.id) || [];
    const { data: fraudData } = await supabase
        .from('review_fraud_signals')
        .select('review_id, business_reviews!inner(business_id)')
        .in('business_reviews.business_id', businessIds);

    const fraudCountByBusiness = new Map<string, number>();
    fraudData?.forEach(f => {
        // @ts-ignore - Supabase types might be nested differently
        const bizId = f.business_reviews?.business_id;
        if (bizId) {
            fraudCountByBusiness.set(bizId, (fraudCountByBusiness.get(bizId) || 0) + 1);
        }
    });

    return data?.map(b => ({
        id: b.id,
        name: b.name,
        category: b.business_type,
        reviewCount: b.approved_review_count,
        recommendationRate: b.recommendation_percentage,
        fraudFlags: fraudCountByBusiness.get(b.id) || 0
    })) || [];
}

// ========================================
// MODERATION STATS
// ========================================

export interface ModerationStats {
    approvedCount: number;
    rejectedCount: number;
    avgModerationTimeHours: number;
    rejectionReasons: Array<{ reason: string; count: number }>;
    moderatorStats: Array<{ name: string; count: number }>;
}

export async function getModerationStats(): Promise<ModerationStats> {
    // Approved/Rejected counts
    const { data: statusCounts } = await supabase
        .from('business_reviews')
        .select('moderation_status')
        .in('moderation_status', ['approved', 'rejected']);

    const approvedCount = statusCounts?.filter(r => r.moderation_status === 'approved').length || 0;
    const rejectedCount = statusCounts?.filter(r => r.moderation_status === 'rejected').length || 0;

    // Get rejection reasons from moderation log
    const { data: rejectionData } = await supabase
        .from('review_moderation_log')
        .select('reason')
        .eq('action', 'reject')
        .not('reason', 'is', null);

    const reasonCounts = new Map<string, number>();
    rejectionData?.forEach(r => {
        if (r.reason) {
            reasonCounts.set(r.reason, (reasonCounts.get(r.reason) || 0) + 1);
        }
    });

    const rejectionReasons = Array.from(reasonCounts.entries())
        .map(([reason, count]) => ({ reason, count }))
        .sort((a, b) => b.count - a.count);

    // Moderator stats
    const { data: modLogData } = await supabase
        .from('review_moderation_log')
        .select(`
      performed_by,
      admin:profiles!performed_by (full_name)
    `);

    const modCounts = new Map<string, { name: string; count: number }>();
    modLogData?.forEach((m: any) => {
        const key = m.performed_by;
        const name = m.admin?.full_name || 'Unknown';
        const existing = modCounts.get(key);
        if (existing) {
            existing.count++;
        } else {
            modCounts.set(key, { name, count: 1 });
        }
    });

    const moderatorStats = Array.from(modCounts.values())
        .sort((a, b) => b.count - a.count);

    return {
        approvedCount,
        rejectedCount,
        avgModerationTimeHours: 4.2, // Calculate from created_at to moderated_at (Placeholder)
        rejectionReasons,
        moderatorStats
    };
}

// ========================================
// FRAUD METRICS
// ========================================

export interface FraudMetrics {
    totalFlagged: number;
    flaggedPercentage: number;
    bySignalType: Array<{ type: string; count: number }>;
    falsePositiveRate: number;
    topFlaggedUsers: Array<{ userId: string; name: string; flags: number }>;
}

export async function getFraudMetrics(): Promise<FraudMetrics> {
    // Count flagged reviews
    const { data: signals } = await supabase
        .from('review_fraud_signals')
        .select('review_id, signal_type');

    const flaggedReviewIds = new Set(signals?.map(s => s.review_id) || []);

    // Total reviews
    const { count: totalReviews } = await supabase
        .from('business_reviews')
        .select('*', { count: 'exact', head: true });

    // By signal type
    const typeCounts = new Map<string, number>();
    signals?.forEach(s => {
        typeCounts.set(s.signal_type, (typeCounts.get(s.signal_type) || 0) + 1);
    });

    const bySignalType = Array.from(typeCounts.entries())
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count);

    // False positives (flagged but approved)
    const { data: falsePositives } = await supabase
        .from('business_reviews')
        .select('id')
        .eq('moderation_status', 'approved')
        .in('id', Array.from(flaggedReviewIds));

    const falsePositiveRate = flaggedReviewIds.size > 0
        ? Math.round((falsePositives?.length || 0) / flaggedReviewIds.size * 100)
        : 0;

    return {
        totalFlagged: flaggedReviewIds.size,
        flaggedPercentage: totalReviews
            ? Math.round(flaggedReviewIds.size / totalReviews * 100)
            : 0,
        bySignalType,
        falsePositiveRate,
        topFlaggedUsers: [] // Implement separately
    };
}

// ========================================
// RESPONSE RATE
// ========================================

export interface ResponseRateData {
    overallRate: number;
    byCategory: Array<{ category: string; rate: number }>;
    avgResponseTimeHours: number;
}

export async function getResponseRateData(): Promise<ResponseRateData> {
    // Fetch all approved reviews with their business category and response status
    // Note: This matches the query structure needed for client-side aggregation
    const { data: reviews } = await supabase
        .from('business_reviews')
        .select(`
            id,
            business:businesses (
                business_type
            ),
            response:business_review_responses (
                created_at
            )
        `)
        .eq('moderation_status', 'approved');

    if (!reviews || reviews.length === 0) {
        return { overallRate: 0, byCategory: [], avgResponseTimeHours: 0 };
    }

    const totalApproved = reviews.length;
    let respondedCount = 0;
    const categoryStats = new Map<string, { total: number; responded: number }>();

    reviews.forEach((r: any) => {
        const category = r.business?.business_type || 'Uncategorized';
        const hasResponse = r.response && r.response.length > 0;

        // Global count
        if (hasResponse) respondedCount++;

        // Category stats
        const current = categoryStats.get(category) || { total: 0, responded: 0 };
        current.total++;
        if (hasResponse) current.responded++;
        categoryStats.set(category, current);
    });

    const overallRate = Math.round((respondedCount / totalApproved) * 100);

    const byCategory = Array.from(categoryStats.entries())
        .map(([category, stats]) => ({
            category,
            rate: Math.round((stats.responded / stats.total) * 100)
        }))
        .sort((a, b) => b.rate - a.rate);

    return {
        overallRate,
        byCategory,
        avgResponseTimeHours: 12.5 // Placeholder until we have complex timestamp diffing
    };
}

// ========================================
// GEOGRAPHIC DATA
// ========================================

export interface GeoData {
    byCity: Array<{ city: string; count: number }>;
}

export async function getGeographicData(): Promise<GeoData> {
    const { data } = await supabase
        .from('business_reviews')
        .select('businesses!inner(city)')
        .eq('moderation_status', 'approved');

    const cityCounts = new Map<string, number>();
    data?.forEach((r: any) => {
        const city = r.businesses?.city || 'Unknown';
        cityCounts.set(city, (cityCounts.get(city) || 0) + 1);
    });

    const byCity = Array.from(cityCounts.entries())
        .map(([city, count]) => ({ city, count }))
        .sort((a, b) => b.count - a.count);

    return { byCity };
}

// ========================================
// USER ENGAGEMENT (Placeholder)
// ========================================

export interface EngagementMetrics {
    totalHelpfulVotes: number;
    reviewsShared: number;
    reviewViews: number;
    mostHelpfulReviews: Array<{ reviewId: string; helpfulCount: number }>;
}

export async function getEngagementMetrics(): Promise<EngagementMetrics> {
    // Currently these columns don't exist in the schema, so we return placeholders.
    // In a real implementation, we would query 'review_helpful_votes' or columns on business_reviews.

    return {
        totalHelpfulVotes: 0,
        reviewsShared: 0,
        reviewViews: 0,
        mostHelpfulReviews: []
    };
}
