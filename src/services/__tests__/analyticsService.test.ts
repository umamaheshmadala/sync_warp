/**
 * Unit Tests for analyticsService
 * Story 9.8.1: Unit Tests - Services & Database Functions
 * 
 * Coverage:
 * - getUserSharingAnalytics
 * - trackShareClick
 * - trackShareConversion
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getUserSharingAnalytics, trackShareClick, trackShareConversion } from '../analyticsService';
import { supabase } from '../../lib/supabase';

// Mock Supabase
vi.mock('../../lib/supabase', () => ({
    supabase: {
        auth: {
            getUser: vi.fn(),
        },
        rpc: vi.fn(),
        from: vi.fn(),
    },
}));

// Mock navigator and document
global.navigator = { userAgent: 'Test User Agent' } as any;
global.document = { referrer: 'https://test.com' } as any;

describe('analyticsService', () => {
    const mockUser = { id: 'user-123' };

    beforeEach(() => {
        vi.resetAllMocks();
        (supabase.auth.getUser as any).mockResolvedValue({
            data: { user: mockUser },
            error: null,
        });
    });

    describe('getUserSharingAnalytics', () => {
        it('should get sharing analytics successfully', async () => {
            const mockAnalytics = {
                total_shares: 42,
                shares_by_method: {
                    friends: 25,
                    link: 10,
                    social: 7,
                },
                click_through_rate: 0.65,
                conversion_rate: 0.32,
                most_shared_offers: [
                    {
                        id: 'offer-1',
                        title: 'Amazing Deal',
                        image_url: 'https://example.com/image.jpg',
                        share_count: 15,
                    },
                ],
                most_engaged_friends: [
                    {
                        id: 'friend-1',
                        full_name: 'John Doe',
                        avatar_url: 'https://example.com/avatar.jpg',
                        shares_received: 10,
                        clicks: 8,
                        conversions: 3,
                    },
                ],
            };

            (supabase.rpc as any).mockResolvedValue({
                data: mockAnalytics,
                error: null,
            });

            const result = await getUserSharingAnalytics();

            expect(result).toEqual(mockAnalytics);
            expect(result.total_shares).toBe(42);
            expect(result.click_through_rate).toBe(0.65);
            expect(result.most_shared_offers).toHaveLength(1);
            expect(supabase.rpc).toHaveBeenCalledWith('get_user_sharing_analytics');
        });

        it('should return empty analytics on error', async () => {
            (supabase.rpc as any).mockResolvedValue({
                data: null,
                error: { message: 'Database error' },
            });

            const result = await getUserSharingAnalytics();

            expect(result).toEqual({
                total_shares: 0,
                shares_by_method: {},
                click_through_rate: 0,
                conversion_rate: 0,
                most_shared_offers: [],
                most_engaged_friends: [],
            });
        });

        it('should log error when RPC fails', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            (supabase.rpc as any).mockResolvedValue({
                data: null,
                error: { message: 'Database error' },
            });

            await getUserSharingAnalytics();

            expect(consoleSpy).toHaveBeenCalledWith(
                'Error fetching sharing analytics:',
                { message: 'Database error' }
            );

            consoleSpy.mockRestore();
        });
    });

    describe('trackShareClick', () => {
        it('should track share click successfully', async () => {
            const mockInsert = vi.fn().mockResolvedValue({ error: null });
            (supabase.from as any).mockReturnValue({
                insert: mockInsert,
            });

            await trackShareClick('share-123', 'deal-456');

            expect(supabase.from).toHaveBeenCalledWith('share_clicks');
            expect(mockInsert).toHaveBeenCalledWith({
                share_id: 'share-123',
                deal_id: 'deal-456',
                user_id: mockUser.id,
                user_agent: 'Test User Agent',
                referrer: 'https://test.com',
            });
        });

        it('should track share click when user not authenticated', async () => {
            (supabase.auth.getUser as any).mockResolvedValue({
                data: { user: null },
                error: null,
            });

            const mockInsert = vi.fn().mockResolvedValue({ error: null });
            (supabase.from as any).mockReturnValue({
                insert: mockInsert,
            });

            await trackShareClick('share-123', 'deal-456');

            expect(mockInsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    user_id: null,
                })
            );
        });

        it('should log error when insert fails', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            const mockInsert = vi.fn().mockResolvedValue({
                error: { message: 'Insert failed' },
            });
            (supabase.from as any).mockReturnValue({
                insert: mockInsert,
            });

            await trackShareClick('share-123', 'deal-456');

            expect(consoleSpy).toHaveBeenCalledWith(
                'Failed to track share click:',
                { message: 'Insert failed' }
            );

            consoleSpy.mockRestore();
        });

        it('should handle null referrer', async () => {
            global.document = { referrer: '' } as any;

            const mockInsert = vi.fn().mockResolvedValue({ error: null });
            (supabase.from as any).mockReturnValue({
                insert: mockInsert,
            });

            await trackShareClick('share-123', 'deal-456');

            expect(mockInsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    referrer: null,
                })
            );
        });
    });

    describe('trackShareConversion', () => {
        it('should track favorite conversion successfully', async () => {
            const mockInsert = vi.fn().mockResolvedValue({ error: null });
            (supabase.from as any).mockReturnValue({
                insert: mockInsert,
            });

            await trackShareConversion('share-123', 'deal-456', 'favorite');

            expect(supabase.from).toHaveBeenCalledWith('share_conversions');
            expect(mockInsert).toHaveBeenCalledWith({
                share_id: 'share-123',
                deal_id: 'deal-456',
                user_id: mockUser.id,
                conversion_type: 'favorite',
            });
        });

        it('should track save conversion successfully', async () => {
            const mockInsert = vi.fn().mockResolvedValue({ error: null });
            (supabase.from as any).mockReturnValue({
                insert: mockInsert,
            });

            await trackShareConversion('share-123', 'deal-456', 'save');

            expect(mockInsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    conversion_type: 'save',
                })
            );
        });

        it('should track purchase conversion successfully', async () => {
            const mockInsert = vi.fn().mockResolvedValue({ error: null });
            (supabase.from as any).mockReturnValue({
                insert: mockInsert,
            });

            await trackShareConversion('share-123', 'deal-456', 'purchase');

            expect(mockInsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    conversion_type: 'purchase',
                })
            );
        });

        it('should not track when user not authenticated', async () => {
            (supabase.auth.getUser as any).mockResolvedValue({
                data: { user: null },
                error: null,
            });

            const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });
            const mockInsert = vi.fn();
            (supabase.from as any).mockReturnValue({
                insert: mockInsert,
            });

            await trackShareConversion('share-123', 'deal-456', 'favorite');

            expect(consoleSpy).toHaveBeenCalledWith('Cannot track conversion: user not authenticated');
            expect(mockInsert).not.toHaveBeenCalled();

            consoleSpy.mockRestore();
        });

        it('should log error when insert fails', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            const mockInsert = vi.fn().mockResolvedValue({
                error: { message: 'Insert failed' },
            });
            (supabase.from as any).mockReturnValue({
                insert: mockInsert,
            });

            await trackShareConversion('share-123', 'deal-456', 'favorite');

            expect(consoleSpy).toHaveBeenCalledWith(
                'Failed to track share conversion:',
                { message: 'Insert failed' }
            );

            consoleSpy.mockRestore();
        });
    });
});
