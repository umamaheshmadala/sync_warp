# 🚀 COMPLETE REBUILD: Facebook-level Friends + Messaging System

**Date**: 2025-01-15  
**Status**: ✅ **READY FOR IMPLEMENTATION**  
**Scope**: Complete overhaul of Friends + Messaging modules  
**Inspiration**: Facebook, Instagram, WhatsApp architecture

---

## 🎯 **EXECUTIVE SUMMARY**

This is a **complete rebuild** of the SynC Friends and Messaging system to match **Facebook-level quality**. The current implementation has fundamental schema mismatches and missing core features. This rebuild provides:

✅ **Bidirectional friend graph** (Facebook-style)  
✅ **Friend requests with auto-expiry** (30 days)  
✅ **Follow system** (Instagram/Twitter-style)  
✅ **Block functionality** (privacy + safety)  
✅ **1:1 and Group messaging** (WhatsApp-style)  
✅ **Online status + last active**  
✅ **Typing indicators** (real-time)  
✅ **Rich message types** (text, images, videos, links, deals)  
✅ **Notifications system**  
✅ **Full RLS security**  
✅ **Real-time subscriptions**

---

## 📋 **IMPLEMENTATION PHASES**

### **PHASE 1: Database Migration** ⏱️ 5 mins
**File**: `supabase/migrations/20250115_complete_rebuild_friends_messaging.sql`

#### What it does:
1. **Drops broken tables** (friendships, conversations, messages, etc.)
2. **Extends profiles table** with social fields (online status, friend count)
3. **Creates 9 production-ready tables**:
   - `friendships` - Bidirectional friend relationships
   - `friend_requests` - Pending/accepted/rejected requests
   - `following` - One-way follow relationships
   - `blocked_users` - User blocking
   - `conversations` - 1:1 and group chats (uses `participants UUID[]` array)
   - `messages` - Rich messages with media support
   - `typing_indicators` - Real-time typing status
   - `notifications` - System notifications
4. **Creates 3 helper functions**:
   - `accept_friend_request()` - Accepts request + creates bidirectional friendship
   - `unfriend()` - Removes friendship + auto-unfollows
   - `create_or_get_direct_conversation()` - Creates or finds 1:1 conversation
5. **Sets up RLS policies** for all tables
6. **Enables real-time subscriptions** for live updates

#### Run:
```bash
# Connect to your Supabase project
supabase link --project-ref ysxmgbblljoyebvugrfo

# Apply migration
supabase db push
```

**Validation**:
```sql
-- Check all tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('friendships', 'friend_requests', 'following', 'blocked_users', 'conversations', 'messages', 'typing_indicators', 'notifications')
ORDER BY table_name;

-- Should return 8 rows
```

---

### **PHASE 2: Update Code to Use `participants` Array** ⏱️ 30 mins

The database uses `participants UUID[]` (Epic 8.1 schema) but the code expects `participant1_id`/`participant2_id`. We need to update the code to match the database.

#### Files to update:

1. **`src/services/conversationService.ts`** - Main service layer
2. **`src/hooks/useConversations.ts`** - React hook (also fix infinite loop)
3. **`src/hooks/useMessages.ts`** - Messages hook
4. **`src/components/messaging/FriendPickerModal.tsx`** - Friend picker
5. **`src/components/messaging/ConversationCard.tsx`** - Conversation display
6. **`src/components/messaging/ConversationListPage.tsx`** - Conversations list
7. **`src/components/messaging/MessageThreadPage.tsx`** - Message thread
8. **`src/types/index.ts`** - TypeScript types

#### Key changes:

**BEFORE** (Broken - expects `participant1_id`/`participant2_id`):
```typescript
const { data } = await supabase
  .from('conversations')
  .select('*')
  .or(`participant1_id.eq.${userId},participant2_id.eq.${userId}`)
```

**AFTER** (Correct - uses `participants` array):
```typescript
const { data } = await supabase
  .from('conversations')
  .select('*')
  .contains('participants', [userId]) // GIN index optimized
```

**Also fix infinite loop in `useConversations.ts`**:
- Remove `conversations` from `useEffect` dependency array
- Increase polling interval from 10s to 30s for web

---

### **PHASE 3: Friends Service Overhaul** ⏱️ 45 mins

Create a **world-class friends service** matching Facebook's feature set.

#### Create `src/services/friendsService.ts`:

