# 🔒 EPIC 9.5: Privacy Controls & Settings

**Epic Owner:** Frontend Engineering / Backend Engineering  
**Stakeholders:** Product, Security, Legal, QA  
**Dependencies:** Epic 9.1 (Foundation), Epic 9.3 (UI), Epic 9.4 (Services)  
**Timeline:** Week 7 (1 week)  
**Status:** ✅ Complete

---

## 🎯 **Epic Goal**

Implement **comprehensive privacy controls** for the friends module that give users full control over:
- Who can send them friend requests
- Who can see their profile and find them in search
- Who can see their online status and last active time
- Who can follow them
- Managing blocked users

This epic ensures **user privacy and safety**, matching Facebook's privacy features while being GDPR/CCPA compliant.

---

## 📱 **Platform Support**

**All Platforms:** Web, iOS, Android  
**Privacy by Default:** Most restrictive settings by default (opt-in for public features)

---

## 🎯 **MCP Integration Strategy**

1. **🛢 Supabase MCP** (Heavy) - Privacy settings schema, RLS updates
2. **🎨 Shadcn MCP** (Medium) - Settings UI components
3. **🌐 Chrome DevTools MCP** (Light) - UI testing

---

## ✅ **Success Criteria**

| Objective | KPI / Target |
|-----------|--------------|
| **Privacy Adoption** | > 80% users customize settings |
| **Default Security** | Most restrictive by default |
| **GDPR Compliance** | 100% compliant with data privacy |
| **User Understanding** | Clear explanations for each setting |
| **Setting Application** | Real-time enforcement via RLS |

---

## 📊 **High-Level Architecture**

```
┌─────────────────────────────────────────────────────────┐
│                PRIVACY CONTROLS LAYER                    │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────────────────────────────────────────────┐   │
│  │      PRIVACY SETTINGS (JSONB in profiles)        │   │
│  │  {                                               │   │
│  │    "friend_requests": "friends_of_friends",      │   │
│  │    "profile_visibility": "friends",              │   │
│  │    "search_visibility": true,                    │   │
│  │    "online_status_visibility": "friends",        │   │
│  │    "who_can_follow": "everyone"                  │   │
│  │  }                                               │   │
│  └──────────────────────────────────────────────────┘   │
│                        ↓                                  │
│  ┌──────────────────────────────────────────────────┐   │
│  │         RLS POLICY ENFORCEMENT                   │   │
│  │  • Check privacy_settings before queries         │   │
│  │  • Real-time updates on setting changes          │   │
│  │  • Cascade to all friend operations              │   │
│  └──────────────────────────────────────────────────┘   │
│                        ↓                                  │
│  ┌──────────────────────────────────────────────────┐   │
│  │         PRIVACY UI COMPONENTS                    │   │
│  │  • Settings dashboard                            │   │
│  │  • Individual setting toggles                    │   │
│  │  • Block list management                         │   │
│  │  • Privacy audit log                             │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## 🗂️ **Stories in This Epic**

### **STORY 9.5.1: Privacy Settings Database Schema** ⏱️ 1 day
**Priority:** 🔴 Critical  
**MCP Usage:** 🛢 Supabase MCP (Heavy)

**Description:**  
Add `privacy_settings` JSONB column to `profiles` table with default privacy-first settings.

**Acceptance Criteria:**
- [ ] Add `privacy_settings` JSONB column to profiles
- [ ] Default settings on user signup (most restrictive)
- [ ] Database function to validate privacy rules
- [ ] Migration preserves existing users with safe defaults
- [ ] JSONB schema validation

**Technical Spec:**
```sql
-- Add privacy settings column
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS privacy_settings JSONB DEFAULT '{
  "friend_requests": "everyone",
  "profile_visibility": "public",
  "search_visibility": true,
  "online_status_visibility": "friends",
  "who_can_follow": "everyone",
  "last_updated": null
}'::jsonb;

