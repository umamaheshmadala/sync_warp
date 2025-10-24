import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useOfferAnalytics } from '../useOfferAnalytics';
import { supabase } from '@/lib/supabase';

// Mock the Supabase client
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
    })),
    rpc: vi.fn(() => ({
      eq: vi.fn(),
    })),
  },
}));

describe('useOfferAnalytics', () => {
  const mockOfferId = 'offer-123';
  const mockAnalytics = {
    id: 'analytics-1',
    offer_id: mockOfferId,
    business_id: 'business-1',
    total_views: 150,
    unique_viewers: 100,
    total_shares: 30,
    unique_sharers: 25,
    share_channels: {
      whatsapp: 15,
      facebook: 10,
      in_app: 5,
    },
    total_clicks: 60,
    unique_clickers: 45,
    click_sources: {
      direct: 40,
      shared_link: 20,
    },
    daily_stats: [
      { date: '2025-01-01', views: 50, shares: 10, clicks: 20 },
      { date: '2025-01-02', views: 100, shares: 20, clicks: 40 },
    ],
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-02T12:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('fetchAnalytics', () => {
    it('should fetch analytics data successfully', async () => {
      const mockSupabaseResponse = {
        data: mockAnalytics,
        error: null,
      };

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(mockSupabaseResponse),
          }),
        }),
      } as any);

      const { result } = renderHook(() => useOfferAnalytics(mockOfferId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.analytics).toEqual(mockAnalytics);
      expect(result.current.error).toBeNull();
      expect(supabase.from).toHaveBeenCalledWith('offer_analytics');
    });

    it('should handle analytics fetch error', async () => {
      const mockError = { message: 'Failed to fetch analytics', code: '500' };

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: mockError,
            }),
          }),
        }),
      } as any);

      const { result } = renderHook(() => useOfferAnalytics(mockOfferId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.analytics).toBeNull();
      expect(result.current.error).toEqual(mockError);
    });

    it('should set loading to true initially and false after fetch', async () => {
      const mockSupabaseResponse = {
        data: mockAnalytics,
        error: null,
      };

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(mockSupabaseResponse),
          }),
        }),
      } as any);

      const { result } = renderHook(() => useOfferAnalytics(mockOfferId));

      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it('should handle missing analytics data (new offer)', async () => {
      const mockSupabaseResponse = {
        data: null,
        error: { message: 'No analytics found', code: 'PGRST116' },
      };

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(mockSupabaseResponse),
          }),
        }),
      } as any);

      const { result } = renderHook(() => useOfferAnalytics(mockOfferId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // For a new offer with no analytics yet, we should handle gracefully
      expect(result.current.analytics).toBeNull();
      expect(result.current.error).toBeTruthy();
    });
  });

  describe('calculateCTR', () => {
    it('should calculate click-through rate correctly', async () => {
      const mockSupabaseResponse = {
        data: mockAnalytics,
        error: null,
      };

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(mockSupabaseResponse),
          }),
        }),
      } as any);

      const { result } = renderHook(() => useOfferAnalytics(mockOfferId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // CTR = (clicks / shares) * 100 = (60 / 30) * 100 = 200%
      expect(result.current.calculateCTR()).toBe(200);
    });

    it('should return 0 CTR when there are no shares', async () => {
      const analyticsWithNoShares = {
        ...mockAnalytics,
        total_shares: 0,
        total_clicks: 10,
      };

      const mockSupabaseResponse = {
        data: analyticsWithNoShares,
        error: null,
      };

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(mockSupabaseResponse),
          }),
        }),
      } as any);

      const { result } = renderHook(() => useOfferAnalytics(mockOfferId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.calculateCTR()).toBe(0);
    });

    it('should return 0 CTR when analytics is null', async () => {
      const mockSupabaseResponse = {
        data: null,
        error: { message: 'No analytics', code: 'PGRST116' },
      };

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(mockSupabaseResponse),
          }),
        }),
      } as any);

      const { result } = renderHook(() => useOfferAnalytics(mockOfferId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.calculateCTR()).toBe(0);
    });
  });

  describe('calculateShareRate', () => {
    it('should calculate share rate correctly', async () => {
      const mockSupabaseResponse = {
        data: mockAnalytics,
        error: null,
      };

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(mockSupabaseResponse),
          }),
        }),
      } as any);

      const { result } = renderHook(() => useOfferAnalytics(mockOfferId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Share rate = (shares / views) * 100 = (30 / 150) * 100 = 20%
      expect(result.current.calculateShareRate()).toBe(20);
    });

    it('should return 0 share rate when there are no views', async () => {
      const analyticsWithNoViews = {
        ...mockAnalytics,
        total_views: 0,
        total_shares: 5,
      };

      const mockSupabaseResponse = {
        data: analyticsWithNoViews,
        error: null,
      };

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(mockSupabaseResponse),
          }),
        }),
      } as any);

      const { result } = renderHook(() => useOfferAnalytics(mockOfferId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.calculateShareRate()).toBe(0);
    });

    it('should return 0 share rate when analytics is null', async () => {
      const mockSupabaseResponse = {
        data: null,
        error: { message: 'No analytics', code: 'PGRST116' },
      };

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(mockSupabaseResponse),
          }),
        }),
      } as any);

      const { result } = renderHook(() => useOfferAnalytics(mockOfferId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.calculateShareRate()).toBe(0);
    });
  });

  describe('getTopShareChannels', () => {
    it('should return share channels sorted by count', async () => {
      const mockSupabaseResponse = {
        data: mockAnalytics,
        error: null,
      };

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(mockSupabaseResponse),
          }),
        }),
      } as any);

      const { result } = renderHook(() => useOfferAnalytics(mockOfferId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const topChannels = result.current.getTopShareChannels();
      expect(topChannels).toEqual([
        { channel: 'whatsapp', count: 15 },
        { channel: 'facebook', count: 10 },
        { channel: 'in_app', count: 5 },
      ]);
    });

    it('should return empty array when no share channels exist', async () => {
      const analyticsWithNoChannels = {
        ...mockAnalytics,
        share_channels: {},
      };

      const mockSupabaseResponse = {
        data: analyticsWithNoChannels,
        error: null,
      };

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(mockSupabaseResponse),
          }),
        }),
      } as any);

      const { result } = renderHook(() => useOfferAnalytics(mockOfferId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.getTopShareChannels()).toEqual([]);
    });

    it('should return empty array when analytics is null', async () => {
      const mockSupabaseResponse = {
        data: null,
        error: { message: 'No analytics', code: 'PGRST116' },
      };

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(mockSupabaseResponse),
          }),
        }),
      } as any);

      const { result } = renderHook(() => useOfferAnalytics(mockOfferId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.getTopShareChannels()).toEqual([]);
    });

    it('should limit results to top N channels', async () => {
      const analyticsWithManyChannels = {
        ...mockAnalytics,
        share_channels: {
          whatsapp: 50,
          facebook: 40,
          twitter: 30,
          in_app: 20,
          other: 10,
        },
      };

      const mockSupabaseResponse = {
        data: analyticsWithManyChannels,
        error: null,
      };

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(mockSupabaseResponse),
          }),
        }),
      } as any);

      const { result } = renderHook(() => useOfferAnalytics(mockOfferId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const topChannels = result.current.getTopShareChannels(3);
      expect(topChannels).toHaveLength(3);
      expect(topChannels[0].channel).toBe('whatsapp');
      expect(topChannels[1].channel).toBe('facebook');
      expect(topChannels[2].channel).toBe('twitter');
    });
  });

  describe('refreshAnalytics', () => {
    it('should refetch analytics when refresh is called', async () => {
      const mockSupabaseResponse = {
        data: mockAnalytics,
        error: null,
      };

      const selectMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue(mockSupabaseResponse),
        }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: selectMock,
      } as any);

      const { result } = renderHook(() => useOfferAnalytics(mockOfferId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(selectMock).toHaveBeenCalledTimes(1);

      // Call refresh
      result.current.refreshAnalytics();

      await waitFor(() => {
        expect(selectMock).toHaveBeenCalledTimes(2);
      });
    });

    it('should update loading state during refresh', async () => {
      const mockSupabaseResponse = {
        data: mockAnalytics,
        error: null,
      };

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(mockSupabaseResponse),
          }),
        }),
      } as any);

      const { result } = renderHook(() => useOfferAnalytics(mockOfferId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      result.current.refreshAnalytics();

      // Loading should be true immediately after refresh call
      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });
  });

  describe('edge cases', () => {
    it('should handle null offerId gracefully', async () => {
      const { result } = renderHook(() => useOfferAnalytics(null as any));

      expect(result.current.analytics).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle empty offerId gracefully', async () => {
      const { result } = renderHook(() => useOfferAnalytics(''));

      expect(result.current.analytics).toBeNull();
      expect(result.current.loading).toBe(false);
    });

    it('should handle network timeout', async () => {
      const timeoutError = { message: 'Network timeout', code: 'ETIMEDOUT' };

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockRejectedValue(timeoutError),
          }),
        }),
      } as any);

      const { result } = renderHook(() => useOfferAnalytics(mockOfferId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBeTruthy();
    });
  });

  describe('getDailyStatsForChart', () => {
    it('should format daily stats for chart display', async () => {
      const mockSupabaseResponse = {
        data: mockAnalytics,
        error: null,
      };

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(mockSupabaseResponse),
          }),
        }),
      } as any);

      const { result } = renderHook(() => useOfferAnalytics(mockOfferId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const chartData = result.current.getDailyStatsForChart();
      expect(chartData).toEqual(mockAnalytics.daily_stats);
    });

    it('should return empty array when no daily stats', async () => {
      const analyticsWithNoStats = {
        ...mockAnalytics,
        daily_stats: [],
      };

      const mockSupabaseResponse = {
        data: analyticsWithNoStats,
        error: null,
      };

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(mockSupabaseResponse),
          }),
        }),
      } as any);

      const { result } = renderHook(() => useOfferAnalytics(mockOfferId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.getDailyStatsForChart()).toEqual([]);
    });
  });
});
