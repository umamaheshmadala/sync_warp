# 📋 STORY 9.5.2: Friend Request Privacy Controls

**Epic:** [EPIC 9.5: Privacy Controls & Settings](../epics/EPIC_9.5_Privacy_Settings.md)  
**Story Points:** 3  
**Priority:** 🔴 Critical  
**Status:** ✅ Complete

---

## 📝 **Story Description**

As a **user**, I want to **control who can send me friend requests** so that **I can manage unwanted connection attempts and maintain my privacy**.

---

## 🎯 **Acceptance Criteria**

1. ✅ Settings options: Everyone, Friends of Friends, No one
2. ✅ RLS policy enforces friend request privacy
3. ✅ UI component: RadioGroup with clear explanations
4. ✅ Real-time enforcement (no manual refresh needed)
5. ✅ Clear error messages when request blocked by privacy settings
6. ✅ Service layer integration with privacy checks
7. ✅ Frontend validation before sending request

---

## 🎨 **MCP Integration**

### **Supabase MCP** (Heavy Usage)
```bash
# Apply RLS policy migration
warp mcp run supabase "apply_migration friend_request_privacy_rls 'Update RLS policies for friend request privacy'"

# Test privacy enforcement
warp mcp run supabase "execute_sql SELECT * FROM friend_requests WHERE receiver_id = 'test-user-id'"

# Check RLS policies
warp mcp run supabase "execute_sql SELECT * FROM pg_policies WHERE tablename = 'friend_requests'"
```

### **Shadcn MCP** (Medium Usage)
```bash
# Generate RadioGroup component if needed
warp mcp run shadcn "add radio-group"
```

---

## 📦 **Implementation**

### **Database Migration**

```sql
-- Migration: 20250123_friend_request_privacy_rls.sql

-- Drop existing friend_requests INSERT policy
DROP POLICY IF EXISTS "Users can send friend requests" ON friend_requests;

-- Create new policy with privacy enforcement
CREATE POLICY "Users can send friend requests respecting privacy"
ON friend_requests FOR INSERT
WITH CHECK (
  -- Must be authenticated
  auth.uid() = sender_id AND
  
  -- Can't send request to yourself
  sender_id != receiver_id AND
  
  -- Check receiver's privacy settings
  (
    -- Setting: Everyone
    (
      SELECT privacy_settings->>'friend_requests' 
      FROM profiles WHERE id = receiver_id
    ) = 'everyone'
    
    OR
    
    -- Setting: Friends of Friends
    (
      (
        SELECT privacy_settings->>'friend_requests' 
        FROM profiles WHERE id = receiver_id
      ) = 'friends_of_friends' AND
      EXISTS (
        -- Check for mutual friends
        SELECT 1 FROM friendships f1
        JOIN friendships f2 ON f1.friend_id = f2.user_id
        WHERE f1.user_id = sender_id 
          AND f2.friend_id = receiver_id
          AND f1.status = 'active'
          AND f2.status = 'active'
      )
    )
    
    -- Note: 'no_one' setting will fail the check, preventing request
  )
);

-- Function to check if user can send friend request
CREATE OR REPLACE FUNCTION can_send_friend_request(
  sender_id UUID,
  receiver_id UUID
)
RETURNS JSONB AS $$
DECLARE
  privacy_setting TEXT;
  has_mutual_friends BOOLEAN;
  result JSONB;
BEGIN
  -- Get receiver's privacy setting
  SELECT privacy_settings->>'friend_requests' 
  INTO privacy_setting
  FROM profiles WHERE id = receiver_id;
  
  -- Check based on setting
  IF privacy_setting = 'everyone' THEN
    RETURN jsonb_build_object(
      'allowed', true,
      'reason', 'User accepts requests from everyone'
    );
  ELSIF privacy_setting = 'no_one' THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'User is not accepting friend requests at this time'
    );
  ELSIF privacy_setting = 'friends_of_friends' THEN
    -- Check for mutual friends
    SELECT EXISTS (
      SELECT 1 FROM friendships f1
      JOIN friendships f2 ON f1.friend_id = f2.user_id
      WHERE f1.user_id = sender_id 
        AND f2.friend_id = receiver_id
        AND f1.status = 'active'
        AND f2.status = 'active'
    ) INTO has_mutual_friends;
    
    IF has_mutual_friends THEN
      RETURN jsonb_build_object(
        'allowed', true,
        'reason', 'You have mutual friends with this user'
      );
    ELSE
      RETURN jsonb_build_object(
        'allowed', false,
        'reason', 'User only accepts requests from friends of friends'
      );
    END IF;
  END IF;
  
  -- Default: not allowed
  RETURN jsonb_build_object(
    'allowed', false,
    'reason', 'Unable to send friend request'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION can_send_friend_request(UUID, UUID) TO authenticated;
```

### **Service Layer**

