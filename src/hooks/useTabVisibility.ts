import { useEffect, useRef } from 'react';

/**
 * Hook to handle tab visibility changes without causing unnecessary reloads
 * Prevents components from re-fetching data when user switches browser tabs
 */
export const useTabVisibility = (callback?: () => void, preventReload = true) => {
  const callbackRef = useRef(callback);
  const hasRunRef = useRef(false);
  
  // Update callback ref when callback changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Only run callback if we want to allow reloads and haven't run recently
        if (!preventReload && callbackRef.current && !hasRunRef.current) {
          callbackRef.current();
          hasRunRef.current = true;
          
          // Reset the flag after a delay to allow periodic refreshes
          setTimeout(() => {
            hasRunRef.current = false;
          }, 5000); // Wait 5 seconds before allowing another refresh
        }
      }
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
      
      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }
  }, [preventReload]);
  
  return document?.visibilityState === 'visible';
};