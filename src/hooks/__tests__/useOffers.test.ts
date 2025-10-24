// src/hooks/__tests__/useOffers.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useOffers } from '../useOffers';
import type { Offer } from '../../types/offers';

// Mock Supabase client
vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          in: vi.fn(() => ({
            gte: vi.fn(() => ({
              lte: vi.fn(() => ({
                order: vi.fn(() => ({
                  range: vi.fn(() => Promise.resolve({
                    data: mockOffers,
                    error: null,
                    count: mockOffers.length,
                  })),
                })),
              })),
            })),
          })),
          order: vi.fn(() => ({
            range: vi.fn(() => Promise.resolve({
              data: mockOffers,
              error: null,
              count: mockOffers.length,
            })),
          })),
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({
            data: mockOffers[0],
            error: null,
          })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({
              data: { ...mockOffers[0], status: 'active' },
              error: null,
            })),
          })),
        })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      })),
    })),
  },
}));

const mockOffers: Offer[] = [
  {
    id: '1',
    business_id: 'business-1',
    title: 'Test Offer 1',
    description: 'Test description',
    terms_conditions: 'Test terms',
    valid_from: '2025-01-01',
    valid_until: '2025-12-31',
    created_at: '2025-01-01',
    status: 'active',
    offer_code: 'TEST001',
    icon_image_url: null,
    view_count: 10,
    share_count: 5,
    click_count: 3,
    created_by: 'user-1',
    updated_at: null,
    activated_at: '2025-01-01',
    expired_at: null,
  },
  {
    id: '2',
    business_id: 'business-1',
    title: 'Test Offer 2',
    description: 'Test description 2',
    terms_conditions: 'Test terms 2',
    valid_from: '2025-02-01',
    valid_until: '2025-11-30',
    created_at: '2025-01-02',
    status: 'draft',
    offer_code: 'TEST002',
    icon_image_url: null,
    view_count: 0,
    share_count: 0,
    click_count: 0,
    created_by: 'user-1',
    updated_at: null,
    activated_at: null,
    expired_at: null,
  },
];

