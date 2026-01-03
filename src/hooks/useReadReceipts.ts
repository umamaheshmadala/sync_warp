// src/hooks/useReadReceipts.ts
// Hook for managing read receipts in messaging components
// Story: 8.5.1 - Read Receipts Implementation

import { useState, useEffect, useCallback, useRef } from 'react';
import { readReceiptService, ReadReceipt } from '../services/readReceiptService';
import { supabase } from '../lib/supabase';

interface UseReadReceiptsOptions {
  /** Automatically mark messages as read when visible */
  autoMark?: boolean;
  /** Delay before marking as read (ms) */
  markDelay?: number;
}

interface UseReadReceiptsReturn {
  /** Mark a message as read */
  markAsRead: (messageId: string) => Promise<boolean>;
  /** Mark all messages in conversation as read */
  markConversationAsRead: () => Promise<void>;
  /** Get read receipts for a message */
  getReadReceipts: (messageId: string) => Promise<ReadReceipt[]>;
  /** Check if message is being tracked for read status */
  isMarkedAsRead: (messageId: string) => boolean;
  /** Current user ID */
  currentUserId: string | null;
  /** Loading state */
  isLoading: boolean;
}

/**
 * Hook for managing read receipts in a conversation
 * 
 * @param conversationId - Conversation to manage read receipts for
 * @param options - Configuration options
 * @returns Methods and state for read receipt management
 * 
 * @example
 * ```tsx
 * const { markAsRead, markConversationAsRead } = useReadReceipts(conversationId);
 * 
 * // Mark single message
 * await markAsRead(messageId);
 * 
 * // Mark all unread on conversation open
 * useEffect(() => {
 *   markConversationAsRead();
 * }, [conversationId]);
 * ```
 */
export function useReadReceipts(
  conversationId: string,
  options: UseReadReceiptsOptions = {}
): UseReadReceiptsReturn {
  const { autoMark = true, markDelay = 500 } = options;
  
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const markedSet = useRef<Set<string>>(new Set());
  const markTimer = useRef<NodeJS.Timeout>();

  // Get current user on mount
  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      setCurrentUserId(data.user?.id || null);
    };
    getUser();
  }, []);

  // Clear cache when conversation changes
  useEffect(() => {
    markedSet.current.clear();
    readReceiptService.clearCache();
    
    return () => {
      if (markTimer.current) {
        clearTimeout(markTimer.current);
      }
    };
  }, [conversationId]);

  // Subscribe to real-time read receipt updates
  useEffect(() => {
    if (!conversationId) return;

    const unsubscribe = readReceiptService.subscribeToReadReceipts(
      conversationId,
      (receipt) => {
        console.log('📖 Read receipt received:', receipt);
        // The MessageBubble will update via the message.status field
      }
    );

    return unsubscribe;
  }, [conversationId]);

  // Mark a single message as read
  const markAsRead = useCallback(async (messageId: string): Promise<boolean> => {
    if (markedSet.current.has(messageId)) {
      return true;
    }

    const success = await readReceiptService.markAsRead(messageId);
    if (success) {
      markedSet.current.add(messageId);
    }
    return success;
  }, []);

  // Mark all messages in conversation as read
  const markConversationAsRead = useCallback(async (): Promise<void> => {
    if (!conversationId) return;

    setIsLoading(true);
    try {
      // Add delay to prevent marking on quick swipes
      if (markDelay > 0) {
        await new Promise(resolve => {
          markTimer.current = setTimeout(resolve, markDelay);
        });
      }

      await readReceiptService.markConversationAsRead(conversationId);
    } finally {
      setIsLoading(false);
    }
  }, [conversationId, markDelay]);

  // Get read receipts for a message
  const getReadReceipts = useCallback(async (messageId: string): Promise<ReadReceipt[]> => {
    return readReceiptService.getReadReceipts(messageId);
  }, []);

  // Check if message is marked as read
  const isMarkedAsRead = useCallback((messageId: string): boolean => {
    return markedSet.current.has(messageId);
  }, []);

  return {
    markAsRead,
    markConversationAsRead,
    getReadReceipts,
    isMarkedAsRead,
    currentUserId,
    isLoading
  };
}

/**
 * Hook to track visibility and mark messages as read when visible
 * 
 * @param messageId - Message to track
 * @param conversationId - Conversation containing the message
 * @param isReceived - Whether this is a received message (not sent by current user)
 */
export function useAutoReadReceipt(
  messageId: string,
  conversationId: string,
  isReceived: boolean
): void {
  const hasMarked = useRef(false);
  const observerRef = useRef<IntersectionObserver>();

  useEffect(() => {
    // Only track received messages
    if (!isReceived || hasMarked.current) return;

    const markAsRead = async () => {
      if (!hasMarked.current) {
        hasMarked.current = true;
        await readReceiptService.markAsRead(messageId);
      }
    };

    // Use Intersection Observer for visibility-based marking
    const element = document.getElementById(`message-${messageId}`);
    if (!element) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting && readReceiptService.isVisible) {
            // Small delay to ensure message is actually viewed
            setTimeout(markAsRead, 300);
          }
        });
      },
      { threshold: 0.5 } // Message must be 50% visible
    );

    observerRef.current.observe(element);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [messageId, conversationId, isReceived]);
}
