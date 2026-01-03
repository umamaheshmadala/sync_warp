import { supabase } from "../lib/supabase";
import { hapticService } from "./hapticService";

export type PinDuration = '24h' | '7d' | '30d';

export interface PinnedMessage {
  id: string;
  messageId: string;
  conversationId: string;
  pinnedBy: string;
  pinnedAt: string;
  expiresAt: string;
  message?: {
    id: string;
    content: string;
    type: 'text' | 'image' | 'video' | 'system';
    senderName: string;
    createdAt: string;
  };
}

class PinnedMessageService {
  private readonly MAX_PINS = 3;

  /**
   * Get pinned messages for a conversation
   */
  async getPinnedMessages(conversationId: string): Promise<PinnedMessage[]> {
    // Step 1: Fetch pinned_messages
    const { data: pins, error: pinsError } = await supabase
      .from("pinned_messages")
      .select("id, message_id, conversation_id, pinned_by, pinned_at, expires_at")
      .eq("conversation_id", conversationId)
      .gt("expires_at", new Date().toISOString())
      .order("pinned_at", { ascending: false });

    if (pinsError) {
      console.error("Error fetching pinned_messages:", pinsError);
      throw pinsError;
    }
    
    if (!pins || pins.length === 0) {
      return [];
    }

    // Step 2: Fetch the actual messages
    const messageIds = pins.map(p => p.message_id);
    const { data: messages, error: messagesError } = await supabase
      .from("messages")
      .select("id, content, type, sender_id, created_at")
      .in("id", messageIds);

    if (messagesError) {
      console.error("Error fetching messages:", messagesError);
      // Continue without message data
    }

    // Create a lookup map for messages
    const messageMap: Record<string, any> = {};
    (messages || []).forEach(msg => {
      messageMap[msg.id] = msg;
    });

    // Step 3: Fetch sender profiles
    const senderIds = [...new Set((messages || []).map(m => m.sender_id).filter(Boolean))];
    let profileMap: Record<string, { full_name: string; email: string }> = {};

    if (senderIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", senderIds);

      if (profilesError) {
        console.error("Error fetching profiles:", profilesError);
        // Continue without profile data
      }

      (profiles || []).forEach(p => {
        profileMap[p.id] = p;
      });
    }

    // Step 4: Combine the data
    return pins.map(pin => {
      const message = messageMap[pin.message_id];
      const sender = message?.sender_id ? profileMap[message.sender_id] : null;

      return {
        id: pin.id,
        messageId: pin.message_id,
        conversationId: pin.conversation_id,
        pinnedBy: pin.pinned_by,
        pinnedAt: pin.pinned_at,
        expiresAt: pin.expires_at,
        message: message
          ? {
              id: message.id,
              content: message.content || '',
              type: message.type || 'text',
              senderName: sender?.full_name || sender?.email || "Unknown User",
              createdAt: message.created_at,
            }
          : undefined,
      };
    });
  }

  /**
   * Calculate expiry date based on duration
   */
  calculateExpiry(duration: PinDuration): string {
    const now = new Date();
    switch (duration) {
      case '24h':
        now.setHours(now.getHours() + 24);
        break;
      case '7d':
        now.setDate(now.getDate() + 7);
        break;
      case '30d':
        now.setDate(now.getDate() + 30);
        break;
    }
    return now.toISOString();
  }

  /**
   * Pin a message
   */
  async pinMessage(
    messageId: string,
    conversationId: string,
    duration: PinDuration = '7d'
  ): Promise<boolean> {
    // Try getSession first (doesn't make network call), then getUser
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    
    if (!userId) {
      // Session might be stale, try getUser as fallback
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        throw new Error("Not authenticated. Please log in again.");
      }
      // Use user.id from getUser
      return this.doPinMessage(messageId, conversationId, duration, user.id);
    }
    
    return this.doPinMessage(messageId, conversationId, duration, userId);
  }
  
  /**
   * Internal method to perform the pin operation
   */
  private async doPinMessage(
    messageId: string,
    conversationId: string,
    duration: PinDuration,
    userId: string
  ): Promise<boolean> {
    // Check pin limit
    const currentPins = await this.getPinnedMessages(conversationId);
    if (currentPins.length >= this.MAX_PINS) {
      throw new Error(`Maximum ${this.MAX_PINS} pinned messages allowed`);
    }

    // Check if already pinned
    const isAlreadyPinned = currentPins.some((p) => p.messageId === messageId);
    if (isAlreadyPinned) {
      throw new Error("Message already pinned");
    }

    const expiresAt = this.calculateExpiry(duration);

    const { error } = await supabase.from("pinned_messages").insert({
      message_id: messageId,
      conversation_id: conversationId,
      pinned_by: userId,
      expires_at: expiresAt
    });

    if (error) throw error;

    await hapticService.trigger("success");
    return true;
  }

  /**
   * Unpin a message
   */
  async unpinMessage(
    messageId: string,
    conversationId: string
  ): Promise<boolean> {
    const { error } = await supabase
      .from("pinned_messages")
      .delete()
      .eq("message_id", messageId)
      .eq("conversation_id", conversationId);

    if (error) throw error;

    await hapticService.trigger("light");
    return true;
  }

  /**
   * Check if message is pinned
   */
  async isMessagePinned(
    messageId: string,
    conversationId: string
  ): Promise<boolean> {
    const { data, error } = await supabase
      .from("pinned_messages")
      .select("id")
      .eq("message_id", messageId)
      .eq("conversation_id", conversationId)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (error) throw error;
    return !!data;
  }

  /**
   * Subscribe to pin changes
   */
  subscribeToPinChanges(
    conversationId: string,
    onChange: () => void
  ): () => void {
    const channel = supabase
      .channel(`pins:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pinned_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        onChange
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
}

export const pinnedMessageService = new PinnedMessageService();
