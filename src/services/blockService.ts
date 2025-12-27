import { supabase } from '../lib/supabase';

/**
 * Type definitions for blocking system
 */

export interface BlockedUser {
  // id: string; // Removed as it doesn't exist in actual schema
  blocker_id: string;
  blocked_id: string;
  reason: string | null;
  blocked_at: string; // Renamed from created_at
  blocked_user?: Profile;
}

interface Profile {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
}

export interface BlockUserResult {
  success: boolean;
  already_blocked: boolean;
  friendships_removed: number;
  follows_removed: number;
  requests_cancelled: number;
  blocked_at: string;
}

export interface UnblockUserResult {
  success: boolean;
  unblocked_at: string;
  note: string;
}

/**
 * Block a user - atomic operation that:
 * - Unfriends both directions
 * - Unfollows both directions
 * - Cancels pending friend requests
 * - Adds block entry
 * 
 * Note: Blocked conversations appear in "Blocked" tab (not archived)
 * 
 * @param userId - ID of user to block
 * @param reason - Optional reason for blocking (private to blocker)
 * @returns Result with counts of removed relationships
 * @throws Error if operation fails or user not found
 */
export async function blockUser(
  userId: string,
  reason?: string
): Promise<BlockUserResult> {
  if (!userId) {
    throw new Error('User ID is required');
  }

  const { data, error } = await supabase.rpc('block_user', {
    p_blocked_user_id: userId,
    p_reason: reason || null,
  });

  if (error) {
    console.error('Block user error:', error);
    throw new Error(error.message || 'Failed to block user');
  }

  if (!data) {
    throw new Error('No response from block operation');
  }

  console.log(`🚫 Blocked user ${userId}`);
  return data as BlockUserResult;
}

/**
 * Unblock a user - restores visibility but NOT friendship or follows
 * 
 * @param userId - ID of user to unblock
 * @returns Result confirming unblock
 * @throws Error if user was not blocked or operation fails
 */
export async function unblockUser(userId: string): Promise<UnblockUserResult> {
  if (!userId) {
    throw new Error('User ID is required');
  }

  const { data, error } = await supabase.rpc('unblock_user', {
    p_blocked_user_id: userId,
  });

  if (error) {
    console.error('Unblock user error:', error);
    throw new Error(error.message || 'Failed to unblock user');
  }

  if (!data) {
    throw new Error('No response from unblock operation');
  }

  console.log(`✅ Unblocked user ${userId}`);
  return data as UnblockUserResult;
}

/**
 * Get list of users you've blocked
 * Includes profile information for each blocked user
 * 
 * @returns Array of blocked users with profile data
 * @throws Error if query fails
 */
export async function getBlockedUsers(): Promise<BlockedUser[]> {
  const { data, error } = await supabase
    .from('blocked_users')
    .select('blocker_id, blocked_id, reason, blocked_at')
    .order('blocked_at', { ascending: false });

  if (error) {
    console.error('Get blocked users error:', error);
    throw new Error(error.message || 'Failed to fetch blocked users');
  }

  // Fetch blocked user profiles separately to avoid RLS issues
  if (data && data.length > 0) {
    const blockedIds = data.map(block => block.blocked_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, email, avatar_url')
      .in('id', blockedIds);

    // Merge profiles into blocked users
    return data.map(block => ({
      ...block,
      blocked_user: profiles?.find(p => p.id === block.blocked_id) || null
    })) as BlockedUser[];
  }

  return [];
}

/**
 * Check if a specific user is blocked by current user
 * 
 * @param userId - ID of user to check
 * @returns True if user is blocked, false otherwise
 * @throws Error if query fails
 */
export async function isUserBlocked(userId: string): Promise<boolean> {
  if (!userId) {
    return false;
  }

  const { data, error } = await supabase
    .from('blocked_users')
    .select('blocked_id')
    .eq('blocked_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Is user blocked error:', error);
    throw new Error(error.message || 'Failed to check block status');
  }

  return data !== null;
}

/**
 * Check if current user is blocked by another user
 * This is useful to know why you can't see someone's profile
 * 
 * @param userId - ID of user who might have blocked you
 * @returns True if you are blocked by that user, false otherwise
 * @throws Error if query fails
 */
