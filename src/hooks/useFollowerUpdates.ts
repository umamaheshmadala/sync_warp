// src/hooks/useFollowerUpdates.ts
// Hook for fetching updates from followed businesses with infinite scroll

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

export interface FollowerUpdate {
  id: string;
  business_id: string;
  update_type: 'new_product' | 'new_offer' | 'new_coupon' | 'announcement' | 'price_drop' | 'back_in_stock';
  entity_id?: string;
  title: string;
  description?: string;
  metadata?: any;
  created_at: string;
  expires_at?: string;
  is_active: boolean;
  business?: {
    id: string;
    business_name: string;
    business_type?: string;
    logo_url?: string;
  };
}

interface UseFollowerUpdatesReturn {
  updates: FollowerUpdate[];
  loading: boolean;
  hasMore: boolean;
  loadMore: () => void;
  refresh: () => Promise<void>;
  error: string | null;
  filterByType: (type: string) => void;
  currentFilter: string;
}

const PAGE_SIZE = 20;

export function useFollowerUpdates(): UseFollowerUpdatesReturn {
  const { user } = useAuthStore();
  const [updates, setUpdates] = useState<FollowerUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [currentFilter, setCurrentFilter] = useState<string>('all');

  const loadUpdates = useCallback(async (pageNum: number = 1, filter: string = 'all') => {
    if (!user) {
      setUpdates([]);
      setLoading(false);
      setHasMore(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('[FollowerUpdates] Loading updates - Page:', pageNum, 'Filter:', filter);

      // Step 1: Get businesses user follows
      const { data: followedBusinessIds } = await supabase
        .from('business_followers')
        .select('business_id')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (!followedBusinessIds || followedBusinessIds.length === 0) {
        console.log('[FollowerUpdates] No followed businesses found');
        setUpdates([]);
        setHasMore(false);
        setLoading(false);
        return;
      }

      const businessIds = followedBusinessIds.map(fb => fb.business_id);
      console.log('[FollowerUpdates] Following', businessIds.length, 'businesses');

      // Step 2: Build query for updates
      let query = supabase
        .from('follower_updates')
        .select(`
          *,
          businesses (
            id,
            business_name,
            business_type,
            logo_url
          )
        `)
        .in('business_id', businessIds)
        .eq('is_active', true);

      // Apply filter if not 'all'
      if (filter !== 'all') {
        query = query.eq('update_type', filter);
      }

      // Pagination
      const offset = (pageNum - 1) * PAGE_SIZE;
      query = query
        .order('created_at', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);

      const { data, error: fetchError } = await query;

      if (fetchError) {
        console.error('[FollowerUpdates] Error loading updates:', fetchError);
        throw fetchError;
      }

      console.log('[FollowerUpdates] Loaded', data?.length || 0, 'updates');

      if (pageNum === 1) {
        setUpdates(data as FollowerUpdate[] || []);
      } else {
        setUpdates(prev => [...prev, ...(data as FollowerUpdate[] || [])]);
      }

      setHasMore((data || []).length === PAGE_SIZE);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load updates';
      setError(errorMessage);
      console.error('[FollowerUpdates] Error:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const loadMore = useCallback(() => {
    if (!hasMore || loading) return;
    const nextPage = page + 1;
    setPage(nextPage);
    loadUpdates(nextPage, currentFilter);
  }, [hasMore, loading, page, currentFilter, loadUpdates]);

  const refresh = useCallback(async () => {
    setPage(1);
    await loadUpdates(1, currentFilter);
  }, [currentFilter, loadUpdates]);

  const filterByType = useCallback((type: string) => {
    setCurrentFilter(type);
    setPage(1);
    loadUpdates(1, type);
  }, [loadUpdates]);

  // Set up realtime subscription for new updates
  useEffect(() => {
    if (!user) return;

    console.log('[FollowerUpdates] Setting up realtime subscription');

    const channel = supabase
      .channel('follower_updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'follower_updates',
        },
        (payload) => {
          console.log('[FollowerUpdates] New update detected:', payload);
          refresh(); // Reload from start
        }
      )
      .subscribe();

    return () => {
      console.log('[FollowerUpdates] Cleaning up realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [user, refresh]);

  // Initial load
  useEffect(() => {
    loadUpdates(1, currentFilter);
  }, [user]); // Only reload when user changes

  return {
    updates,
    loading,
    hasMore,
    loadMore,
    refresh,
    error,
    filterByType,
    currentFilter,
  };
}

export default useFollowerUpdates;
