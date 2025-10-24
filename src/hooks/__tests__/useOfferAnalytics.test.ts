// src/hooks/__tests__/useOfferAnalytics.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useOfferAnalytics } from '../useOfferAnalytics';

vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({
            data: mockAnalytics,
            error: null,
          })),
          order: vi.fn(() => Promise.resolve({
            data: [mockAnalytics],
            error: null,
          })),
        })),
      })),
    })),
  },
}));

const mockAnalytics = {
  id: 'analytics-1',
  offer_id: 'offer-1',
  business_id: 'business-1',
  total_views: 100,
  unique_viewers: 75,
  total_shares: 20,
  unique_sharers: 15,
  share_channels: {
    whatsapp: 10,
    facebook: 5,
    twitter: 3,
    email: 2,
  },
  total_clicks: 30,
  unique_clickers: 25,
  click_sources: {
    direct: 15,
    social: 10,
    email: 5,
  },
  daily_stats: [
    { date: '2025-01-01', views: 10, shares: 2, clicks: 3 },
    { date: '2025-01-02', views: 15, shares: 3, clicks: 5 },
    { date: '2025-01-03', views: 20, shares: 4, clicks: 7 },
  ],
  created_at: '2025-01-01',
  updated_at: '2025-01-03',
};

describe('useOfferAnalytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch analytics for single offer', async () => {
    const { result } = renderHook(() =>
      useOfferAnalytics({ offerId: 'offer-1', autoFetch: true })
    );

    await waitFor(() => {
      expect(result.current.analytics).toBeDefined();
      expect(result.current.analytics?.total_views).toBe(100);
    });
  });

  it('should calculate summary with CTR', async () => {
    const { result } = renderHook(() =>
      useOfferAnalytics({ offerId: 'offer-1', autoFetch: true })
    );

    await waitFor(() => {
      expect(result.current.summary).toBeDefined();
      expect(result.current.summary?.ctr).toBe(30); // (30/100)*100
      expect(result.current.summary?.share_rate).toBe(20); // (20/100)*100
    });
  });

  it('should provide views over time data', async () => {
    const { result } = renderHook(() =>
      useOfferAnalytics({ offerId: 'offer-1', autoFetch: true })
    );

    await waitFor(() => {
      const viewsData = result.current.getViewsOverTime();
      expect(viewsData).toHaveLength(3);
      expect(viewsData[0].count).toBe(10);
      expect(viewsData[1].count).toBe(15);
    });
  });

  it('should provide share channel breakdown', async () => {
    const { result } = renderHook(() =>
      useOfferAnalytics({ offerId: 'offer-1', autoFetch: true })
    );

    await waitFor(() => {
      const channelData = result.current.getShareChannelBreakdown();
      expect(channelData).toHaveLength(4);
      expect(channelData[0].channel).toBe('whatsapp');
      expect(channelData[0].count).toBe(10);
    });
  });

  it('should fetch all analytics for business', async () => {
    const { result } = renderHook(() =>
      useOfferAnalytics({ businessId: 'business-1', autoFetch: true })
    );

    await waitFor(() => {
      expect(result.current.allAnalytics).toHaveLength(1);
    });
  });

  it('should handle missing analytics gracefully', async () => {
    vi.mocked(require('../../lib/supabaseClient').supabase.from).mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({
            data: null,
            error: { code: 'PGRST116' }, // Not found
          })),
        })),
      })),
    });

    const { result } = renderHook(() =>
      useOfferAnalytics({ offerId: 'offer-1', autoFetch: true })
    );

    await waitFor(() => {
      expect(result.current.analytics).toBeNull();
      expect(result.current.summary).toBeNull();
    });
  });
});
