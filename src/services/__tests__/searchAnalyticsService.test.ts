import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { searchAnalyticsService } from '../searchAnalyticsService';
import { supabase } from '../../lib/supabase';
import type { SearchAnalytic, SearchTrend, SearchInsight } from '../searchAnalyticsService';

// Mock Supabase
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn()
  }
}));

// Mock navigator.userAgent
Object.defineProperty(global.navigator, 'userAgent', {
  value: 'Mozilla/5.0 (Test Browser)',
  writable: true
});

describe('SearchAnalyticsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==================== TRACK SEARCH ====================

  describe('trackSearch', () => {
    it('should track a search with all parameters', async () => {
      const insertMock = vi.fn().mockResolvedValue({ error: null });
      
      (supabase.from as any).mockReturnValue({
        insert: insertMock
      });

      await searchAnalyticsService.trackSearch({
        searchTerm: 'pizza',
        filters: { validOnly: true, location: 'New York' },
        resultsCount: 10,
        searchTimeMs: 250,
        userId: 'user-123'
      });

      expect(supabase.from).toHaveBeenCalledWith('search_analytics');
      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-123',
          search_term: 'pizza',
          filters: { validOnly: true, location: 'New York' },
          results_count: 10,
          search_time_ms: 250,
          user_agent: 'Mozilla/5.0 (Test Browser)'
        })
      );
    });

    it('should track a search without optional parameters', async () => {
      const insertMock = vi.fn().mockResolvedValue({ error: null });
      
      (supabase.from as any).mockReturnValue({
        insert: insertMock
      });

      await searchAnalyticsService.trackSearch({
        searchTerm: 'coffee',
        resultsCount: 5,
        searchTimeMs: 150
      });

      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          search_term: 'coffee',
          filters: {},
          results_count: 5,
          search_time_ms: 150,
          user_id: undefined
        })
      );
    });

    it('should handle tracking errors gracefully', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const insertMock = vi.fn().mockResolvedValue({ 
        error: { message: 'Database error' } 
      });
      
      (supabase.from as any).mockReturnValue({
        insert: insertMock
      });

      await searchAnalyticsService.trackSearch({
        searchTerm: 'test',
        resultsCount: 0,
        searchTimeMs: 100
      });

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Failed to track search:',
        { message: 'Database error' }
      );

      consoleWarnSpy.mockRestore();
    });

    it('should handle exceptions during tracking', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const insertMock = vi.fn().mockRejectedValue(new Error('Network error'));
      
      (supabase.from as any).mockReturnValue({
        insert: insertMock
      });

      await searchAnalyticsService.trackSearch({
        searchTerm: 'test',
        resultsCount: 0,
        searchTimeMs: 100
      });

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Search tracking error:',
        expect.any(Error)
      );

      consoleWarnSpy.mockRestore();
    });

    it('should include session ID in tracked data', async () => {
      const insertMock = vi.fn().mockResolvedValue({ error: null });
      
      (supabase.from as any).mockReturnValue({
        insert: insertMock
      });

      await searchAnalyticsService.trackSearch({
        searchTerm: 'burger',
        resultsCount: 3,
        searchTimeMs: 200
      });

      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          session_id: expect.stringMatching(/^session_\d+_[a-z0-9]+$/)
        })
      );
    });
  });

  // ==================== TRACK RESULT CLICK ====================

  describe('trackResultClick', () => {
    it('should track a result click for business', async () => {
      const singleMock = vi.fn().mockResolvedValue({ 
        data: { id: 'search-123' }, 
        error: null 
      });
      const limitMock = vi.fn().mockReturnValue({ single: singleMock });
      const orderMock = vi.fn().mockReturnValue({ limit: limitMock });
      const eqMock2 = vi.fn().mockReturnValue({ order: orderMock });
      const eqMock1 = vi.fn().mockReturnValue({ eq: eqMock2 });
      const selectMock = vi.fn().mockReturnValue({ eq: eqMock1 });

      const updateMock = vi.fn().mockResolvedValue({ error: null });
      const updateEqMock = vi.fn().mockReturnValue({ update: updateMock });

      let callCount = 0;
      (supabase.from as any).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return { select: selectMock };
        } else {
          updateMock.mockReturnValue({ eq: updateEqMock });
          return { update: updateMock };
        }
      });

      await searchAnalyticsService.trackResultClick({
        searchTerm: 'pizza',
        resultId: 'business-456',
        resultType: 'business',
        userId: 'user-123'
      });

      expect(selectMock).toHaveBeenCalledWith('id');
    });

    it('should track a result click for coupon', async () => {
      const singleMock = vi.fn().mockResolvedValue({ 
        data: { id: 'search-789' }, 
        error: null 
      });
      const limitMock = vi.fn().mockReturnValue({ single: singleMock });
      const orderMock = vi.fn().mockReturnValue({ limit: limitMock });
      const eqMock2 = vi.fn().mockReturnValue({ order: orderMock });
      const eqMock1 = vi.fn().mockReturnValue({ eq: eqMock2 });
      const selectMock = vi.fn().mockReturnValue({ eq: eqMock1 });

      const updateEqMock = vi.fn().mockResolvedValue({ error: null });
      const updateMock = vi.fn().mockReturnValue({ eq: updateEqMock });

      let callCount = 0;
      (supabase.from as any).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return { select: selectMock };
        } else {
          return { update: updateMock };
        }
      });

      await searchAnalyticsService.trackResultClick({
        searchTerm: 'discount',
        resultId: 'coupon-999',
        resultType: 'coupon'
      });

      expect(updateMock).toHaveBeenCalledWith({
        clicked_result_id: 'coupon-999',
        clicked_result_type: 'coupon'
      });
    });

    it('should handle case when no recent search found', async () => {
      const singleMock = vi.fn().mockResolvedValue({ 
        data: null, 
        error: null 
      });
      const limitMock = vi.fn().mockReturnValue({ single: singleMock });
      const orderMock = vi.fn().mockReturnValue({ limit: limitMock });
      const eqMock2 = vi.fn().mockReturnValue({ order: orderMock });
      const eqMock1 = vi.fn().mockReturnValue({ eq: eqMock2 });
      const selectMock = vi.fn().mockReturnValue({ eq: eqMock1 });

      (supabase.from as any).mockReturnValue({ select: selectMock });

      // Should not throw
      await searchAnalyticsService.trackResultClick({
        searchTerm: 'test',
        resultId: 'test-id',
        resultType: 'business'
      });

      expect(selectMock).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      (supabase.from as any).mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      await searchAnalyticsService.trackResultClick({
        searchTerm: 'test',
        resultId: 'test-id',
        resultType: 'business'
      });

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Result click tracking error:',
        expect.any(Error)
      );

      consoleWarnSpy.mockRestore();
    });
  });

  // ==================== GET POPULAR SEARCH TERMS ====================

  describe('getPopularSearchTerms', () => {
    it('should return popular search terms with default limit', async () => {
      const mockData = [
        { search_term: 'pizza', search_count: 100, unique_users: 50, avg_results: 10, last_searched: '2025-01-30' },
        { search_term: 'burger', search_count: 80, unique_users: 40, avg_results: 8, last_searched: '2025-01-29' },
        { search_term: 'sushi', search_count: 60, unique_users: 30, avg_results: 5, last_searched: '2025-01-28' }
      ];

      const limitMock = vi.fn().mockResolvedValue({ data: mockData, error: null });
      const orderMock = vi.fn().mockReturnValue({ limit: limitMock });
      const selectMock = vi.fn().mockReturnValue({ order: orderMock });

      (supabase.from as any).mockReturnValue({ select: selectMock });

      const result = await searchAnalyticsService.getPopularSearchTerms();

      expect(supabase.from).toHaveBeenCalledWith('popular_search_terms');
      expect(limitMock).toHaveBeenCalledWith(10);
      expect(result).toHaveLength(3);
      expect(result[0]).toMatchObject({
        search_term: 'pizza',
        search_count: 100,
        unique_users: 50,
        avg_results: 10,
        trend_direction: 'up'
      });
    });

    it('should respect custom limit parameter', async () => {
      const limitMock = vi.fn().mockResolvedValue({ data: [], error: null });
      const orderMock = vi.fn().mockReturnValue({ limit: limitMock });
      const selectMock = vi.fn().mockReturnValue({ order: orderMock });

      (supabase.from as any).mockReturnValue({ select: selectMock });

      await searchAnalyticsService.getPopularSearchTerms(5);

      expect(limitMock).toHaveBeenCalledWith(5);
    });

    it('should assign trend directions based on position', async () => {
      const mockData = Array.from({ length: 10 }, (_, i) => ({
        search_term: `term${i}`,
        search_count: 100 - i * 10,
        unique_users: 50 - i * 5,
        avg_results: 10,
        last_searched: '2025-01-30'
      }));

      const limitMock = vi.fn().mockResolvedValue({ data: mockData, error: null });
      const orderMock = vi.fn().mockReturnValue({ limit: limitMock });
      const selectMock = vi.fn().mockReturnValue({ order: orderMock });

      (supabase.from as any).mockReturnValue({ select: selectMock });

      const result = await searchAnalyticsService.getPopularSearchTerms(10);

      // First 3 should be 'up'
      expect(result[0].trend_direction).toBe('up');
      expect(result[1].trend_direction).toBe('up');
      expect(result[2].trend_direction).toBe('up');

      // Next 4 should be 'stable'
      expect(result[3].trend_direction).toBe('stable');
      expect(result[6].trend_direction).toBe('stable');

      // Last ones should be 'down'
      expect(result[7].trend_direction).toBe('down');
      expect(result[9].trend_direction).toBe('down');
    });

    it('should handle database errors', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const limitMock = vi.fn().mockResolvedValue({ 
        data: null, 
        error: { message: 'Database error' } 
      });
      const orderMock = vi.fn().mockReturnValue({ limit: limitMock });
      const selectMock = vi.fn().mockReturnValue({ order: orderMock });

      (supabase.from as any).mockReturnValue({ select: selectMock });

      const result = await searchAnalyticsService.getPopularSearchTerms();

      expect(result).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should return empty array when no data', async () => {
      const limitMock = vi.fn().mockResolvedValue({ data: null, error: null });
      const orderMock = vi.fn().mockReturnValue({ limit: limitMock });
      const selectMock = vi.fn().mockReturnValue({ order: orderMock });

      (supabase.from as any).mockReturnValue({ select: selectMock });

      const result = await searchAnalyticsService.getPopularSearchTerms();

      expect(result).toEqual([]);
    });
  });

  // ==================== GET SEARCH INSIGHTS ====================

  describe('getSearchInsights', () => {
    it('should return comprehensive search insights', async () => {
      const mockSearchData = [
        { 
          user_id: 'user-1', 
          search_time_ms: 200, 
          results_count: 5, 
          clicked_result_id: 'result-1',
          created_at: '2025-01-30T10:00:00Z'
        },
        { 
          user_id: 'user-2', 
          search_time_ms: 300, 
          results_count: 3, 
          clicked_result_id: null,
          created_at: '2025-01-30T11:00:00Z'
        },
        { 
          user_id: 'user-1', 
          search_time_ms: 150, 
          results_count: 0, 
          clicked_result_id: null,
          created_at: '2025-01-30T12:00:00Z'
        }
      ];

      const mockPopularTerms: SearchTrend[] = [
        { 
          search_term: 'pizza', 
          search_count: 10, 
          unique_users: 5, 
          avg_results: 8, 
          last_searched: '2025-01-30',
          trend_direction: 'up',
          change_percentage: 15
        }
      ];

      // Mock the select query
      const lteMock = vi.fn().mockResolvedValue({ data: mockSearchData, error: null });
      const gteMock = vi.fn().mockReturnValue({ lte: lteMock });
      const selectMock = vi.fn().mockReturnValue({ gte: gteMock });

      // Mock getPopularSearchTerms
      const limitMock = vi.fn().mockResolvedValue({ 
        data: [mockPopularTerms[0]], 
        error: null 
      });
      const orderMock = vi.fn().mockReturnValue({ limit: limitMock });
      const selectMock2 = vi.fn().mockReturnValue({ order: orderMock });

      let callCount = 0;
      (supabase.from as any).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return { select: selectMock };
        } else {
          return { select: selectMock2 };
        }
      });

      const result = await searchAnalyticsService.getSearchInsights();

      expect(result.total_searches).toBe(3);
      expect(result.unique_users).toBe(2);
      expect(result.avg_search_time).toBe(217); // (200+300+150)/3 = 216.67, rounded to 217
      expect(result.search_success_rate).toBe(66.67); // 2 out of 3 had results
      expect(result.conversion_rate).toBe(50); // 1 out of 2 successful searches had clicks
      expect(result.top_terms).toHaveLength(1);
      expect(result.popular_filters).toBeDefined();
      expect(result.peak_hours).toBeDefined();
    });

    it('should handle custom date range', async () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');

      const lteMock = vi.fn().mockResolvedValue({ data: [], error: null });
      const gteMock = vi.fn().mockReturnValue({ lte: lteMock });
      const selectMock = vi.fn().mockReturnValue({ gte: gteMock });

      const limitMock = vi.fn().mockResolvedValue({ data: [], error: null });
      const orderMock = vi.fn().mockReturnValue({ limit: limitMock });
      const selectMock2 = vi.fn().mockReturnValue({ order: orderMock });

      let callCount = 0;
      (supabase.from as any).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return { select: selectMock };
        } else {
          return { select: selectMock2 };
        }
      });

      await searchAnalyticsService.getSearchInsights({ start: startDate, end: endDate });

      expect(gteMock).toHaveBeenCalledWith('created_at', startDate.toISOString());
      expect(lteMock).toHaveBeenCalledWith('created_at', endDate.toISOString());
    });

    it('should return default values on error', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      (supabase.from as any).mockImplementation(() => {
        throw new Error('Database error');
      });

      const result = await searchAnalyticsService.getSearchInsights();

      expect(result).toEqual({
        total_searches: 0,
        unique_users: 0,
        avg_search_time: 0,
        top_terms: [],
        search_success_rate: 0,
        popular_filters: [],
        peak_hours: [],
        conversion_rate: 0
      });

      consoleErrorSpy.mockRestore();
    });

    it('should calculate metrics correctly with zero searches', async () => {
      const lteMock = vi.fn().mockResolvedValue({ data: [], error: null });
      const gteMock = vi.fn().mockReturnValue({ lte: lteMock });
      const selectMock = vi.fn().mockReturnValue({ gte: gteMock });

      const limitMock = vi.fn().mockResolvedValue({ data: [], error: null });
      const orderMock = vi.fn().mockReturnValue({ limit: limitMock });
      const selectMock2 = vi.fn().mockReturnValue({ order: orderMock });

      let callCount = 0;
      (supabase.from as any).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return { select: selectMock };
        } else {
          return { select: selectMock2 };
        }
      });

      const result = await searchAnalyticsService.getSearchInsights();

      expect(result.total_searches).toBe(0);
      expect(result.search_success_rate).toBe(0);
      expect(result.conversion_rate).toBe(0);
    });
  });

  // ==================== REFRESH POPULAR TERMS ====================

  describe('refreshPopularTerms', () => {
    it('should call RPC function to refresh popular terms', async () => {
      const rpcMock = vi.fn().mockResolvedValue({ error: null });
      (supabase.rpc as any) = rpcMock;

      await searchAnalyticsService.refreshPopularTerms();

      expect(rpcMock).toHaveBeenCalledWith('refresh_popular_search_terms');
    });

    it('should handle refresh errors gracefully', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const rpcMock = vi.fn().mockRejectedValue(new Error('RPC failed'));
      (supabase.rpc as any) = rpcMock;

      await searchAnalyticsService.refreshPopularTerms();

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Failed to refresh popular search terms:',
        expect.any(Error)
      );

      consoleWarnSpy.mockRestore();
    });
  });

  // ==================== GET SEARCH TRENDS ====================

  describe('getSearchTrends', () => {
    it('should return search trends grouped by date', async () => {
      const mockData = [
        { created_at: '2025-01-30T10:00:00Z' },
        { created_at: '2025-01-30T11:00:00Z' },
        { created_at: '2025-01-30T12:00:00Z' },
        { created_at: '2025-01-29T10:00:00Z' },
        { created_at: '2025-01-29T11:00:00Z' }
      ];

      const orderMock = vi.fn().mockResolvedValue({ data: mockData, error: null });
      const gteMock = vi.fn().mockReturnValue({ order: orderMock });
      const selectMock = vi.fn().mockReturnValue({ gte: gteMock });

      (supabase.from as any).mockReturnValue({ select: selectMock });

      const result = await searchAnalyticsService.getSearchTrends(30);

      expect(result).toHaveLength(2);
      expect(result).toContainEqual({ date: '2025-01-30', searches: 3 });
      expect(result).toContainEqual({ date: '2025-01-29', searches: 2 });
    });

    it('should respect custom days parameter', async () => {
      const orderMock = vi.fn().mockResolvedValue({ data: [], error: null });
      const gteMock = vi.fn().mockReturnValue({ order: orderMock });
      const selectMock = vi.fn().mockReturnValue({ gte: gteMock });

      (supabase.from as any).mockReturnValue({ select: selectMock });

      await searchAnalyticsService.getSearchTrends(7);

      // Verify the date range is correct (7 days ago)
      expect(gteMock).toHaveBeenCalledWith(
        'created_at',
        expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/)
      );
    });

    it('should handle database errors', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const orderMock = vi.fn().mockResolvedValue({ 
        data: null, 
        error: { message: 'Database error' } 
      });
      const gteMock = vi.fn().mockReturnValue({ order: orderMock });
      const selectMock = vi.fn().mockReturnValue({ gte: gteMock });

      (supabase.from as any).mockReturnValue({ select: selectMock });

      const result = await searchAnalyticsService.getSearchTrends();

      expect(result).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should return empty array when no data', async () => {
      const orderMock = vi.fn().mockResolvedValue({ data: [], error: null });
      const gteMock = vi.fn().mockReturnValue({ order: orderMock });
      const selectMock = vi.fn().mockReturnValue({ gte: gteMock });

      (supabase.from as any).mockReturnValue({ select: selectMock });

      const result = await searchAnalyticsService.getSearchTrends();

      expect(result).toEqual([]);
    });

    it('should handle data with null values', async () => {
      const mockData = [
        { created_at: '2025-01-30T10:00:00Z' },
        { created_at: null },
        { created_at: '2025-01-30T11:00:00Z' }
      ];

      const orderMock = vi.fn().mockResolvedValue({ data: mockData, error: null });
      const gteMock = vi.fn().mockReturnValue({ order: orderMock });
      const selectMock = vi.fn().mockReturnValue({ gte: gteMock });

      (supabase.from as any).mockReturnValue({ select: selectMock });

      // Should not throw
      const result = await searchAnalyticsService.getSearchTrends();

      expect(result).toBeDefined();
    });
  });

  // ==================== SESSION ID GENERATION ====================

  describe('Session ID', () => {
    it('should generate unique session IDs', async () => {
      const sessionIds = new Set<string>();
      
      // Track multiple searches to ensure same session ID is used
      const insertMock = vi.fn().mockResolvedValue({ error: null });
      (supabase.from as any).mockReturnValue({ insert: insertMock });

      // Make several calls
      for (let i = 0; i < 3; i++) {
        await searchAnalyticsService.trackSearch({
          searchTerm: `test${i}`,
          resultsCount: i,
          searchTimeMs: 100
        });
      }

      // Extract session IDs from all calls
      insertMock.mock.calls.forEach(call => {
        sessionIds.add(call[0].session_id);
      });

      // All calls should use the same session ID (from same service instance)
      expect(sessionIds.size).toBe(1);
      
      // Verify format
      const sessionId = Array.from(sessionIds)[0];
      expect(sessionId).toMatch(/^session_\d+_[a-z0-9]+$/);
    });
  });
});