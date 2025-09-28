// useSearchAnalytics.ts
// Custom hook for search analytics tracking and dashboard data management

import { useState, useEffect, useCallback } from 'react';
import searchAnalyticsService, { SearchInsight, SearchTrend } from '../services/searchAnalyticsService';
import { useAuthStore } from '../store/authStore';

interface UseSearchAnalyticsReturn {
  // Tracking methods
  trackSearch: (params: {
    searchTerm: string;
    filters?: Record<string, any>;
    resultsCount: number;
    searchTimeMs: number;
  }) => Promise<void>;
  trackResultClick: (params: {
    searchTerm: string;
    resultId: string;
    resultType: 'business' | 'coupon';
  }) => Promise<void>;
  
  // Dashboard data
  insights: SearchInsight | null;
  trends: Array<{ date: string; searches: number }>;
  popularTerms: SearchTrend[];
  
  // State management
  loading: boolean;
  error: string | null;
  
  // Data fetching methods
  refreshInsights: (dateRange?: { start: Date; end: Date }) => Promise<void>;
  refreshPopularTerms: () => Promise<void>;
}

export const useSearchAnalytics = (): UseSearchAnalyticsReturn => {
  const user = useAuthStore((state) => state.user);
  const [insights, setInsights] = useState<SearchInsight | null>(null);
  const [trends, setTrends] = useState<Array<{ date: string; searches: number }>>([]);
  const [popularTerms, setPopularTerms] = useState<SearchTrend[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track search queries
  const trackSearch = useCallback(async (params: {
    searchTerm: string;
    filters?: Record<string, any>;
    resultsCount: number;
    searchTimeMs: number;
  }) => {
    try {
      await searchAnalyticsService.trackSearch({
        ...params,
        userId: user?.id
      });
    } catch (err) {
      console.warn('Failed to track search:', err);
    }
  }, [user?.id]);

  // Track result clicks
  const trackResultClick = useCallback(async (params: {
    searchTerm: string;
    resultId: string;
    resultType: 'business' | 'coupon';
  }) => {
    try {
      await searchAnalyticsService.trackResultClick({
        ...params,
        userId: user?.id
      });
    } catch (err) {
      console.warn('Failed to track result click:', err);
    }
  }, [user?.id]);

  // Refresh insights data
  const refreshInsights = useCallback(async (dateRange?: { start: Date; end: Date }) => {
    setLoading(true);
    setError(null);
    
    try {
      const [insightsData, trendsData] = await Promise.all([
        searchAnalyticsService.getSearchInsights(dateRange),
        searchAnalyticsService.getSearchTrends(30)
      ]);
      
      setInsights(insightsData);
      setTrends(trendsData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load analytics';
      setError(errorMessage);
      console.error('Failed to refresh insights:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh popular terms
  const refreshPopularTerms = useCallback(async () => {
    try {
      const terms = await searchAnalyticsService.getPopularSearchTerms(10);
      setPopularTerms(terms);
    } catch (err) {
      console.warn('Failed to refresh popular terms:', err);
    }
  }, []);

  // Load initial data
  useEffect(() => {
    refreshInsights();
    refreshPopularTerms();
  }, [refreshInsights, refreshPopularTerms]);

  return {
    trackSearch,
    trackResultClick,
    insights,
    trends,
    popularTerms,
    loading,
    error,
    refreshInsights,
    refreshPopularTerms
  };
};

// Hook specifically for search tracking (lighter weight)
export const useSearchTracking = () => {
  const user = useAuthStore((state) => state.user);

  const trackSearch = useCallback(async (params: {
    searchTerm: string;
    filters?: Record<string, any>;
    resultsCount: number;
    searchTimeMs: number;
  }) => {
    try {
      await searchAnalyticsService.trackSearch({
        ...params,
        userId: user?.id
      });
    } catch (err) {
      console.warn('Failed to track search:', err);
    }
  }, [user?.id]);

  const trackResultClick = useCallback(async (params: {
    searchTerm: string;
    resultId: string;
    resultType: 'business' | 'coupon';
  }) => {
    try {
      await searchAnalyticsService.trackResultClick({
        ...params,
        userId: user?.id
      });
    } catch (err) {
      console.warn('Failed to track result click:', err);
    }
  }, [user?.id]);

  return { trackSearch, trackResultClick };
};

// Hook for dashboard-only data (no tracking)
export const useSearchInsights = (dateRange?: { start: Date; end: Date }) => {
  const [insights, setInsights] = useState<SearchInsight | null>(null);
  const [trends, setTrends] = useState<Array<{ date: string; searches: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const [insightsData, trendsData] = await Promise.all([
        searchAnalyticsService.getSearchInsights(dateRange),
        searchAnalyticsService.getSearchTrends(30)
      ]);
      
      setInsights(insightsData);
      setTrends(trendsData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load analytics';
      setError(errorMessage);
      console.error('Failed to load search insights:', err);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  return {
    insights,
    trends,
    loading,
    error,
    refreshData
  };
};

export default useSearchAnalytics;