-- Validation function
CREATE OR REPLACE FUNCTION validate_privacy_settings(settings JSONB)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    settings ? 'friend_requests' AND
    settings->>'friend_requests' IN ('everyone', 'friends_of_friends', 'no_one') AND
    settings ? 'profile_visibility' AND
    settings->>'profile_visibility' IN ('public', 'friends', 'friends_of_friends') AND
    settings ? 'search_visibility' AND
    jsonb_typeof(settings->'search_visibility') = 'boolean' AND
    settings ? 'online_status_visibility' AND
    settings->>'online_status_visibility' IN ('everyone', 'friends', 'no_one') AND
    settings ? 'who_can_follow' AND
    settings->>'who_can_follow' IN ('everyone', 'friends', 'no_one')
  );
END;
$$ LANGUAGE plpgsql;

-- Add check constraint
ALTER TABLE profiles
ADD CONSTRAINT valid_privacy_settings 
CHECK (validate_privacy_settings(privacy_settings));

-- Update function for privacy settings
CREATE OR REPLACE FUNCTION update_privacy_settings(
  setting_key TEXT,
  setting_value TEXT
)
RETURNS JSONB AS $$
DECLARE
  current_settings JSONB;
BEGIN
  SELECT privacy_settings INTO current_settings 
  FROM profiles WHERE id = auth.uid();
  
  current_settings = jsonb_set(
    current_settings, 
    ARRAY[setting_key], 
    to_jsonb(setting_value)
  );
  
  current_settings = jsonb_set(
    current_settings,
    '{last_updated}',
    to_jsonb(NOW())
  );
  
  UPDATE profiles 
  SET privacy_settings = current_settings 
  WHERE id = auth.uid();
  
  RETURN current_settings;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**MCP Commands:**
```bash
# Apply migration
warp mcp run supabase "apply_migration 20250120_privacy_settings_schema"

# Test validation
warp mcp run supabase "execute_sql SELECT validate_privacy_settings('{\"friend_requests\": \"invalid\"}'::jsonb)"
```

---

### **STORY 9.5.2: Friend Request Privacy Controls** ⏱️ 1 day
**Priority:** 🔴 Critical  
**MCP Usage:** 🛢 Supabase MCP (Heavy)

**Description:**  
Implement RLS policies and UI for "Who can send you friend requests?" setting.

**Acceptance Criteria:**
- [ ] Settings options: Everyone, Friends of Friends, No one
- [ ] RLS policy enforces friend request privacy
- [ ] UI component: RadioGroup with explanations
- [ ] Real-time enforcement (no manual refresh)
- [ ] Clear error messages when request blocked

**Technical Spec:**
```sql
-- Update friend_requests RLS policy
CREATE OR REPLACE POLICY "Users can send friend requests respecting privacy"
ON friend_requests FOR INSERT
WITH CHECK (
  auth.uid() = sender_id AND
  sender_id != receiver_id AND
  -- Check receiver's privacy settings
  (
    (
      SELECT privacy_settings->>'friend_requests' 
      FROM profiles WHERE id = receiver_id
    ) = 'everyone'
    OR
    (
      (
        SELECT privacy_settings->>'friend_requests' 
        FROM profiles WHERE id = receiver_id
      ) = 'friends_of_friends' AND
      EXISTS (
        SELECT 1 FROM friendships f1
        JOIN friendships f2 ON f1.friend_id = f2.user_id
        WHERE f1.user_id = sender_id 
          AND f2.friend_id = receiver_id
          AND f1.status = 'active'
          AND f2.status = 'active'
      )
    )
  )
);
```

