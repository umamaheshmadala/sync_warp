// src/hooks/__tests__/useFollowerNotifications.test.ts
// Unit tests for useFollowerNotifications hook

import { renderHook, waitFor, act } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useFollowerNotifications } from '../useFollowerNotifications'
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

describe('useFollowerNotifications', () => {
  const mockUserId = 'test-user-id'
  const mockNotifications = [
    {
      id: 'notif-1',
      user_id: mockUserId,
      business_id: 'business-1',
      update_type: 'new_product',
      content_title: 'New Product Available',
      content_description: 'Check out our latest product!',
      is_read: false,
      created_at: '2025-01-20T10:00:00Z',
      business: {
        business_name: 'Test Business',
        business_image: 'https://example.com/image.jpg'
      }
    },
    {
      id: 'notif-2',
      user_id: mockUserId,
      business_id: 'business-2',
      update_type: 'new_coupon',
      content_title: 'New Coupon Available',
      content_description: '50% off everything!',
      is_read: false,
      created_at: '2025-01-19T10:00:00Z',
      business: {
        business_name: 'Another Business',
        business_image: 'https://example.com/image2.jpg'
      }
    },
    {
      id: 'notif-3',
      user_id: mockUserId,
      business_id: 'business-1',
      update_type: 'new_offer',
      content_title: 'Special Offer',
      content_description: 'Limited time offer!',
      is_read: true,
      created_at: '2025-01-18T10:00:00Z',
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

  it('fetches unread notifications', async () => {
    const mockSelect = vi.fn().mockReturnThis()
    const mockEq = vi.fn().mockReturnThis()
    const mockOrder = vi.fn().mockResolvedValue({
      data: mockNotifications.filter(n => !n.is_read),
      error: null
    })

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      order: mockOrder
    } as any)

    const { result } = renderHook(() => useFollowerNotifications())

    await waitFor(() => {
      expect(result.current.notifications).toHaveLength(2)
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.notifications[0].is_read).toBe(false)
    expect(result.current.notifications[1].is_read).toBe(false)
  })

  it('marks notification as read', async () => {
    const mockSelect = vi.fn().mockReturnThis()
    const mockEq = vi.fn().mockReturnThis()
    const mockOrder = vi.fn().mockResolvedValue({
      data: mockNotifications.filter(n => !n.is_read),
      error: null
    })
    const mockUpdate = vi.fn().mockReturnThis()
    const mockMatch = vi.fn().mockResolvedValue({ error: null })

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      order: mockOrder,
      update: mockUpdate,
      match: mockMatch
    } as any)

    const { result } = renderHook(() => useFollowerNotifications())

    await waitFor(() => {
      expect(result.current.notifications).toHaveLength(2)
    })

    // Mark first notification as read
    await act(async () => {
      await result.current.markAsRead('notif-1')
    })

    expect(mockUpdate).toHaveBeenCalledWith({ is_read: true, read_at: expect.any(String) })
    expect(mockMatch).toHaveBeenCalledWith({ id: 'notif-1' })
  })

  it('marks all notifications as read', async () => {
    const mockSelect = vi.fn().mockReturnThis()
    const mockEq = vi.fn().mockReturnThis()
    const mockOrder = vi.fn().mockResolvedValue({
      data: mockNotifications.filter(n => !n.is_read),
      error: null
    })
    const mockUpdate = vi.fn().mockReturnThis()
    const mockMatch = vi.fn().mockResolvedValue({ error: null })

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      order: mockOrder,
      update: mockUpdate,
      match: mockMatch
    } as any)

    const { result } = renderHook(() => useFollowerNotifications())

    await waitFor(() => {
      expect(result.current.notifications).toHaveLength(2)
    })

    // Mark all as read
    await act(async () => {
      await result.current.markAllAsRead()
    })

    expect(mockUpdate).toHaveBeenCalledWith({ is_read: true, read_at: expect.any(String) })
    expect(mockMatch).toHaveBeenCalledWith({
      user_id: mockUserId,
      is_read: false
    })
  })

  it('calculates unread count correctly', async () => {
    const mockSelect = vi.fn().mockReturnThis()
    const mockEq = vi.fn().mockReturnThis()
    const mockOrder = vi.fn().mockResolvedValue({
      data: mockNotifications.filter(n => !n.is_read),
      error: null
    })

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      order: mockOrder
    } as any)

    const { result } = renderHook(() => useFollowerNotifications())

    await waitFor(() => {
      expect(result.current.unreadCount).toBe(2)
    })
  })

  it('handles real-time new notifications', async () => {
    const mockChannel = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn()
    }

    const mockSelect = vi.fn().mockReturnThis()
    const mockEq = vi.fn().mockReturnThis()
    const mockOrder = vi.fn().mockResolvedValue({
      data: [mockNotifications[0]],
      error: null
    })

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      order: mockOrder
    } as any)

    // Mock real-time channel
    ;(supabase as any).channel = vi.fn().mockReturnValue(mockChannel)

    const { result } = renderHook(() => useFollowerNotifications({ realtime: true }))

    await waitFor(() => {
      expect(result.current.notifications).toHaveLength(1)
    })

    // Verify real-time subscription was set up
    expect((supabase as any).channel).toHaveBeenCalledWith('follower_notifications')
    expect(mockChannel.on).toHaveBeenCalled()
    expect(mockChannel.subscribe).toHaveBeenCalled()
  })

  it('handles empty notification state', async () => {
    const mockSelect = vi.fn().mockReturnThis()
    const mockEq = vi.fn().mockReturnThis()
    const mockOrder = vi.fn().mockResolvedValue({
      data: [],
      error: null
    })

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      order: mockOrder
    } as any)

    const { result } = renderHook(() => useFollowerNotifications())

    await waitFor(() => {
      expect(result.current.notifications).toHaveLength(0)
      expect(result.current.unreadCount).toBe(0)
      expect(result.current.loading).toBe(false)
    })
  })

  it('handles mark as read error gracefully', async () => {
    const mockSelect = vi.fn().mockReturnThis()
    const mockEq = vi.fn().mockReturnThis()
    const mockOrder = vi.fn().mockResolvedValue({
      data: mockNotifications.filter(n => !n.is_read),
      error: null
    })
    const mockUpdate = vi.fn().mockReturnThis()
    const mockMatch = vi.fn().mockResolvedValue({
      error: new Error('Failed to mark as read')
    })

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      order: mockOrder,
      update: mockUpdate,
      match: mockMatch
    } as any)

    const { result } = renderHook(() => useFollowerNotifications())

    await waitFor(() => {
      expect(result.current.notifications).toHaveLength(2)
    })

    // Attempt to mark as read (should handle error)
    await act(async () => {
      await result.current.markAsRead('notif-1')
    })

    // Error should be captured but not crash
    expect(result.current.error).toBe('Failed to mark as read')
  })

  it('filters notifications by type', async () => {
    const mockSelect = vi.fn().mockReturnThis()
    const mockEq = vi.fn().mockReturnThis()
    const mockOrder = vi.fn().mockResolvedValue({
      data: mockNotifications.filter(n => n.update_type === 'new_product'),
      error: null
    })

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      order: mockOrder
    } as any)

    const { result } = renderHook(() => useFollowerNotifications({ filter: 'new_product' }))

    await waitFor(() => {
      expect(result.current.notifications).toHaveLength(1)
      expect(result.current.notifications[0].update_type).toBe('new_product')
    })
  })

  it('provides pagination support', async () => {
    const page1 = [mockNotifications[0]]
    const page2 = [mockNotifications[1]]

    let callCount = 0
    const mockSelect = vi.fn().mockReturnThis()
    const mockEq = vi.fn().mockReturnThis()
    const mockOrder = vi.fn().mockReturnThis()
    const mockLimit = vi.fn(() => {
      callCount++
      return Promise.resolve({
        data: callCount === 1 ? page1 : page2,
        error: null
      })
    })

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      order: mockOrder,
      limit: mockLimit
    } as any)

    const { result } = renderHook(() => useFollowerNotifications({ pageSize: 1 }))

    await waitFor(() => {
      expect(result.current.notifications).toHaveLength(1)
    })

    // Load next page
    await act(async () => {
      await result.current.loadMore()
    })

    await waitFor(() => {
      expect(result.current.notifications).toHaveLength(2)
    })
  })

  it('clears specific notification', async () => {
    const mockSelect = vi.fn().mockReturnThis()
    const mockEq = vi.fn().mockReturnThis()
    const mockOrder = vi.fn().mockResolvedValue({
      data: mockNotifications.filter(n => !n.is_read),
      error: null
    })
    const mockDelete = vi.fn().mockReturnThis()
    const mockMatch = vi.fn().mockResolvedValue({ error: null })

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      order: mockOrder,
      delete: mockDelete,
      match: mockMatch
    } as any)

    const { result } = renderHook(() => useFollowerNotifications())

    await waitFor(() => {
      expect(result.current.notifications).toHaveLength(2)
    })

    // Clear notification
    await act(async () => {
      await result.current.clearNotification('notif-1')
    })

    expect(mockDelete).toHaveBeenCalled()
    expect(mockMatch).toHaveBeenCalledWith({ id: 'notif-1' })
  })
})
