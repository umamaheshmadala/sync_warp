// src/lib/followerUtils.ts
// Utility functions for follower and campaign operations

import { supabase } from './supabase';

/**
 * Follow a business
 */
export async function followBusiness(businessId: string, userId: string): Promise<boolean> {
  try {
    // Check if already following
    const { data: existing } = await supabase
      .from('business_followers')
      .select('id, is_active')
      .eq('business_id', businessId)
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      // Reactivate if previously unfollowed
      const { error } = await supabase
        .from('business_followers')
        .update({ 
          is_active: true, 
          followed_at: new Date().toISOString() 
        })
        .eq('id', existing.id);

      if (error) throw error;
      return true;
    } else {
      // Create new follow
      const { error } = await supabase.from('business_followers').insert({
        business_id: businessId,
        user_id: userId,
        is_active: true,
      });

      if (error) throw error;
      return true;
    }
  } catch (error) {
    console.error('Error following business:', error);
    return false;
  }
}

/**
 * Unfollow a business
 */
export async function unfollowBusiness(businessId: string, userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('business_followers')
      .update({ is_active: false })
      .eq('business_id', businessId)
      .eq('user_id', userId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error unfollowing business:', error);
    return false;
  }
}

/**
 * Check if a user is following a business
 */
export async function isFollowing(businessId: string, userId: string): Promise<boolean> {
  try {
    const { data } = await supabase
      .from('business_followers')
      .select('id')
      .eq('business_id', businessId)
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle();

    return !!data;
  } catch (error) {
    console.error('Error checking follow status:', error);
    return false;
  }
}

/**
 * Get follower count for a business
 */
export async function getFollowerCount(businessId: string): Promise<number> {
  try {
    const { count } = await supabase
      .from('business_followers')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .eq('is_active', true);

    return count || 0;
  } catch (error) {
    console.error('Error getting follower count:', error);
    return 0;
  }
}

/**
 * Get age group label from age
 */
export function getAgeGroup(age: number): string {
  if (age < 18) return '13-17';
  if (age < 25) return '18-24';
  if (age < 35) return '25-34';
  if (age < 45) return '35-44';
  if (age < 55) return '45-54';
  if (age < 65) return '55-64';
  return '65+';
}

/**
 * Calculate campaign CTR
 */
export function calculateCTR(impressions: number, clicks: number): number {
  if (impressions === 0) return 0;
  return (clicks / impressions) * 100;
}

/**
 * Calculate campaign engagement rate
 */
export function calculateEngagementRate(
  impressions: number,
  clicks: number,
  likes: number,
  shares: number
): number {
  if (impressions === 0) return 0;
  return ((clicks + likes + shares) / impressions) * 100;
}

/**
 * Format large numbers with abbreviations (K, M, B)
 */
export function formatNumber(num: number): string {
  if (num >= 1000000000) {
    return (num / 1000000000).toFixed(1) + 'B';
  }
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

/**
 * Track campaign impression
 */
export async function trackCampaignImpression(
  campaignId: string,
  userId: string,
  isFollower: boolean,
  demographic?: string
): Promise<boolean> {
  try {
    const { error } = await supabase.from('campaign_metrics').insert({
      campaign_id: campaignId,
      user_id: userId,
      impressions: 1,
      is_follower: isFollower,
      demographic: demographic || null,
    });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error tracking impression:', error);
    return false;
  }
}

/**
 * Track campaign click
 */
export async function trackCampaignClick(
  campaignId: string,
  userId: string,
  isFollower: boolean
): Promise<boolean> {
  try {
    // Find existing metric for this user/campaign today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: existing } = await supabase
      .from('campaign_metrics')
      .select('id, clicks')
      .eq('campaign_id', campaignId)
      .eq('user_id', userId)
      .gte('created_at', today.toISOString())
      .maybeSingle();

    if (existing) {
      // Update existing metric
      const { error } = await supabase
        .from('campaign_metrics')
        .update({ clicks: (existing.clicks || 0) + 1 })
        .eq('id', existing.id);

      if (error) throw error;
    } else {
      // Create new metric
      const { error } = await supabase.from('campaign_metrics').insert({
        campaign_id: campaignId,
        user_id: userId,
        clicks: 1,
        is_follower: isFollower,
      });

      if (error) throw error;
    }

    return true;
  } catch (error) {
    console.error('Error tracking click:', error);
    return false;
  }
}

/**
 * Track campaign engagement (like or share)
 */
export async function trackCampaignEngagement(
  campaignId: string,
  userId: string,
  type: 'like' | 'share',
  isFollower: boolean
): Promise<boolean> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: existing } = await supabase
      .from('campaign_metrics')
      .select('id, likes, shares')
      .eq('campaign_id', campaignId)
      .eq('user_id', userId)
      .gte('created_at', today.toISOString())
      .maybeSingle();

    if (existing) {
      const updates =
        type === 'like'
          ? { likes: (existing.likes || 0) + 1 }
          : { shares: (existing.shares || 0) + 1 };

      const { error } = await supabase
        .from('campaign_metrics')
        .update(updates)
        .eq('id', existing.id);

      if (error) throw error;
    } else {
      const { error } = await supabase.from('campaign_metrics').insert({
        campaign_id: campaignId,
        user_id: userId,
        [type === 'like' ? 'likes' : 'shares']: 1,
        is_follower: isFollower,
      });

      if (error) throw error;
    }

    return true;
  } catch (error) {
    console.error('Error tracking engagement:', error);
    return false;
  }
}

