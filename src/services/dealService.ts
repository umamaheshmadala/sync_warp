/**
 * Deal Service
 * Story 9.2.6: Deal Sharing Integration
 * 
 * Handles deal sharing with friends via notifications
 */

import { supabase } from '../lib/supabase';

/**
 * Share deal with multiple friends
 * Story 9.7.1: Enhanced to support both message and notification sharing
 * 
 * @param dealId - ID of the deal/offer to share
 * @param friendIds - Array of user IDs to share with
 * @param options - Optional sharing options
 */
export async function shareDealWithFriends(
  dealId: string,
  friendIds: string[],
  options?: {
    shareMethod?: 'message' | 'notification';
    message?: string;
  }
): Promise<void> {
  const shareMethod = options?.shareMethod || 'notification';
  const customMessage = options?.message;

  console.log('shareDealWithFriends called:', { dealId, friendIds, shareMethod, customMessage });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  console.log('Current user:', user.id);

  // Get user's full name
  console.log('Fetching user profile...');
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single();

  if (profileError) {
    console.error('Failed to fetch user profile:', profileError);
  } else {
    console.log('Profile fetched:', profile);
  }

  const senderName = profile?.full_name || 'A friend';
  console.log('Sender name:', senderName);

  // Get offer details for sharing (using offers table, not deals)
  const { data: offer, error: offerError } = await supabase
    .from('offers')
    .select('title')
    .eq('id', dealId)
    .single();

  if (offerError) {
    console.error('Failed to fetch offer:', offerError);
  }

  const dealTitle = offer?.title || 'a deal';

  // Share with each friend based on method
  const sharePromises = friendIds.map(async (friendId) => {
    // Log share in database
    const { error: shareError } = await supabase
      .from('deal_shares')
      .insert({
        deal_id: dealId,
        sender_id: user.id,
        recipient_id: friendId,
        message: customMessage,
        share_method: shareMethod,
      });

    if (shareError) {
      console.error('Error logging share:', shareError);
    }

    // Send via chosen method
    if (shareMethod === 'message') {
      // TODO: Integrate with messaging system when available
      // For now, fall back to notification
      console.warn('Message sharing not yet implemented, using notification');

      await supabase.from('notifications').insert({
        user_id: friendId,
        title: 'Deal Shared',
        message: customMessage || `${senderName} shared ${dealTitle} with you`,
        notification_type: 'deal_shared_message',
        entity_id: dealId,
        sender_id: user.id,
      });
    } else {
      // Send as notification
      await supabase.from('notifications').insert({
        user_id: friendId,
        title: 'Deal Shared',
        message: customMessage || `${senderName} shared ${dealTitle} with you`,
        notification_type: 'deal_shared_message',
        entity_id: dealId,
        sender_id: user.id,
      });
    }
  });

  await Promise.all(sharePromises);

  console.log('🎉 shareDealWithFriends completed successfully');
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
    .select('sender_id, created_at')
    .eq('deal_id', dealId);

  if (error || !data) {
    return { totalShares: 0, uniqueSharers: 0, recentShares: 0 };
  }

  const uniqueSharers = new Set(data.map(share => share.sender_id)).size;
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const recentShares = data.filter(share => share.created_at > oneDayAgo).length;

  return {
    totalShares: data.length,
    uniqueSharers,
    recentShares,
  };
}

/**
 * Get deal details by ID
 */
export async function getDealById(dealId: string): Promise<any> {
  const { data, error } = await supabase
    .from('offers')
    .select('*')
    .eq('id', dealId)
    .single();

  if (error) {
    console.error('Failed to fetch deal:', error);
    return null;
  }

  return data;
}
