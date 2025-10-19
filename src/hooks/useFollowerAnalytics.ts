// src/hooks/useFollowerAnalytics.ts
// Hook for business owners to view follower analytics

import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

export interface FollowerAnalytics {
  business_name: string;
  total_followers: number;
  new_followers_this_week: number;
  new_followers_this_month: number;
  active_followers: number; // Followers with notifications enabled
  demographics: {
    age_distribution: Record<string, number>;
    gender_split: Record<string, number>;
    top_cities: Array<{ city: string; count: number }>;
    top_interests: Array<{ interest: string; count: number }>;
  };
  growth_trend: Array<{ date: string; count: number }>;
  engagement_rate: number;
}

interface UseFollowerAnalyticsReturn {
  analytics: FollowerAnalytics | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useFollowerAnalytics(businessId: string): UseFollowerAnalyticsReturn {
  const [analytics, setAnalytics] = useState<FollowerAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const subscriptionRef = useRef<any>(null);

  const fetchAnalytics = async () => {
    if (!businessId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('[FollowerAnalytics] Fetching analytics for business:', businessId);

      // First, get the business name
      const { data: businessData, error: businessError } = await supabase
        .from('businesses')
        .select('business_name')
        .eq('id', businessId)
        .single();

      if (businessError) {
        console.error('[FollowerAnalytics] Error fetching business:', businessError);
        throw new Error('Business not found');
      }

      const businessName = businessData?.business_name || 'Unknown Business';
      console.log('[FollowerAnalytics] Business name:', businessName);

      // Get all followers
      const { data: followers, error: fetchError } = await supabase
        .from('business_followers')
        .select(`
          id,
          user_id,
          followed_at,
          notification_preferences,
          is_active
        `)
        .eq('business_id', businessId)
        .eq('is_active', true);

      if (fetchError) {
        console.error('[FollowerAnalytics] Error fetching followers:', fetchError);
        throw fetchError;
      }

      console.log('[FollowerAnalytics] Fetched', followers?.length || 0, 'followers');

      // Fetch profiles separately for better reliability
      let profiles: any[] = [];
      if (followers && followers.length > 0) {
        const userIds = followers.map(f => f.user_id);
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, date_of_birth, city, interests')
          .in('id', userIds);
        
        if (profilesError) {
          console.warn('[FollowerAnalytics] Error fetching profiles:', profilesError);
        } else {
          profiles = profilesData || [];
        }
      }

      console.log('[FollowerAnalytics] Fetched', profiles.length, 'profiles');

      // Create a profile map for easy lookup
      const profileMap = new Map(profiles.map(p => [p.id, p]));

      // Calculate basic metrics
      const total = followers?.length || 0;
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const newThisWeek = followers?.filter(
        f => new Date(f.followed_at) >= oneWeekAgo
      ).length || 0;

      const newThisMonth = followers?.filter(
        f => new Date(f.followed_at) >= oneMonthAgo
      ).length || 0;

      const activeFollowers = followers?.filter(
        f => {
          const prefs = f.notification_preferences as any;
          return prefs && Object.values(prefs).some(v => v === true);
        }
      ).length || 0;

      // Demographics calculations
      const ageDistribution: Record<string, number> = {};
      const genderSplit: Record<string, number> = {};
      const cityCount: Record<string, number> = {};
      const interestCount: Record<string, number> = {};

      followers?.forEach(f => {
        const profile = profileMap.get(f.user_id);
        if (profile) {
          // Age groups - calculate from date_of_birth
          if (profile.date_of_birth) {
            const birthDate = new Date(profile.date_of_birth);
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
              age--;
            }
            
            const ageGroup = age < 25 ? '18-24' :
                            age < 35 ? '25-34' :
                            age < 45 ? '35-44' : '45+';
            ageDistribution[ageGroup] = (ageDistribution[ageGroup] || 0) + 1;
          }

          // Gender - set default since column doesn't exist
          // Can be added later if gender field is added to profiles table
          genderSplit['Not specified'] = (genderSplit['Not specified'] || 0) + 1;

          // City
          if (profile.city) {
            cityCount[profile.city] = (cityCount[profile.city] || 0) + 1;
          }

          // Interests
          if (Array.isArray(profile.interests)) {
            profile.interests.forEach((interest: string) => {
              interestCount[interest] = (interestCount[interest] || 0) + 1;
            });
          }
        }
      });

      const topCities = Object.entries(cityCount)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([city, count]) => ({ city, count }));

      const topInterests = Object.entries(interestCount)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([interest, count]) => ({ interest, count }));

      // Calculate growth trend (last 30 days)
      const growthTrend: Array<{ date: string; count: number }> = [];
      for (let i = 29; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const countOnDate = followers?.filter(f => {
          const followDate = new Date(f.followed_at);
          return followDate.toISOString().split('T')[0] === dateStr;
        }).length || 0;

        growthTrend.push({ date: dateStr, count: countOnDate });
      }

      setAnalytics({
        business_name: businessName,
        total_followers: total,
        new_followers_this_week: newThisWeek,
        new_followers_this_month: newThisMonth,
        active_followers: activeFollowers,
        demographics: {
          age_distribution: ageDistribution,
          gender_split: genderSplit,
          top_cities: topCities,
          top_interests: topInterests,
        },
        growth_trend: growthTrend,
        engagement_rate: total > 0 ? (activeFollowers / total) * 100 : 0,
      });

      console.log('[FollowerAnalytics] Analytics calculated successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch follower analytics';
      setError(errorMessage);
      console.error('[FollowerAnalytics] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();

    // Set up real-time subscription for follower changes
    if (businessId) {
      console.log('[FollowerAnalytics] Setting up real-time subscription');
      
      // Clean up existing subscription
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }

      // Subscribe to business_followers changes for this business
      subscriptionRef.current = supabase
        .channel(`business_followers_analytics_${businessId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'business_followers',
            filter: `business_id=eq.${businessId}`
          },
          (payload) => {
            console.log('[FollowerAnalytics] Real-time update received:', payload.eventType);
            // Refresh analytics when follower data changes
            fetchAnalytics();
          }
        )
        .subscribe((status) => {
          console.log('[FollowerAnalytics] Subscription status:', status);
        });
    }

    // Cleanup subscription on unmount
    return () => {
      if (subscriptionRef.current) {
        console.log('[FollowerAnalytics] Cleaning up subscription');
        supabase.removeChannel(subscriptionRef.current);
      }
    };
  }, [businessId]);

  return {
    analytics,
    loading,
    error,
    refresh: fetchAnalytics,
  };
}

export default useFollowerAnalytics;
