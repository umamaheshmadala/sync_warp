# 📋 STORY 9.5.4: Online Status Visibility Controls

**Epic:** [EPIC 9.5: Privacy Controls & Settings](../epics/EPIC_9.5_Privacy_Settings.md)  
**Story Points:** 2  
**Priority:** 🟡 Medium  
**Status:** 📋 To Do

---

## 📝 **Story Description**

As a **user**, I want to **control who can see my online status and last active time** so that **I can maintain my privacy and control my availability visibility**.

---

## 🎯 **Acceptance Criteria**

1. ✅ Settings options: Everyone, Friends only, No one
2. ✅ Hide green dot when set to "No one"
3. ✅ Hide "Last active" timestamp based on setting
4. ✅ Real-time respect for privacy setting
5. ✅ Update messaging module to respect setting
6. ✅ Update friends list to respect setting
7. ✅ Clear UI with status preview

---

## 🎨 **MCP Integration**

### **Supabase MCP** (Heavy Usage)
```bash
# Apply online status visibility functions
warp mcp run supabase "apply_migration online_status_visibility 'Add functions for online status visibility control'"

# Test visibility function
warp mcp run supabase "execute_sql SELECT can_see_online_status('viewer-id', 'target-id')"
```

---

## 📦 **Implementation**

### **Database Migration**

```sql
-- Migration: 20250123_online_status_visibility.sql

-- Function to check if viewer can see online status
CREATE OR REPLACE FUNCTION can_see_online_status(
  viewer_id UUID,
  target_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  visibility_setting TEXT;
  are_friends BOOLEAN;
BEGIN
  -- User can always see their own status
  IF viewer_id = target_id THEN
    RETURN TRUE;
  END IF;
  
  -- Get target's online status visibility setting
  SELECT privacy_settings->>'online_status_visibility' 
  INTO visibility_setting
  FROM profiles WHERE id = target_id;
  
  -- Everyone: all authenticated users can see
  IF visibility_setting = 'everyone' THEN
    RETURN TRUE;
  END IF;
  
  -- No one: hide from everyone
  IF visibility_setting = 'no_one' THEN
    RETURN FALSE;
  END IF;
  
  -- Friends: check if they are friends
  IF visibility_setting = 'friends' THEN
    SELECT EXISTS (
      SELECT 1 FROM friendships
      WHERE user_id = viewer_id 
        AND friend_id = target_id 
        AND status = 'active'
    ) INTO are_friends;
    
    RETURN are_friends;
  END IF;
  
  -- Default: hide
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION can_see_online_status(UUID, UUID) TO authenticated;

-- Function to get user's visible online status
CREATE OR REPLACE FUNCTION get_visible_online_status(
  viewer_id UUID,
  target_id UUID
)
RETURNS JSONB AS $$
DECLARE
  can_see BOOLEAN;
  target_profile RECORD;
BEGIN
  -- Check if viewer can see status
  SELECT can_see_online_status(viewer_id, target_id) INTO can_see;
  
  IF NOT can_see THEN
    RETURN jsonb_build_object(
      'is_online', NULL,
      'last_active', NULL,
      'visible', FALSE
    );
  END IF;
  
  -- Get target's status
  SELECT is_online, last_active INTO target_profile
  FROM profiles WHERE id = target_id;
  
  RETURN jsonb_build_object(
    'is_online', target_profile.is_online,
    'last_active', target_profile.last_active,
    'visible', TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_visible_online_status(UUID, UUID) TO authenticated;
```

### **Service Layer**

```typescript
// Add to src/services/privacyService.ts

export const privacyService = {
  // ... existing methods

  /**
   * Check if viewer can see target's online status
   */
  async canSeeOnlineStatus(targetId: string): Promise<ServiceResponse<boolean>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.rpc('can_see_online_status', {
        viewer_id: user.id,
        target_id: targetId,
      });

      if (error) throw error;

      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to check online status visibility',
      };
    }
  },

  /**
   * Get user's visible online status
   */
  async getVisibleOnlineStatus(targetId: string): Promise<ServiceResponse<{
    is_online: boolean | null;
    last_active: string | null;
    visible: boolean;
  }>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.rpc('get_visible_online_status', {
        viewer_id: user.id,
        target_id: targetId,
      });

      if (error) throw error;

      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to get online status',
      };
    }
  },
};
```

### **UI Component**

