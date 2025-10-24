// src/hooks/__tests__/useOfferDrafts.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useOfferDrafts } from '../useOfferDrafts';
import type { OfferDraft } from '../../types/offers';

// Mock Supabase client
vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({
              data: mockDrafts,
              error: null,
            })),
          })),
          single: vi.fn(() => Promise.resolve({
            data: mockDrafts[0],
            error: null,
          })),
        })),
        single: vi.fn(() => Promise.resolve({
          data: mockDrafts[0],
          error: null,
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({
            data: mockDrafts[0],
            error: null,
          })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({
              data: { ...mockDrafts[0], updated_at: new Date().toISOString() },
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

const mockDrafts: OfferDraft[] = [
  {
    id: 'draft-1',
    user_id: 'user-1',
    business_id: 'business-1',
    draft_name: 'My Draft',
    form_data: {
      title: 'Draft Offer',
      description: 'Draft description',
    },
    step_completed: 1,
    created_at: '2025-01-01',
    updated_at: '2025-01-01',
  },
  {
    id: 'draft-2',
    user_id: 'user-1',
    business_id: 'business-1',
    draft_name: 'Another Draft',
    form_data: {
      title: 'Another Draft Offer',
    },
    step_completed: 0,
    created_at: '2025-01-02',
    updated_at: '2025-01-02',
  },
];

describe('useOfferDrafts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  describe('Initialization', () => {
    it('should fetch drafts on mount', async () => {
      const { result } = renderHook(() =>
        useOfferDrafts({
          userId: 'user-1',
          businessId: 'business-1',
        })
      );

      await waitFor(() => {
        expect(result.current.drafts).toHaveLength(2);
      });
    });

    it('should set loading state during fetch', async () => {
      const { result } = renderHook(() =>
        useOfferDrafts({
          userId: 'user-1',
          businessId: 'business-1',
        })
      );

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe('Create Draft', () => {
    it('should create a new draft', async () => {
      const { result } = renderHook(() =>
        useOfferDrafts({
          userId: 'user-1',
          businessId: 'business-1',
        })
      );

      await waitFor(() => {
        expect(result.current.drafts).toBeDefined();
      });

      let createdDraft: OfferDraft | null = null;

      await act(async () => {
        createdDraft = await result.current.createDraft('New Draft');
      });

      expect(createdDraft).toBeDefined();
      expect(createdDraft?.draft_name).toBe('My Draft'); // Mock returns first draft
    });

    it('should set current draft after creation', async () => {
      const { result } = renderHook(() =>
        useOfferDrafts({
          userId: 'user-1',
          businessId: 'business-1',
        })
      );

      await waitFor(() => {
        expect(result.current.drafts).toBeDefined();
      });

      await act(async () => {
        await result.current.createDraft('New Draft');
      });

      await waitFor(() => {
        expect(result.current.currentDraft).toBeDefined();
      });
    });
  });

  describe('Load Draft', () => {
    it('should load a specific draft', async () => {
      const { result } = renderHook(() =>
        useOfferDrafts({
          userId: 'user-1',
          businessId: 'business-1',
        })
      );

      await act(async () => {
        await result.current.loadDraft('draft-1');
      });

      await waitFor(() => {
        expect(result.current.currentDraft).toBeDefined();
        expect(result.current.currentDraft?.id).toBe('draft-1');
      });
    });
  });

  describe('Auto-save', () => {
    it('should auto-save draft after delay', async () => {
      const { result } = renderHook(() =>
        useOfferDrafts({
          userId: 'user-1',
          businessId: 'business-1',
          autoSaveDelay: 2000,
        })
      );

      await act(async () => {
        await result.current.createDraft('Test Draft');
      });

      await waitFor(() => {
        expect(result.current.currentDraft).toBeDefined();
      });

      // Update draft
      act(() => {
        result.current.updateDraft(
          { title: 'Updated Title' },
          1
        );
      });

      // Verify isSaving flag
      expect(result.current.isSaving).toBe(false); // Not yet, waiting for debounce

      // Fast-forward time
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      await waitFor(() => {
        expect(result.current.isSaving).toBe(false); // Should complete
      });
    });

    it('should debounce multiple updates', async () => {
      const { result } = renderHook(() =>
        useOfferDrafts({
          userId: 'user-1',
          businessId: 'business-1',
          autoSaveDelay: 2000,
        })
      );

      await act(async () => {
        await result.current.createDraft('Test Draft');
      });

      // Multiple rapid updates
      act(() => {
        result.current.updateDraft({ title: 'Title 1' }, 1);
      });

      act(() => {
        vi.advanceTimersByTime(500);
      });

      act(() => {
        result.current.updateDraft({ title: 'Title 2' }, 1);
      });

      act(() => {
        vi.advanceTimersByTime(500);
      });

      act(() => {
        result.current.updateDraft({ title: 'Title 3' }, 1);
      });

      // Fast-forward to trigger save
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      // Should only save once with final value
      await waitFor(() => {
        expect(result.current.isSaving).toBe(false);
      });
    });
  });

  describe('Delete Draft', () => {
    it('should delete a draft', async () => {
      const { result } = renderHook(() =>
        useOfferDrafts({
          userId: 'user-1',
          businessId: 'business-1',
        })
      );

      await waitFor(() => {
        expect(result.current.drafts).toHaveLength(2);
      });

      let success = false;

      await act(async () => {
        success = await result.current.deleteDraft('draft-1');
      });

      expect(success).toBe(true);
    });

    it('should clear current draft if deleted', async () => {
      const { result } = renderHook(() =>
        useOfferDrafts({
          userId: 'user-1',
          businessId: 'business-1',
        })
      );

      await act(async () => {
        await result.current.loadDraft('draft-1');
      });

      await waitFor(() => {
        expect(result.current.currentDraft?.id).toBe('draft-1');
      });

      await act(async () => {
        await result.current.deleteDraft('draft-1');
      });

      await waitFor(() => {
        expect(result.current.currentDraft).toBeNull();
      });
    });
  });

  describe('Convert to Offer', () => {
    it('should convert draft to offer', async () => {
      const { result } = renderHook(() =>
        useOfferDrafts({
          userId: 'user-1',
          businessId: 'business-1',
        })
      );

      await waitFor(() => {
        expect(result.current.drafts).toBeDefined();
      });

      let success = false;

      await act(async () => {
        success = await result.current.convertDraftToOffer('draft-1');
      });

      expect(success).toBe(true);
    });

    it('should delete draft after conversion', async () => {
      const { result } = renderHook(() =>
        useOfferDrafts({
          userId: 'user-1',
          businessId: 'business-1',
        })
      );

      await waitFor(() => {
        expect(result.current.drafts).toHaveLength(2);
      });

      await act(async () => {
        await result.current.convertDraftToOffer('draft-1');
      });

      // Draft should be removed from list
      await waitFor(() => {
        const draft = result.current.drafts.find(d => d.id === 'draft-1');
        expect(draft).toBeUndefined();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle fetch errors', async () => {
      vi.mocked(require('../../lib/supabaseClient').supabase.from).mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({
                data: null,
                error: new Error('Fetch failed'),
              })),
            })),
          })),
        })),
      });

      const { result } = renderHook(() =>
        useOfferDrafts({
          userId: 'user-1',
          businessId: 'business-1',
        })
      );

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });
    });

    it('should handle create errors', async () => {
      vi.mocked(require('../../lib/supabaseClient').supabase.from).mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({
                data: mockDrafts,
                error: null,
              })),
            })),
          })),
        })),
      }).mockReturnValueOnce({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({
              data: null,
              error: new Error('Create failed'),
            })),
          })),
        })),
      });

      const { result } = renderHook(() =>
        useOfferDrafts({
          userId: 'user-1',
          businessId: 'business-1',
        })
      );

      await waitFor(() => {
        expect(result.current.drafts).toBeDefined();
      });

      let createdDraft: OfferDraft | null = null;

      await act(async () => {
        createdDraft = await result.current.createDraft('Failed Draft');
      });

      expect(createdDraft).toBeNull();
      expect(result.current.error).toBeTruthy();
    });
  });

  describe('Cleanup', () => {
    it('should clear timer on unmount', async () => {
      const { result, unmount } = renderHook(() =>
        useOfferDrafts({
          userId: 'user-1',
          businessId: 'business-1',
        })
      );

      await act(async () => {
        await result.current.createDraft('Test Draft');
      });

      act(() => {
        result.current.updateDraft({ title: 'Test' }, 1);
      });

      unmount();

      // Should not throw or cause issues
      act(() => {
        vi.advanceTimersByTime(3000);
      });
    });
  });
});
