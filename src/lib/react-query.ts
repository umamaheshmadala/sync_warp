import { QueryClient } from '@tanstack/react-query'

// Configure React Query with stale-while-revalidate pattern
// Shows cached data immediately, then fetches fresh data in background
export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            // Cache data for 24 hours
            gcTime: 1000 * 60 * 60 * 24,

            // Consider data fresh for 30 minutes
            // Within this time, won't refetch at all (instant cache hit)
            staleTime: 1000 * 60 * 30,

            // When data becomes stale (after 30min), show cached version immediately
            // then refetch in background - this is the key setting!
            refetchOnMount: true,  // Refetch stale data on mount (but show cache first)

            // Disable refetch on window focus to prevent jarring updates
            refetchOnWindowFocus: false,

            // Refetch when reconnecting to network
            refetchOnReconnect: true,

            // Retry failed requests
            retry: 2,
        },
    },
})
