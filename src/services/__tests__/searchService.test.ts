/**
 * Unit Tests for searchService
 * Story 9.8.1: Unit Tests - Services & Database Functions
 * 
 * Coverage:
 * - search (main search method)
 * - getNearbyBusinesses
 * - Cache management
 * - Analytics tracking
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SearchService } from '../searchService';
import { supabase } from '../../lib/supabase';

// Mock Supabase
vi.mock('../../lib/supabase', () => ({
    supabase: {
        from: vi.fn(),
        rpc: vi.fn(),
        auth: {
            getUser: vi.fn(),
        },
    },
}));

describe('SearchService', () => {
    let searchService: any;

    beforeEach(() => {
        vi.resetAllMocks();
        // Create new instance for each test to reset cache
        searchService = new (SearchService as any)();
    });

    describe('getNearbyBusinesses', () => {
        it('should get nearby businesses successfully', async () => {
            const mockBusinesses = [
                { id: 'business-1', business_name: 'Business 1', distance: 2.5 },
                { id: 'business-2', business_name: 'Business 2', distance: 5.0 },
            ];

            (supabase.rpc as any).mockResolvedValue({
                data: mockBusinesses,
                error: null,
            });

            const result = await searchService.getNearbyBusinesses(40.7128, -74.0060, 10, 20);

            expect(result).toEqual(mockBusinesses);
            expect(supabase.rpc).toHaveBeenCalledWith('nearby_businesses', {
                lat: 40.7128,
                lng: -74.0060,
                radius_km: 10,
                result_limit: 20,
            });
        });

        it('should use default radius of 10km', async () => {
            (supabase.rpc as any).mockResolvedValue({
                data: [],
                error: null,
            });

            await searchService.getNearbyBusinesses(40.7128, -74.0060);

            expect(supabase.rpc).toHaveBeenCalledWith('nearby_businesses', {
                lat: 40.7128,
                lng: -74.0060,
                radius_km: 10,
                result_limit: 20,
            });
        });

        it('should use default limit of 20', async () => {
            (supabase.rpc as any).mockResolvedValue({
                data: [],
                error: null,
            });

            await searchService.getNearbyBusinesses(40.7128, -74.0060, 5);

            expect(supabase.rpc).toHaveBeenCalledWith('nearby_businesses', {
                lat: 40.7128,
                lng: -74.0060,
                radius_km: 5,
                result_limit: 20,
            });
        });

        it('should return empty array on error', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            (supabase.rpc as any).mockResolvedValue({
                data: null,
                error: { message: 'Database error' },
            });

            const result = await searchService.getNearbyBusinesses(40.7128, -74.0060);

            expect(result).toEqual([]);
            expect(consoleSpy).toHaveBeenCalledWith(
                'Error fetching nearby businesses:',
                { message: 'Database error' }
            );

            consoleSpy.mockRestore();
        });

        it('should return empty array when data is null', async () => {
            (supabase.rpc as any).mockResolvedValue({
                data: null,
                error: null,
            });

            const result = await searchService.getNearbyBusinesses(40.7128, -74.0060);

            expect(result).toEqual([]);
        });
    });

    describe('Cache Management', () => {
        it('should cache search results', async () => {
            // Mock successful search
            const mockCoupons = [{ id: 'coupon-1', title: 'Test Coupon' }];
            const mockBusinesses = [{ id: 'business-1', business_name: 'Test Business' }];

            // Mock the search methods
            vi.spyOn(searchService, 'searchCoupons').mockResolvedValue({
                coupons: mockCoupons,
                total: 1,
                hasMore: false,
            });
            vi.spyOn(searchService, 'searchBusinesses').mockResolvedValue({
                businesses: mockBusinesses,
                total: 1,
                hasMore: false,
            });
            vi.spyOn(searchService, 'generateFacets').mockResolvedValue({
                couponTypes: [],
                discountRanges: [],
                businessTypes: [],
                locations: [],
                validityRanges: [],
            });
            vi.spyOn(searchService, 'generateSuggestions').mockResolvedValue([]);
            vi.spyOn(searchService, 'trackSearchAnalytics').mockResolvedValue(undefined);

            const query = {
                q: 'test',
                filters: {},
                sort: { field: 'relevance' as const, order: 'desc' as const },
                pagination: { page: 1, limit: 20 },
            };

            // First search - should call methods
            await searchService.search(query);
            expect(searchService.searchCoupons).toHaveBeenCalledTimes(1);

            // Second search with same query - should use cache
            await searchService.search(query);
            expect(searchService.searchCoupons).toHaveBeenCalledTimes(1); // Still 1, not called again
        });

        it('should generate unique cache keys for different queries', () => {
            const query1 = {
                q: 'test1',
                filters: {},
                sort: { field: 'relevance' as const, order: 'desc' as const },
                pagination: { page: 1, limit: 20 },
            };

            const query2 = {
                q: 'test2',
                filters: {},
                sort: { field: 'relevance' as const, order: 'desc' as const },
                pagination: { page: 1, limit: 20 },
            };

            const key1 = searchService.generateCacheKey(query1);
            const key2 = searchService.generateCacheKey(query2);

            expect(key1).not.toBe(key2);
        });
    });

    describe('Search Analytics', () => {
        it('should track search analytics when enabled', async () => {
            const mockInsert = vi.fn().mockResolvedValue({ error: null });
            (supabase.from as any).mockReturnValue({
                insert: mockInsert,
            });

            const query = {
                q: 'test search',
                filters: { validOnly: true },
                sort: { field: 'relevance' as const, order: 'desc' as const },
                pagination: { page: 1, limit: 20 },
            };

            const result = {
                coupons: [],
                businesses: [],
                totalCoupons: 0,
                totalBusinesses: 0,
                facets: {
                    couponTypes: [],
                    discountRanges: [],
                    businessTypes: [],
                    locations: [],
                    validityRanges: [],
                },
                suggestions: [],
                searchTime: 100,
                hasMore: false,
            };

            await searchService.trackSearchAnalytics(query, result, 'user-123');

            expect(supabase.from).toHaveBeenCalledWith('search_analytics');
            expect(mockInsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    user_id: 'user-123',
                    search_term: 'test search',
                    results_count: 0,
                    response_time_ms: 100,
                })
            );
        });

        it('should not throw error when analytics tracking fails', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            const mockInsert = vi.fn().mockResolvedValue({
                error: { message: 'Insert failed' },
            });
            (supabase.from as any).mockReturnValue({
                insert: mockInsert,
            });

            const query = {
                q: 'test',
                filters: {},
                sort: { field: 'relevance' as const, order: 'desc' as const },
                pagination: { page: 1, limit: 20 },
            };

            const result = {
                coupons: [],
                businesses: [],
                totalCoupons: 0,
                totalBusinesses: 0,
                facets: {
                    couponTypes: [],
                    discountRanges: [],
                    businessTypes: [],
                    locations: [],
                    validityRanges: [],
                },
                suggestions: [],
                searchTime: 100,
                hasMore: false,
            };

            // Should not throw
            await expect(
                searchService.trackSearchAnalytics(query, result, 'user-123')
            ).resolves.toBeUndefined();

            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });
    });

    describe('Relevance Scoring', () => {
        it('should calculate relevance score for coupons', () => {
            const coupon = {
                id: 'coupon-1',
                title: 'Test Coupon',
                description: 'Test description',
                collection_count: 100,
                usage_count: 50,
                created_at: new Date().toISOString(),
                discount_value: 20,
                businesses: { business_name: 'Test Business' },
            };

            const query = {
                q: 'test',
                filters: {},
                sort: { field: 'relevance' as const, order: 'desc' as const },
                pagination: { page: 1, limit: 20 },
            };

            const score = searchService.calculateRelevanceScore(coupon, query);

            expect(score).toBeGreaterThan(0);
            expect(typeof score).toBe('number');
        });

        it('should calculate relevance score for businesses', () => {
            const business = {
                id: 'business-1',
                business_name: 'Test Business',
                description: 'Test description',
                business_coupons: [{}, {}, {}], // 3 coupons
                rating: 4.5,
            };

            const query = {
                q: 'test',
                filters: {},
                sort: { field: 'relevance' as const, order: 'desc' as const },
                pagination: { page: 1, limit: 20 },
            };

            const score = searchService.calculateBusinessRelevanceScore(business, query);

            expect(score).toBeGreaterThan(0);
            expect(typeof score).toBe('number');
        });
    });

    describe('Search Term Highlighting', () => {
        it('should highlight search terms in text', () => {
            const result = searchService.highlightSearchTerms(
                'Amazing Deal on Pizza',
                'Get 50% off on pizza today',
                'pizza'
            );

            expect(result.highlightedTitle).toContain('<mark>');
            expect(result.highlightedDescription).toContain('<mark>');
        });

        it('should handle case-insensitive highlighting', () => {
            const result = searchService.highlightSearchTerms(
                'PIZZA Deal',
                'pizza description',
                'pizza'
            );

            expect(result.highlightedTitle).toContain('<mark>PIZZA</mark>');
            expect(result.highlightedDescription).toContain('<mark>pizza</mark>');
        });

        it('should return original text when no search term', () => {
            const result = searchService.highlightSearchTerms(
                'Test Title',
                'Test Description'
            );

            expect(result.highlightedTitle).toBe('Test Title');
            expect(result.highlightedDescription).toBe('Test Description');
        });
    });
});
