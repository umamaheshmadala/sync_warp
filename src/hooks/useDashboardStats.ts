import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

export interface DashboardStats {
  favoritesCount: number;
  reviewsCount: number;
  followingCount: number;
  collectedCouponsCount: number;
  loading: boolean;
  error: string | null;
}

export const useDashboardStats = () => {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats>({
    favoritesCount: 0,
    reviewsCount: 0,
    followingCount: 0,
    collectedCouponsCount: 0,
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!user?.id) {
      setStats(prev => ({ ...prev, loading: false }));
      return;
    }

    const fetchStats = async () => {
      try {
        setStats(prev => ({ ...prev, loading: true, error: null }));

        // Fetch all stats in parallel
        const [favoritesRes, reviewsRes, followingRes, couponsRes] = await Promise.all([
          // Favorites count
          supabase
            .from('favorites')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id),
          
          // Reviews count
          supabase
            .from('business_reviews')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id),
          
          // Following count  
          supabase
            .from('business_followers')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('is_active', true),
          
          // Collected coupons count
          supabase
            .from('user_coupon_collections')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id),
        ]);

        setStats({
          favoritesCount: favoritesRes.count || 0,
          reviewsCount: reviewsRes.count || 0,
          followingCount: followingRes.count || 0,
          collectedCouponsCount: couponsRes.count || 0,
          loading: false,
          error: null,
        });
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        setStats(prev => ({
          ...prev,
          loading: false,
          error: 'Failed to load statistics',
        }));
      }
    };

    fetchStats();
  }, [user?.id]);

  return stats;
};

export default useDashboardStats;