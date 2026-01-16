# Story 10.1.5: User Profile Sharing

**Epic:** [Epic 10.1: Unified Sharing Ecosystem](../epics/EPIC_10.1_Unified_Sharing_Ecosystem.md)  
**Status:** ✅ COMPLETE  
**Priority:** 🟡 Medium  
**Effort:** 1 day  
**Dependencies:** Story 10.1.1 (Share Infrastructure)

---

## 📋 Overview

Implement share functionality for User Profiles, enabling users to share their own profile or their friends' profiles (respecting privacy settings) via in-app chat, external apps, and social media.

---

## 🎯 Acceptance Criteria

### AC-1: Share Button on Own Profile Page
**Given** I am viewing my own profile page  
**When** I look at the profile header  
**Then** I see a "Share Profile" button  
**And** clicking it opens the share modal

**Location:** `src/pages/Profile.tsx` or profile header component

---

### AC-2: Share Button on Friend Profile Modal
**Given** I open a friend's profile (via FriendProfileModal)  
**When** I look at the modal actions  
**Then** I see a Share button (if their profile is public)

**Location:** `src/components/friends/FriendProfileModal.tsx`

---

### AC-3: Share Profile Option in Settings
**Given** I am in my profile settings  
**When** I look at the options  
**Then** I see "Share my profile" option

**Location:** Profile settings dropdown or page

---

### AC-4: Privacy Settings Check
**Given** profiles can be public or private  
**When** attempting to share a profile  
**Then**:

| Profile Status | External Share | In-App Chat Share |
|----------------|----------------|-------------------|
| Public | ✅ Full share | ✅ Full preview |
| Private | ❌ Blocked (or limited) | ⚠️ Limited preview |

**Privacy Check:**
```typescript
async function canShareProfile(userId: string): Promise<{ external: boolean; chat: boolean }> {
  const { data: settings } = await supabase
    .from('privacy_settings')
    .select('profile_visibility')
    .eq('user_id', userId)
    .single();
  
  const isPublic = settings?.profile_visibility !== 'private';
  
  return {
    external: isPublic,
    chat: true // Can always share in-app, but preview may be limited
  };
}
```

---

### AC-5: Share Data Preparation
**Given** I am sharing a user profile  
**When** the share data is prepared  
**Then** it includes:

| Field | Value |
|-------|-------|
| Title | User's full name |
| Description | `${fullName} is on SynC - Connect with them!` |
| Image | User's avatar URL |
| URL | `/profile/${userId}` |

**For private profiles (in-app only):**
| Field | Value |
|-------|-------|
| Title | "SynC User" (or first name only) |
| Description | "This profile is private" |
| Image | Default avatar |
| URL | `/profile/${userId}` |

---

### AC-6: ProfileShareButton Component
**Given** the need for a reusable share button  
**When** this story is complete  
**Then** `src/components/sharing/ProfileShareButton.tsx` exists:

```tsx
interface ProfileShareButtonProps {
  userId: string;
  fullName: string;
  avatarUrl?: string;
  isOwnProfile?: boolean;
  isPrivate?: boolean;
  variant?: 'icon' | 'button' | 'menu-item';
  className?: string;
}

export function ProfileShareButton({
  userId,
  fullName,
  avatarUrl,
  isOwnProfile = false,
  isPrivate = false,
  variant = 'icon',
  className
}: ProfileShareButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // For private profiles, only show in-app sharing options
  const externalShareDisabled = isPrivate && !isOwnProfile;

  const shareData = useMemo(() => ({
    entityType: 'profile' as const,
    entityId: userId,
    title: isPrivate && !isOwnProfile ? 'SynC User' : fullName,
    description: isPrivate && !isOwnProfile 
      ? 'This profile is private - connect on SynC to see more'
      : `${fullName} is on SynC - Connect with them!`,
    imageUrl: isPrivate && !isOwnProfile ? undefined : avatarUrl,
    url: `${window.location.origin}/profile/${userId}`
  }), [userId, fullName, avatarUrl, isPrivate, isOwnProfile]);

  // ... render
}
```

---

### AC-7: Share to Chat Flow for Profiles
**Given** I share a profile via chat  
**When** the message is sent  
**Then** the chat message contains a `sync-profile` link preview with:
- User avatar (or placeholder)
- Full name (or "SynC User" if private)
- "View Profile" CTA
- Add Friend button (shown in Story 10.1.7)

