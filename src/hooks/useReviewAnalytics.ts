import { useQuery } from '@tanstack/react-query';
import {
    getBusinessReviewAnalytics,
    getDailyReviewStats,
    getTagAnalysis,
    getCategoryAverages,
    getReviewTimeHeatmap
} from '../services/reviewAnalyticsService';

/**
 * Hook to get overall business review analytics
 */
export function useBusinessReviewAnalytics(businessId: string, days = 30) {
    return useQuery({
        queryKey: ['review-analytics', businessId, days],
        queryFn: () => getBusinessReviewAnalytics(businessId, days),
        enabled: !!businessId,
        staleTime: 5 * 60 * 1000 // 5 minutes
    });
}

/**
 * Hook to get daily review stats for charts
 */
export function useDailyReviewStats(businessId: string, days = 30) {
    return useQuery({
        queryKey: ['review-daily-stats', businessId, days],
        queryFn: () => getDailyReviewStats(businessId, days),
        enabled: !!businessId,
        staleTime: 5 * 60 * 1000
    });
}

/**
 * Hook to get tag analysis
 */
export function useTagAnalysis(businessId: string, days = 90) {
    return useQuery({
        queryKey: ['review-tags', businessId, days],
        queryFn: () => getTagAnalysis(businessId, days),
        enabled: !!businessId,
        staleTime: 15 * 60 * 1000 // 15 minutes
    });
}

/**
 * Hook to get category averages
 */
export function useCategoryAverages(category: string) {
    return useQuery({
        queryKey: ['category-averages', category],
        queryFn: () => getCategoryAverages(category),
        enabled: !!category,
        staleTime: 60 * 60 * 1000 // 1 hour
    });
}

/**
 * Hook to get peak review times heatmap
 */
export function useReviewTimeHeatmap(businessId: string) {
    return useQuery({
        queryKey: ['review-heatmap', businessId],
        queryFn: () => getReviewTimeHeatmap(businessId),
        enabled: !!businessId,
        staleTime: 60 * 60 * 1000 // 1 hour
    });
}
