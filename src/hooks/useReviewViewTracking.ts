// =====================================================
// Story 11.3.9: Review View Tracking Hook
// Uses Intersection Observer to track when reviews are viewed
// =====================================================

import { useEffect, useRef, useCallback } from 'react';
import { logReviewView } from '../services/userReviewService';

interface UseReviewViewTrackingOptions {
    reviewId: string;
    /** Skip tracking for own reviews (handled in service but can skip API call) */
    isOwnReview?: boolean;
    /** Minimum time in view before counting (ms) */
    minViewTime?: number;
    /** Threshold for intersection (0-1) */
    threshold?: number;
}

/**
 * Hook to track when a review card is viewed
 * Logs view when:
 * - Review is at least 50% visible
 * - User has viewed for at least 2 seconds
 * - User is authenticated
 * - User is not the review author
 */
export function useReviewViewTracking({
    reviewId,
    isOwnReview = false,
    minViewTime = 2000,
    threshold = 0.5
}: UseReviewViewTrackingOptions) {
    const elementRef = useRef<HTMLDivElement>(null);
    const viewStartTimeRef = useRef<number | null>(null);
    const hasLoggedRef = useRef(false);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const logView = useCallback(async () => {
        if (hasLoggedRef.current || isOwnReview) return;

        try {
            await logReviewView(reviewId);
            hasLoggedRef.current = true;
            console.log('[ViewTracking] Logged view for review:', reviewId);
        } catch (error) {
            console.error('[ViewTracking] Error logging view:', error);
        }
    }, [reviewId, isOwnReview]);

    useEffect(() => {
        if (isOwnReview || hasLoggedRef.current) return;

        const element = elementRef.current;
        if (!element) return;

        const observer = new IntersectionObserver(
            (entries) => {
                const entry = entries[0];

                if (entry.isIntersecting) {
                    // Start timing when element becomes visible
                    if (!viewStartTimeRef.current) {
                        viewStartTimeRef.current = Date.now();

                        // Set timer to log view after minViewTime
                        timerRef.current = setTimeout(() => {
                            logView();
                        }, minViewTime);
                    }
                } else {
                    // Element left viewport - clear timer
                    viewStartTimeRef.current = null;
                    if (timerRef.current) {
                        clearTimeout(timerRef.current);
                        timerRef.current = null;
                    }
                }
            },
            { threshold }
        );

        observer.observe(element);

        return () => {
            observer.disconnect();
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        };
    }, [reviewId, isOwnReview, minViewTime, threshold, logView]);

    return elementRef;
}

export default useReviewViewTracking;
