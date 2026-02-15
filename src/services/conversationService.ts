/**
 * Conversation Service - Friends-Only Messaging
 * Story 9.1.9: Messaging Integration
 * 
 * Handles conversation creation with friendship validation
 * Uses the database functions and view created in Story 9.1.9
 */

import { supabase } from '../lib/supabase';

export interface ConversationWithFriendStatus {
  conversation_id: string;
  type: 'direct' | 'group';
  participants: string[];
  name?: string;
  avatar_url?: string;
  is_archived: boolean;
  is_muted: boolean;
  is_pinned: boolean;
  friend_info?: {
    user_id: string;
    username: string;
    full_name: string;
    avatar_url: string;
    is_online: boolean;
    last_active: string;
    is_friend: boolean;
    is_blocked: boolean;
  };
  latest_message?: {
    content: string;
    created_at: string;
    sender_id: string;
    is_deleted: boolean;
  };
  unread_count: number;
  created_at: string;
  updated_at: string;
  last_message_at?: string;
}

/**
 * Create or get direct conversation with friendship validation
 * Story 9.1.9: Enforces friends-only messaging
 * 
 * @param userId - Friend's user ID
 * @returns Conversation ID
 * @throws Error if not friends or blocked
 */
export async function createOrGetDirectConversation(userId: string): Promise<string> {
  try {
    console.log('🔄 Creating/getting conversation with:', userId);

    const { data, error } = await supabase.rpc('create_or_get_direct_conversation', {
      p_other_user_id: userId,
    });

    if (error) {
      // Handle specific friend-related errors with user-friendly messages
      if (error.message.includes('Can only message friends')) {
        throw new Error('You can only message your friends. Send them a friend request first!');
      } else if (error.message.includes('Cannot message blocked user')) {
        throw new Error('You cannot message this user.');
      } else if (error.message.includes('Cannot message yourself')) {
        throw new Error('You cannot message yourself.');
      } else if (error.message.includes('Not authenticated')) {
        throw new Error('Please log in to send messages.');
      }
      throw error;
    }

    console.log('✅ Conversation ID:', data);
    return data as string;
  } catch (error: any) {
    console.error('❌ Error creating conversation:', error);
    throw error;
  }
}

/**
 * Get conversations with enriched friend status
 * Uses the conversations_with_friend_status view from Story 9.1.9
 */
export async function getConversationsWithFriendStatus(signal?: AbortSignal): Promise<ConversationWithFriendStatus[]> {
  try {
    const { data, error } = await supabase
      .from('conversations_with_friend_status')
      .select('*')
      .order('last_message_at', { ascending: false })
      .abortSignal(signal as AbortSignal); // Cast is safe as Supabase handles undefined

    if (error) {
      console.error('❌ Error fetching conversations:', error);
      throw error;
    }

    return data as ConversationWithFriendStatus[];
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.log('🛑 Fetch conversations aborted');
      return []; // Return empty or rethrow depending on needs, usually silent for abort
    }
    console.error('❌ getConversationsWithFriendStatus error:', error);
    return [];
  }
}

/**
 * Check if current user can message another user
 * Story 9.1.9: Validates friendship + blocking
 * 
 * @param userId - User ID to check
 * @returns true if can message, false otherwise
 */
export async function canMessageUser(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('can_message_user', {
      p_user_id: userId,
    });

    if (error) {
      console.error('❌ Error checking if can message:', error);
      return false;
    }

    return data as boolean;
  } catch (error) {
    console.error('❌ canMessageUser error:', error);
    return false;
  }
}

/**
 * Get conversation by ID with friend status
 */
export async function getConversationById(
  conversationId: string
): Promise<ConversationWithFriendStatus | null> {
  try {
    const { data, error } = await supabase
      .from('conversations_with_friend_status')
      .select('*')
      .eq('conversation_id', conversationId)
      .single();

    if (error) {
      console.error('❌ Error fetching conversation:', error);
      return null;
    }

    return data as ConversationWithFriendStatus;
  } catch (error) {
    console.error('❌ getConversationById error:', error);
    return null;
  }
}
