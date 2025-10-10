/**
 * useCampaigns Hook Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { 
  useCampaign, 
  useCampaignList,
  useCreateCampaign,
  useUpdateCampaign 
} from '../useCampaigns';
import { mockCampaign, mockCampaigns } from '../../test/mocks/data';

// Valid test IDs
const VALID_CAMPAIGN_ID = mockCampaigns[0]?.id || '123e4567-e89b-12d3-a456-426614174000';
const VALID_BUSINESS_ID = mockCampaigns[0]?.business_id || '123e4567-e89b-12d3-a456-426614174001';

// Create mock Supabase query builder
const createMockQueryBuilder = (mockData: any, mockError: any = null) => ({
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  in: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  range: vi.fn().mockReturnThis(),
  gte: vi.fn().mockReturnThis(),
  lte: vi.fn().mockReturnThis(),
  or: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data: mockData, error: mockError, count: null }),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockResolvedValue({ data: mockData, error: mockError }),
  then: vi.fn((callback) => Promise.resolve(callback({ data: mockData, error: mockError, count: mockCampaigns.length }))),
});

// Mock Supabase client
const mockFrom = vi.fn((table: string) => {
  if (table === 'campaigns') {
    return createMockQueryBuilder(mockCampaigns);
  }
  return createMockQueryBuilder([]);
});

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: mockFrom,
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  }
}));

describe('useCampaign', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockImplementation((table: string) => {
      if (table === 'campaigns') {
        return createMockQueryBuilder(mockCampaign);
      }
      return createMockQueryBuilder([]);
    });
  });

  it('fetches a single campaign successfully', async () => {
    const { result } = renderHook(() => useCampaign(VALID_CAMPAIGN_ID));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.campaign).toBeTruthy();
    expect(result.current.error).toBeNull();
  });

  it('does not fetch when campaignId is undefined', () => {
    const { result } = renderHook(() => useCampaign(undefined));
    expect(result.current.isLoading).toBe(false);
    expect(result.current.campaign).toBeNull();
  });

  it('handles campaign fetch error', async () => {
    mockFrom.mockImplementation(() => 
      createMockQueryBuilder(null, { message: 'Not found' })
    );

    const { result } = renderHook(() => useCampaign(VALID_CAMPAIGN_ID));

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });
  });

  it('refreshes campaign data', async () => {
    const { result } = renderHook(() => useCampaign(VALID_CAMPAIGN_ID));

    await waitFor(() => {
      expect(result.current.campaign).toBeTruthy();
    });

    act(() => {
      result.current.refresh();
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });
});

describe('useCampaignList', () => {
  it('fetches campaign list with default options', async () => {
    const { result } = renderHook(() => useCampaignList());

    // Initially loading
    expect(result.current.isLoading).toBe(true);

    // Wait for data
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Check data
    expect(result.current.campaigns).toHaveLength(3);
    expect(result.current.totalCount).toBeGreaterThan(0);
  });

  it('filters campaigns by status', async () => {
    const { result } = renderHook(() => 
      useCampaignList({ status: ['active'] })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // All campaigns should be active
    result.current.campaigns.forEach(campaign => {
      expect(campaign.status).toBe('active');
    });
  });

  it('filters campaigns by business ID', async () => {
    const { result } = renderHook(() => 
      useCampaignList({ businessId: 'business-456' })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // All campaigns should belong to the business
    result.current.campaigns.forEach(campaign => {
      expect(campaign.business_id).toBe('business-456');
    });
  });

  it('handles pagination correctly', async () => {
    const { result } = renderHook(() => 
      useCampaignList({}, { page: 1, pageSize: 2 })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.campaigns.length).toBeLessThanOrEqual(2);
    expect(result.current.hasMore).toBeDefined();
  });

  it('handles empty campaign list', async () => {
    // Mock empty response
    server.use(
      http.get('*/campaigns', () => {
        return HttpResponse.json([]);
      })
    );

    const { result } = renderHook(() => useCampaignList());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.campaigns).toHaveLength(0);
    expect(result.current.hasMore).toBe(false);
  });
});

