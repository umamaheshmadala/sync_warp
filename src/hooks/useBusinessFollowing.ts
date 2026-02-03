// src/hooks/useBusinessFollowing.ts
// Hook for following businesses with notifications and realtime updates
// Replaces useUnifiedFavorites for business-specific functionality

import { useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { toast } from 'react-hot-toast';

export interface NotificationPreferences {
  new_products: boolean;
  new_offers: boolean;
  new_coupons: boolean;
  announcements: boolean;
}

export interface FollowedBusiness {
  id: string;
  business_id: string;
  user_id: string;
  followed_at: string;
  notification_preferences: NotificationPreferences;
  notification_channel: 'in_app' | 'push' | 'email' | 'sms' | 'all';
  is_active: boolean;
  business?: {
    id: string;
    business_name: string;
    business_type?: string;
    logo_url?: string;
    cover_image_url?: string;
    address?: string;
    rating?: number;
    review_count?: number;
    description?: string;
    follower_count?: number;
    active_coupons_count?: number; // Combined offers + coupons
    local_area?: string;
    city?: string;
  };
}

interface UseBusinessFollowingReturn {
  followedBusinesses: FollowedBusiness[];
  loading: boolean;
  error: string | null;
  isFollowing: (businessId: string) => boolean;
  followBusiness: (businessId: string, businessName?: string) => Promise<boolean>;
  unfollowBusiness: (businessId: string, businessName?: string) => Promise<boolean>;
  updateNotificationPreferences: (
    businessId: string,
    preferences: Partial<NotificationPreferences>,
    channel?: 'in_app' | 'push' | 'email' | 'sms' | 'all'
  ) => Promise<boolean>;
  refresh: () => Promise<void>;
  totalFollowing: number;
}

export function useBusinessFollowing(): UseBusinessFollowingReturn {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  // Query key
  const queryKey = ['followedBusinesses', user?.id];

  // Fetch function
  const fetchFollowedBusinesses = async (): Promise<FollowedBusiness[]> => {
    if (!user) return [];

    console.log('[BusinessFollowing] Loading followed businesses for user:', user.id);

    const { data, error: fetchError } = await supabase
      .from('business_followers')
      .select(`
        id,
        business_id,
        user_id,
        followed_at,
        notification_preferences,
        notification_channel,
        is_active
      `)
      .eq('user_id', user.id)
      .eq('entity_type', 'business')
      .eq('is_active', true)
      .order('followed_at', { ascending: false });

    if (fetchError) {
      console.error('[BusinessFollowing] Error loading:', fetchError);
      throw fetchError;
    }

    if (!data || data.length === 0) return [];

    // Get business details and follower counts for each
    const businessesWithDetails = await Promise.all(
      data.map(async (follow) => {
        try {
          // Fetch business details with active counts
          // Note: We use raw supabase query to filter relations for counts
          const { data: businessData, error: businessError } = await supabase
            .from('businesses')
            .select(`
              *,
              active_coupons:business_coupons(count),
              active_offers:offers(count)
            `)
            .eq('id', follow.business_id)
            .single();

          // Note: Since Supabase postgrest-js doesn't easily support complex filtering on count relations 
          // without custom functions or manual join logic (the above simple count gets ALL coupons), 
          // we will fetch active counts with separate queries or a more complex single query.
          // However, to fix the immediate "Unknown Business" issue, we MUST remove the top-level filters.

          // To get accurate "active" counts, we can't easily filter the (count) relation in standard syntax 
          // without side-loading. Let's try side-loading.

          const { count: activeCouponsCount } = await supabase
            .from('business_coupons')
            .select('*', { count: 'exact', head: true })
            .eq('business_id', follow.business_id)
            .eq('status', 'active')
            .gte('valid_until', new Date().toISOString())
            .lte('valid_from', new Date().toISOString());

          const { count: activeOffersCount } = await supabase
            .from('offers')
            .select('*', { count: 'exact', head: true })
            .eq('business_id', follow.business_id)
            .eq('status', 'active')
            .gte('valid_until', new Date().toISOString())
            .lte('valid_from', new Date().toISOString());

          if (businessError) {
            console.error(`[BusinessFollowing] Error fetching business ${follow.business_id}:`, businessError);
            return {
              ...follow,
              business: undefined
            };
          }

          // Get follower count
          const { count } = await supabase
            .from('business_followers')
            .select('*', { count: 'exact', head: true })
            .eq('business_id', follow.business_id)
            .eq('entity_type', 'business')
            .eq('is_active', true);

          // Get counts from the relation arrays (supabase returns [{count: N}] or [])
          // Using separate queries for active counts now to avoid filtering parent business
          const validCouponsCount = activeCouponsCount || 0;
          const validOffersCount = activeOffersCount || 0;

          return {
            ...follow,
            business: businessData ? {
              id: businessData.id,
              business_name: businessData.business_name,
              business_type: businessData.business_type,
              logo_url: businessData.logo_url,
              cover_image_url: businessData.cover_image_url,
              address: businessData.address,
              rating: businessData.rating,
              description: businessData.description,
              follower_count: count || 0,
              active_coupons_count: activeCouponsCount + activeOffersCount, // Combined count for the card
              local_area: businessData.local_area, // Mapped for consistent address display
              city: businessData.city
            } : undefined
          };
        } catch (err) {
          console.error(`[BusinessFollowing] Error processing business ${follow.business_id}:`, err);
          return {
            ...follow,
            business: undefined
          };
        }
      })
    );

    return businessesWithDetails as FollowedBusiness[];
  };

  // React Query hook
  const {
    data: followedBusinesses = [],
    isLoading,
    error: queryError,
    refetch
  } = useQuery({
    queryKey,
    queryFn: fetchFollowedBusinesses,
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
  });

  // Check if user follows a business
  const isFollowing = useCallback(
    (businessId: string): boolean => {
      return followedBusinesses.some(fb => fb.business_id === businessId);
    },
    [followedBusinesses]
  );

  // Follow a business
  const followBusiness = useCallback(
    async (businessId: string, businessName?: string): Promise<boolean> => {
      if (!user) {
        toast.error('Sign in required: Please sign in to follow businesses.');
        return false;
      }

      try {
        // Optimistic update
        const tempFollow: FollowedBusiness = {
          id: 'temp-' + Date.now(),
          business_id: businessId,
          user_id: user.id,
          followed_at: new Date().toISOString(),
          notification_preferences: {
            new_products: true,
            new_offers: true,
            new_coupons: true,
            announcements: true,
          },
          notification_channel: 'in_app',
          is_active: true,
          business: businessName ? {
            id: businessId,
            business_name: businessName,
          } : undefined,
        } as FollowedBusiness; // Cast to avoid partial type issues if business details are missing

        queryClient.setQueryData(queryKey, (old: FollowedBusiness[] | undefined) => {
          return [tempFollow, ...(old || [])];
        });

        const { error: insertError } = await supabase
          .from('business_followers')
          .insert({
            user_id: user.id,
            business_id: businessId,
            entity_type: 'business',
            entity_id: businessId,
            is_active: true,
          });

        if (insertError) {
          // Revert optimistic update
          queryClient.setQueryData(queryKey, (old: FollowedBusiness[] | undefined) => {
            return (old || []).filter(f => f.business_id !== businessId);
          });
          throw insertError;
        }

        toast.success(businessName ? `Following ${businessName}!` : 'Following business!');

        // Refetch to ensure we have the correct DB ID and consistent state
        queryClient.invalidateQueries({ queryKey });
        return true;
      } catch (err) {
        console.error('[BusinessFollowing] Error following:', err);
        toast.error('Failed to follow. Please try again.');
        return false;
      }
    },
    [user, queryClient, queryKey]
  );

  // Unfollow a business
  const unfollowBusiness = useCallback(
    async (businessId: string, businessName?: string): Promise<boolean> => {
      if (!user) return false;

      try {
        // Optimistic update
        const previousData = queryClient.getQueryData<FollowedBusiness[]>(queryKey);

        queryClient.setQueryData(queryKey, (old: FollowedBusiness[] | undefined) => {
          return (old || []).filter(f => f.business_id !== businessId);
        });

        const { error: deleteError } = await supabase
          .from('business_followers')
          .delete()
          .eq('user_id', user.id)
          .eq('business_id', businessId);

        if (deleteError) {
          // Revert optimistic update
          if (previousData) {
            queryClient.setQueryData(queryKey, previousData);
          }
          throw deleteError;
        }

        toast.success(businessName ? `Unfollowed ${businessName}` : 'Unfollowed business');

        return true;
      } catch (err) {
        console.error('[BusinessFollowing] Error unfollowing:', err);
        toast.error('Failed to unfollow. Please try again.');
        return false;
      }
    },
    [user, queryClient, queryKey]
  );

  // Update notification preferences
  const updateNotificationPreferences = useCallback(
    async (
      businessId: string,
      preferences: Partial<NotificationPreferences>,
      channel?: 'in_app' | 'push' | 'email' | 'sms' | 'all'
    ): Promise<boolean> => {
      if (!user) return false;

      try {
        // Optimistic update logic is complex here, so we'll just wait for the update
        // or we can implement shallow optimistic update if needed.
        // For now, let's just do the mutation.

        const currentData = queryClient.getQueryData<FollowedBusiness[]>(queryKey);

        // Calculate new preferences
        let updates: any = {};
        if (preferences) {
          const current = currentData?.find(f => f.business_id === businessId);
          if (current) {
            updates.notification_preferences = {
              ...current.notification_preferences,
              ...preferences,
            };
          }
        }
        if (channel) {
          updates.notification_channel = channel;
        }

        const { error: updateError } = await supabase
          .from('business_followers')
          .update(updates)
          .eq('user_id', user.id)
          .eq('business_id', businessId);

        if (updateError) throw updateError;

        toast.success('Preferences updated');
        queryClient.invalidateQueries({ queryKey });
        return true;
      } catch (err) {
        console.error('[BusinessFollowing] Error updating preferences:', err);
        toast.error('Failed to update preferences');
        return false;
      }
    },
    [user, queryClient, queryKey]
  );

  // Set up realtime subscription
  useEffect(() => {
    if (!user) return;

    console.log('[BusinessFollowing] Setting up realtime subscription for user:', user.id);

    const channel = supabase
      .channel(`business_followers_swr_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'business_followers',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('[BusinessFollowing] Realtime update detected:', payload);
          queryClient.invalidateQueries({ queryKey });
        }
      )
      .subscribe();

    return () => {
      console.log('[BusinessFollowing] Cleaning up realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]); // queryKey is stable enough or included via closure but safer to not include arrays in deps if unnecessary

  return {
    followedBusinesses,
    loading: isLoading,
    error: queryError instanceof Error ? queryError.message : (queryError as string | null),
    isFollowing,
    followBusiness,
    unfollowBusiness,
    updateNotificationPreferences,
    refresh: async () => { await refetch() },
    totalFollowing: followedBusinesses.length,
  };
}

export default useBusinessFollowing;
