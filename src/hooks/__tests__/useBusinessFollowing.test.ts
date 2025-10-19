// src/hooks/__tests__/useBusinessFollowing.test.ts
// Unit tests for useBusinessFollowing hook

import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useBusinessFollowing } from '../useBusinessFollowing';
import { supabase } from '../../lib/supabase';

// Mock Supabase
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn()
    },
    channel: vi.fn()
  }
}));

describe('useBusinessFollowing', () => {
  const mockBusinessId = 'business-123';
  const mockUserId = 'user-456';
  
  const mockFollowingData = [
    {
      id: 'follow-1',
      user_id: mockUserId,
      business_id: mockBusinessId,
      followed_at: '2025-01-15T10:00:00Z',
      notification_preferences: {
        products: true,
        offers: true,
        coupons: true,
        announcements: true
      },
      notification_channel: 'in_app',
      is_active: true
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock auth.getUser
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { id: mockUserId } as any },
      error: null
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Initialization', () => {
    it('should initialize with correct default state', () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockResolvedValue({ data: [], error: null });
      
      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        eq: mockEq
      } as any);

      const { result } = renderHook(() => useBusinessFollowing());

      expect(result.current.loading).toBe(true);
      expect(result.current.following).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('should load following list on mount', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockResolvedValue({ 
        data: mockFollowingData, 
        error: null 
      });
      
      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        eq: mockEq
      } as any);

      const { result } = renderHook(() => useBusinessFollowing());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.following).toEqual(mockFollowingData);
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockEq).toHaveBeenCalledWith('user_id', mockUserId);
    });
  });

  describe('followBusiness', () => {
    it('should successfully follow a business', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockResolvedValue({ data: [], error: null });
      const mockInsert = vi.fn().mockResolvedValue({ 
        data: mockFollowingData[0], 
        error: null 
      });
      
      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        insert: mockInsert
      } as any);

      const { result } = renderHook(() => useBusinessFollowing());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.followBusiness(mockBusinessId);
      });

      expect(mockInsert).toHaveBeenCalledWith({
        user_id: mockUserId,
        business_id: mockBusinessId,
        notification_preferences: {
          products: true,
          offers: true,
          coupons: true,
          announcements: true
        },
        notification_channel: 'in_app',
        is_active: true
      });
    });

    it('should handle follow errors gracefully', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockResolvedValue({ data: [], error: null });
      const mockInsert = vi.fn().mockResolvedValue({ 
        data: null, 
        error: { message: 'Insert failed' } 
      });
      
      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        insert: mockInsert
      } as any);

      const { result } = renderHook(() => useBusinessFollowing());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.followBusiness(mockBusinessId);
      });

      expect(result.current.error).toBeTruthy();
    });

    it('should update state optimistically before API response', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockResolvedValue({ data: [], error: null });
      let insertResolver: any;
      const mockInsert = vi.fn().mockReturnValue(
        new Promise(resolve => { insertResolver = resolve; })
      );
      
      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        insert: mockInsert
      } as any);

      const { result } = renderHook(() => useBusinessFollowing());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.followBusiness(mockBusinessId);
      });

      // Should show optimistic state immediately
      await waitFor(() => {
        expect(result.current.following.length).toBeGreaterThan(0);
      });

      // Resolve the API call
      act(() => {
        insertResolver({ data: mockFollowingData[0], error: null });
      });
    });
  });

  describe('unfollowBusiness', () => {
    it('should successfully unfollow a business', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn()
        .mockReturnValueOnce({ data: mockFollowingData, error: null })
        .mockReturnThis();
      const mockUpdate = vi.fn().mockResolvedValue({ 
        data: { ...mockFollowingData[0], is_active: false }, 
        error: null 
      });
      
      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        update: mockUpdate
      } as any);

      const { result } = renderHook(() => useBusinessFollowing());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.unfollowBusiness(mockBusinessId);
      });

      expect(mockUpdate).toHaveBeenCalledWith({ is_active: false });
    });

    it('should handle unfollow errors gracefully', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn()
        .mockReturnValueOnce({ data: mockFollowingData, error: null })
        .mockReturnThis();
      const mockUpdate = vi.fn().mockResolvedValue({ 
        data: null, 
        error: { message: 'Update failed' } 
      });
      
      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        update: mockUpdate
      } as any);

      const { result } = renderHook(() => useBusinessFollowing());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.unfollowBusiness(mockBusinessId);
      });

      expect(result.current.error).toBeTruthy();
    });
  });

  describe('isFollowing', () => {
    it('should return true when business is followed', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockResolvedValue({ 
        data: mockFollowingData, 
        error: null 
      });
      
      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        eq: mockEq
      } as any);

      const { result } = renderHook(() => useBusinessFollowing());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.isFollowing(mockBusinessId)).toBe(true);
    });

    it('should return false when business is not followed', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockResolvedValue({ data: [], error: null });
      
      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        eq: mockEq
      } as any);

      const { result } = renderHook(() => useBusinessFollowing());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.isFollowing(mockBusinessId)).toBe(false);
    });

    it('should return false when business is followed but not active', async () => {
      const inactiveData = [{
        ...mockFollowingData[0],
        is_active: false
      }];

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockResolvedValue({ 
        data: inactiveData, 
        error: null 
      });
      
      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        eq: mockEq
      } as any);

      const { result } = renderHook(() => useBusinessFollowing());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.isFollowing(mockBusinessId)).toBe(false);
    });
  });

  describe('updatePreferences', () => {
    it('should successfully update notification preferences', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn()
        .mockReturnValueOnce({ data: mockFollowingData, error: null })
        .mockReturnThis();
      const mockUpdate = vi.fn().mockResolvedValue({ 
        data: mockFollowingData[0], 
        error: null 
      });
      
      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        update: mockUpdate
      } as any);

      const { result } = renderHook(() => useBusinessFollowing());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const newPreferences = {
        products: false,
        offers: true,
        coupons: true,
        announcements: false
      };

      await act(async () => {
        await result.current.updatePreferences(mockBusinessId, newPreferences);
      });

      expect(mockUpdate).toHaveBeenCalledWith({
        notification_preferences: newPreferences
      });
    });

    it('should handle preference update errors', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn()
        .mockReturnValueOnce({ data: mockFollowingData, error: null })
        .mockReturnThis();
      const mockUpdate = vi.fn().mockResolvedValue({ 
        data: null, 
        error: { message: 'Update failed' } 
      });
      
      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        update: mockUpdate
      } as any);

      const { result } = renderHook(() => useBusinessFollowing());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.updatePreferences(mockBusinessId, {
          products: false,
          offers: true,
          coupons: true,
          announcements: false
        });
      });

      expect(result.current.error).toBeTruthy();
    });
  });

  describe('Real-time subscriptions', () => {
    it('should subscribe to real-time changes on mount', async () => {
      const mockOn = vi.fn().mockReturnThis();
      const mockSubscribe = vi.fn();
      const mockChannel = {
        on: mockOn,
        subscribe: mockSubscribe
      };
      
      vi.mocked(supabase.channel).mockReturnValue(mockChannel as any);

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockResolvedValue({ data: [], error: null });
      
      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        eq: mockEq
      } as any);

      renderHook(() => useBusinessFollowing());

      await waitFor(() => {
        expect(supabase.channel).toHaveBeenCalled();
        expect(mockOn).toHaveBeenCalled();
        expect(mockSubscribe).toHaveBeenCalled();
      });
    });

    it('should unsubscribe from real-time changes on unmount', async () => {
      const mockUnsubscribe = vi.fn();
      const mockRemoveChannel = vi.fn();
      const mockOn = vi.fn().mockReturnThis();
      const mockSubscribe = vi.fn();
      const mockChannel = {
        on: mockOn,
        subscribe: mockSubscribe,
        unsubscribe: mockUnsubscribe
      };
      
      vi.mocked(supabase.channel).mockReturnValue(mockChannel as any);
      vi.mocked(supabase as any).removeChannel = mockRemoveChannel;

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockResolvedValue({ data: [], error: null });
      
      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        eq: mockEq
      } as any);

      const { unmount } = renderHook(() => useBusinessFollowing());

      await waitFor(() => {
        expect(mockSubscribe).toHaveBeenCalled();
      });

      unmount();

      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });

  describe('Edge cases', () => {
    it('should handle user not authenticated', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' } as any
      });

      const { result } = renderHook(() => useBusinessFollowing());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.following).toEqual([]);
    });

    it('should handle empty following list', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockResolvedValue({ data: [], error: null });
      
      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        eq: mockEq
      } as any);

      const { result } = renderHook(() => useBusinessFollowing());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.following).toEqual([]);
      expect(result.current.isFollowing(mockBusinessId)).toBe(false);
    });

    it('should handle network errors', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockResolvedValue({ 
        data: null, 
        error: { message: 'Network error' } 
      });
      
      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        eq: mockEq
      } as any);

      const { result } = renderHook(() => useBusinessFollowing());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBeTruthy();
    });
  });
});
