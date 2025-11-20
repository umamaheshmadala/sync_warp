/**
 * Friend Search Service - Global Friend Search
 * Story 9.2.1: Global Friend Search with Fuzzy Matching
 */

import { supabase } from '../lib/supabase';

export interface FriendSearchResult {
  user_id: string;
  full_name: string;
  username: string;
  avatar_url: string | null;
  location: string | null;
  city: string | null;      // Added
  is_online: boolean;       // Added
  mutual_friends_count: number;
  distance_km: number | null;
  relevance_score: number;
}

export interface FriendSearchFilters {
  limit?: number;
  offset?: number;
  location?: string;
  hasMutualFriends?: boolean;
  isOnline?: boolean;
}

export interface SearchHistory {
  query: string;
  searched_at: string;
}

/**
 * Search for users globally with fuzzy matching
 */
export async function searchFriends(
  query: string,
  filters: FriendSearchFilters = {}
): Promise<FriendSearchResult[]> {
  if (!query || query.trim().length < 2) {
    throw new Error('Search query must be at least 2 characters');
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase.rpc('search_users', {
    search_query: query.trim(),
    current_user_id: user.id,
    limit_count: filters.limit || 20,
    offset_count: filters.offset || 0,
  });

  if (error) {
    console.error('Friend search error:', error);
    throw new Error('Failed to search users. Please try again.');
  }

  let results = data || [];

  // Apply client-side filters
  if (filters.location) {
    results = results.filter(r => {
      // Check both city and location fields for the filter value
      const cityMatch = r.city?.toLowerCase() === filters.location!.toLowerCase();
      const locationMatch = r.location?.toLowerCase() === filters.location!.toLowerCase();
      return cityMatch || locationMatch;
    });
  }

  if (filters.hasMutualFriends) {
    results = results.filter(r => r.mutual_friends_count > 0);
  }

  if (filters.isOnline) {
    // Filter by actual is_online status from database
    results = results.filter(r => r.is_online === true);
  }

  // Save search query to history (fire and forget)
  saveFriendSearchQuery(query.trim()).catch(console.error);

  return results;
}

/**
 * Save search query to history
 */
export async function saveFriendSearchQuery(query: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase.rpc('save_search_query', {
    p_user_id: user.id,
    p_query: query,
  });

  if (error) {
    console.error('Failed to save search query:', error);
  }
}

/**
 * Get user's search history (last 10 searches)
 */
export async function getFriendSearchHistory(): Promise<SearchHistory[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase.rpc('get_search_history', {
    p_user_id: user.id,
  });

  if (error) {
    console.error('Failed to get search history:', error);
    return [];
  }

  return data || [];
}

/**
 * Clear all search history
 */
export async function clearFriendSearchHistory(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const { error } = await supabase
    .from('search_history')
    .delete()
    .eq('user_id', user.id);

  if (error) {
    console.error('Failed to clear search history:', error);
    throw new Error('Failed to clear search history');
  }
}