**UI Component:**
```typescript
// src/components/friends/privacy/FriendRequestPrivacy.tsx
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

export function FriendRequestPrivacy() {
  const [setting, setSetting] = useState('everyone');

  const options = [
    {
      value: 'everyone',
      label: 'Everyone',
      description: 'Anyone can send you friend requests',
    },
    {
      value: 'friends_of_friends',
      label: 'Friends of Friends',
      description: 'Only people with mutual friends can send requests',
    },
    {
      value: 'no_one',
      label: 'No One',
      description: 'Turn off friend requests',
    },
  ];

  const handleChange = async (value: string) => {
    await supabase.rpc('update_privacy_settings', {
      setting_key: 'friend_requests',
      setting_value: value,
    });
    setSetting(value);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Who can send you friend requests?</h3>
      <RadioGroup value={setting} onValueChange={handleChange}>
        {options.map((opt) => (
          <div key={opt.value} className="flex items-start space-x-3">
            <RadioGroupItem value={opt.value} id={opt.value} />
            <label htmlFor={opt.value} className="flex-1 cursor-pointer">
              <div className="font-medium">{opt.label}</div>
              <div className="text-sm text-muted-foreground">
                {opt.description}
              </div>
            </label>
          </div>
        ))}
      </RadioGroup>
    </div>
  );
}
```

---

### **STORY 9.5.3: Profile & Search Visibility Settings** ⏱️ 1 day
**Priority:** 🔴 Critical  
**MCP Usage:** 🛢 Supabase MCP, 🎨 Shadcn MCP

**Description:**  
Control who can see user profiles and whether users appear in search results.

**Acceptance Criteria:**
- [ ] Profile visibility: Public, Friends only, Friends of friends
- [ ] Search visibility: On/Off toggle
- [ ] RLS policies enforce visibility rules
- [ ] Hide from search results when disabled
- [ ] UI with clear privacy icons

---

### **STORY 9.5.4: Online Status Visibility Controls** ⏱️ 1 day
**Priority:** 🟡 Medium  
**MCP Usage:** 🛢 Supabase MCP

**Description:**  
Let users control who can see their online status and last active timestamp.

**Acceptance Criteria:**
- [ ] Settings: Everyone, Friends only, No one
- [ ] Hide green dot when set to "No one"
- [ ] Hide "Last active" timestamp based on setting
- [ ] Real-time respect for privacy setting
- [ ] Update messaging module to respect setting

