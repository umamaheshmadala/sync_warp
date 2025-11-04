# Epic 7.2: Supabase Mobile Coordination & Security ⚪ PLANNED

**Goal**: Implement production-ready Supabase configuration with secure token storage and push notification coordination for mobile platforms.

**Progress**: 0/5 stories completed (0%)

**Dependencies**: EPIC 7.1 must be complete (Capacitor setup done)

---

## Story 7.2.1: Capacitor Secure Storage Implementation ⚪ PLANNED
**What you'll see**: User tokens stored securely in iOS Keychain and Android EncryptedSharedPreferences.

**User Experience**:
- As a user, my login tokens are stored securely on mobile
- As a user, my session persists even after device restart
- As a user, I don't need to log in every time I open the app
- As a user, my sensitive data is protected by device encryption

**What needs to be built**:
- [ ] Install @capacitor/preferences package
- [ ] Create custom storage adapter for Capacitor
- [ ] Implement CapacitorStorage with get/set/remove methods
- [ ] Test storage on iOS (uses Keychain)
- [ ] Test storage on Android (uses EncryptedSharedPreferences)
- [ ] Test fallback to localStorage on web
- [ ] Document secure storage implementation

**Files to Create/Modify**:
- `src/lib/supabase.ts` - Add CapacitorStorage adapter
- `package.json` - Add @capacitor/preferences dependency

**Implementation**:
```typescript
const CapacitorStorage = {
  async getItem(key: string): Promise<string | null> {
    if (!Capacitor.isNativePlatform()) {
      return localStorage.getItem(key);
    }
    const { value } = await Preferences.get({ key });
    return value;
  },
  // ... setItem, removeItem
};
```

**Time Estimate**: 2-3 hours

**Acceptance Criteria**:
- ✅ Secure storage working on iOS
- ✅ Secure storage working on Android
- ✅ Falls back to localStorage on web
- ✅ Tokens encrypted on native platforms
- ✅ Sessions persist across app restarts

**iOS Requirement**: MUST use Keychain for App Store approval

---

## Story 7.2.2: Enhanced Supabase Client Configuration ⚪ PLANNED
**What you'll see**: Supabase client optimized for mobile with PKCE auth flow.

**User Experience**:
- As a user, my authentication is more secure on mobile
- As a user, I don't experience auth token issues
- As a user, my session automatically refreshes
- As a developer, I can see which platform requests come from

**What needs to be built**:
- [ ] Update Supabase client config with CapacitorStorage
- [ ] Enable PKCE flow for mobile (more secure)
- [ ] Add platform header to all requests
- [ ] Configure proper session handling
- [ ] Test auth flow on all platforms
- [ ] Document configuration changes

**Files to Create/Modify**:
- `src/lib/supabase.ts` - Complete mobile config

**Configuration**:
```typescript
const supabaseConfig = {
  auth: {
    storage: CapacitorStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: !Capacitor.isNativePlatform(),
    flowType: Capacitor.isNativePlatform() ? 'pkce' : 'implicit',
    storageKey: 'sb-auth-token'
  },
  global: {
    headers: {
      'x-client-platform': Capacitor.getPlatform()
    }
  }
};
```

**Time Estimate**: 2-3 hours

**Acceptance Criteria**:
- ✅ PKCE flow working on mobile
- ✅ Platform headers sent with requests
- ✅ Auto-refresh working correctly
- ✅ No auth errors on any platform
- ✅ More secure than web-only config

---

## Story 7.2.3: Push Token Registration Hook ⚪ PLANNED
**What you'll see**: Automatic push notification token registration when users log in.

**User Experience**:
- As a user, push notifications are automatically set up
- As a user, I don't need to manually enable notifications
- As a user, my device token is registered in the database
- As a developer, I can see push tokens in Supabase

**What needs to be built**:
- [ ] Create usePushNotifications hook
- [ ] Request push permissions on mobile
- [ ] Listen for device token from platform
- [ ] Save token to push_tokens table in Supabase
- [ ] Handle token updates and refreshes
- [ ] Test on iOS and Android
- [ ] Document hook usage

