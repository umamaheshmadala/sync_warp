// searchAnalyticsService.ts
// Service for tracking and analyzing search behavior and trends

import { supabase } from '../lib/supabase';

export interface SearchAnalytic {
  id: string;
  user_id?: string;
  search_term: string;
  filters: Record<string, any>;
  results_count: number;
  clicked_result_id?: string;
  clicked_result_type?: 'business' | 'coupon';
  search_time_ms: number;
  created_at: string;
  session_id: string;
  user_agent: string;
  ip_address?: string;
}

export interface SearchTrend {
  search_term: string;
  search_count: number;
  unique_users: number;
  avg_results: number;
  last_searched: string;
  trend_direction: 'up' | 'down' | 'stable';
  change_percentage: number;
}

export interface SearchInsight {
  total_searches: number;
  unique_users: number;
  avg_search_time: number;
  top_terms: SearchTrend[];
  search_success_rate: number;
  popular_filters: Array<{ filter: string; usage_count: number }>;
  peak_hours: Array<{ hour: number; search_count: number }>;
  conversion_rate: number;
}

class SearchAnalyticsService {
  private sessionId: string;
  
  constructor() {
    this.sessionId = this.generateSessionId();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Track a search query
   */
  async trackSearch(params: {
    searchTerm: string;
    filters?: Record<string, any>;
    resultsCount: number;
    searchTimeMs: number;
    userId?: string;
  }): Promise<void> {
    try {
      const { error } = await supabase
        .from('search_analytics')
        .insert({
          user_id: params.userId,
          search_term: params.searchTerm,
          filters: params.filters || {},
          results_count: params.resultsCount,
          search_time_ms: params.searchTimeMs,
          session_id: this.sessionId,
          user_agent: navigator.userAgent,
          created_at: new Date().toISOString()
        });

      if (error) {
        console.warn('Failed to track search:', error);
      }
    } catch (error) {
      console.warn('Search tracking error:', error);
    }
  }

  /**
   * Track when a user clicks on a search result
   */
  async trackResultClick(params: {
    searchTerm: string;
    resultId: string;
    resultType: 'business' | 'coupon';
    userId?: string;
  }): Promise<void> {
    try {
      // Find the most recent search for this term and update it
      const { data: recentSearch } = await supabase
        .from('search_analytics')
        .select('id')
        .eq('search_term', params.searchTerm)
        .eq('session_id', this.sessionId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (recentSearch) {
        await supabase
          .from('search_analytics')
          .update({
            clicked_result_id: params.resultId,
            clicked_result_type: params.resultType
          })
          .eq('id', recentSearch.id);
      }
    } catch (error) {
      console.warn('Result click tracking error:', error);
    }
  }

  /**
   * Get popular search terms
   */
  async getPopularSearchTerms(limit: number = 10): Promise<SearchTrend[]> {
    try {
      const { data, error } = await supabase
        .from('popular_search_terms')
        .select('*')
        .order('search_count', { ascending: false })
        .limit(limit);

      if (error) throw error;

      // Calculate trends (mock for now - would need historical data)
      return (data || []).map((item, index) => ({
        search_term: item.search_term,
        search_count: item.search_count,
        unique_users: item.unique_users,
        avg_results: item.avg_results,
        last_searched: item.last_searched,
        trend_direction: index < 3 ? 'up' : index < 7 ? 'stable' : 'down',
        change_percentage: Math.random() * 50 - 25 // Mock percentage
      }));
    } catch (error) {
      console.error('Failed to get popular search terms:', error);
      return [];
    }
  }

  /**
   * Get comprehensive search insights
   */
  async getSearchInsights(dateRange?: { start: Date; end: Date }): Promise<SearchInsight> {
    try {
      const startDate = dateRange?.start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = dateRange?.end || new Date();

      // Get basic stats
      const { data: basicStats } = await supabase
        .from('search_analytics')
        .select('*', { count: 'exact' })
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      // Get popular terms
      const popularTerms = await this.getPopularSearchTerms(5);

      // Calculate metrics
      const totalSearches = basicStats?.length || 0;
      const uniqueUsers = new Set(basicStats?.map(s => s.user_id).filter(Boolean)).size;
      const avgSearchTime = basicStats?.length 
        ? basicStats.reduce((acc, s) => acc + (s.search_time_ms || 0), 0) / basicStats.length 
        : 0;
      
      const successfulSearches = basicStats?.filter(s => s.results_count > 0).length || 0;
      const searchSuccessRate = totalSearches > 0 ? (successfulSearches / totalSearches) * 100 : 0;

      const clickedResults = basicStats?.filter(s => s.clicked_result_id).length || 0;
      const conversionRate = successfulSearches > 0 ? (clickedResults / successfulSearches) * 100 : 0;

      // Analyze popular filters (mock for now)
      const popularFilters = [
        { filter: 'validOnly', usage_count: Math.floor(totalSearches * 0.6) },
        { filter: 'discountType', usage_count: Math.floor(totalSearches * 0.4) },
        { filter: 'location', usage_count: Math.floor(totalSearches * 0.3) }
      ];

      // Analyze peak hours (mock for now)
      const peakHours = Array.from({ length: 24 }, (_, hour) => ({
        hour,
        search_count: Math.floor(Math.random() * totalSearches / 10)
      })).sort((a, b) => b.search_count - a.search_count);

      return {
        total_searches: totalSearches,
        unique_users: uniqueUsers,
        avg_search_time: Math.round(avgSearchTime),
        top_terms: popularTerms,
        search_success_rate: Math.round(searchSuccessRate * 100) / 100,
        popular_filters: popularFilters,
        peak_hours: peakHours.slice(0, 6),
        conversion_rate: Math.round(conversionRate * 100) / 100
      };
    } catch (error) {
      console.error('Failed to get search insights:', error);
      return {
        total_searches: 0,
        unique_users: 0,
        avg_search_time: 0,
        top_terms: [],
        search_success_rate: 0,
        popular_filters: [],
        peak_hours: [],
        conversion_rate: 0
      };
    }
  }

  /**
   * Refresh popular search terms materialized view
   */
  async refreshPopularTerms(): Promise<void> {
    try {
      await supabase.rpc('refresh_popular_search_terms');
    } catch (error) {
      console.warn('Failed to refresh popular search terms:', error);
    }
  }

  /**
   * Get search trends over time
   */
  async getSearchTrends(days: number = 30): Promise<Array<{ date: string; searches: number }>> {
    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      
      const { data, error } = await supabase
        .from('search_analytics')
        .select('created_at')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Group by date
      const dateGroups: Record<string, number> = {};
      (data || []).forEach(record => {
        const date = new Date(record.created_at).toISOString().split('T')[0];
        dateGroups[date] = (dateGroups[date] || 0) + 1;
      });

      return Object.entries(dateGroups).map(([date, searches]) => ({
        date,
        searches
      }));
    } catch (error) {
      console.error('Failed to get search trends:', error);
      return [];
    }
  }
}

export const searchAnalyticsService = new SearchAnalyticsService();
export default searchAnalyticsService;