// src/hooks/useBusinessFollowing.ts
// Hook for following businesses with notifications and realtime updates
// Replaces useUnifiedFavorites for business-specific functionality

import { useState, useEffect, useCallback } from 'react';
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
    address?: string;
    follower_count?: number;
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
  const [followedBusinesses, setFollowedBusinesses] = useState<FollowedBusiness[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load followed businesses from database
  const loadFollowedBusinesses = useCallback(async () => {
    if (!user) {
      setFollowedBusinesses([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

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

      console.log('[BusinessFollowing] Loaded', data?.length || 0, 'followed businesses');

      // Get business details and follower counts for each
      const businessesWithDetails = await Promise.all(
        (data || []).map(async (follow) => {
          // Fetch business details
          const { data: businessData } = await supabase
            .from('businesses')
            .select('id, business_name, business_type, logo_url, address')
            .eq('id', follow.business_id)
            .single();
          
          // Get follower count
          const { count } = await supabase
            .from('business_followers')
            .select('*', { count: 'exact', head: true })
            .eq('business_id', follow.business_id)
            .eq('entity_type', 'business')
            .eq('is_active', true);
          
          return {
            ...follow,
            business: businessData ? {
              ...businessData,
              follower_count: count || 0
            } : undefined
          };
        })
      );

      setFollowedBusinesses(businessesWithDetails as FollowedBusiness[]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load followed businesses';
      setError(errorMessage);
      console.error('[BusinessFollowing] Error:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

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
        toast.error('Sign in required', {
          description: 'Please sign in to follow businesses.',
        });
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
        };
        setFollowedBusinesses(prev => [tempFollow, ...prev]);

        const { error: insertError } = await supabase
          .from('business_followers')
          .insert({
            user_id: user.id,
            business_id: businessId,
            entity_type: 'business',  // Required by legacy constraint
            entity_id: businessId,     // Required by legacy constraint
            is_active: true,
          });

        if (insertError) {
          // Revert optimistic update
          setFollowedBusinesses(prev => prev.filter(f => f.id !== tempFollow.id));
          throw insertError;
        }

        toast.success('Following!', {
          description: businessName 
            ? `You're now following ${businessName}` 
            : 'You\'re now following this business',
        });

        await loadFollowedBusinesses();
        return true;
      } catch (err) {
        console.error('[BusinessFollowing] Error following:', err);
        toast.error('Failed to follow', {
          description: 'Please try again.',
        });
        return false;
      }
    },
    [user, loadFollowedBusinesses]
  );

  // Unfollow a business
  const unfollowBusiness = useCallback(
    async (businessId: string, businessName?: string): Promise<boolean> => {
      if (!user) return false;

      try {
        // Optimistic update
        setFollowedBusinesses(prev => prev.filter(f => f.business_id !== businessId));

        const { error: deleteError } = await supabase
          .from('business_followers')
          .delete()
          .eq('user_id', user.id)
          .eq('business_id', businessId);

        if (deleteError) {
          // Revert optimistic update
          await loadFollowedBusinesses();
          throw deleteError;
        }

        toast.success('Unfollowed', {
          description: businessName 
            ? `You unfollowed ${businessName}` 
            : 'You unfollowed this business',
        });

        return true;
      } catch (err) {
        console.error('[BusinessFollowing] Error unfollowing:', err);
        toast.error('Failed to unfollow', {
          description: 'Please try again.',
        });
        return false;
      }
    },
    [user, loadFollowedBusinesses]
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
        const updates: any = {};
        
        if (preferences) {
          // Merge with existing preferences
          const current = followedBusinesses.find(f => f.business_id === businessId);
          if (current) {
            updates.notification_preferences = {
              ...current.notification_preferences,
              ...preferences,
            };
          } else {
            updates.notification_preferences = {
              new_products: true,
              new_offers: true,
              new_coupons: true,
              announcements: true,
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

        toast.success('Preferences updated', {
          description: 'Your notification settings have been saved.',
        });

        await loadFollowedBusinesses();
        return true;
      } catch (err) {
        console.error('[BusinessFollowing] Error updating preferences:', err);
        toast.error('Failed to update preferences', {
          description: 'Please try again.',
        });
        return false;
      }
    },
    [user, followedBusinesses, loadFollowedBusinesses]
  );

  // Set up realtime subscription
  useEffect(() => {
    if (!user) return;

    console.log('[BusinessFollowing] Setting up realtime subscription for user:', user.id);

    const channel = supabase
      .channel(`business_followers_${user.id}`)
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
          loadFollowedBusinesses();
        }
      )
      .subscribe();

    return () => {
      console.log('[BusinessFollowing] Cleaning up realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [user, loadFollowedBusinesses]);

  // Initial load
  useEffect(() => {
    loadFollowedBusinesses();
  }, [loadFollowedBusinesses]);

  return {
    followedBusinesses,
    loading,
    error,
    isFollowing,
    followBusiness,
    unfollowBusiness,
    updateNotificationPreferences,
    refresh: loadFollowedBusinesses,
    totalFollowing: followedBusinesses.length,
  };
}

export default useBusinessFollowing;
