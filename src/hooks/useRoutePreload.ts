import { useEffect } from 'react'

const preloadedRoutes = new Set<string>()

/**
 * Hook for preloading route components to make navigation feel instant
 * @returns Object with preloadRoute function
 */
export function useRoutePreload() {
    /**
     * Preload a route component by triggering its lazy import
     * @param path Route path to preload
     */
    const preloadRoute = (path: string) => {
        if (preloadedRoutes.has(path)) return

        preloadedRoutes.add(path)

        // Map of routes to their lazy imports
        const routeMap: Record<string, () => Promise<any>> = {
            '/': () => import('../components/Landing'),
            '/dashboard': () => import('../components/Dashboard'),
            '/search': () => import('../components/Search'),
            '/wallet': () => import('../components/Wallet'),
            '/profile': () => import('../components/Profile'),
            '/social': () => import('../components/Social'),
            '/friends': () => import('../pages/Friends').then(m => m.FriendsPage),
            '/messages': () => import('../components/messaging/MessagingLayout').then(m => m.MessagingLayout),
            '/settings': () => import('../components/Settings'),
            '/business/dashboard': () => import('../components/business/BusinessDashboard'),
            // Add more routes as needed
        }

        routeMap[path]?.().catch(() => {
            // Silently fail - preloading is a performance optimization, not critical
            preloadedRoutes.delete(path) // Allow retry on next attempt
        })
    }

    /**
     * Preload multiple routes at once
     * @param paths Array of route paths to preload
     */
    const preloadRoutes = (paths: string[]) => {
        paths.forEach(preloadRoute)
    }

    return { preloadRoute, preloadRoutes }
}

/**
 * Hook to automatically preload likely navigation paths on component mount
 * @param routes Array of route paths to preload on mount
 */
export function usePreloadOnMount(routes: string[]) {
    const { preloadRoutes } = useRoutePreload()

    useEffect(() => {
        // Delay preloading slightly to not block initial render
        const timer = setTimeout(() => {
            preloadRoutes(routes)
        }, 100)

        return () => clearTimeout(timer)
    }, []) // eslint-disable-line react-hooks/exhaustive-deps
}
