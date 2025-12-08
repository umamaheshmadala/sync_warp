import { useEffect, useRef } from 'react';

interface UseMessageVisibilityOptions {
  /**
   * Message ID to track
   */
  messageId: string;
  
  /**
   * Callback fired when message becomes visible
   */
  onVisible: (messageId: string) => void;
  
  /**
   * Whether this message should be tracked (e.g., skip for own messages)
   */
  enabled?: boolean;
  
  /**
   * Threshold for visibility (0.0 to 1.0)
   * @default 0.5 - Message must be at least 50% visible
   */
  threshold?: number;
}

/**
 * Hook to detect when a message scrolls into viewport
 * Uses IntersectionObserver API for efficient visibility detection
 * 
 * Based on WhatsApp's read receipt behavior:
 * - Only fires when message is sufficiently visible (default 50%)
 * - Fires once per message (doesn't re-fire when scrolling away and back)
 * - Optimized for performance with large message lists
 * 
 * @example
 * ```tsx
 * function MessageBubble({ message, onVisible }) {
 *   const ref = useMessageVisibility({
 *     messageId: message.id,
 *     onVisible,
 *     enabled: !message.isOwn
 *   });
 *   
 *   return <div ref={ref}>...</div>
 * }
 * ```
 */
export function useMessageVisibility({
  messageId,
  onVisible,
  enabled = true,
  threshold = 0.5
}: UseMessageVisibilityOptions) {
  const elementRef = useRef<HTMLDivElement>(null);
  const hasBeenVisible = useRef(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    // Skip if disabled or already been visible
    if (!enabled || hasBeenVisible.current) return;

    const element = elementRef.current;
    if (!element) return;

    // Create observer
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // Check if message is visible and hasn't been marked yet
          if (entry.isIntersecting && !hasBeenVisible.current) {
            console.log(`👁️ [useMessageVisibility] Message ${messageId} entered viewport`);
            hasBeenVisible.current = true;
            onVisible(messageId);
            
            // Unobserve after firing (one-time event)
            if (observerRef.current) {
              observerRef.current.unobserve(element);
            }
          }
        });
      },
      {
        threshold, // Default 0.5 = 50% visible
        // Use viewport as root (null means viewport)
        root: null,
        // No margin offset
        rootMargin: '0px'
      }
    );

    // Start observing
    observerRef.current.observe(element);

    // Cleanup
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
    };
  }, [messageId, onVisible, enabled, threshold]);

  return elementRef;
}
