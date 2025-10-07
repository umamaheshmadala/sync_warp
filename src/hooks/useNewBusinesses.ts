// src/hooks/useNewBusinesses.ts
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Business } from '../types/business';
import { normalizeBusinesses } from '../utils/businessMapper';

interface UseNewBusinessesOptions {
  daysThreshold?: number;
  limit?: number;
  autoFetch?: boolean;
}

export function useNewBusinesses(options: UseNewBusinessesOptions = {}) {
  const {
    daysThreshold = 30,
    limit = 12,
    autoFetch = true,
  } = options;

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  /**
   * Fetch new businesses from the database
   */
  const fetchNewBusinesses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Calculate date threshold (e.g., 30 days ago)
      const thresholdDate = new Date();
      thresholdDate.setDate(thresholdDate.getDate() - daysThreshold);
      const thresholdISO = thresholdDate.toISOString();

      // Fetch businesses created after threshold date
      const { data, error: fetchError, count } = await supabase
        .from('businesses')
        .select(`
          *,
          owner:profiles!fk_businesses_user_id (
            id,
            full_name,
            avatar_url
          )
        `, { count: 'exact' })
        .eq('status', 'active')
        .gte('created_at', thresholdISO)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (fetchError) throw fetchError;

      if (data) {
        const mappedBusinesses = normalizeBusinesses(data.map((biz: any) => ({
          ...biz,
          owner: biz.owner ? {
            id: biz.owner.id,
            full_name: biz.owner.full_name,
            avatar_url: biz.owner.avatar_url,
          } : undefined,
        })));

        setBusinesses(mappedBusinesses);
        setHasMore((count || 0) > limit);
      }
    } catch (err: any) {
      console.error('Error fetching new businesses:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [daysThreshold, limit]);

  /**
   * Load more businesses
   */
  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;

    try {
      setLoading(true);

      const thresholdDate = new Date();
      thresholdDate.setDate(thresholdDate.getDate() - daysThreshold);
      const thresholdISO = thresholdDate.toISOString();

      const { data, error: fetchError, count } = await supabase
        .from('businesses')
        .select(`
          *,
          owner:profiles!fk_businesses_user_id (
            id,
            full_name,
            avatar_url
          )
        `, { count: 'exact' })
        .eq('status', 'active')
        .gte('created_at', thresholdISO)
        .order('created_at', { ascending: false })
        .range(businesses.length, businesses.length + limit - 1);

      if (fetchError) throw fetchError;

      if (data) {
        const mappedBusinesses = normalizeBusinesses(data.map((biz: any) => ({
          ...biz,
          owner: biz.owner ? {
            id: biz.owner.id,
            full_name: biz.owner.full_name,
            avatar_url: biz.owner.avatar_url,
          } : undefined,
        })));

        setBusinesses(prev => [...prev, ...mappedBusinesses]);
        setHasMore((count || 0) > businesses.length + data.length);
      }
    } catch (err: any) {
      console.error('Error loading more businesses:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [hasMore, loading, businesses.length, daysThreshold, limit]);

  /**
   * Get business age in days
   */
  const getBusinessAge = useCallback((business: Business): number => {
    const createdDate = new Date(business.created_at);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - createdDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }, []);

  /**
   * Check if business is new (within threshold)
   */
  const isNewBusiness = useCallback((business: Business): boolean => {
    return getBusinessAge(business) <= daysThreshold;
  }, [daysThreshold, getBusinessAge]);

  /**
   * Auto-fetch on mount
   */
  useEffect(() => {
    if (autoFetch) {
      fetchNewBusinesses();
    }
  }, [autoFetch, fetchNewBusinesses]);

  return {
    businesses,
    loading,
    error,
    hasMore,
    fetchNewBusinesses,
    loadMore,
    getBusinessAge,
    isNewBusiness,
    totalCount: businesses.length,
  };
}
