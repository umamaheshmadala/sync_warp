// src/hooks/__tests__/useFollowerAnalytics.test.ts
// Unit tests for useFollowerAnalytics hook

import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useFollowerAnalytics } from '../useFollowerAnalytics'
import { supabase } from '../../lib/supabase'

// Mock Supabase
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn()
  }
}))

describe('useFollowerAnalytics', () => {
  const mockBusinessId = 'test-business-id'
  const mockFollowers = [
    {
      id: 'follower-1',
      user_id: 'user-1',
      business_id: mockBusinessId,
      followed_at: '2025-01-15T10:00:00Z',
      is_active: true,
      profile: {
        full_name: 'John Doe',
        city: 'New York',
        age: 25
      }
    },
    {
      id: 'follower-2',
      user_id: 'user-2',
      business_id: mockBusinessId,
      followed_at: '2025-01-20T10:00:00Z',
      is_active: true,
      profile: {
        full_name: 'Jane Smith',
        city: 'Los Angeles',
        age: 30
      }
    },
    {
      id: 'follower-3',
      user_id: 'user-3',
      business_id: mockBusinessId,
      followed_at: '2025-01-18T10:00:00Z',
      is_active: false,
      profile: {
        full_name: 'Bob Johnson',
        city: 'New York',
        age: 35
      }
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches follower count correctly', async () => {
    const mockSelect = vi.fn().mockReturnThis()
    const mockEq = vi.fn().mockResolvedValue({
      data: mockFollowers.filter(f => f.is_active),
      error: null
    })

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
      eq: mockEq
    } as any)

    const { result } = renderHook(() => useFollowerAnalytics(mockBusinessId))

    await waitFor(() => {
      expect(result.current.followerCount).toBe(2)
      expect(result.current.loading).toBe(false)
    })
  })

  it('calculates growth metrics correctly', async () => {
    const mockSelect = vi.fn().mockReturnThis()
    const mockEq = vi.fn().mockResolvedValue({
      data: mockFollowers,
      error: null
    })

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
      eq: mockEq
    } as any)

    const { result } = renderHook(() => useFollowerAnalytics(mockBusinessId))

    await waitFor(() => {
      expect(result.current.growthMetrics).toBeDefined()
      expect(result.current.growthMetrics?.totalFollowers).toBe(3)
      expect(result.current.growthMetrics?.activeFollowers).toBe(2)
      expect(result.current.growthMetrics?.inactiveFollowers).toBe(1)
    })
  })

  it('computes demographics correctly', async () => {
    const mockSelect = vi.fn().mockReturnThis()
    const mockEq = vi.fn().mockResolvedValue({
      data: mockFollowers.filter(f => f.is_active),
      error: null
    })

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
      eq: mockEq
    } as any)

    const { result } = renderHook(() => useFollowerAnalytics(mockBusinessId))

    await waitFor(() => {
      expect(result.current.demographics).toBeDefined()
      expect(result.current.demographics?.cities).toEqual({
        'New York': 1,
        'Los Angeles': 1
      })
      expect(result.current.demographics?.ageGroups).toBeDefined()
    })
  })

  it('handles zero followers', async () => {
    const mockSelect = vi.fn().mockReturnThis()
    const mockEq = vi.fn().mockResolvedValue({
      data: [],
      error: null
    })

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
      eq: mockEq
    } as any)

    const { result } = renderHook(() => useFollowerAnalytics(mockBusinessId))

    await waitFor(() => {
      expect(result.current.followerCount).toBe(0)
      expect(result.current.growthMetrics?.totalFollowers).toBe(0)
      expect(result.current.demographics?.cities).toEqual({})
      expect(result.current.loading).toBe(false)
    })
  })

  it('handles missing profile data gracefully', async () => {
    const followersWithoutProfile = [
      {
        id: 'follower-1',
        user_id: 'user-1',
        business_id: mockBusinessId,
        followed_at: '2025-01-20T10:00:00Z',
        is_active: true,
        profile: null
      }
    ]

    const mockSelect = vi.fn().mockReturnThis()
    const mockEq = vi.fn().mockResolvedValue({
      data: followersWithoutProfile,
      error: null
    })

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
      eq: mockEq
    } as any)

    const { result } = renderHook(() => useFollowerAnalytics(mockBusinessId))

    await waitFor(() => {
      expect(result.current.followerCount).toBe(1)
      expect(result.current.demographics?.cities).toEqual({})
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBeNull()
    })
  })

  it('refreshes on new follower', async () => {
    const mockSelect = vi.fn().mockReturnThis()
    const mockEq = vi.fn()
      .mockResolvedValueOnce({
        data: mockFollowers.slice(0, 1),
        error: null
      })
      .mockResolvedValueOnce({
        data: mockFollowers.slice(0, 2),
        error: null
      })

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
      eq: mockEq
    } as any)

    const { result } = renderHook(() => useFollowerAnalytics(mockBusinessId))

    await waitFor(() => {
      expect(result.current.followerCount).toBe(1)
    })

    // Refresh analytics
    result.current.refresh()

    await waitFor(() => {
      expect(result.current.followerCount).toBe(2)
    })
  })

  it('calculates follower retention rate', async () => {
    const mockSelect = vi.fn().mockReturnThis()
    const mockEq = vi.fn().mockResolvedValue({
      data: mockFollowers,
      error: null
    })

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
      eq: mockEq
    } as any)

    const { result } = renderHook(() => useFollowerAnalytics(mockBusinessId))

    await waitFor(() => {
      expect(result.current.retentionRate).toBeDefined()
      // 2 active out of 3 total = 66.67%
      expect(result.current.retentionRate).toBeCloseTo(66.67, 1)
    })
  })

  it('provides follower growth trend', async () => {
    const mockSelect = vi.fn().mockReturnThis()
    const mockEq = vi.fn().mockResolvedValue({
      data: mockFollowers,
      error: null
    })

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
      eq: mockEq
    } as any)

    const { result } = renderHook(() => useFollowerAnalytics(mockBusinessId))

    await waitFor(() => {
      expect(result.current.growthTrend).toBeDefined()
      expect(Array.isArray(result.current.growthTrend)).toBe(true)
      expect(result.current.growthTrend!.length).toBeGreaterThan(0)
    })
  })

  it('handles error state', async () => {
    const mockError = new Error('Failed to fetch analytics')
    const mockSelect = vi.fn().mockReturnThis()
    const mockEq = vi.fn().mockResolvedValue({
      data: null,
      error: mockError
    })

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
      eq: mockEq
    } as any)

    const { result } = renderHook(() => useFollowerAnalytics(mockBusinessId))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBe('Failed to fetch analytics')
      expect(result.current.followerCount).toBe(0)
    })
  })

  it('calculates average follower engagement', async () => {
    const mockSelect = vi.fn().mockReturnThis()
    const mockEq = vi.fn().mockResolvedValue({
      data: mockFollowers.filter(f => f.is_active),
      error: null
    })

    // Mock engagement data
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: { average_engagement: 75.5 },
      error: null
    })

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
      eq: mockEq
    } as any)

    const { result } = renderHook(() => useFollowerAnalytics(mockBusinessId))

    await waitFor(() => {
      expect(result.current.averageEngagement).toBe(75.5)
    })
  })
})
