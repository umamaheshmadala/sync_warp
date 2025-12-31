import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { useMessagingStore } from '../store/messagingStore';
import { messagingService } from '../services/messagingService';
import { friendsService } from '../services/friendsService';
import { fetchDashboardData } from '../hooks/useDashboardData';
import { fetchUserCouponsForPrefetch } from '../hooks/useCoupons';
import { syncFavoritesFromDatabase } from '../hooks/useUnifiedFavorites';

/**
 * AppDataPrefetcher
 * 
 * Component responsible for aggressively prefetching data when the app launches
 * or user authenticates. It ensures that dashboard, wallet, messages, etc.
 * are ready in the background for a "seamless" feel.
 */
export const AppDataPrefetcher = () => {
    const { user } = useAuthStore();
    const queryClient = useQueryClient();
    const { setConversations } = useMessagingStore();

    useEffect(() => {
        if (!user?.id) return;

        const prefetchData = async () => {
            console.log('🚀 [AppDataPrefetcher] Starting aggressive prefetch...');
            const startTime = Date.now();

            // 1. Dashboard Data (React Query)
            queryClient.prefetchQuery({
                queryKey: ['dashboard', user.id],
                queryFn: () => fetchDashboardData(user.id),
                staleTime: 1000 * 60 * 5 // 5 min
            });

            // 2. Wallet/Coupons (React Query)
            queryClient.prefetchQuery({
                queryKey: ['userCoupons', user.id],
                queryFn: () => fetchUserCouponsForPrefetch(user.id),
                staleTime: 1000 * 60 * 5
            });

            // 3. Friends List (React Query)
            queryClient.prefetchQuery({
                queryKey: ['friends', user.id],
                queryFn: () => friendsService.getFriends(user.id),
                staleTime: 1000 * 60 * 5
            });

            // 4. Messages (Zustand Store)
            messagingService.fetchConversations().then(data => {
                // Pre-populate the store silently
                setConversations(data);
                console.log(`✅ [AppDataPrefetcher] Preloaded ${data.length} conversations`);
            }).catch(err => console.warn('Preferred messaging load failed', err));

            // 5. Favorites (Custom Global Store)
            // This function updates its own internal global state and localStorage
            syncFavoritesFromDatabase(user.id).catch(err =>
                console.warn('Prefetched favorites sync failed', err)
            );

            console.log(`✨ [AppDataPrefetcher] Prefetch init complete in ${Date.now() - startTime}ms`);
        };

        // Execute immediately on mount/user change
        prefetchData();

    }, [user?.id, queryClient, setConversations]);

    return null; // This component renders nothing
};
