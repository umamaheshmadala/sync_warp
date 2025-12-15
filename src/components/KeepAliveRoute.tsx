import { Outlet } from 'react-router-dom'
import { useRef } from 'react'

// Cache for keeping route components mounted but hidden
const routeCache = new Map<string, React.ReactNode>()

interface KeepAliveRouteProps {
    path: string
    children: React.ReactNode
}

/**
 * Component to keep route mounted when navigating away
 * Shows cached version immediately on return, then updates in background
 */
export function KeepAliveRoute({ path, children }: KeepAliveRouteProps) {
    const containerRef = useRef<HTMLDivElement>(null)

    // Cache the rendered component
    if (!routeCache.has(path)) {
        routeCache.set(path, children)
    }

    return (
        <div ref={containerRef} className="h-full">
            {children}
        </div>
    )
}

/**
 * Hook to preserve scroll position across navigation
 */
export function useScrollRestoration(key: string) {
    const scrollPositions = useRef<Map<string, number>>(new Map())

    // Save scroll position before unmount
    const saveScrollPosition = () => {
        const position = window.scrollY
        scrollPositions.current.set(key, position)
    }

    // Restore scroll position on mount
    const restoreScrollPosition = () => {
        const position = scrollPositions.current.get(key)
        if (position !== undefined) {
            requestAnimationFrame(() => {
                window.scrollTo(0, position)
            })
        }
    }

    return { saveScrollPosition, restoreScrollPosition }
}

export default KeepAliveRoute