**Files to Create/Modify**:
- `src/hooks/usePushNotifications.ts` - Push token registration

**Hook Implementation**:
```typescript
export const usePushNotifications = () => {
  const user = useAuthStore(state => state.user);
  
  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !user?.id) return;
    
    // Request permission and register
    // Save token to Supabase
  }, [user?.id]);
  
  return { isRegistered, token };
};
```

**Time Estimate**: 3-4 hours

**Acceptance Criteria**:
- ✅ Hook automatically runs when user logs in
- ✅ Push permissions requested correctly
- ✅ Tokens saved to push_tokens table
- ✅ Works on both iOS and Android
- ✅ Handles permission denial gracefully

---

## Story 7.2.4: Push Tokens Database Table ⚪ PLANNED
**What you'll see**: Database table to store device push tokens for notifications.

**User Experience**:
- As an admin, I can see which devices users have registered
- As a system, I can send push notifications to user devices
- As a user, I receive notifications on all my devices
- As a user, old device tokens are automatically cleaned up

**What needs to be built**:
- [ ] Create push_tokens table in Supabase
- [ ] Add RLS policies for security
- [ ] Add indexes for performance
- [ ] Create upsert logic for token updates
- [ ] Test token storage and retrieval
- [ ] Document table schema

**Database Schema**:
```sql
CREATE TABLE push_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, platform)
);
```

**Time Estimate**: 1-2 hours

**Acceptance Criteria**:
- ✅ push_tokens table created
- ✅ RLS policies protect user data
- ✅ Indexes added for queries
- ✅ Unique constraint prevents duplicates
- ✅ Cascade delete when user deleted

---

## Story 7.2.5: Integrated Auth Flow with Push Registration ⚪ PLANNED
**What you'll see**: Push notifications automatically enabled when users log in.

**User Experience**:
- As a user, when I log in, push notifications are set up automatically
- As a user, I see a permission prompt on first login
- As a user, my token is registered without extra steps
- As a developer, I don't need to manually call push setup

**What needs to be built**:
- [ ] Integrate usePushNotifications into Layout component
- [ ] Add push setup to auth flow
- [ ] Test complete login → push registration flow
- [ ] Add loading states for push registration
- [ ] Handle errors gracefully
- [ ] Document the integrated flow

**Files to Create/Modify**:
- `src/components/Layout.tsx` - Add push hook
- `src/store/authStore.ts` - May need updates

**Integration Example**:
```typescript
// In Layout.tsx
const { isRegistered } = usePushNotifications();

// Automatically registers on mount if user logged in
```

**Time Estimate**: 2-3 hours

**Acceptance Criteria**:
- ✅ Push registration happens on login
- ✅ No manual setup required by user
- ✅ Works seamlessly across platforms
- ✅ Errors handled gracefully
- ✅ User sees appropriate feedback

---

## Epic 7.2 Summary

**Total Stories**: 5 stories
**Status**: ⚪ Ready to start after EPIC 7.1
**Prerequisites**: 
- EPIC 7.1 complete (Capacitor installed)
- iOS/Android platforms set up
- push_tokens table created in Supabase

**Estimated Timeline**: 1.5-2 weeks (12-17 hours)

**Deliverables**:
1. Secure token storage (Keychain/EncryptedSharedPreferences)
2. Enhanced Supabase client with PKCE
3. Automatic push token registration
4. push_tokens database table
5. Integrated auth + push flow

**Security Improvements**:
- 🔒 iOS Keychain for token storage (App Store requirement)
- 🔒 Android EncryptedSharedPreferences
- 🔒 PKCE auth flow (more secure than implicit)
- 🔒 Platform identification in requests
- 🔒 Proper RLS policies on push_tokens

**User Impact**: Production-ready security for mobile apps - users' data is protected, and push notifications are automatically configured

**Next Epic**: EPIC 7.3 - Enhanced Offline Mode with PWA