**Message Structure:**
```typescript
await messagingService.sendMessage({
  conversationId: conversationId,
  content: customMessage || `Check out ${fullName} on SynC!`,
  type: 'link',
  linkPreviews: [{
    url: shareUrl,
    title: fullName,
    description: `Connect with ${fullName} on SynC`,
    image: avatarUrl,
    type: 'sync-profile',
    metadata: {
      entityType: 'profile',
      entityId: userId,
      userId: userId,
      isPrivate: isPrivate
    }
  }]
});
```

---

### AC-8: Sharing Own Profile vs Others
**Given** I want to share a profile  
**When** it's my own profile  
**Then**:
- Full share data is always used (no privacy restriction)
- Share text: "Check out my profile on SynC!"
- I can share both externally and in-app

**When** it's someone else's profile  
**Then**:
- Respect their privacy settings
- Share text: "Check out [Name] on SynC!"
- May be limited to in-app only

---

### AC-9: Private Profile External Share Block
**Given** I try to share a private profile externally  
**When** clicking external share options  
**Then** show a message: "This profile is private and can only be shared within SynC"

```tsx
const handleExternalShare = () => {
  if (isPrivate && !isOwnProfile) {
    toast.error('This profile is private and can only be shared within SynC');
    return;
  }
  // Proceed with share
};
```

---

### AC-10: Profile URL Handling
**Given** someone clicks a shared profile link  
**When** they visit the URL  
**Then**:
- If public: Show full profile
- If private: Show limited info with "Send Friend Request" option
- If already friends: Show full profile

---

## 📁 Files to Create/Modify

### New Files
| File | Purpose |
|------|---------|
| `src/components/sharing/ProfileShareButton.tsx` | Profile-specific share button |

### Modified Files
| File | Changes |
|------|---------|
| `src/pages/Profile.tsx` | Add share button to own profile |
| `src/components/friends/FriendProfileModal.tsx` | Add share button |
| `src/components/sharing/ShareModal.tsx` | Handle privacy restrictions |

---

## 🎨 UI Mockup Description

### Profile Page with Share Button
```
┌─────────────────────────────────────┐
│  [Cover Image]                      │
│  ┌─────┐                            │
│  │ 👤  │  John Doe        [Edit]    │
│  │Avatar│  @johndoe       [Share]   │ <- Share button
│  └─────┘                            │
│                                     │
│  [Friends: 42] [Following: 15]      │
└─────────────────────────────────────┘
```

### Share Modal for Profile
```
┌─────────────────────────────────────┐
│  Share Profile                [X]   │
├─────────────────────────────────────┤
│  ┌──────┐                           │
│  │ 👤   │ John Doe                  │
│  │      │ Connect on SynC!          │
│  └──────┘                           │
├─────────────────────────────────────┤
│  [💬] Send to Friend                │
│  [🔗] Copy Link                     │
├─────────────────────────────────────┤
│  [FB] [TW] [WA] [📧] [...]          │
└─────────────────────────────────────┘
```

### Private Profile Share Modal (Limited)
```
┌─────────────────────────────────────┐
│  Share Profile                [X]   │
├─────────────────────────────────────┤
│  ┌──────┐                           │
│  │ 👤   │ SynC User                 │
│  │      │ This profile is private   │
│  └──────┘                           │
├─────────────────────────────────────┤
│  [💬] Send to Friend                │
│  ─────────────────────────          │
│  🔒 External sharing disabled       │
│     This profile is private         │
└─────────────────────────────────────┘
```

---

## 🧪 Testing Checklist

### Visual Tests
- [ ] Share button on own profile page
- [ ] Share button on friend profile modal
- [ ] Share option in profile settings
- [ ] Private profile shows limited modal

### Functional Tests
- [ ] Share own profile (full data)
- [ ] Share public friend profile (full data)
- [ ] Share private friend profile (limited)
- [ ] External share blocked for private profiles
- [ ] In-app share works for private profiles
- [ ] Profile URL resolves correctly

### Privacy Tests
- [ ] Privacy settings respected
- [ ] Private profiles show placeholder avatar
- [ ] Private profiles hide full name (externally)
- [ ] Own profile always fully shareable

---

## ✅ Definition of Done

- [ ] ProfileShareButton component created
- [ ] Share button on own profile page
- [ ] Share button on friend profile modal
- [ ] Privacy checks implemented
- [ ] Limited share for private profiles
- [ ] All share methods working (with restrictions)
- [ ] Profile link preview in chat
- [ ] All tests passing
- [ ] Code reviewed and merged

---

## 📝 Notes

- This is lower priority than entity sharing (Storefront/Product/Offer)
- Consider adding "Find me on SynC" shareable card for new users
- The profile URL should handle both /profile/[id] and /user/[id] if both exist
- Mutual friends could be shown as social proof in the share preview
