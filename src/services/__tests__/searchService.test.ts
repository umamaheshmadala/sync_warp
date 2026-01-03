/**
 * Unit Tests for searchService
 * Story 9.8.1: Unit Tests - Services & Database Functions
 * 
 * Coverage:
 * - getNearbyBusinesses (public method)
 * - clearCache (public method)
 * - getTrendingSearchTerms (public method)
 * - getPopularSearchTerms (public method)
 * 
 * Note: Private methods are not tested directly as they're implementation details
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { searchService } from '../searchService';
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

describe('searchService', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        // Clear cache before each test
        searchService.clearCache();
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

    describe('clearCache', () => {
        it('should clear the cache', () => {
            // Should not throw
            expect(() => searchService.clearCache()).not.toThrow();
        });
    });

    describe('getTrendingSearchTerms', () => {
        it('should return fallback trending terms', async () => {
            const result = await searchService.getTrendingSearchTerms();

            expect(Array.isArray(result)).toBe(true);
            expect(result.length).toBeGreaterThan(0);
            expect(result).toContain('Restaurants near me');
        });

        it('should accept custom daysBack parameter', async () => {
            const result = await searchService.getTrendingSearchTerms(30);

            expect(Array.isArray(result)).toBe(true);
            expect(result.length).toBeGreaterThan(0);
        });

        it('should accept custom limit parameter', async () => {
            const result = await searchService.getTrendingSearchTerms(7, 5);

            expect(Array.isArray(result)).toBe(true);
            expect(result.length).toBeGreaterThan(0);
        });
    });

    describe('getPopularSearchTerms', () => {
        it('should return popular search terms', async () => {
            const result = await searchService.getPopularSearchTerms();

            expect(Array.isArray(result)).toBe(true);
            expect(result.length).toBeGreaterThan(0);
        });

        it('should accept custom limit parameter', async () => {
            const result = await searchService.getPopularSearchTerms(5);

            expect(Array.isArray(result)).toBe(true);
            expect(result.length).toBeGreaterThan(0);
            expect(result.length).toBeLessThanOrEqual(5);
        });

        it('should return string array', async () => {
            const result = await searchService.getPopularSearchTerms();

            expect(result.every(item => typeof item === 'string')).toBe(true);
        });
    });
});