```typescript
// src/services/privacyService.ts

import { supabase } from '../lib/supabase';
import type { ServiceResponse } from '../types/friends';

export interface PrivacySettings {
  friend_requests: 'everyone' | 'friends_of_friends' | 'no_one';
  profile_visibility: 'public' | 'friends' | 'friends_of_friends';
  search_visibility: boolean;
  online_status_visibility: 'everyone' | 'friends' | 'no_one';
  who_can_follow: 'everyone' | 'friends' | 'no_one';
  last_updated: string | null;
}

export const privacyService = {
  /**
   * Get current user's privacy settings
   */
  async getPrivacySettings(): Promise<ServiceResponse<PrivacySettings>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('profiles')
        .select('privacy_settings')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      return {
        success: true,
        data: data.privacy_settings as PrivacySettings,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to load privacy settings',
      };
    }
  },

  /**
   * Update a specific privacy setting
   */
  async updatePrivacySetting(
    key: keyof PrivacySettings,
    value: string | boolean
  ): Promise<ServiceResponse<PrivacySettings>> {
    try {
      const { data, error } = await supabase.rpc('update_privacy_settings', {
        setting_key: key,
        setting_value: String(value),
      });

      if (error) throw error;

      return {
        success: true,
        data: data as PrivacySettings,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to update privacy setting',
      };
    }
  },

  /**
   * Check if user can send friend request to another user
   */
  async canSendFriendRequest(receiverId: string): Promise<ServiceResponse<{ allowed: boolean; reason: string }>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.rpc('can_send_friend_request', {
        sender_id: user.id,
        receiver_id: receiverId,
      });

      if (error) throw error;

      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to check friend request permission',
      };
    }
  },
};
```

### **React Hook**

```typescript
// src/hooks/usePrivacySettings.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { privacyService, type PrivacySettings } from '../services/privacyService';
import toast from 'react-hot-toast';

export function usePrivacySettings() {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['privacySettings'],
    queryFn: async () => {
      const response = await privacyService.getPrivacySettings();
      if (!response.success) throw new Error(response.error);
      return response.data;
    },
  });

  const updateSetting = useMutation({
    mutationFn: async ({ key, value }: { key: keyof PrivacySettings; value: string | boolean }) => {
      const response = await privacyService.updatePrivacySetting(key, value);
      if (!response.success) throw new Error(response.error);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['privacySettings'] });
      toast.success('Privacy setting updated');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update privacy setting');
    },
  });

  return {
    settings,
    isLoading,
    updateSetting: updateSetting.mutate,
    isUpdating: updateSetting.isPending,
  };
}
```

### **UI Component**

```typescript
// src/components/friends/privacy/FriendRequestPrivacy.tsx

import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { usePrivacySettings } from '@/hooks/usePrivacySettings';
import { Users, UserCheck, UserX } from 'lucide-react';

export function FriendRequestPrivacy() {
  const { settings, updateSetting, isUpdating } = usePrivacySettings();

  const options = [
    {
      value: 'everyone',
      label: 'Everyone',
      description: 'Anyone can send you friend requests',
      icon: Users,
    },
    {
      value: 'friends_of_friends',
      label: 'Friends of Friends',
      description: 'Only people with mutual friends can send requests',
      icon: UserCheck,
    },
    {
      value: 'no_one',
      label: 'No One',
      description: 'Turn off friend requests completely',
      icon: UserX,
    },
  ];

  const handleChange = (value: string) => {
    updateSetting({ key: 'friend_requests', value });
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium">Who can send you friend requests?</h3>
        <p className="text-sm text-muted-foreground">
          Control who can connect with you on the platform
        </p>
      </div>

      <RadioGroup
        value={settings?.friend_requests || 'everyone'}
        onValueChange={handleChange}
        disabled={isUpdating}
        className="space-y-3"
      >
        {options.map((option) => {
          const Icon = option.icon;
          return (
            <div
              key={option.value}
              className="flex items-start space-x-3 rounded-lg border p-4 hover:bg-accent/50 transition-colors"
            >
              <RadioGroupItem value={option.value} id={option.value} className="mt-1" />
              <div className="flex-1">
                <Label htmlFor={option.value} className="flex items-center gap-2 cursor-pointer">
                  <Icon className="h-4 w-4" />
                  <span className="font-medium">{option.label}</span>
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  {option.description}
                </p>
              </div>
            </div>
          );
        })}
      </RadioGroup>
    </div>
  );
}
```

### **Integration with friendsService**

```typescript
// Update src/services/friendsService.ts

import { privacyService } from './privacyService';

export const friendsService = {
  // ... existing methods

  async sendFriendRequest(
    receiverId: string,
    message?: string
  ): Promise<ServiceResponse<FriendRequest>> {
    try {
      // Check privacy settings first
      const permissionCheck = await privacyService.canSendFriendRequest(receiverId);
      
      if (!permissionCheck.success || !permissionCheck.data?.allowed) {
        return {
          success: false,
          error: permissionCheck.data?.reason || 'Cannot send friend request',
        };
      }

      // Existing send friend request logic...
      // ...
    } catch (error: any) {
      // ...
    }
  },
};
```

---

## 🚀 **Deployment Checklist**

- [ ] Database migration applied
- [ ] RLS policies updated
- [ ] Privacy service created
- [ ] React hook implemented
- [ ] UI component created
- [ ] Integration with friendsService complete
- [ ] Error messages tested
- [ ] Privacy enforcement verified
- [ ] Code reviewed

---

## 🧪 **Testing**

### **Manual Testing**
1. Change privacy setting to "No one"
2. Try to send friend request from another account
3. Verify request is blocked with clear message
4. Change to "Friends of Friends"
5. Test with account that has mutual friends
6. Test with account that has no mutual friends
7. Change to "Everyone"
8. Verify anyone can send request

### **Integration Testing**
- Test RLS policy enforcement
- Verify real-time updates
- Test error messages
- Verify UI updates immediately

---

**Previous Story:** [STORY 9.5.1: Privacy Settings Database Schema](./STORY_9.5.1_Privacy_Settings_Schema.md)  
**Next Story:** [STORY 9.5.3: Profile & Search Visibility Settings](./STORY_9.5.3_Profile_Search_Visibility.md)