**Technical Spec:**
```sql
-- Function to check if user can see online status
CREATE OR REPLACE FUNCTION can_see_online_status(
  viewer_id UUID,
  target_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  visibility_setting TEXT;
  are_friends BOOLEAN;
BEGIN
  -- Get target's visibility setting
  SELECT privacy_settings->>'online_status_visibility' 
  INTO visibility_setting
  FROM profiles WHERE id = target_id;
  
  IF visibility_setting = 'everyone' THEN
    RETURN TRUE;
  ELSIF visibility_setting = 'no_one' THEN
    RETURN FALSE;
  ELSIF visibility_setting = 'friends' THEN
    -- Check if they are friends
    SELECT EXISTS (
      SELECT 1 FROM friendships
      WHERE user_id = viewer_id 
        AND friend_id = target_id 
        AND status = 'active'
    ) INTO are_friends;
    RETURN are_friends;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

### **STORY 9.5.5: Block List Management UI** ⏱️ 1 day
**Priority:** 🟡 Medium  
**MCP Usage:** 🎨 Shadcn MCP, 🌐 Chrome DevTools MCP

**Description:**  
UI for viewing and managing blocked users list.

**Acceptance Criteria:**
- [ ] View all blocked users with avatars
- [ ] Unblock button with confirmation dialog
- [ ] Search within blocked list
- [ ] Empty state: "No blocked users"
- [ ] Display reason for blocking (if provided)

**UI Component:**
```typescript
// src/components/friends/privacy/BlockedUsersList.tsx
export function BlockedUsersList() {
  const { data: blockedUsers, refetch } = useBlockedUsers();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredUsers = blockedUsers?.filter((user) =>
    user.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleUnblock = async (userId: string) => {
    if (confirm('Unblock this user?')) {
      await unblockUser(userId);
      refetch();
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Blocked Users</h3>
      
      {blockedUsers?.length > 0 && (
        <Input
          placeholder="Search blocked users..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      )}

      {filteredUsers?.length === 0 ? (
        <EmptyState
          icon={ShieldX}
          title="No blocked users"
          description="When you block someone, they'll appear here"
        />
      ) : (
        <div className="space-y-2">
          {filteredUsers?.map((user) => (
            <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center space-x-3">
                <Avatar src={user.avatar_url} fallback={user.full_name} />
                <div>
                  <div className="font-medium">{user.full_name}</div>
                  {user.reason && (
                    <div className="text-sm text-muted-foreground">
                      Reason: {user.reason}
                    </div>
                  )}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleUnblock(user.id)}
              >
                Unblock
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

### **STORY 9.5.6: Privacy Dashboard in Settings** ⏱️ 1 day
**Priority:** 🟡 Medium  
**MCP Usage:** 🎨 Shadcn MCP

**Description:**  
Centralized "Friends & Privacy" settings page with all privacy controls.

**Acceptance Criteria:**
- [ ] Settings page: "Friends & Privacy"
- [ ] All privacy controls in one place
- [ ] Section headers with icons
- [ ] Privacy audit log (who viewed your profile - future feature placeholder)
- [ ] Export privacy settings (GDPR compliance)

**UI Structure:**
```typescript
// src/pages/settings/FriendsPrivacySettings.tsx
export function FriendsPrivacySettings() {
  return (
    <div className="max-w-2xl mx-auto space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-bold">Friends & Privacy</h1>
        <p className="text-muted-foreground">
          Control who can connect with you and see your information
        </p>
      </div>

      <Separator />

      {/* Friend Requests */}
      <section>
        <FriendRequestPrivacy />
      </section>

      <Separator />

      {/* Profile Visibility */}
      <section>
        <ProfileVisibilitySettings />
      </section>

      <Separator />

      {/* Online Status */}
      <section>
        <OnlineStatusVisibility />
      </section>

      <Separator />

      {/* Blocked Users */}
      <section>
        <BlockedUsersList />
      </section>

      <Separator />

      {/* Export Settings (GDPR) */}
      <section>
        <Button variant="outline" onClick={exportPrivacySettings}>
          <Download className="mr-2 h-4 w-4" />
          Export Privacy Settings
        </Button>
      </section>
    </div>
  );
}
```

---

## 📦 **Deliverables**

### **Database Migrations:**
1. `20250120_privacy_settings_schema.sql` - Privacy settings column + validation
2. `20250120_privacy_rls_updates.sql` - Update RLS policies for privacy

### **Services:**
1. `src/services/privacyService.ts` - Privacy settings CRUD

### **Components:**
```
src/components/friends/privacy/
├── FriendRequestPrivacy.tsx
├── ProfileVisibilitySettings.tsx
├── OnlineStatusVisibility.tsx
├── BlockedUsersList.tsx
└── PrivacyDashboard.tsx
```

### **Hooks:**
1. `src/hooks/usePrivacySettings.ts` - Get/update privacy settings
2. `src/hooks/useBlockedUsers.ts` - Blocked users list

---

## 🔒 **GDPR/CCPA Compliance**

- ✅ Privacy by default (most restrictive settings)
- ✅ Clear privacy explanations
- ✅ User control over all data visibility
- ✅ Export privacy settings (data portability)
- ✅ Right to be forgotten (block + delete account)
- ✅ Audit log of privacy changes

---

## 📈 **Metrics & Monitoring**

### **Privacy Metrics:**
- % users who customize privacy settings
- Most common privacy configurations
- Block/unblock rate
- Privacy-related support tickets

### **Compliance Metrics:**
- Privacy setting update frequency
- Data export requests
- Account deletion requests

---

**Next Epic:** [EPIC 9.6: Friend Activity Feed & Notifications](./EPIC_9.6_Friend_Activity_Notifications.md)
