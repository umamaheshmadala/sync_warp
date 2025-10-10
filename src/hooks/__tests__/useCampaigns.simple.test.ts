/**
 * useCampaigns Hook Tests (Simplified)
 * 
 * Tests hooks with mocked Supabase client
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { mockCampaign, mockCampaigns } from '../../test/mocks/data';

// Create shared mock functions
let mockSingleFn: ReturnType<typeof vi.fn>;
let mockFromFn: ReturnType<typeof vi.fn>;

// Mock Supabase at the module level
vi.mock('../../lib/supabase', () => {
  mockSingleFn = vi.fn().mockResolvedValue({ data: null, error: null });
  mockFromFn = vi.fn();

  return {
    supabase: {
      from: mockFromFn,
    },
  };
});

// Import hooks AFTER mocking
import { useCampaign, useCampaignList } from '../useCampaigns';

describe('useCampaign', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSingleFn.mockResolvedValue({ data: mockCampaign, error: null });
    mockFromFn.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: mockSingleFn,
    });
  });

  it('fetches a campaign successfully', async () => {
    const { result } = renderHook(() => useCampaign(mockCampaign.id));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.campaign).toEqual(mockCampaign);
    expect(result.current.error).toBeNull();
  });

  it('handles undefined campaignId', () => {
    const { result } = renderHook(() => useCampaign(undefined));
    expect(result.current.isLoading).toBe(false);
    expect(result.current.campaign).toBeNull();
  });

  it('handles fetch error', async () => {
    mockSingleFn.mockResolvedValue({ 
      data: null, 
      error: { message: 'Campaign not found' } 
    });

    const { result } = renderHook(() => useCampaign(mockCampaign.id));

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });

    expect(result.current.campaign).toBeNull();
  });
});

describe('useCampaignList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock the complete query chain that returns a promise with data
    const mockThen = vi.fn().mockImplementation((callback) => {
      return Promise.resolve(callback({ 
        data: mockCampaigns, 
        error: null, 
        count: mockCampaigns.length 
      }));
    });

    const mockQueryChain = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      then: mockThen,
    };

    mockFromFn.mockReturnValue(mockQueryChain);
  });

  it('fetches campaigns with default options', async () => {
    const { result } = renderHook(() => useCampaignList());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.campaigns).toHaveLength(mockCampaigns.length);
    expect(result.current.totalCount).toBe(mockCampaigns.length);
    expect(result.current.error).toBeNull();
  });

  it('applies filters correctly', async () => {
    const { result } = renderHook(() => 
      useCampaignList({ status: ['active'] })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockFromFn).toHaveBeenCalledWith('campaigns');
  });

  it('handles pagination', async () => {
    const { result } = renderHook(() => 
      useCampaignList({}, { page: 1, pageSize: 10 })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.hasMore).toBe(false); // Since mockCampaigns length equals totalCount
  });
});
