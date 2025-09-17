// src/hooks/useLoadingTimeout.ts
import { useEffect, useRef } from 'react'

/**
 * Hook to automatically reset loading state after a timeout
 * This prevents components from getting stuck in loading state
 */
export const useLoadingTimeout = (
  isLoading: boolean, 
  onTimeout: () => void, 
  timeoutMs: number = 45000 // 45 seconds default
) => {
  const timeoutRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    if (isLoading) {
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      
      // Set new timeout
      timeoutRef.current = setTimeout(() => {
        console.warn('Loading state timeout reached, forcing reset')
        onTimeout()
      }, timeoutMs)
    } else {
      // Clear timeout when loading stops
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = undefined
      }
    }

    // Cleanup on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [isLoading, onTimeout, timeoutMs])
}

/**
 * Hook for debugging loading states
 */
export const useLoadingDebug = (componentName: string, isLoading: boolean) => {
  useEffect(() => {
    if (isLoading) {
      console.log(`${componentName}: Loading started`)
    } else {
      console.log(`${componentName}: Loading stopped`)
    }
  }, [isLoading, componentName])
}