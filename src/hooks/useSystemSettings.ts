import { useState, useEffect } from 'react';
import { getAdminSettings } from '../services/adminSettingsService';

/**
 * Hook to access global system settings
 * Currently only exposes requireGpsCheckinForReviews
 */
export function useSystemSettings() {
    const [requireGpsCheckin, setRequireGpsCheckin] = useState<boolean>(true); // Default safe to true
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        let mounted = true;

        async function loadSettings() {
            try {
                const settings = await getAdminSettings();
                if (mounted) {
                    setRequireGpsCheckin(settings.requireGpsCheckinForReviews);
                    setIsLoading(false);
                }
            } catch (err) {
                console.error('Failed to load system settings:', err);
                if (mounted) {
                    setError(err as Error);
                    setIsLoading(false);
                }
            }
        }

        loadSettings();

        return () => {
            mounted = false;
        };
    }, []);

    return {
        requireGpsCheckin,
        isLoading,
        error,
        // Helper to manually refresh if needed
        refresh: async () => {
            const settings = await getAdminSettings();
            setRequireGpsCheckin(settings.requireGpsCheckinForReviews);
        }
    };
}
