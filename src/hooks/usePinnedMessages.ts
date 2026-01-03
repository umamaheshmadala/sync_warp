import { useState, useEffect, useCallback } from "react";
import { pinnedMessageService, PinnedMessage, PinDuration } from "../services/pinnedMessageService";
import { toast } from "react-hot-toast";

export function usePinnedMessages(conversationId: string) {
  const [pinnedMessages, setPinnedMessages] = useState<PinnedMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPins = useCallback(async () => {
    if (!conversationId) return;

    try {
      const pins = await pinnedMessageService.getPinnedMessages(conversationId);
      setPinnedMessages(pins);
    } catch (error) {
      console.error("Failed to fetch pinned messages:", error);
    } finally {
      setIsLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    setPinnedMessages([]); // Reset state when conversation changes
    fetchPins();

    const unsubscribe = pinnedMessageService.subscribeToPinChanges(
      conversationId,
      fetchPins
    );

    return unsubscribe;
  }, [conversationId, fetchPins]);

  const pinMessage = useCallback(
    async (messageId: string, duration: PinDuration) => {
      try {
        await pinnedMessageService.pinMessage(messageId, conversationId, duration);
        toast.success("Message pinned");
        // Immediately fetch to show real data with content and sender
        await fetchPins();
      } catch (error: any) {
        console.error(error);
        toast.error(error.message || "Failed to pin message");
      }
    },
    [conversationId, fetchPins]
  );

  const unpinMessage = useCallback(
    async (messageId: string) => {
      // Optimistic update
      const previousPins = pinnedMessages;
      setPinnedMessages(prev => prev.filter(p => p.messageId !== messageId));

      try {
        await pinnedMessageService.unpinMessage(messageId, conversationId);
        toast.success("Message unpinned");
        // Note: Subscription callback will refresh pins automatically
      } catch (error) {
        // Revert optimistic update
        setPinnedMessages(previousPins);
        console.error(error);
        toast.error("Failed to unpin message");
      }
    },
    [conversationId, pinnedMessages]
  );

  const isMessagePinned = useCallback(
    (messageId: string) => {
      return pinnedMessages.some((p) => p.messageId === messageId);
    },
    [pinnedMessages]
  );

  return {
    pinnedMessages,
    isLoading,
    pinMessage,
    unpinMessage,
    isMessagePinned,
    canPin: pinnedMessages.length < 3,
    refreshPins: fetchPins
  };
}
