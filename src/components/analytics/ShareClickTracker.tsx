import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { unifiedShareService } from '../../services/unifiedShareService';

export const ShareClickTracker = () => {
    const location = useLocation();
    const processedRef = useRef<string | null>(null);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        // Unified share service uses 'ref' for shareEventId
        const shareEventId = params.get('ref');

        if (shareEventId && shareEventId !== processedRef.current) {
            console.log('🔗 Detected share click:', shareEventId);
            processedRef.current = shareEventId;

            unifiedShareService.trackClick(shareEventId)
                .catch(err => console.error('Failed to track share click:', err));
        }
    }, [location.search]);

    return null;
};
