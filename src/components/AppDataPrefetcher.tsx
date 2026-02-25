import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { useAuthStore } from '../store/authStore';
import { messagingService } from '../services/messagingService';
import { friendsService } from '../services/friendsService';
import { dashboardService } from '../services/dashboardService';
import { fetchUserCouponsForPrefetch } from '../hooks/useCoupons';
import { syncFavoritesFromDatabase } from '../hooks/useUnifiedFavorites';

/**
 * AppDataPrefetcher
 * 
 * Component responsible for aggressively prefetching data when the app launches
 * or user authenticates. It ensures that dashboard, wallet, messages, etc.
 * are ready in the background for a "seamless" feel.
 * 
 * It also manages the Splash Screen to ensure it only hides when critical data is ready.
 */
export const AppDataPrefetcher = () => {
    const user = useAuthStore((state) => state.user);
    const queryClient = useQueryClient();
    const hasHiddenSplash = useRef(false);

    // Helper to safely hide splash
    const hideSplash = async () => {
        if (hasHiddenSplash.current) return;
        hasHiddenSplash.current = true;
        if (Capacitor.isNativePlatform()) {
            try {
                await SplashScreen.hide();
            } catch (e) {
                console.error('Error hiding splash screen', e);
            }
        }
    };

    useEffect(() => {
        // Safety timeout - ensure splash always hides after 3s max
        const timer = setTimeout(() => {
            if (!hasHiddenSplash.current) {
                console.warn('⚠️ [AppDataPrefetcher] Force hiding splash due to timeout');
                hideSplash();
            }
        }, 3000);

        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        // Check if auth hydration has finished
        const hasHydrated = useAuthStore.persist.hasHydrated();

        // If not hydrated yet, wait. The persist middleware will trigger a re-render or we can listen.
        // However, useAuthStore doesn't automatically re-render this component just because hydration finished 
        // unless we subscribe to a state, but the 'user' object WILL change if hydration brings one in.
        // If 'user' remains null after hydration, we know we are logged out.

        // If we have a user, start prefetching
        if (user?.id) {
            const prefetchData = async () => {
                console.log('🚀 [AppDataPrefetcher] Starting aggressive prefetch...');
                const startTime = Date.now();

                // 1. Critical: Dashboard Data (React Query)
                // We await these before hiding splash. Prefetching individually to match useDashboardData keys.
                // Note: We use Promise.all to fetch them in parallel.
                const dashboardPromises = Promise.all([
                    queryClient.prefetchQuery({
                        queryKey: ['dashboard', 'stats', user.id],
                        queryFn: () => dashboardService.getDashboardStats(user.id),
                        staleTime: 1000 * 60 * 5
                    }),
                    queryClient.prefetchQuery({
                        queryKey: ['dashboard', 'businesses', user.id],
                        queryFn: () => dashboardService.getSpotlightBusinesses(3),
                        staleTime: 1000 * 60 * 5
                    }),
                    queryClient.prefetchQuery({
                        queryKey: ['dashboard', 'offers', user.id],
                        queryFn: () => dashboardService.getHotOffers(6),
                        staleTime: 1000 * 60 * 5
                    }),
                    queryClient.prefetchQuery({
                        queryKey: ['dashboard', 'products', user.id],
                        queryFn: () => dashboardService.getTrendingProducts(6),
                        staleTime: 1000 * 60 * 5
                    })
                ]);

                // 2. Wallet/Coupons (Background)
                queryClient.prefetchQuery({
                    queryKey: ['userCoupons', user.id],
                    queryFn: () => fetchUserCouponsForPrefetch(user.id),
                    staleTime: 1000 * 60 * 5
                });

                // 3. Friends List (Background)
                queryClient.prefetchQuery({
                    queryKey: ['friends', user.id],
                    queryFn: () => friendsService.getFriends(user.id),
                    staleTime: 1000 * 60 * 5
                });

                // 4. Conversations & Messages (React Query)
                queryClient.prefetchQuery({
                    queryKey: ['conversations'],
                    queryFn: () => messagingService.fetchConversations(),
                    staleTime: 1000 * 60 * 5
                }).then(() => {
                    const data = queryClient.getQueryData<any[]>(['conversations']);
                    if (!data) return;

                    // [Story 16.3] Reduced Prefetching:
                    // Prefetch messages for only the top 3 most recent conversations.
                    // The remaining conversations load messages on-demand when navigated to.
                    // This reduces startup from 20 parallel queries to 3, improving initial load speed.
                    const topActive = data.slice(0, 3);
                    console.log(`⚡ [AppDataPrefetcher] Prefetching messages for top ${topActive.length} chats`);

                    topActive.forEach(conv => {
                        queryClient.prefetchQuery({
                            queryKey: ['messages', conv.conversation_id],
                            queryFn: () => messagingService.fetchMessages(conv.conversation_id, 20),
                            staleTime: 1000 * 60 * 5, // 5 min
                            gcTime: 1000 * 60 * 30    // 30 min
                        });
                    });
                }).catch(console.warn);

                // 5. Favorites
                syncFavoritesFromDatabase(user.id).catch(console.warn);

                try {
                    // Wait for dashboard data or 2 seconds, whichever is faster
                    // We don't want to block too long if network is slow
                    const minWait = new Promise(resolve => setTimeout(resolve, 500)); // Min splash time to prevent flash
                    const maxWait = new Promise(resolve => setTimeout(resolve, 2000)); // Max wait for data

                    await Promise.all([
                        minWait,
                        Promise.race([dashboardPromises, maxWait])
                    ]);

                    console.log(`✨ [AppDataPrefetcher] Ready in ${Date.now() - startTime}ms`);
                } finally {
                    hideSplash();
                }
            };

            prefetchData();
        } else if (hasHydrated && !user) {
            // Logged out or hydration finished with no user - hide immediately
            hideSplash();
        } else {
            // Not hydrated yet, or waiting for user. 
            // We rely on the safety timeout if for some reason hydration hangs.
            // But usually 'user' updates quickly.

            // If we are seemingly "stuck" with no user but hydration claims true (rare race),
            // we might trigger a check.
            if (hasHydrated && !hasHiddenSplash.current) {
                hideSplash();
            }
        }

    }, [user?.id, queryClient]);

    return null;
};
