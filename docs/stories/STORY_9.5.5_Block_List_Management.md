# 📋 STORY 9.5.5: Block List Management UI

**Epic:** [EPIC 9.5: Privacy Controls & Settings](../epics/EPIC_9.5_Privacy_Settings.md)  
**Story Points:** 2  
**Priority:** 🟡 Medium  
**Status:** 📋 To Do

---

## 📝 **Story Description**

As a **user**, I want to **view and manage my blocked users list** so that **I can unblock users if I change my mind and maintain control over who I've blocked**.

---

## 🎯 **Acceptance Criteria**

1. ✅ View all blocked users with avatars
2. ✅ Unblock button with confirmation dialog
3. ✅ Search within blocked list
4. ✅ Empty state: "No blocked users"
5. ✅ Display reason for blocking (if provided)
6. ✅ Real-time updates when blocking/unblocking
7. ✅ Integration with existing block/unblock service

---

## 🎨 **MCP Integration**

### **Shadcn MCP** (Medium Usage)
```bash
# Add required UI components
warp mcp run shadcn "add input dialog"
```

### **Chrome DevTools MCP** (Light Usage)
```bash
# Test UI interactions
warp mcp run chrome "navigate to settings page and test block list"
```

---

## 📦 **Implementation**

### **React Hook**

```typescript
// src/hooks/useBlockedUsers.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

export function useBlockedUsers() {
  const queryClient = useQueryClient();

  const { data: blockedUsers, isLoading } = useQuery({
    queryKey: ['blockedUsers'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('blocked_users')
        .select(`
          id,
          blocked_id,
          reason,
          created_at,
          blocked_user:profiles!blocked_users_blocked_id_fkey (
            id,
            full_name,
            username,
            avatar_url
          )
        `)
        .eq('blocker_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const unblock = useMutation({
    mutationFn: async (userId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('blocked_users')
        .delete()
        .eq('blocker_id', user.id)
        .eq('blocked_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blockedUsers'] });
      toast.success('User unblocked');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to unblock user');
    },
  });

  return {
    blockedUsers,
    isLoading,
    unblock: unblock.mutate,
    isUnblocking: unblock.isPending,
  };
}
```

### **UI Component**

```typescript
// src/components/friends/privacy/BlockedUsersList.tsx

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useBlockedUsers } from '@/hooks/useBlockedUsers';
import { ShieldX, Search } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export function BlockedUsersList() {
  const { blockedUsers, isLoading, unblock, isUnblocking } = useBlockedUsers();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredUsers = blockedUsers?.filter((item) =>
    item.blocked_user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.blocked_user.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return <div>Loading blocked users...</div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium">Blocked Users</h3>
        <p className="text-sm text-muted-foreground">
          Manage users you've blocked
        </p>
      </div>

      {blockedUsers && blockedUsers.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search blocked users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      )}

      {!filteredUsers || filteredUsers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <ShieldX className="h-12 w-12 text-muted-foreground mb-4" />
          <h4 className="text-lg font-medium mb-2">No blocked users</h4>
          <p className="text-sm text-muted-foreground max-w-sm">
            When you block someone, they'll appear here. You can unblock them at any time.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredUsers.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1">
                <Avatar>
                  <AvatarImage src={item.blocked_user.avatar_url} />
                  <AvatarFallback>
                    {item.blocked_user.full_name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">
                    {item.blocked_user.full_name}
                  </div>
                  {item.blocked_user.username && (
                    <div className="text-sm text-muted-foreground truncate">
                      @{item.blocked_user.username}
                    </div>
                  )}
                  {item.reason && (
                    <div className="text-sm text-muted-foreground mt-1">
                      Reason: {item.reason}
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground mt-1">
                    Blocked {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                  </div>
                </div>
              </div>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" disabled={isUnblocking}>
                    Unblock
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Unblock {item.blocked_user.full_name}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This user will be able to send you friend requests, see your profile, and interact with you again.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => unblock(item.blocked_id)}>
                      Unblock
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## 🚀 **Deployment Checklist**

- [ ] React hook created
- [ ] UI component created
- [ ] Search functionality working
- [ ] Unblock confirmation dialog working
- [ ] Empty state displayed correctly
- [ ] Real-time updates working
- [ ] Integration tested
- [ ] Code reviewed

---

## 🧪 **Testing**

### **Manual Testing**
1. Block a user from their profile
2. Navigate to privacy settings
3. Verify user appears in blocked list
4. Search for blocked user
5. Click unblock button
6. Confirm unblock in dialog
7. Verify user is removed from list
8. Verify user can now send friend requests

---

**Previous Story:** [STORY 9.5.4: Online Status Visibility Controls](./STORY_9.5.4_Online_Status_Visibility.md)  
**Next Story:** [STORY 9.5.6: Privacy Dashboard in Settings](./STORY_9.5.6_Privacy_Dashboard.md)
