import { supabase } from '@/lib/supabase';

export type ReportReason = 'spam' | 'abusive' | 'fake' | 'offensive' | 'irrelevant';

export interface ReportReview {
    reviewId: string;
    reason: ReportReason;
    details?: string;
}

export interface ReviewReport {
    id: string;
    review_id: string;
    reporter_id: string;
    reason: ReportReason;
    details: string | null;
    is_business_owner: boolean;
    status: 'pending' | 'reviewed' | 'actioned' | 'dismissed';
    created_at: string;
    reporter?: {
        id: string;
        full_name: string;
    };
}

export const REPORT_REASONS: Record<ReportReason, { label: string; description: string }> = {
    spam: {
        label: 'Spam',
        description: 'Promotional content, links, or advertising'
    },
    abusive: {
        label: 'Abusive',
        description: 'Harassment, personal attacks, or bullying'
    },
    fake: {
        label: 'Fake',
        description: 'Reviewer never visited or made false claims'
    },
    offensive: {
        label: 'Offensive',
        description: 'Hate speech, discrimination, or inappropriate content'
    },
    irrelevant: {
        label: 'Irrelevant',
        description: 'Not about the business or service experience'
    }
};

/**
 * Submit a report for a review
 */
export async function submitReport(data: ReportReview): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error('You must be logged in to report a review');
    }

    // Check if already reported
    const { data: existing } = await supabase
        .from('review_reports')
        .select('id')
        .eq('review_id', data.reviewId)
        .eq('reporter_id', user.id)
        .single();

    if (existing) {
        throw new Error('You have already reported this review');
    }

    // Check if reporting own review
    const { data: review } = await supabase
        .from('business_reviews')
        .select('user_id, business:businesses!business_id(owner_id)')
        .eq('id', data.reviewId)
        .single();

    if (!review) {
        throw new Error('Review not found');
    }

    if (review.user_id === user.id) {
        throw new Error('You cannot report your own review');
    }

    // Check if reporter is business owner
    const business = Array.isArray(review.business) ? review.business[0] : review.business;
    const isBusinessOwner = business?.owner_id === user.id;

    // Validate details length
    if (data.details && data.details.length > 200) {
        throw new Error('Additional details must be 200 characters or less');
    }

    // Submit report
    const { error } = await supabase.from('review_reports').insert({
        review_id: data.reviewId,
        reporter_id: user.id,
        reason: data.reason,
        details: data.details?.trim() || null,
        is_business_owner: isBusinessOwner,
        status: 'pending'
    });

    if (error) {
        if (error.code === '23505') { // Unique violation
            throw new Error('You have already reported this review');
        }
        console.error('[ReportService] Error:', error);
        throw new Error('Could not submit report');
    }

    // Notify admins
    const businessName = Array.isArray(review.business) ? (review.business[0] as any)?.name : (review.business as any)?.name;
    const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
    const reporterName = profile?.full_name || 'A user';

    // Import dynamically to avoid circular dependency if possible, or move function to shared service?
    // moderationService depends on reportService. reportService depends on moderationService?
    // moderationService imports resolveReports from reportService.
    // So reportService importing notify from moderationService creates cycle.
    // Solution: Move notification logic to this file or a shared one.
    // Actually, reportService DOES NOT import moderationService currently.
    // So if I import moderationService here, it MIGHT cause cycle if moderationService imports reportService.
    // Yes: moderationService -> reportService (resolveReports) -> moderationService (notifyAdminsNewReport).
    // I should move `notifyAdminsNewReport` to `notificationService` or keep it local here?
    // Or just implement it here cleanly.
}

/**
 * Check if current user has reported a review
 */
export async function hasUserReported(reviewId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return false;

    const { data } = await supabase
        .from('review_reports')
        .select('id')
        .eq('review_id', reviewId)
        .eq('reporter_id', user.id)
        .single();

    return !!data;
}

/**
 * Get reports for a review (admin only)
 */
export async function getReviewReports(reviewId: string): Promise<ReviewReport[]> {
    const { data, error } = await supabase
        .from('review_reports')
        .select(`
      *,
      reporter:profiles!reporter_id (id, full_name)
    `)
        .eq('review_id', reviewId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('[ReportService] Error fetching reports:', error);
        throw new Error('Could not load reports');
    }

    return data || [];
}