export async function isBlockedByUser(userId: string): Promise<boolean> {
  if (!userId) {
    return false;
  }

  const { data: currentUser } = await supabase.auth.getUser();
  if (!currentUser.user) {
    return false;
  }

  const { data, error } = await supabase
    .from('blocked_users')
    .select('blocker_id')
    .eq('blocker_id', userId)
    .eq('blocked_id', currentUser.user.id)
    .maybeSingle();

  if (error) {
    console.error('Is blocked by user error:', error);
    throw new Error(error.message || 'Failed to check block status');
  }

  return data !== null;
}

/**
 * Get count of users you've blocked
 * 
 * @returns Number of blocked users
 * @throws Error if query fails
 */
export async function getBlockedUsersCount(): Promise<number> {
  const { count, error } = await supabase
    .from('blocked_users')
    .select('blocked_id', { count: 'exact', head: true });

  if (error) {
    console.error('Get blocked users count error:', error);
    throw new Error(error.message || 'Failed to get blocked users count');
  }

  return count || 0;
}

/**
 * Subscribe to changes in blocked_users table
 * Useful for real-time updates when users are blocked/unblocked
 * 
 * @param callback - Function to call when block status changes
 * @returns Unsubscribe function
 */
export function subscribeToBlockChanges(
  callback: (payload: {
    eventType: 'INSERT' | 'UPDATE' | 'DELETE';
    new: BlockedUser | null;
    old: BlockedUser | null;
  }) => void
) {
  const channel = supabase
    .channel('blocked_users_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'blocked_users',
      },
      (payload: any) => {
        callback({
          eventType: payload.eventType,
          new: payload.new,
          old: payload.old,
        });
      }
    )
    .subscribe();

  // Return unsubscribe function
  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Check if there is any blocking relationship between two users
 * (either direction)
 * 
 * @param userId - ID of other user
 * @returns Object indicating if you blocked them or they blocked you
 * @throws Error if query fails
 */
export async function getBlockingStatus(userId: string): Promise<{
  youBlockedThem: boolean;
  theyBlockedYou: boolean;
}> {
  if (!userId) {
    return { youBlockedThem: false, theyBlockedYou: false };
  }

  const [youBlockedThem, theyBlockedYou] = await Promise.all([
    isUserBlocked(userId),
    isBlockedByUser(userId),
  ]);

  return { youBlockedThem, theyBlockedYou };
}

/**
 * Archive all conversations with a specific user
 * Called automatically when blocking a user
 * 
 * @param userId - ID of user whose conversations should be archived
 * @throws Error if archiving fails
 */
export async function archiveConversationsWithUser(userId: string): Promise<void> {
  if (!userId) {
    return;
  }

  const { data: currentUser } = await supabase.auth.getUser();
  if (!currentUser.user) {
    throw new Error('Not authenticated');
  }

  const currentUserId = currentUser.user.id;

  // Find all conversations where both users are participants
  // Using array contains operator to check if both users are in participants array
  const { data: conversations, error: fetchError } = await supabase
    .from('conversations')
    .select('id, participants, type')
    .contains('participants', [currentUserId])
    .contains('participants', [userId]);

  if (fetchError) {
    console.error('Failed to fetch conversations:', fetchError);
    throw new Error('Failed to fetch conversations');
  }

  if (!conversations || conversations.length === 0) {
    console.log('No conversations to archive');
    return;
  }

  // Filter to only include direct (1-on-1) conversations
  const targetConversations = conversations.filter(
    (c) => c.type === 'direct' && c.participants.length === 2
  );

  if (targetConversations.length === 0) {
    console.log('No direct conversations to archive');
    return;
  }

  // Archive each conversation
  for (const convo of targetConversations) {
    const { error: archiveError } = await supabase
      .from('conversation_participants')
      .update({
        is_archived: true,
      })
      .eq('conversation_id', convo.id)
      .eq('user_id', currentUserId);

    if (archiveError) {
      console.error(`Failed to archive conversation ${convo.id}:`, archiveError);
      // Continue archiving other conversations even if one fails
    } else {
      console.log(`📦 Archived conversation ${convo.id}`);
    }
  }
}
