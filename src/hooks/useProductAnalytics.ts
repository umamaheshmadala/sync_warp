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

        // Prevent double tracking in same session/component lifecycle if desired, 
        // though DB handles hourly dedupe. This saves network calls.
        if (trackedRef.current.has(productId)) return;

        const track = async () => {
            await productAnalyticsService.trackProductView(productId);
            trackedRef.current.add(productId);
        };

        // Small delay to ensure it's a real view, not just a flicker
        const timer = setTimeout(track, 1000);

        return () => clearTimeout(timer);
    }, [productId, enabled]);
};