```typescript
import { supabase } from '@/integrations/supabase/client'

export interface Friend {
  id: string
  user_id: string
  friend_id: string
  status: 'active' | 'unfriended'
  created_at: string
  unfriended_at?: string
  profile?: {
    full_name: string
    avatar_url?: string
    is_online: boolean
    last_active: string
  }
}

export interface FriendRequest {
  id: string
  sender_id: string
  receiver_id: string
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled'
  message?: string
  created_at: string
  expires_at: string
  sender_profile?: {
    full_name: string
    avatar_url?: string
  }
}

// 1. Get all friends with online status
export async function getFriends(userId: string): Promise<Friend[]> {
  const { data, error } = await supabase
    .from('friendships')
    .select(`
      *,
      profile:friend_id (
        full_name,
        avatar_url,
        is_online,
        last_active
      )
    `)
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

// 2. Send friend request
export async function sendFriendRequest(
  receiverId: string, 
  message?: string
): Promise<{ success: boolean; error?: string }> {
  // Check if already friends
  const { data: existing } = await supabase
    .from('friendships')
    .select('id')
    .or(`user_id.eq.${receiverId},friend_id.eq.${receiverId}`)
    .eq('status', 'active')
    .single()

  if (existing) {
    return { success: false, error: 'Already friends' }
  }

  // Check if request already exists
  const { data: existingRequest } = await supabase
    .from('friend_requests')
    .select('id')
    .eq('receiver_id', receiverId)
    .eq('status', 'pending')
    .single()

  if (existingRequest) {
    return { success: false, error: 'Request already sent' }
  }

  // Create request
  const { error } = await supabase
    .from('friend_requests')
    .insert({ 
      receiver_id: receiverId, 
      message,
      sender_id: (await supabase.auth.getUser()).data.user?.id 
    })

  if (error) return { success: false, error: error.message }
  return { success: true }
}

// 3. Accept friend request (uses database function)
export async function acceptFriendRequest(requestId: string) {
  const { data, error } = await supabase.rpc('accept_friend_request', { 
    request_id: requestId 
  })
  
  if (error) throw error
  return data
}

// 4. Reject friend request
export async function rejectFriendRequest(requestId: string) {
  const { error } = await supabase
    .from('friend_requests')
    .update({ status: 'rejected', updated_at: new Date().toISOString() })
    .eq('id', requestId)
  
  if (error) throw error
}

// 5. Unfriend (uses database function)
export async function unfriend(friendUserId: string) {
  const { data, error } = await supabase.rpc('unfriend', { 
    friend_user_id: friendUserId 
  })
  
  if (error) throw error
  return data
}

// 6. Block user
export async function blockUser(userId: string, reason?: string) {
  // First unfriend if they are friends
  await unfriend(userId)
  
  // Then block
  const { error } = await supabase
    .from('blocked_users')
    .insert({ blocked_id: userId, reason })
  
  if (error) throw error
}

// 7. Unblock user
export async function unblockUser(userId: string) {
  const { error } = await supabase
    .from('blocked_users')
    .delete()
    .eq('blocked_id', userId)
  
  if (error) throw error
}

// 8. Get pending friend requests (received)
export async function getPendingRequests(): Promise<FriendRequest[]> {
  const user = await supabase.auth.getUser()
  
  const { data, error } = await supabase
    .from('friend_requests')
    .select(`
      *,
      sender_profile:sender_id (
        full_name,
        avatar_url
      )
    `)
    .eq('receiver_id', user.data.user?.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

// 9. Search friends by name
export async function searchFriends(query: string): Promise<Friend[]> {
  const user = await supabase.auth.getUser()
  
  const { data, error } = await supabase
    .from('friendships')
    .select(`
      *,
      profile:friend_id (
        full_name,
        avatar_url,
        is_online,
        last_active
      )
    `)
    .eq('user_id', user.data.user?.id)
    .eq('status', 'active')
    .ilike('profile.full_name', `%${query}%`)

  if (error) throw error
  return data || []
}

// 10. Get online friends count
export async function getOnlineFriendsCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('friendships')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'active')
    .eq('profile.is_online', true)

  if (error) throw error
  return count || 0
}
```

---

### **PHASE 4: React Hooks** ⏱️ 30 mins

#### Create `src/hooks/useFriends.ts`:

