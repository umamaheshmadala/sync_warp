import { supabase } from "../lib/supabase";
import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle } from "@capacitor/haptics";

export interface Reaction {
  emoji: string;
  userIds: string[];
  count: number;
}

export interface ReactionUser {
  id: string;
  username: string;
  avatarUrl?: string;
  fullName?: string;
}

// Standard quick reactions (WhatsApp style)
export const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"] as const;

class ReactionService {
  /**
   * Toggle reaction (WhatsApp style: Single reaction per user)
   * - If same emoji: Remove it
   * - If different emoji: Replace old with new
   * - If no reaction: Add it
   */
  async toggleReaction(messageId: string, emoji: string): Promise<boolean> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    // Haptic feedback on mobile (Optimistic)
    if (Capacitor.isNativePlatform()) {
      await Haptics.impact({ style: ImpactStyle.Light });
    }

    // Fetch current reactions
    const { data: message, error: fetchError } = await supabase
      .from("messages")
      .select("reactions")
      .eq("id", messageId)
      .single();

    if (fetchError) throw fetchError;

    const reactions = message?.reactions || {};
    let added = false;

    // 1. Remove user from ALL existing reactions (enforce single reaction)
    let previousEmoji: string | null = null;
    
    Object.keys(reactions).forEach(key => {
      if (reactions[key].includes(user.id)) {
        previousEmoji = key;
        reactions[key] = reactions[key].filter((id: string) => id !== user.id);
        if (reactions[key].length === 0) {
          delete reactions[key];
        }
      }
    });

    // 2. If the clicked emoji is NOT the one we just removed, add it
    // (If it IS the one we removed, we successfully "toggled off")
    if (previousEmoji !== emoji) {
      if (!reactions[emoji]) {
        reactions[emoji] = [];
      }
      reactions[emoji].push(user.id);
      added = true;
    }

    // Update message
    const { error: updateError } = await supabase
      .from("messages")
      .update({ reactions })
      .eq("id", messageId);

    if (updateError) throw updateError;

    return added;
  }

  /**
   * Get reactions summary for display
   */
  getReactionsSummary(reactions: Record<string, string[]>): Reaction[] {
    if (!reactions) return [];

    return Object.entries(reactions)
      .map(([emoji, userIds]) => ({
        emoji,
        userIds,
        count: userIds.length,
      }))
      .sort((a, b) => b.count - a.count); // Sort by count descending
  }

  /**
   * Get reaction users with details
   */
  async getReactionUsers(
    reactions: Record<string, string[]>,
    emoji: string
  ): Promise<ReactionUser[]> {
    const userIds = reactions[emoji] || [];
    if (userIds.length === 0) return [];

    const { data, error } = await supabase
      .from("profiles") // Changed from 'users' to 'profiles' as per codebase convention
      .select("id, username, full_name, avatar_url")
      .in("id", userIds);

    if (error) throw error;

    return (
      data?.map((u) => ({
        id: u.id,
        username: u.username || 'Unknown',
        fullName: u.full_name,
        avatarUrl: u.avatar_url,
      })) || []
    );
  }

  /**
   * Check if current user has reacted with specific emoji
   */
  hasUserReacted(
    reactions: Record<string, string[]>,
    emoji: string,
    userId: string
  ): boolean {
    return reactions[emoji]?.includes(userId) || false;
  }
}

export const reactionService = new ReactionService();
