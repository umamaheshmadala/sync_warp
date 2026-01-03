import { supabase } from '@/lib/supabase';

/**
 * Leaderboard entry representing a friend's engagement metrics
 * Future expansion: Add review_count, share_count, total_score
 */
export interface LeaderboardEntry {
  user_id: string;
  full_name: string;
  username: string;
  avatar_url: string;
  deal_count: number;
  // Future metrics (prepared for expansion):
  // review_count?: number;
  // share_count?: number;
  // total_score?: number;
}

/**
 * Time range options for leaderboard filtering
 */
export type TimeRange = 'week' | 'month' | 'all';

/**
 * Get friend leaderboard ranked by engagement metrics
 * 
 * @param timeRange - Time period to filter: 'week', 'month', or 'all'
 * @returns Array of leaderboard entries sorted by deal count (descending)
 * 
 * Current metric: Offers favorited ("deals found")
 * Future: Multi-metric scoring for business driver identification
 */
export async function getFriendLeaderboard(
  timeRange: TimeRange = 'month'
): Promise<LeaderboardEntry[]> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    console.warn('User not authenticated, returning empty leaderboard');
    return [];
  }

  // Note: RPC function uses auth.uid() internally, no user_id parameter needed
  const { data, error } = await supabase.rpc('get_friend_leaderboard', {
    time_range: timeRange,
    limit_count: 50,
  });

  if (error) {
    console.error('Error fetching friend leaderboard:', error);
    return []; // Return empty array to prevent component from breaking
  }

  return data || [];
}

/**
 * Badge configuration for gamification
 */
export interface Badge {
  emoji: string;
  title: string;
  color: string;
  threshold: number;
}

/**
 * Get badge for a given deal count
 * 
 * Thresholds:
 * - Hunter (🥈): 10+ deals
 * - Expert (🥇): 50+ deals
 * - Legend (🏆): 100+ deals
 */
export function getBadgeForCount(count: number): Badge | null {
  if (count >= 100) {
    return { 
      emoji: '🏆', 
      title: 'Legend', 
      color: 'text-yellow-500',
      threshold: 100 
    };
  }
  if (count >= 50) {
    return { 
      emoji: '🥇', 
      title: 'Expert', 
      color: 'text-yellow-600',
      threshold: 50 
    };
  }
  if (count >= 10) {
    return { 
      emoji: '🥈', 
      title: 'Hunter', 
      color: 'text-gray-400',
      threshold: 10 
    };
  }
  return null;
}

/**
 * Get color class for rank position
 */
export function getRankColor(rank: number): string {
  if (rank === 1) return 'text-yellow-500 font-bold';
  if (rank === 2) return 'text-gray-400 font-bold';
  if (rank === 3) return 'text-orange-600 font-bold';
  return 'text-muted-foreground';
}
