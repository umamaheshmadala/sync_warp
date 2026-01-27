import { supabase } from '@/lib/supabase';

export type BadgeTier = 'recommended' | 'highly_recommended' | 'very_highly_recommended' | null;

export interface BusinessBadge {
    tier: BadgeTier;
    percentage: number;
    reviewCount: number;
    nextTier: {
        name: string;
        percentage: number;
        reviewsNeeded?: number;
    } | null;
}

export const BADGE_CONFIG: Record<string, {
    label: string;
    shortLabel: string;
    threshold: number;
    icon: string;
    color: string;
    bgColor: string;
}> = {
    recommended: {
        label: 'Recommended',
        shortLabel: 'Rec.',
        threshold: 75,
        icon: '👍',
        color: 'text-amber-700',
        bgColor: 'bg-amber-100'
    },
    highly_recommended: {
        label: 'Highly Recommended',
        shortLabel: 'Highly Rec.',
        threshold: 90,
        icon: '🌟',
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-100'
    },
    very_highly_recommended: {
        label: 'Very Highly Recommended',
        shortLabel: 'Top Rated',
        threshold: 95,
        icon: '🏆',
        color: 'text-purple-700',
        bgColor: 'bg-purple-100'
    }
};

/**
 * Get badge info for a business
 */
export async function getBusinessBadge(businessId: string): Promise<BusinessBadge> {
    const { data, error } = await supabase
        .from('businesses')
        .select('recommendation_badge, recommendation_percentage, approved_review_count')
        .eq('id', businessId)
        .single();

    if (error || !data) {
        return { tier: null, percentage: 0, reviewCount: 0, nextTier: null };
    }

    const nextTier = calculateNextTier(
        data.recommendation_badge,
        data.recommendation_percentage,
        data.approved_review_count
    );

    return {
        tier: data.recommendation_badge,
        percentage: data.recommendation_percentage,
        reviewCount: data.approved_review_count,
        nextTier
    };
}

export function calculateNextTier(
    currentTier: BadgeTier,
    percentage: number,
    reviewCount: number
): BusinessBadge['nextTier'] {
    // Need 3 reviews first
    if (reviewCount < 3) {
        return {
            name: 'Recommended',
            percentage: 75,
            reviewsNeeded: 3 - reviewCount
        };
    }

    // Helper to calculate reviews needed
    const calculateNeeded = (targetPct: number) => {
        const target = targetPct / 100;
        const current = percentage / 100;
        const positives = Math.round(reviewCount * current);

        // Formula: (Target * N - Positives) / (1 - Target)
        // Derived from: (Positives + X) / (N + X) >= Target
        const numerator = (target * reviewCount) - positives;
        const denominator = 1 - target;

        if (denominator <= 0) return 0; // Should not happen for < 100% targets

        const needed = Math.ceil(numerator / denominator);
        return Math.max(0, needed);
    };

    if (!currentTier || currentTier === 'recommended') {
        if (percentage < 75) {
            return {
                name: 'Recommended',
                percentage: 75,
                reviewsNeeded: calculateNeeded(75)
            };
        }
        return {
            name: 'Highly Recommended',
            percentage: 90,
            reviewsNeeded: calculateNeeded(90)
        };
    }

    if (currentTier === 'highly_recommended') {
        return {
            name: 'Very Highly Recommended',
            percentage: 95,
            reviewsNeeded: calculateNeeded(95)
        };
    }

    // Already at top tier
    return null;
}