```typescript
import { useState, useEffect } from 'react'
import * as friendsService from '@/services/friendsService'
import { supabase } from '@/integrations/supabase/client'

export function useFriends() {
  const [friends, setFriends] = useState<friendsService.Friend[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    loadFriends()
    
    // Subscribe to real-time updates
    const subscription = supabase
      .channel('friends-changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'friendships' 
      }, () => {
        loadFriends() // Reload on any change
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  async function loadFriends() {
    try {
      const user = await supabase.auth.getUser()
      if (!user.data.user) return
      
      const data = await friendsService.getFriends(user.data.user.id)
      setFriends(data)
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }

  return {
    friends,
    loading,
    error,
    refetch: loadFriends,
    sendRequest: friendsService.sendFriendRequest,
    acceptRequest: friendsService.acceptFriendRequest,
    rejectRequest: friendsService.rejectFriendRequest,
    unfriend: friendsService.unfriend,
    blockUser: friendsService.blockUser,
    unblockUser: friendsService.unblockUser,
    searchFriends: friendsService.searchFriends,
  }
}
```

#### Create `src/hooks/useFriendRequests.ts`:

```typescript
import { useState, useEffect } from 'react'
import * as friendsService from '@/services/friendsService'
import { supabase } from '@/integrations/supabase/client'

export function useFriendRequests() {
  const [requests, setRequests] = useState<friendsService.FriendRequest[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadRequests()
    
    // Subscribe to real-time updates
    const subscription = supabase
      .channel('friend-requests-changes')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'friend_requests' 
      }, () => {
        loadRequests()
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  async function loadRequests() {
    try {
      const data = await friendsService.getPendingRequests()
      setRequests(data)
    } catch (err) {
      console.error('Failed to load friend requests:', err)
    } finally {
      setLoading(false)
    }
  }

  return {
    requests,
    loading,
    refetch: loadRequests,
  }
}
```

---

### **PHASE 5: UI Components** ⏱️ 60 mins

#### 1. **Friends List Component**

Create `src/components/friends/FriendsList.tsx`:

```typescript
import { useFriends } from '@/hooks/useFriends'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'
import { MessageCircle, UserMinus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export function FriendsList() {
  const { friends, loading, unfriend } = useFriends()
  const navigate = useNavigate()

  const handleMessage = async (friendId: string) => {
    // Uses the database function
    const { data } = await supabase.rpc('create_or_get_direct_conversation', { 
      other_user_id: friendId 
    })
    navigate(`/messages/${data}`)
  }

  if (loading) return <div>Loading friends...</div>

  return (
    <div className="space-y-2">
      {friends.map(friend => (
        <div key={friend.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Avatar src={friend.profile?.avatar_url} />
              {friend.profile?.is_online && (
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
              )}
            </div>
            <div>
              <h3 className="font-medium">{friend.profile?.full_name}</h3>
              <p className="text-sm text-gray-500">
                {friend.profile?.is_online ? 'Online' : `Active ${formatLastActive(friend.profile?.last_active)}`}
              </p>
            </div>
          </div>
          <div className="flex space-x-2">
            <Button size="sm" onClick={() => handleMessage(friend.friend_id)}>
              <MessageCircle className="w-4 h-4" />
            </Button>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={() => {
                if (confirm('Unfriend this person?')) {
                  unfriend(friend.friend_id)
                }
              }}
            >
              <UserMinus className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}

function formatLastActive(lastActive?: string) {
  if (!lastActive) return 'recently'
  const minutes = Math.floor((Date.now() - new Date(lastActive).getTime()) / 60000)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}
```

#### 2. **Friend Requests Component**

Create `src/components/friends/FriendRequestsList.tsx`:

```typescript
import { useFriendRequests } from '@/hooks/useFriendRequests'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'
import { Check, X } from 'lucide-react'

export function FriendRequestsList() {
  const { requests, loading, refetch } = useFriendRequests()

  const handleAccept = async (requestId: string) => {
    await supabase.rpc('accept_friend_request', { request_id: requestId })
    refetch()
  }

  const handleReject = async (requestId: string) => {
    await supabase
      .from('friend_requests')
      .update({ status: 'rejected' })
      .eq('id', requestId)
    refetch()
  }

  if (loading) return <div>Loading requests...</div>
  if (requests.length === 0) return <div>No pending requests</div>

  return (
    <div className="space-y-3">
      {requests.map(request => (
        <div key={request.id} className="flex items-center justify-between p-3 rounded-lg bg-blue-50">
          <div className="flex items-center space-x-3">
            <Avatar src={request.sender_profile?.avatar_url} />
            <div>
              <h3 className="font-medium">{request.sender_profile?.full_name}</h3>
              {request.message && (
                <p className="text-sm text-gray-600">{request.message}</p>
              )}
              <p className="text-xs text-gray-500">
                {formatTimeAgo(request.created_at)}
              </p>
            </div>
          </div>
          <div className="flex space-x-2">
            <Button size="sm" onClick={() => handleAccept(request.id)}>
              <Check className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => handleReject(request.id)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}

function formatTimeAgo(dateString: string) {
  const minutes = Math.floor((Date.now() - new Date(dateString).getTime()) / 60000)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}
```