/**
 * Report suspicious follower activity
 */
export async function reportSuspiciousActivity(
  reporterId: string,
  reportedUserId: string,
  businessId: string,
  reportType: 'spam' | 'bot' | 'harassment' | 'fake_engagement' | 'other',
  description: string
): Promise<boolean> {
  try {
    const { error } = await supabase.from('follower_reports').insert({
      reporter_id: reporterId,
      reported_user_id: reportedUserId,
      business_id: businessId,
      report_type: reportType,
      description,
      status: 'pending',
    });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error reporting activity:', error);
    return false;
  }
}

/**
 * Get business followers with demographic data
 */
export async function getBusinessFollowersWithDemographics(businessId: string) {
  try {
    const { data, error } = await supabase
      .from('business_followers')
      .select(`
        id,
        user_id,
        followed_at,
        is_active,
        users:user_id (
          id,
          age,
          gender,
          city,
          country
        )
      `)
      .eq('business_id', businessId)
      .eq('is_active', true);

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting followers:', error);
    return [];
  }
}

/**
 * Calculate demographic distribution
 */
export function calculateDemographicDistribution(followers: any[]) {
  const ageGroups: Record<string, number> = {};
  const genders: Record<string, number> = {};
  const cities: Record<string, number> = {};

  followers.forEach((follower) => {
    const user = follower.users;
    if (!user) return;

    // Age groups
    if (user.age) {
      const ageGroup = getAgeGroup(user.age);
      ageGroups[ageGroup] = (ageGroups[ageGroup] || 0) + 1;
    }

    // Genders
    if (user.gender) {
      genders[user.gender] = (genders[user.gender] || 0) + 1;
    }

    // Cities
    if (user.city) {
      cities[user.city] = (cities[user.city] || 0) + 1;
    }
  });

  return { ageGroups, genders, cities };
}

/**
 * Export campaign data to CSV
 */
export function exportCampaignToCSV(
  campaign: any,
  metrics: any
): string {
  const rows = [
    ['Metric', 'Value'],
    ['Campaign', campaign.title],
    ['Status', campaign.status],
    ['Total Impressions', metrics.impressions?.toString() || '0'],
    ['Total Clicks', metrics.clicks?.toString() || '0'],
    ['Total Likes', metrics.likes?.toString() || '0'],
    ['Total Shares', metrics.shares?.toString() || '0'],
    ['CTR (%)', calculateCTR(metrics.impressions || 0, metrics.clicks || 0).toFixed(2)],
    [
      'Engagement Rate (%)',
      calculateEngagementRate(
        metrics.impressions || 0,
        metrics.clicks || 0,
        metrics.likes || 0,
        metrics.shares || 0
      ).toFixed(2),
    ],
    ['Follower Reach', metrics.followerReach?.toString() || '0'],
    ['Public Reach', metrics.publicReach?.toString() || '0'],
  ];

  return rows.map((row) => row.join(',')).join('\n');
}

/**
 * Download CSV file
 */
export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Validate campaign targeting filters
 */
export function validateTargetingFilters(filters: any): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (filters.ageRange) {
    if (filters.ageRange.min < 13) {
      errors.push('Minimum age must be at least 13');
    }
    if (filters.ageRange.max > 100) {
      errors.push('Maximum age cannot exceed 100');
    }
    if (filters.ageRange.min >= filters.ageRange.max) {
      errors.push('Minimum age must be less than maximum age');
    }
  }

  if (filters.gender && !['all', 'male', 'female', 'other'].includes(filters.gender)) {
    errors.push('Invalid gender value');
  }

  if (filters.cities && !Array.isArray(filters.cities)) {
    errors.push('Cities must be an array');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get campaign status color
 */
export function getCampaignStatusColor(status: string): string {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'draft':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    case 'completed':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'paused':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'archived':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

/**
 * Format date for display
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format date with time
 */
export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Calculate days between dates
 */
export function daysBetween(date1: Date | string, date2: Date | string): number {
  const d1 = typeof date1 === 'string' ? new Date(date1) : date1;
  const d2 = typeof date2 === 'string' ? new Date(date2) : date2;
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Get relative time string (e.g., "2 hours ago")
 */
export function getRelativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000);

  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 604800)} weeks ago`;
  return formatDate(d);
}
