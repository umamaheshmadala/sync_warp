// src/hooks/useOfferAnalytics.ts
// React hook for fetching and managing Offer Analytics (Story 4.12)

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { OfferAnalytics, OfferAnalyticsSummary } from '../types/offers';

interface UseOfferAnalyticsOptions {
  offerId?: string;
  businessId?: string;
  autoFetch?: boolean;
}

interface UseOfferAnalyticsReturn {
  analytics: OfferAnalytics | null;
  summary: OfferAnalyticsSummary | null;
  allAnalytics: OfferAnalytics[];
  isLoading: boolean;
  error: string | null;
  
  // Operations
  fetchAnalytics: (offerId: string) => Promise<void>;
  fetchAllAnalytics: (businessId: string) => Promise<void>;
  refreshAnalytics: () => Promise<void>;
  
  // Helper methods
  getViewsOverTime: () => Array<{ date: string; count: number }>;
  getSharesOverTime: () => Array<{ date: string; count: number }>;
  getClicksOverTime: () => Array<{ date: string; count: number }>;
  getShareChannelBreakdown: () => Array<{ channel: string; count: number }>;
}

export const useOfferAnalytics = (
  options: UseOfferAnalyticsOptions = {}
): UseOfferAnalyticsReturn => {
  const { offerId, businessId, autoFetch = true } = options;

  const [analytics, setAnalytics] = useState<OfferAnalytics | null>(null);
  const [summary, setSummary] = useState<OfferAnalyticsSummary | null>(null);
  const [allAnalytics, setAllAnalytics] = useState<OfferAnalytics[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch analytics for a specific offer
  const fetchAnalytics = useCallback(async (targetOfferId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('offer_analytics')
        .select('*')
        .eq('offer_id', targetOfferId)
        .single();

      if (fetchError) {
        // If no analytics record exists yet, create an empty one
        if (fetchError.code === 'PGRST116') {
          setAnalytics(null);
          setSummary(null);
          return;
        }
        throw fetchError;
      }

      setAnalytics(data);

      // Calculate summary
      const calculatedSummary: OfferAnalyticsSummary = {
        offer_id: targetOfferId,
        views: data.total_views,
        shares: data.total_shares,
        clicks: data.total_clicks,
        ctr: data.total_views > 0 ? (data.total_clicks / data.total_views) * 100 : 0,
        share_rate: data.total_views > 0 ? (data.total_shares / data.total_views) * 100 : 0,
      };
      setSummary(calculatedSummary);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch analytics');
      console.error('Error fetching analytics:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch analytics for all offers in a business
  const fetchAllAnalytics = useCallback(async (targetBusinessId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('offer_analytics')
        .select('*')
        .eq('business_id', targetBusinessId)
        .order('updated_at', { ascending: false });

      if (fetchError) throw fetchError;

      setAllAnalytics(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch all analytics');
      console.error('Error fetching all analytics:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Refresh current analytics
  const refreshAnalytics = useCallback(async () => {
    if (offerId) {
      await fetchAnalytics(offerId);
    } else if (businessId) {
      await fetchAllAnalytics(businessId);
    }
  }, [offerId, businessId, fetchAnalytics, fetchAllAnalytics]);

  // Get views over time for charts
  const getViewsOverTime = useCallback((): Array<{ date: string; count: number }> => {
    if (!analytics?.daily_stats) return [];
    return analytics.daily_stats.map(stat => ({
      date: stat.date,
      count: stat.views,
    }));
  }, [analytics]);

  // Get shares over time for charts
  const getSharesOverTime = useCallback((): Array<{ date: string; count: number }> => {
    if (!analytics?.daily_stats) return [];
    return analytics.daily_stats.map(stat => ({
      date: stat.date,
      count: stat.shares,
    }));
  }, [analytics]);

  // Get clicks over time for charts
  const getClicksOverTime = useCallback((): Array<{ date: string; count: number }> => {
    if (!analytics?.daily_stats) return [];
    return analytics.daily_stats.map(stat => ({
      date: stat.date,
      count: stat.clicks,
    }));
  }, [analytics]);

  // Get share channel breakdown for pie chart
  const getShareChannelBreakdown = useCallback((): Array<{ channel: string; count: number }> => {
    if (!analytics?.share_channels) return [];
    return Object.entries(analytics.share_channels).map(([channel, count]) => ({
      channel,
      count: count as number,
    }));
  }, [analytics]);

  // Auto-fetch on mount if enabled
  useEffect(() => {
    if (autoFetch) {
      if (offerId) {
        fetchAnalytics(offerId);
      } else if (businessId) {
        fetchAllAnalytics(businessId);
      }
    }
  }, [autoFetch, offerId, businessId, fetchAnalytics, fetchAllAnalytics]);

  return {
    analytics,
    summary,
    allAnalytics,
    isLoading,
    error,
    
    fetchAnalytics,
    fetchAllAnalytics,
    refreshAnalytics,
    
    getViewsOverTime,
    getSharesOverTime,
    getClicksOverTime,
    getShareChannelBreakdown,
  };
};