```typescript
// src/components/friends/privacy/OnlineStatusVisibility.tsx

import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { usePrivacySettings } from '@/hooks/usePrivacySettings';
import { Globe, Users, EyeOff, Circle } from 'lucide-react';

export function OnlineStatusVisibility() {
  const { settings, updateSetting, isUpdating } = usePrivacySettings();

  const options = [
    {
      value: 'everyone',
      label: 'Everyone',
      description: 'Anyone can see when you\'re online',
      icon: Globe,
      preview: <Badge variant="default" className="gap-1"><Circle className="h-2 w-2 fill-green-500 text-green-500" /> Online</Badge>,
    },
    {
      value: 'friends',
      label: 'Friends Only',
      description: 'Only your friends can see your online status',
      icon: Users,
      preview: <Badge variant="secondary" className="gap-1"><Circle className="h-2 w-2 fill-green-500 text-green-500" /> Online (Friends only)</Badge>,
    },
    {
      value: 'no_one',
      label: 'No One',
      description: 'Hide your online status from everyone',
      icon: EyeOff,
      preview: <Badge variant="outline">Status hidden</Badge>,
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium">Who can see your online status?</h3>
        <p className="text-sm text-muted-foreground">
          Control who can see when you're active and your last active time
        </p>
      </div>

      <RadioGroup
        value={settings?.online_status_visibility || 'friends'}
        onValueChange={(value) => updateSetting({ key: 'online_status_visibility', value })}
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
              <RadioGroupItem value={option.value} id={`status-${option.value}`} className="mt-1" />
              <div className="flex-1 space-y-2">
                <Label htmlFor={`status-${option.value}`} className="flex items-center gap-2 cursor-pointer">
                  <Icon className="h-4 w-4" />
                  <span className="font-medium">{option.label}</span>
                </Label>
                <p className="text-sm text-muted-foreground">
                  {option.description}
                </p>
                <div className="pt-1">
                  <span className="text-xs text-muted-foreground mr-2">Preview:</span>
                  {option.preview}
                </div>
              </div>
            </div>
          );
        })}
      </RadioGroup>

      <div className="rounded-lg bg-muted/50 p-4 text-sm">
        <p className="text-muted-foreground">
          <strong>Note:</strong> Your "Last active" timestamp will also be hidden based on this setting.
        </p>
      </div>
    </div>
  );
}
```

### **Update Friend Components**

```typescript
// Update src/components/friends/FriendCard.tsx

import { useQuery } from '@tanstack/react-query';
import { privacyService } from '@/services/privacyService';
import { formatDistanceToNow } from 'date-fns';

export function FriendCard({ friend }: { friend: Friend }) {
  // Check if we can see online status
  const { data: statusData } = useQuery({
    queryKey: ['onlineStatus', friend.id],
    queryFn: async () => {
      const response = await privacyService.getVisibleOnlineStatus(friend.id);
      return response.data;
    },
  });

  return (
    <div className="flex items-center gap-3">
      <div className="relative">
        <Avatar src={friend.avatar_url} fallback={friend.full_name} />
        {/* Only show green dot if visible */}
        {statusData?.visible && statusData?.is_online && (
          <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
        )}
      </div>
      <div className="flex-1">
        <div className="font-medium">{friend.full_name}</div>
        {/* Only show last active if visible */}
        {statusData?.visible && statusData?.last_active && !statusData?.is_online && (
          <div className="text-sm text-muted-foreground">
            Last active {formatDistanceToNow(new Date(statusData.last_active), { addSuffix: true })}
          </div>
        )}
        {!statusData?.visible && (
          <div className="text-sm text-muted-foreground">Status hidden</div>
        )}
      </div>
    </div>
  );
}
```

---

## 🚀 **Deployment Checklist**

- [ ] Database migration applied
- [ ] Visibility functions created
- [ ] Service layer methods added
- [ ] UI component created
- [ ] Friend components updated
- [ ] Messaging module updated
- [ ] Real-time updates working
- [ ] Code reviewed

---

## 🧪 **Testing**

### **Manual Testing**
1. Set online status visibility to "No one"
2. Log in with another account
3. Verify green dot is hidden
4. Verify "Last active" is hidden
5. Set to "Friends Only"
6. Verify friends can see status
7. Verify non-friends cannot see status
8. Set to "Everyone"
9. Verify all users can see status

### **Integration Testing**
- Test RLS enforcement
- Verify real-time updates
- Test messaging module integration
- Verify friends list updates

---

**Previous Story:** [STORY 9.5.3: Profile & Search Visibility Settings](./STORY_9.5.3_Profile_Search_Visibility.md)  
**Next Story:** [STORY 9.5.5: Block List Management UI](./STORY_9.5.5_Block_List_Management.md)
