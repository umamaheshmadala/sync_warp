import { useEffect, useRef } from 'react';
import { productAnalyticsService } from '../services/productAnalyticsService';

/**
 * Hook to automatically track product views properly.
 * Ensures we don't double count on strict mode or quick re-renders.
 */
export const useProductViewTracking = (productId: string | undefined, enabled: boolean = true) => {
    const trackedRef = useRef<Set<string>>(new Set());

    useEffect(() => {
        if (!productId || !enabled) return;

        // 1. Check in-memory ref (component lifecycle)
        if (trackedRef.current.has(productId)) return;

        // 2. Check persistent storage (session/hour deduplication)
        const storageKey = `viewed_${productId}`;
        const lastViewed = sessionStorage.getItem(storageKey);
        const now = Date.now();
        const ONE_HOUR = 60 * 60 * 1000;

        if (lastViewed && (now - parseInt(lastViewed)) < ONE_HOUR) {
            // Already viewed recently, skip to prevent 409
            return;
        }

        const track = async () => {
            await productAnalyticsService.trackProductView(productId);
            trackedRef.current.add(productId);
            try {
                sessionStorage.setItem(storageKey, now.toString());
            } catch (e) {
                // Ignore storage errors (quota, incognito)
            }
        };

        // Small delay to ensure it's a real view, not just a flicker
        const timer = setTimeout(track, 1000);

        return () => clearTimeout(timer);
    }, [productId, enabled]);
};
