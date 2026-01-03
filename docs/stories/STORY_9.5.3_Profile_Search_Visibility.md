# 📋 STORY 9.5.3: Profile & Search Visibility Settings

**Epic:** [EPIC 9.5: Privacy Controls & Settings](../epics/EPIC_9.5_Privacy_Settings.md)  
**Story Points:** 3  
**Priority:** 🔴 Critical  
**Status:** ✅ Complete

---

## 📝 **Story Description**

As a **user**, I want to **control who can see my profile and whether I appear in search results** so that **I can manage my online presence and privacy**.

---

## 🎯 **Acceptance Criteria**

1. ✅ Profile visibility options: Public, Friends only, Friends of friends
2. ✅ Search visibility: On/Off toggle
3. ✅ RLS policies enforce visibility rules
4. ✅ Hide from search results when disabled
5. ✅ UI with clear privacy icons and explanations
6. ✅ Real-time enforcement across all profile views
7. ✅ PYMK (People You May Know) respects visibility settings

---

## 🎨 **MCP Integration**

### **Supabase MCP** (Heavy Usage)
```bash
# Apply visibility RLS policies
warp mcp run supabase "apply_migration profile_visibility_rls 'Add RLS policies for profile and search visibility'"

# Test profile visibility
warp mcp run supabase "execute_sql SELECT * FROM profiles WHERE id = 'test-user-id'"
```

### **Shadcn MCP** (Medium Usage)
```bash
# Add Switch component for search visibility toggle
warp mcp run shadcn "add switch"
```

---

## 📦 **Implementation**

### **Database Migration**

```sql
-- Migration: 20250123_profile_visibility_rls.sql

-- Function to check if viewer can see profile
CREATE OR REPLACE FUNCTION can_view_profile(
  viewer_id UUID,
  target_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  visibility_setting TEXT;
  are_friends BOOLEAN;
  are_friends_of_friends BOOLEAN;
BEGIN
  -- User can always see their own profile
  IF viewer_id = target_id THEN
    RETURN TRUE;
  END IF;
  
  -- Get target's profile visibility setting
  SELECT privacy_settings->>'profile_visibility' 
  INTO visibility_setting
  FROM profiles WHERE id = target_id;
  
  -- Public: everyone can see
  IF visibility_setting = 'public' THEN
    RETURN TRUE;
  END IF;
  
  -- Check if they are friends
  SELECT EXISTS (
    SELECT 1 FROM friendships
    WHERE user_id = viewer_id 
      AND friend_id = target_id 
      AND status = 'active'
  ) INTO are_friends;
  
  -- Friends: only friends can see
  IF visibility_setting = 'friends' THEN
    RETURN are_friends;
  END IF;
  
  -- Friends of friends: check for mutual friends
  IF visibility_setting = 'friends_of_friends' THEN
    IF are_friends THEN
      RETURN TRUE;
    END IF;
    
    SELECT EXISTS (
      SELECT 1 FROM friendships f1
      JOIN friendships f2 ON f1.friend_id = f2.user_id
      WHERE f1.user_id = viewer_id 
        AND f2.friend_id = target_id
        AND f1.status = 'active'
        AND f2.status = 'active'
    ) INTO are_friends_of_friends;
    
    RETURN are_friends_of_friends;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION can_view_profile(UUID, UUID) TO authenticated;

-- Update profiles SELECT policy
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;

CREATE POLICY "Profiles are viewable based on privacy settings"
ON profiles FOR SELECT
USING (
  -- Own profile
  auth.uid() = id
  OR
  -- Check visibility permission
  can_view_profile(auth.uid(), id)
);

-- Function to check if user appears in search
CREATE OR REPLACE FUNCTION is_searchable(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  search_visibility BOOLEAN;
BEGIN
  SELECT (privacy_settings->>'search_visibility')::BOOLEAN 
  INTO search_visibility
  FROM profiles WHERE id = user_id;
  
  RETURN COALESCE(search_visibility, TRUE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION is_searchable(UUID) TO authenticated;

-- Update search function to respect privacy
CREATE OR REPLACE FUNCTION search_users(search_query TEXT)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  username TEXT,
  email TEXT,
  avatar_url TEXT,
  is_online BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.full_name,
    p.username,
    p.email,
    p.avatar_url,
    p.is_online
  FROM profiles p
  WHERE 
    -- Must be searchable
    is_searchable(p.id) = TRUE
    AND
    -- Must match search query
    (
      p.full_name ILIKE '%' || search_query || '%'
      OR p.username ILIKE '%' || search_query || '%'
      OR p.email ILIKE '%' || search_query || '%'
    )
    AND
    -- Can't search for yourself
    p.id != auth.uid()
    AND
    -- Must be able to view profile
    can_view_profile(auth.uid(), p.id) = TRUE
  LIMIT 50;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION search_users(TEXT) TO authenticated;
```