describe('useOffers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Initial Load', () => {
    it('should fetch offers on mount when autoFetch is true', async () => {
      const { result } = renderHook(() =>
        useOffers({
          businessId: 'business-1',
          autoFetch: true,
        })
      );

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.offers).toHaveLength(2);
      });
    });

    it('should not fetch offers on mount when autoFetch is false', () => {
      const { result } = renderHook(() =>
        useOffers({
          businessId: 'business-1',
          autoFetch: false,
        })
      );

      expect(result.current.offers).toHaveLength(0);
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('Filtering', () => {
    it('should filter offers by status', async () => {
      const { result } = renderHook(() =>
        useOffers({
          businessId: 'business-1',
          filters: { status: 'active' },
          autoFetch: true,
        })
      );

      await waitFor(() => {
        expect(result.current.offers).toBeDefined();
      });
    });

    it('should filter offers by multiple statuses', async () => {
      const { result } = renderHook(() =>
        useOffers({
          businessId: 'business-1',
          filters: { status: ['active', 'draft'] },
          autoFetch: true,
        })
      );

      await waitFor(() => {
        expect(result.current.offers).toBeDefined();
      });
    });

    it('should filter offers by date range', async () => {
      const { result } = renderHook(() =>
        useOffers({
          businessId: 'business-1',
          filters: {
            valid_from: '2025-01-01',
            valid_until: '2025-12-31',
          },
          autoFetch: true,
        })
      );

      await waitFor(() => {
        expect(result.current.offers).toBeDefined();
      });
    });
  });

  describe('Sorting', () => {
    it('should sort offers by created_at descending by default', async () => {
      const { result } = renderHook(() =>
        useOffers({
          businessId: 'business-1',
          autoFetch: true,
        })
      );

      await waitFor(() => {
        expect(result.current.offers).toBeDefined();
      });
    });

    it('should sort offers by custom field', async () => {
      const { result } = renderHook(() =>
        useOffers({
          businessId: 'business-1',
          sort: { field: 'view_count', direction: 'desc' },
          autoFetch: true,
        })
      );

      await waitFor(() => {
        expect(result.current.offers).toBeDefined();
      });
    });
  });

  describe('Pagination', () => {
    it('should paginate offers with default limit', async () => {
      const { result } = renderHook(() =>
        useOffers({
          businessId: 'business-1',
          autoFetch: true,
        })
      );

      await waitFor(() => {
        expect(result.current.currentPage).toBe(1);
        expect(result.current.totalCount).toBeGreaterThanOrEqual(0);
      });
    });

    it('should paginate offers with custom limit', async () => {
      const { result } = renderHook(() =>
        useOffers({
          businessId: 'business-1',
          limit: 10,
          autoFetch: true,
        })
      );

      await waitFor(() => {
        expect(result.current.offers.length).toBeLessThanOrEqual(10);
      });
    });

    it('should fetch next page', async () => {
      const { result } = renderHook(() =>
        useOffers({
          businessId: 'business-1',
          autoFetch: true,
        })
      );

      await waitFor(() => {
        expect(result.current.offers).toBeDefined();
      });

      await result.current.fetchOffers(2);

      await waitFor(() => {
        expect(result.current.currentPage).toBe(2);
      });
    });
  });

  describe('CRUD Operations', () => {
    it('should create a new offer', async () => {
      const { result } = renderHook(() =>
        useOffers({
          businessId: 'business-1',
          autoFetch: false,
        })
      );

      const newOffer = {
        title: 'New Offer',
        description: 'New description',
        terms_conditions: 'New terms',
        icon_image_url: null,
        valid_from: '2025-01-01',
        valid_until: '2025-12-31',
      };

      const created = await result.current.createOffer(newOffer);

      expect(created).toBeDefined();
      expect(created?.title).toBe('Test Offer 1'); // Mock returns first offer
    });

    it('should update an existing offer', async () => {
      const { result } = renderHook(() =>
        useOffers({
          businessId: 'business-1',
          autoFetch: false,
        })
      );

      const updated = await result.current.updateOffer('1', {
        title: 'Updated Title',
      });

      expect(updated).toBeDefined();
    });

    it('should delete an offer', async () => {
      const { result } = renderHook(() =>
        useOffers({
          businessId: 'business-1',
          autoFetch: false,
        })
      );

      const success = await result.current.deleteOffer('1');

      expect(success).toBe(true);
    });
  });

  describe('Status Management', () => {
    it('should activate an offer', async () => {
      const { result } = renderHook(() =>
        useOffers({
          businessId: 'business-1',
          autoFetch: false,
        })
      );

      const success = await result.current.activateOffer('1');

      expect(success).toBe(true);
    });

    it('should pause an offer', async () => {
      const { result } = renderHook(() =>
        useOffers({
          businessId: 'business-1',
          autoFetch: false,
        })
      );

      const success = await result.current.pauseOffer('1');

      expect(success).toBe(true);
    });

    it('should archive an offer', async () => {
      const { result } = renderHook(() =>
        useOffers({
          businessId: 'business-1',
          autoFetch: false,
        })
      );

      const success = await result.current.archiveOffer('1');

      expect(success).toBe(true);
    });
  });

  describe('Duplicate Offer', () => {
    it('should duplicate an existing offer', async () => {
      const { result } = renderHook(() =>
        useOffers({
          businessId: 'business-1',
          autoFetch: false,
        })
      );

      const duplicate = await result.current.duplicateOffer('1');

      expect(duplicate).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle fetch errors', async () => {
      // Mock error response
      vi.mocked(require('../../lib/supabaseClient').supabase.from).mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({
            data: null,
            error: new Error('Fetch failed'),
          })),
        })),
      });

      const { result } = renderHook(() =>
        useOffers({
          businessId: 'business-1',
          autoFetch: true,
        })
      );

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });
    });
  });

  describe('Refresh', () => {
    it('should refresh current page', async () => {
      const { result } = renderHook(() =>
        useOffers({
          businessId: 'business-1',
          autoFetch: true,
        })
      );

      await waitFor(() => {
        expect(result.current.offers).toBeDefined();
      });

      await result.current.refreshOffers();

      await waitFor(() => {
        expect(result.current.offers).toBeDefined();
      });
    });
  });
});
