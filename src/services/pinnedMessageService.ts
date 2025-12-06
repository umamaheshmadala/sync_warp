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
    const { data, error } = await supabase
      .from("pinned_messages")
      .select(`
        id,
        message_id,
        conversation_id,
        pinned_by,
        pinned_at,
        expires_at,
        message:messages!pinned_messages_message_id_fkey(
          id,
          content,
          created_at,
          sender_id
        )
      `)
      .eq("conversation_id", conversationId)
      .gt("expires_at", new Date().toISOString())
      .order("pinned_at", { ascending: false });

    if (error) throw error;
    
    // Manual profile fetching
    const senderIds = [...new Set((data || []).map((p: any) => p.message?.sender_id).filter(Boolean))];
    let profiles: Record<string, { full_name: string, email: string }> = {};

    if (senderIds.length > 0) {
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', senderIds);
      
      if (profilesData) {
        profiles = profilesData.reduce((acc, profile) => {
          acc[profile.id] = profile;
          return acc;
        }, {} as Record<string, any>);
      }
    }

    return (data || []).map((pin: any) => {
        const sender = pin.message?.sender_id ? profiles[pin.message.sender_id] : null;
        return {
          id: pin.id,
          messageId: pin.message_id,
          conversationId: pin.conversation_id,
          pinnedBy: pin.pinned_by,
          pinnedAt: pin.pinned_at,
          expiresAt: pin.expires_at,
          message: pin.message
            ? {
                id: pin.message.id,
                content: pin.message.content,
                senderName: sender?.full_name || sender?.email || "Unknown",
                createdAt: pin.message.created_at,
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

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
      pinned_by: user.id,
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
