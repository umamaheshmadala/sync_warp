/**
 * Deal Service
 * Story 9.2.6: Deal Sharing Integration
 * 
 * Handles deal sharing with friends via notifications
 */

import { supabase } from '../lib/supabase';

/**
 * Share deal with multiple friends
 * Sends deal via notification to each friend
 * 
 * @param dealId - ID of the deal/offer to share
 * @param friendIds - Array of user IDs to share with
 */
export async function shareDealWithFriends(
  dealId: string,
  friendIds: string[]
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  // Get user's full name for the notification
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single();

  const senderName = profile?.full_name || 'A friend';

  // Create notification for each friend
  const notifications = friendIds.map((friendId) => ({
    user_id: friendId,
    title: 'Deal Shared',
    message: `${senderName} shared a deal with you`,
    notification_type: 'deal_shared_message',
    entity_id: dealId,
    route_to: `/deals/${dealId}`,
    sender_id: user.id,
    is_read: false,
    created_at: new Date().toISOString(),
  }));

  const { error } = await supabase.from('notifications').insert(notifications);

  if (error) {
    console.error('Failed to share deal:', error);
    throw new Error('Failed to share deal. Please try again.');
  }

  // Track sharing analytics (optional)
  try {
    await supabase.from('deal_shares').insert({
      deal_id: dealId,
      shared_by: user.id,
      shared_with: friendIds,
      shared_at: new Date().toISOString(),
    });
  } catch (error) {
    // Analytics tracking failure shouldn't block the share
    console.warn('Failed to track deal share analytics:', error);
  }
}

/**
 * Get recently shared deals from localStorage
 * Used for showing recent activity
 */
export async function getRecentlySharedDeals(): Promise<string[]> {
  try {
    const recent = localStorage.getItem('recently_shared_deals');
    return recent ? JSON.parse(recent) : [];
  } catch {
    return [];
  }
}

/**
 * Save deal to recently shared list
 */
export function saveToRecentlyShared(dealId: string): void {
  try {
    const recent = JSON.parse(localStorage.getItem('recently_shared_deals') || '[]');
    const updated = [dealId, ...recent.filter((id: string) => id !== dealId)].slice(0, 10);
    localStorage.setItem('recently_shared_deals', JSON.stringify(updated));
  } catch (error) {
    console.error('Failed to save recently shared deal:', error);
  }
}

/**
 * Get deal sharing statistics
 */
export async function getDealSharingStats(dealId: string): Promise<{
  totalShares: number;
  uniqueSharers: number;
  recentShares: number;
}> {
  const { data, error } = await supabase
    .from('deal_shares')
    .select('shared_by, shared_at')
    .eq('deal_id', dealId);

  if (error || !data) {
    return { totalShares: 0, uniqueSharers: 0, recentShares: 0 };
  }

  const uniqueSharers = new Set(data.map(share => share.shared_by)).size;
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const recentShares = data.filter(share => share.shared_at > oneDayAgo).length;

  return {
    totalShares: data.length,
    uniqueSharers,
    recentShares,
  };
}
