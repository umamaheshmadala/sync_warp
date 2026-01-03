# 📋 STORY 9.4.1: Friends Service Layer - Core Service

**Epic:** [EPIC 9.4: Friends Service Layer & Business Logic](../epics/EPIC_9.4_Friends_Service_Layer.md)  
**Story Points:** 5  
**Priority:** High  
**Status:** ✅ Complete

---

## 📝 **Story Description**

As a **developer**, I want to **implement a complete TypeScript service layer for friend operations** so that **all friend-related business logic is centralized, type-safe, and reusable across the application**.

---

## 🎯 **Acceptance Criteria**

### **Core Functions:**
1. ✅ `getFriends(userId)` - Fetch user's friends with online status
2. ✅ `sendFriendRequest(receiverId, message?)` - Send friend request with optional message
3. ✅ `acceptFriendRequest(requestId)` - Accept friend request (uses RPC)
4. ✅ `rejectFriendRequest(requestId)` - Reject/decline friend request
5. ✅ `unfriend(userId)` - Remove friend (uses RPC)
6. ✅ `blockUser(userId, reason?)` - Block user with optional reason (uses RPC)
7. ✅ `unblockUser(userId)` - Unblock user
8. ✅ `searchFriends(query)` - Search friends by name/username
9. ✅ `getMutualFriends(userId)` - Get mutual friends with another user
10. ✅ `getOnlineFriendsCount(userId)` - Get count of currently online friends

### **Quality Requirements:**
11. ✅ All functions return typed responses with success/error states
12. ✅ All functions handle errors gracefully with user-friendly messages
13. ✅ Unit tests for all service functions (>80% coverage)
14. ✅ JSDoc documentation for all public functions
15. ✅ TypeScript strict mode compliance

---

## 🎨 **MCP Integration**

```bash
# Context7 MCP: Analyze existing service patterns
warp mcp run context7 "analyze service layer patterns in src/services"

# Context7 MCP: Generate service boilerplate
warp mcp run context7 "generate TypeScript service class for friends with CRUD operations"

# Supabase MCP: Test RPC functions
warp mcp run supabase "test RPC function accept_friend_request with mock data"
```

---

## 📦 **Implementation**

### **File Structure:**
```typescript
// src/services/friendsService.ts

import { supabase } from '../lib/supabase';
import type { Friend, FriendRequest, ServiceResponse } from '../types/friends';

/**
 * Friends Service - Centralized business logic for friend operations
 */
export const friendsService = {
  /**
   * Get user's friends with online status
   */
  async getFriends(userId: string): Promise<ServiceResponse<Friend[]>> {
    try {
      const { data, error } = await supabase
        .from('friendships')
        .select(`
          id,
          friend:profiles!friendships_friend_id_fkey (
            id,
            full_name,
            username,
            avatar_url,
            is_online,
            last_active
          )
        `)
        .eq('user_id', userId)
        .eq('status', 'accepted')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return {
        success: true,
        data: data.map(f => f.friend),
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to load friends',
      };
    }
  },

  /**
   * Send friend request
   */
  async sendFriendRequest(
    receiverId: string,
    message?: string
  ): Promise<ServiceResponse<FriendRequest>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('friend_requests')
        .insert({
          sender_id: user.id,
          receiver_id: receiverId,
          message,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data,
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to send friend request',
      };
    }
  },

  /**
   * Accept friend request (uses RPC for atomic operation)
   */
  async acceptFriendRequest(requestId: string): Promise<ServiceResponse<void>> {
    try {
      const { error } = await supabase.rpc('accept_friend_request', {
        request_id: requestId,
      });

      if (error) throw error;

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to accept friend request',
      };
    }
  },

  /**
   * Reject friend request
   */
  async rejectFriendRequest(requestId: string): Promise<ServiceResponse<void>> {
    try {
      const { error } = await supabase
        .from('friend_requests')
        .update({ status: 'rejected' })
        .eq('id', requestId);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to reject friend request',
      };
    }
  },

  /**
   * Unfriend user (uses RPC for atomic operation)
   */
  async unfriend(friendId: string): Promise<ServiceResponse<void>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.rpc('unfriend_user', {
        user_id: user.id,
        friend_id: friendId,
      });

      if (error) throw error;

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to unfriend user',
      };
    }
  },

  /**
   * Block user (uses RPC)
   */
  async blockUser(userId: string, reason?: string): Promise<ServiceResponse<void>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.rpc('block_user', {
        blocker_id: user.id,
        blocked_id: userId,
        block_reason: reason,
      });

      if (error) throw error;

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to block user',
      };
    }
  },

  /**
   * Unblock user
   */
  async unblockUser(userId: string): Promise<ServiceResponse<void>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('blocked_users')
        .delete()
        .eq('blocker_id', user.id)
        .eq('blocked_id', userId);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to unblock user',
      };
    }
  },

  /**
   * Search friends by name or username
   */
  async searchFriends(query: string): Promise<ServiceResponse<Friend[]>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('friendships')
        .select(`
          friend:profiles!friendships_friend_id_fkey (
            id,
            full_name,
            username,
            avatar_url,
            is_online,
            last_active
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'accepted')
        .or(`full_name.ilike.%${query}%,username.ilike.%${query}%`, { foreignTable: 'profiles' });

      if (error) throw error;

      return {
        success: true,
        data: data.map(f => f.friend),
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to search friends',
      };
    }
  },

  /**
   * Get mutual friends with another user
   */
  async getMutualFriends(userId: string): Promise<ServiceResponse<Friend[]>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.rpc('get_mutual_friends', {
        user_id_1: user.id,
        user_id_2: userId,
      });

      if (error) throw error;

      return {
        success: true,
        data,
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to get mutual friends',
      };
    }
  },

  /**
   * Get count of online friends
   */
  async getOnlineFriendsCount(userId: string): Promise<ServiceResponse<number>> {
    try {
      const { data, error } = await supabase
        .from('friendships')
        .select('friend:profiles!friendships_friend_id_fkey(is_online)', { count: 'exact' })
        .eq('user_id', userId)
        .eq('status', 'accepted')
        .eq('profiles.is_online', true);

      if (error) throw error;

      return {
        success: true,
        data: data?.length || 0,
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to get online friends count',
      };
    }
  },
};
```

### **Types:**
```typescript
// src/types/friends.ts

export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface Friend {
  id: string;
  full_name: string;
  username: string;
  avatar_url?: string;
  is_online: boolean;
  last_active?: string;
}

export interface FriendRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  message?: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
}
```

---

## 🧪 **Testing**

### **Unit Tests:**
```typescript
// src/services/__tests__/friendsService.test.ts

import { friendsService } from '../friendsService';
import { supabase } from '../../lib/supabase';

jest.mock('../../lib/supabase');

describe('friendsService', () => {
  describe('getFriends', () => {
    it('should return friends list on success', async () => {
      const mockFriends = [{ id: '1', full_name: 'Test User' }];
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockFriends, error: null }),
      });

      const result = await friendsService.getFriends('user-id');
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockFriends);
    });

    it('should handle errors gracefully', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: null, error: new Error('DB error') }),
      });

      const result = await friendsService.getFriends('user-id');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  // Add tests for all other functions...
});
```

---

## 🚀 **Deployment Checklist**

- [ ] All service functions implemented
- [ ] TypeScript types defined
- [ ] Unit tests written (>80% coverage)
- [ ] JSDoc documentation added
- [ ] Error handling implemented
- [ ] Integration tested with Supabase
- [ ] Code reviewed and approved

---

**Next Story:** [STORY 9.4.2: React Hooks for Friends](./STORY_9.4.2_React_Hooks.md)