---

### **PHASE 6: Testing** ⏱️ 30 mins

#### Manual Testing Checklist:

```
[ ] Database Migration
  [ ] All tables created
  [ ] All functions exist
  [ ] RLS policies active
  [ ] Real-time enabled

[ ] Friend Requests
  [ ] Send friend request
  [ ] Receive friend request
  [ ] Accept friend request (bidirectional friendship created)
  [ ] Reject friend request
  [ ] Cancel friend request
  [ ] Auto-expire after 30 days

[ ] Friendships
  [ ] View friends list
  [ ] Search friends by name
  [ ] See online status (green dot)
  [ ] See last active time
  [ ] Unfriend (soft delete)
  [ ] Auto-unfollow on unfriend

[ ] Messaging
  [ ] Start conversation from friends list
  [ ] Start conversation from messages page
  [ ] Send text message
  [ ] Send image
  [ ] See typing indicator
  [ ] See message status (sent/delivered/read)
  [ ] No infinite refresh loop

[ ] Blocking
  [ ] Block user
  [ ] Unblock user
  [ ] Blocked user cannot send messages
  [ ] Blocked user cannot send friend requests

[ ] Notifications
  [ ] Receive notification on friend request
  [ ] Receive notification on friend accept
  [ ] Mark notification as read
```

---

## 📊 **COMPARISON: BEFORE vs AFTER**

| Feature | Before (Broken) | After (Facebook-level) |
|---------|----------------|----------------------|
| **Friend Requests** | ❌ Incomplete | ✅ Full flow + auto-expiry |
| **Friendships** | ❌ Schema mismatch | ✅ Bidirectional graph |
| **Online Status** | ❌ No implementation | ✅ Real-time with last_active |
| **Blocking** | ❌ No implementation | ✅ Full privacy controls |
| **Following** | ❌ No implementation | ✅ Instagram-style follows |
| **Messaging Schema** | ❌ participant1_id/2_id | ✅ participants[] array |
| **Conversation Creation** | ❌ Error: "column does not exist" | ✅ Works with database function |
| **Infinite Refresh Loop** | ❌ 10s polling + broken deps | ✅ Fixed polling + deps |
| **Typing Indicators** | ❌ No implementation | ✅ Real-time with auto-cleanup |
| **Notifications** | ❌ Basic only | ✅ Full notification system |
| **RLS Security** | ⚠️ Partial | ✅ Complete policies |
| **Real-time Subscriptions** | ⚠️ Basic | ✅ Full real-time support |

---

## 🎯 **SUCCESS CRITERIA**

✅ All 8 database tables created and validated  
✅ All 3 helper functions working  
✅ All RLS policies active  
✅ Code uses `participants` array (no more schema errors)  
✅ No infinite refresh loops  
✅ Users can send/accept/reject friend requests  
✅ Users can unfriend/block/unblock  
✅ Users can start conversations from friends list  
✅ Users can start conversations from messages page  
✅ Online status + last active shown correctly  
✅ Typing indicators work in real-time  
✅ Notifications sent on key actions  
✅ All features work on Web, iOS, Android

---

## 📱 **CROSS-PLATFORM NOTES**

- **Web**: Uses React hooks + Supabase client
- **iOS/Android**: Use same Supabase functions via RPC calls
- **Real-time**: Supabase Realtime works across all platforms
- **Offline**: Store last synced state in local storage/AsyncStorage

---

## 🚀 **NEXT STEPS**

1. **Apply database migration** (Phase 1)
2. **Update code to use participants array** (Phase 2)
3. **Create friends service** (Phase 3)
4. **Create React hooks** (Phase 4)
5. **Build UI components** (Phase 5)
6. **Test thoroughly** (Phase 6)
7. **Deploy to production**

---

## 📚 **REFERENCES**

- **Epic 8.1**: Core Database Tables Schema (uses `participants UUID[]`)
- **Epic 8.2**: Messaging UI Implementation
- **Facebook Friends Module**: Inspiration for features and UX
- **Supabase RLS**: Row-level security best practices
- **Supabase Realtime**: Real-time subscriptions guide

---

**Ready to proceed?** Start with Phase 1 (Database Migration) 🚀
