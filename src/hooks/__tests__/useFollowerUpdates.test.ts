// src/hooks/__tests__/useFollowerUpdates.test.ts
// Unit tests for useFollowerUpdates hook

import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useFollowerUpdates } from '../useFollowerUpdates'
import { supabase } from '../../lib/supabase'

// Mock Supabase
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn()
    }
  }
}))

describe('useFollowerUpdates', () => {
  const mockUserId = 'test-user-id'
  const mockUpdates = [
    {
      id: 'update-1',
      business_id: 'business-1',
      update_type: 'new_product',
      content_title: 'New Product',
      content_description: 'Check out our latest product!',
      created_at: '2025-01-20T10:00:00Z',
      business: {
        business_name: 'Test Business',
        business_image: 'https://example.com/image.jpg'
      }
    },
    {
      id: 'update-2',
      business_id: 'business-1',
      update_type: 'new_coupon',
      content_title: 'New Coupon',
      content_description: '50% off everything!',
      created_at: '2025-01-19T10:00:00Z',
      business: {
        business_name: 'Test Business',
        business_image: 'https://example.com/image.jpg'
      }
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock auth user
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { id: mockUserId } },
      error: null
    } as any)
  })

  it('fetches updates for followed businesses', async () => {
    const mockSelect = vi.fn().mockReturnThis()
    const mockEq = vi.fn().mockReturnThis()
    const mockOrder = vi.fn().mockResolvedValue({ data: mockUpdates, error: null })

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      order: mockOrder
    } as any)

    const { result } = renderHook(() => useFollowerUpdates())

    await waitFor(() => {
      expect(result.current.updates).toHaveLength(2)
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.updates[0].content_title).toBe('New Product')
    expect(result.current.updates[1].content_title).toBe('New Coupon')
  })

  it('filters updates by type', async () => {
    const filteredUpdates = [mockUpdates[0]] // Only new_product

    const mockSelect = vi.fn().mockReturnThis()
    const mockEq = vi.fn().mockReturnThis()
    const mockOrder = vi.fn().mockResolvedValue({ data: filteredUpdates, error: null })

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      order: mockOrder
    } as any)

    const { result } = renderHook(() => useFollowerUpdates({ filter: 'new_product' }))

    await waitFor(() => {
      expect(result.current.updates).toHaveLength(1)
      expect(result.current.updates[0].update_type).toBe('new_product')
    })
  })

  it('implements infinite scroll pagination', async () => {
    const page1Updates = mockUpdates.slice(0, 1)
    const page2Updates = mockUpdates.slice(1, 2)

    let callCount = 0
    const mockSelect = vi.fn().mockReturnThis()
    const mockEq = vi.fn().mockReturnThis()
    const mockOrder = vi.fn().mockReturnThis()
    const mockRange = vi.fn(() => {
      callCount++
      return Promise.resolve({
        data: callCount === 1 ? page1Updates : page2Updates,
        error: null
      })
    })

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      order: mockOrder,
      range: mockRange
    } as any)

    const { result } = renderHook(() => useFollowerUpdates({ pageSize: 1 }))

    await waitFor(() => {
      expect(result.current.updates).toHaveLength(1)
    })

    // Load more
    result.current.loadMore()

    await waitFor(() => {
      expect(result.current.updates).toHaveLength(2)
      expect(result.current.hasMore).toBe(false)
    })
  })

  it('handles real-time updates', async () => {
    const mockChannel = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn()
    }

    const mockSelect = vi.fn().mockReturnThis()
    const mockEq = vi.fn().mockReturnThis()
    const mockOrder = vi.fn().mockResolvedValue({ data: mockUpdates, error: null })

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      order: mockOrder
    } as any)

    // Mock real-time channel
    ;(supabase as any).channel = vi.fn().mockReturnValue(mockChannel)

    const { result } = renderHook(() => useFollowerUpdates({ realtime: true }))

    await waitFor(() => {
      expect(result.current.updates).toHaveLength(2)
    })

    // Verify real-time subscription was set up
    expect((supabase as any).channel).toHaveBeenCalledWith('follower_updates')
    expect(mockChannel.on).toHaveBeenCalled()
    expect(mockChannel.subscribe).toHaveBeenCalled()
  })

  it('handles empty state correctly', async () => {
    const mockSelect = vi.fn().mockReturnThis()
    const mockEq = vi.fn().mockReturnThis()
    const mockOrder = vi.fn().mockResolvedValue({ data: [], error: null })

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      order: mockOrder
    } as any)

    const { result } = renderHook(() => useFollowerUpdates())

    await waitFor(() => {
      expect(result.current.updates).toHaveLength(0)
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBeNull()
    })
  })

  it('handles error state correctly', async () => {
    const mockError = new Error('Failed to fetch updates')
    const mockSelect = vi.fn().mockReturnThis()
    const mockEq = vi.fn().mockReturnThis()
    const mockOrder = vi.fn().mockResolvedValue({ data: null, error: mockError })

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      order: mockOrder
    } as any)

    const { result } = renderHook(() => useFollowerUpdates())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBe('Failed to fetch updates')
      expect(result.current.updates).toHaveLength(0)
    })
  })

  it('refreshes updates on demand', async () => {
    const mockSelect = vi.fn().mockReturnThis()
    const mockEq = vi.fn().mockReturnThis()
    const mockOrder = vi.fn()
      .mockResolvedValueOnce({ data: [mockUpdates[0]], error: null })
      .mockResolvedValueOnce({ data: mockUpdates, error: null })

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      order: mockOrder
    } as any)

    const { result } = renderHook(() => useFollowerUpdates())

    await waitFor(() => {
      expect(result.current.updates).toHaveLength(1)
    })

    // Refresh
    result.current.refresh()

    await waitFor(() => {
      expect(result.current.updates).toHaveLength(2)
    })
  })

  it('groups updates by business when requested', async () => {
    const mockSelect = vi.fn().mockReturnThis()
    const mockEq = vi.fn().mockReturnThis()
    const mockOrder = vi.fn().mockResolvedValue({ data: mockUpdates, error: null })

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      order: mockOrder
    } as any)

    const { result } = renderHook(() => useFollowerUpdates({ groupByBusiness: true }))

    await waitFor(() => {
      expect(result.current.groupedUpdates).toBeDefined()
      expect(Object.keys(result.current.groupedUpdates!)).toHaveLength(1)
      expect(result.current.groupedUpdates!['business-1']).toHaveLength(2)
    })
  })
})