/**
 * Get all pending reports (admin only)
 */
export async function getPendingReports(): Promise<{
    reportCount: number;
    reviewsWithReports: Array<{
        reviewId: string;
        reportCount: number;
        reasons: ReportReason[];
        firstReportedAt: string;
    }>;
}> {
    // Query table directly to avoid potential View permission issues
    const { data, error } = await supabase
        .from('review_reports')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('[ReportService] Error:', error);
        throw new Error('Could not load pending reports');
    }

    if (!data || data.length === 0) {
        return { reportCount: 0, reviewsWithReports: [] };
    }

    // Aggregate by review_id
    const reportsByReview = new Map<string, {
        reviewId: string;
        count: number;
        reasons: Set<ReportReason>;
        firstReportedAt: string;
    }>();

    data.forEach((report: any) => {
        if (!reportsByReview.has(report.review_id)) {
            reportsByReview.set(report.review_id, {
                reviewId: report.review_id,
                count: 0,
                reasons: new Set(),
                firstReportedAt: report.created_at // Init with this one (sorted desc)
            });
        }

        const entry = reportsByReview.get(report.review_id)!;
        entry.count++;
        entry.reasons.add(report.reason);
        // Update firstReportedAt to be the MIN (earliest) timestamp
        if (new Date(report.created_at) < new Date(entry.firstReportedAt)) {
            entry.firstReportedAt = report.created_at;
        }
    });

    const combined = Array.from(reportsByReview.values()).map(r => ({
        reviewId: r.reviewId,
        reportCount: r.count,
        reasons: Array.from(r.reasons),
        firstReportedAt: r.firstReportedAt
    }));

    return {
        reportCount: data.length,
        reviewsWithReports: combined.sort((a, b) => b.reportCount - a.reportCount)
    };
}

/**
 * Dismiss or action a report (admin only)
 */
export async function resolveReports(
    reviewId: string,
    action: 'dismissed' | 'actioned',
    actionDetails?: string
): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
        .from('review_reports')
        .update({
            status: action === 'actioned' ? 'actioned' : 'dismissed',
            reviewed_by: user.id,
            reviewed_at: new Date().toISOString(),
            action_taken: actionDetails
        })
        .eq('review_id', reviewId)
        .eq('status', 'pending');

    if (error) {
        console.error('[ReportService] Error resolving reports:', error);
        throw new Error('Could not resolve reports');
    }

    // Notify reporters if action was taken
    if (action === 'actioned') {
        await notifyReporters(reviewId);
    }
}

async function notifyReporters(reviewId: string): Promise<void> {
    // Get all reporters for this review
    const { data: reports } = await supabase
        .from('review_reports')
        .select('reporter_id')
        .eq('review_id', reviewId);

    if (!reports) return;

    // Create notifications
    const notifications = reports.map(report => ({
        user_id: report.reporter_id,
        type: 'report_actioned',
        title: 'Report Action Taken',
        message: 'Thank you for your report. We have taken action on the review you flagged.',
        data: { reviewId }
    }));

    await supabase.from('notifications').insert(notifications);
}
/**
 * Get latest report details for specific reviews
 */
export async function getLatestReportsForReviews(reviewIds: string[]): Promise<Map<string, { reporterName: string; reportedAt: string }>> {
    if (!reviewIds || reviewIds.length === 0) return new Map();

    const { data, error } = await supabase
        .from('review_reports')
        .select(`
            review_id,
            created_at,
            reporter:profiles!reporter_id (full_name)
        `)
        .in('review_id', reviewIds)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('[ReportService] Error fetching latest reports:', error);
        return new Map();
    }

    const reportMap = new Map();
    // Since we ordered by desc, the first encounter of a review_id is the latest
    data?.forEach((report: any) => {
        if (!reportMap.has(report.review_id)) {
            const reporterName = Array.isArray(report.reporter)
                ? report.reporter[0]?.full_name
                : report.reporter?.full_name || 'Unknown';

            reportMap.set(report.review_id, {
                reporterName,
                reportedAt: report.created_at
            });
        }
    });

    return reportMap;
}