describe('useCreateCampaign', () => {
  it('creates a campaign successfully', async () => {
    const { result } = renderHook(() => useCreateCampaign());

    expect(result.current.isCreating).toBe(false);

    // Create campaign
    const newCampaign = {
      name: 'New Campaign',
      description: 'Test',
      business_id: 'business-123',
      ad_format: 'banner' as const,
      priority: 'medium' as const,
      budget: 5000,
      target_impressions: 10000,
      start_date: '2024-01-01T00:00:00Z',
      end_date: '2024-12-31T23:59:59Z',
      targeting_rules: {},
      status: 'draft' as const
    };

    let createdCampaign;
    await waitFor(async () => {
      createdCampaign = await result.current.createCampaign(newCampaign);
    });

    expect(createdCampaign).toBeTruthy();
    expect(createdCampaign.name).toBe('New Campaign');
  });

  it('handles create campaign error', async () => {
    // Mock error response
    server.use(
      http.post('*/campaigns', () => {
        return HttpResponse.json({ error: 'Validation failed' }, { status: 400 });
      })
    );

    const { result } = renderHook(() => useCreateCampaign());

    const invalidCampaign = {
      name: '',
      business_id: ''
    } as any;

    await expect(
      result.current.createCampaign(invalidCampaign)
    ).rejects.toThrow();
  });
});

describe('useUpdateCampaign', () => {
  it('updates a campaign successfully', async () => {
    const { result } = renderHook(() => useUpdateCampaign());

    const updates = {
      name: 'Updated Campaign',
      budget: 15000
    };

    let updatedCampaign;
    await waitFor(async () => {
      updatedCampaign = await result.current.updateCampaign('campaign-123', updates);
    });

    expect(updatedCampaign).toBeTruthy();
    expect(updatedCampaign.name).toBe('Updated Campaign');
  });

  it('handles update campaign error', async () => {
    // Mock error response
    server.use(
      http.patch('*/campaigns/:id', () => {
        return HttpResponse.json({ error: 'Not found' }, { status: 404 });
      })
    );

    const { result } = renderHook(() => useUpdateCampaign());

    await expect(
      result.current.updateCampaign('invalid-id', { name: 'Test' })
    ).rejects.toThrow();
  });

  it('sets isUpdating state correctly', async () => {
    const { result } = renderHook(() => useUpdateCampaign());

    expect(result.current.isUpdating).toBe(false);

    // Start update (don't await)
    const updatePromise = result.current.updateCampaign('campaign-123', { name: 'Test' });

    // Should be updating
    expect(result.current.isUpdating).toBe(true);

    // Wait for completion
    await updatePromise;

    // Wait for state to update
    await waitFor(() => {
      expect(result.current.isUpdating).toBe(false);
    });
  });
});

describe('Integration Tests', () => {
  it('creates a campaign and then fetches it', async () => {
    const { result: createResult } = renderHook(() => useCreateCampaign());

    // Create campaign
    const newCampaign = {
      name: 'Integration Test Campaign',
      business_id: 'business-123',
      ad_format: 'video' as const,
      priority: 'high' as const,
      budget: 10000,
      target_impressions: 50000,
      start_date: '2024-01-01T00:00:00Z',
      end_date: '2024-12-31T23:59:59Z',
      targeting_rules: {},
      status: 'draft' as const
    };

    const created = await createResult.current.createCampaign(newCampaign);

    // Fetch the created campaign
    const { result: fetchResult } = renderHook(() => useCampaign(created.id));

    await waitFor(() => {
      expect(fetchResult.current.campaign).toBeTruthy();
    });

    expect(fetchResult.current.campaign?.name).toBe('Integration Test Campaign');
  });

  it('updates a campaign and refreshes the list', async () => {
    const { result: listResult } = renderHook(() => useCampaignList());
    const { result: updateResult } = renderHook(() => useUpdateCampaign());

    // Wait for initial list
    await waitFor(() => {
      expect(listResult.current.campaigns.length).toBeGreaterThan(0);
    });

    const firstCampaign = listResult.current.campaigns[0];

    // Update the campaign
    await updateResult.current.updateCampaign(firstCampaign.id, {
      name: 'Updated Name'
    });

    // Refresh the list
    await listResult.current.refresh();

    // Wait for refresh
    await waitFor(() => {
      expect(listResult.current.isLoading).toBe(false);
    });
  });
});
