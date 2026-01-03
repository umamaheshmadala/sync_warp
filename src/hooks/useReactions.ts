import { useState, useCallback } from "react";
import { reactionService, Reaction, ReactionUser } from "../services/reactionService";
import { useMessagingStore } from "../store/messagingStore";
import { Message } from "../types/messaging";
import { toast } from "react-hot-toast";
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

export function useReactions(
  message: Message,
  currentUserId: string
) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);
  const [emojiUsers, setEmojiUsers] = useState<ReactionUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Get formatted reactions for display from message prop directly
  // This ensures we always show what's in the store (realtime + optimistic)
  const reactionsSummary: Reaction[] = reactionService.getReactionsSummary(message.reactions || {});

  const updateMessageStore = useMessagingStore(state => state.updateMessage);

  // Toggle reaction
  const toggleReaction = useCallback(
    async (emoji: string) => {
      // Prevent multiple clicks while processing
      // Actually, for optimistic UI, we might want to allow rapid clicks, 
      // but race conditions in 'toggle' logic make it tricky. 
      // For now, let's debounce/block.
      if (isLoading) return;
      
      // Haptic feedback (Mobile only ideally, but harmless on web as it's no-op or ignored)
      if (Capacitor.isNativePlatform()) {
        try {
          await Haptics.impact({ style: ImpactStyle.Light });
        } catch (e) {
          // Ignore haptics errors
        }
      }
      
      setIsLoading(true);
      
      const previousReactions = { ...message.reactions };

      try {
        // 1. Calculate new reactions locally (Single user logic)
        const reactions = { ...message.reactions } || {};
        
        // Remove from all keys
        let previousEmoji: string | null = null;
        Object.keys(reactions).forEach(key => {
          if (reactions[key]?.includes(currentUserId)) {
            previousEmoji = key;
            reactions[key] = reactions[key].filter(id => id !== currentUserId);
            if (reactions[key].length === 0) {
              delete reactions[key];
            }
          }
        });

        // Add if different
        if (previousEmoji !== emoji) {
          if (!reactions[emoji]) reactions[emoji] = [];
          reactions[emoji].push(currentUserId);
        }

        // 2. Optimistic update to store
        updateMessageStore(message.conversation_id, message.id, { reactions });

        // 3. Call service
        await reactionService.toggleReaction(message.id, emoji);

      } catch (error) {
        console.error("Failed to react:", error);
        toast.error("Failed to update reaction");
        // Revert on error
        updateMessageStore(message.conversation_id, message.id, { reactions: previousReactions });
      } finally {
        setIsLoading(false);
      }
    },
    [message, currentUserId, updateMessageStore, isLoading]
  );

  // View users who reacted with emoji
  const viewReactionUsers = useCallback(
    async (emoji: string) => {
      setSelectedEmoji(emoji);
      setLoadingUsers(true);
      try {
        const users = await reactionService.getReactionUsers(message.reactions || {}, emoji);
        setEmojiUsers(users);
      } catch (error) {
        console.error("Failed to load reactions:", error);
        toast.error("Failed to load info");
      } finally {
        setLoadingUsers(false);
      }
    },
    [message.reactions]
  );
  
  const closeReactionUsers = useCallback(() => {
    setSelectedEmoji(null);
    setEmojiUsers([]);
  }, []);

  return {
    reactionsSummary,
    isLoading,
    toggleReaction,
    selectedEmoji,
    emojiUsers,
    loadingUsers,
    viewReactionUsers,
    closeReactionUsers
  };
}
