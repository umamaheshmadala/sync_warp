import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

export interface NavigationBadges {
  wallet: number;
  social: number;
  following: number;
}

export const useNavigationBadges = () => {
  const { user } = useAuthStore();
  const [badges, setBadges] = useState<NavigationBadges>({
    wallet: 0,
    social: 0,
    following: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBadges = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Fetch wallet badge (new/unused coupons)
        const { count: walletCount, error: walletError } = await supabase
          .from('user_coupon_collections')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('status', 'active')
          .eq('times_used', 0);

        if (walletError) throw walletError;

        // Fetch social badge (pending friend requests)
        const { count: socialCount, error: socialError } = await supabase
          .from('friend_connections')
          .select('*', { count: 'exact', head: true })
          .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
          .eq('status', 'pending')
          .neq('requester_id', user.id);

        if (socialError) throw socialError;

        // Fetch following badge (new updates from followed businesses)
        const { count: followingCount, error: followingError } = await supabase
          .from('follower_notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('is_read', false);

        if (followingError) throw followingError;

        setBadges({
          wallet: walletCount || 0,
          social: socialCount || 0,
          following: followingCount || 0,
        });
      } catch (err) {
        console.error('Error fetching navigation badges:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchBadges();

    // Set up real-time subscriptions for badge updates
    const walletSubscription = supabase
      .channel('wallet_badge_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_coupon_collections',
          filter: `user_id=eq.${user?.id}`,
        },
        () => {
          fetchBadges();
        }
      )
      .subscribe();

    const socialSubscription = supabase
      .channel('social_badge_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friend_connections',
          filter: `user_a_id=eq.${user?.id}`,
        },
        () => {
          fetchBadges();
        }
      )
      .subscribe();

    return () => {
      walletSubscription.unsubscribe();
      socialSubscription.unsubscribe();
    };
  }, [user]);

  return { badges, loading };
};

export default useNavigationBadges;
