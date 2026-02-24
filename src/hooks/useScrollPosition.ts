import { useState, useEffect, useRef, useCallback } from 'react'
import { Capacitor } from '@capacitor/core'

interface UseScrollPositionProps {
    threshold?: number // Distance from bottom to consider "at bottom" (default: 100px)
}

interface UseScrollPositionReturn {
    scrollContainerRef: React.RefObject<HTMLDivElement>
    isAtBottom: boolean
    showScrollButton: boolean
    scrollToBottom: (behavior?: ScrollBehavior | 'auto') => void
    checkScrollPosition: () => void
}

/**
 * Hook to track scroll position and determine if user is at the bottom
 * Used for "Smart Scroll" behavior (Story 8.12.1)
 */
export function useScrollPosition({ threshold = 100 }: UseScrollPositionProps = {}): UseScrollPositionReturn {
    const scrollContainerRef = useRef<HTMLDivElement>(null)
    const [isAtBottom, setIsAtBottom] = useState(true) // Default to true for initial load
    const [showScrollButton, setShowScrollButton] = useState(false)
    const isInternalScroll = useRef(false)

    // Check if we are at the bottom
    const checkScrollPosition = useCallback(() => {
        const container = scrollContainerRef.current
        if (!container) return

        const { scrollTop, scrollHeight, clientHeight } = container

        // Distance from bottom
        const distanceFromBottom = scrollHeight - scrollTop - clientHeight

        // Check if at bottom
        // We use a small buffer (threshold) to account for fractional pixels or padding
        const newIsAtBottom = distanceFromBottom <= threshold

        // Only update state if changed to prevent re-renders
        if (newIsAtBottom !== isAtBottom) {
            setIsAtBottom(newIsAtBottom)
            setShowScrollButton(!newIsAtBottom)
        }
    }, [isAtBottom, threshold])

    // Scroll handler with requestAnimationFrame for performance
    useEffect(() => {
        const container = scrollContainerRef.current
        if (!container) return

        let rafId: number | null = null

        const handleScroll = () => {
            // Skip check if this scroll event was triggered by our own scrollToBottom
            if (isInternalScroll.current) {
                isInternalScroll.current = false
                // Still force set to true effectively, but maybe wait for next frame?
                // Actually, better to just let it check.
            }

            if (rafId) cancelAnimationFrame(rafId)

            rafId = requestAnimationFrame(() => {
                checkScrollPosition()
            })
        }

        container.addEventListener('scroll', handleScroll, { passive: true })

        // Initial check
        checkScrollPosition()

        return () => {
            container.removeEventListener('scroll', handleScroll)
            if (rafId) cancelAnimationFrame(rafId)
        }
    }, [checkScrollPosition])

    // Scroll to bottom function
    const scrollToBottom = useCallback((behavior: ScrollBehavior | 'auto' = 'smooth') => {
        const container = scrollContainerRef.current
        if (!container) return

        // Mark as internal scroll to avoid state flickering (optional optimization)
        isInternalScroll.current = true

        // Force state to bottom immediately (optimistic)
        setIsAtBottom(true)
        setShowScrollButton(false)

        // Use 'auto' behavior for native platforms if requested, to avoid glitches
        const finalBehavior = behavior === 'auto' || Capacitor.isNativePlatform()
            ? 'auto'
            : behavior

        container.scrollTo({
            top: container.scrollHeight,
            behavior: finalBehavior as ScrollBehavior
        })

        // Double check after scroll animation (approximate duration)
        // This ensures state is correct even if something interfered
        if (finalBehavior === 'smooth') {
            setTimeout(checkScrollPosition, 300)
        } else {
            setTimeout(checkScrollPosition, 50)
        }
    }, [checkScrollPosition])

    return {
        scrollContainerRef,
        isAtBottom,
        showScrollButton,
        scrollToBottom,
        checkScrollPosition
    }
}