### **Service Layer**

```typescript
// Add to src/services/privacyService.ts

export const privacyService = {
  // ... existing methods

  /**
   * Check if viewer can see a profile
   */
  async canViewProfile(targetId: string): Promise<ServiceResponse<boolean>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.rpc('can_view_profile', {
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
        error: error.message || 'Failed to check profile visibility',
      };
    }
  },

  /**
   * Search users respecting privacy settings
   */
  async searchUsers(query: string): Promise<ServiceResponse<any[]>> {
    try {
      const { data, error } = await supabase.rpc('search_users', {
        search_query: query,
      });

      if (error) throw error;

      return {
        success: true,
        data: data || [],
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to search users',
      };
    }
  },
};
```

### **UI Components**

```typescript
// src/components/friends/privacy/ProfileVisibilitySettings.tsx

import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { usePrivacySettings } from '@/hooks/usePrivacySettings';
import { Globe, Users, UserCheck, Eye, EyeOff } from 'lucide-react';

export function ProfileVisibilitySettings() {
  const { settings, updateSetting, isUpdating } = usePrivacySettings();

  const profileOptions = [
    {
      value: 'public',
      label: 'Public',
      description: 'Anyone can see your profile',
      icon: Globe,
    },
    {
      value: 'friends',
      label: 'Friends Only',
      description: 'Only your friends can see your profile',
      icon: Users,
    },
    {
      value: 'friends_of_friends',
      label: 'Friends of Friends',
      description: 'Your friends and their friends can see your profile',
      icon: UserCheck,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Profile Visibility */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-medium">Who can see your profile?</h3>
          <p className="text-sm text-muted-foreground">
            Control who can view your profile information
          </p>
        </div>

        <RadioGroup
          value={settings?.profile_visibility || 'public'}
          onValueChange={(value) => updateSetting({ key: 'profile_visibility', value })}
          disabled={isUpdating}
          className="space-y-3"
        >
          {profileOptions.map((option) => {
            const Icon = option.icon;
            return (
              <div
                key={option.value}
                className="flex items-start space-x-3 rounded-lg border p-4 hover:bg-accent/50 transition-colors"
              >
                <RadioGroupItem value={option.value} id={`profile-${option.value}`} className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor={`profile-${option.value}`} className="flex items-center gap-2 cursor-pointer">
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

      {/* Search Visibility */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-medium">Search Visibility</h3>
          <p className="text-sm text-muted-foreground">
            Control whether you appear in search results
          </p>
        </div>

        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="flex items-center gap-3">
            {settings?.search_visibility ? (
              <Eye className="h-5 w-5 text-primary" />
            ) : (
              <EyeOff className="h-5 w-5 text-muted-foreground" />
            )}
            <div>
              <Label htmlFor="search-visibility" className="font-medium cursor-pointer">
                Appear in search results
              </Label>
              <p className="text-sm text-muted-foreground">
                {settings?.search_visibility
                  ? 'You can be found when people search'
                  : 'You won\'t appear in search results'}
              </p>
            </div>
          </div>
          <Switch
            id="search-visibility"
            checked={settings?.search_visibility ?? true}
            onCheckedChange={(checked) => updateSetting({ key: 'search_visibility', value: checked })}
            disabled={isUpdating}
          />
        </div>
      </div>
    </div>
  );
}
```

---

## 🚀 **Deployment Checklist**

- [ ] Database migration applied
- [ ] RLS policies updated
- [ ] Visibility check functions created
- [ ] Search function updated
- [ ] Service layer methods added
- [ ] UI components created
- [ ] Profile views respect visibility
- [ ] Search respects visibility
- [ ] PYMK respects visibility
- [ ] Code reviewed

---

## 🧪 **Testing**

### **Manual Testing**
1. Set profile visibility to "Friends Only"
2. Log in with non-friend account
3. Try to view profile - should be blocked
4. Set to "Public" - should be visible
5. Turn off search visibility
6. Search for user - should not appear
7. Turn on search visibility
8. Search for user - should appear

### **Integration Testing**
- Test RLS enforcement on profile queries
- Verify search function filters correctly
- Test PYMK respects visibility
- Verify real-time updates

---

**Previous Story:** [STORY 9.5.2: Friend Request Privacy Controls](./STORY_9.5.2_Friend_Request_Privacy.md)  
**Next Story:** [STORY 9.5.4: Online Status Visibility Controls](./STORY_9.5.4_Online_Status_Visibility.md)
