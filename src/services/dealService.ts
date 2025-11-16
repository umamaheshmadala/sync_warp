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
  console.log('shareDealWithFriends called:', { dealId, friendIds });
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }
  
  console.log('Current user:', user.id);

  // Get user's full name for the notification
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

  // Create notification for each friend
  const notifications = friendIds.map((friendId) => ({
    user_id: friendId,
    title: 'Deal Shared',
    message: `${senderName} shared a deal with you`,
    notification_type: 'deal_shared_message',
    entity_id: dealId,
    sender_id: user.id,
  }));
  
  console.log('Notifications to insert:', notifications);

  console.log('Inserting notifications...');
  const { error } = await supabase.from('notifications').insert(notifications);

  if (error) {
    console.error('Failed to create notifications:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    console.error('Error details:', error.details);
    console.error('Attempted to insert:', notifications);
    
    // Provide more helpful error message
    if (error.message.includes('null value')) {
      throw new Error('Missing required fields. Please ensure all data is valid.');
    } else if (error.code === '23503') {
      throw new Error('Invalid user ID. Please check friend selection.');
    } else {
      throw new Error(`Database error: ${error.message}`);
    }
  }
  
  console.log('✅ Notifications inserted successfully');

  // Track sharing analytics (optional)
  console.log('Tracking analytics...');
  try {
    await supabase.from('deal_shares').insert({
      deal_id: dealId,
      shared_by: user.id,
      shared_with: friendIds,
      shared_at: new Date().toISOString(),
    });
    console.log('✅ Analytics tracked successfully');
  } catch (error) {
    // Analytics tracking failure shouldn't block the share
    console.warn('Failed to track deal share analytics:', error);
  }
  
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
