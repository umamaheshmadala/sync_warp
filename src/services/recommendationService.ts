/**
 * Recommendation Service - People You May Know
 * Story 9.2.2: PYMK Recommendation Engine
 */

import { supabase } from '../lib/supabase';

export interface PYMKRecommendation {
  user_id: string;
  full_name: string;
  username: string;
  avatar_url: string | null;
  location: string | null;
  mutual_friends_count: number;
  from_contacts: boolean;
  distance_km: number | null;
  shared_interests_count: number;
  reason: string;
  score: number;
}

/**
 * Get People You May Know recommendations
 */
export async function getPeopleYouMayKnow(
  limit: number = 20
): Promise<PYMKRecommendation[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase.rpc('get_people_you_may_know', {
    current_user_id: user.id,
    limit_count: limit,
  });

  if (error) {
    console.error('PYMK error:', error);
    throw new Error('Failed to load friend suggestions. Please try again.');
  }

  return data || [];
}

/**
 * Dismiss a PYMK suggestion (hide it for 90 days)
 */
export async function dismissPYMKSuggestion(suggestedUserId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const { error } = await supabase.rpc('dismiss_pymk_suggestion', {
    p_user_id: user.id,
    p_suggested_user_id: suggestedUserId,
  });

  if (error) {
    console.error('Failed to dismiss suggestion:', error);
    throw new Error('Failed to dismiss suggestion');
  }
}

/**
 * Track PYMK analytics event
 */
export async function trackPYMKEvent(
  eventType: 'impression' | 'click' | 'friend_request' | 'dismiss',
  suggestedUserId: string
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // Log to analytics (implement based on your analytics solution)
  console.log('PYMK Analytics:', { eventType, suggestedUserId, userId: user.id });
  
  // Could integrate with Supabase Edge Functions for analytics
  // await supabase.functions.invoke('track-analytics', {
  //   body: { event: `pymk_${eventType}`, userId: user.id, suggestedUserId }
  // });
}
