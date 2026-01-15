# Story 10.1.7: In-Chat Action Buttons

**Epic:** [Epic 10.1: Unified Sharing Ecosystem](../epics/EPIC_10.1_Unified_Sharing_Ecosystem.md)  
**Status:** 🔴 NOT STARTED  
**Priority:** 🔴 Critical  
**Effort:** 2 days  
**Dependencies:** Story 10.1.6 (Rich Link Previews)

---

## 📋 Overview

Add inline action buttons (Favorite, Follow, Add Friend) to link preview cards in chat, enabling users to take immediate action on shared content without navigating away from the conversation.

---

## 🎯 Acceptance Criteria

### AC-1: Action Buttons by Entity Type
**Given** a link preview card is displayed in chat  
**When** the preview type is a SynC entity  
**Then** show the appropriate action button(s):

| Preview Type | Primary Action | Icon | Button Text |
|--------------|----------------|------|-------------|
| `sync-storefront` | Follow Business | Bell/+ | "Follow" / "Following" |
| `sync-product` | Favorite Product | Heart | "Save" / "Saved" |
| `sync-offer` | Favorite Offer | Heart | "Save" / "Saved" |
| `sync-profile` | Add Friend | UserPlus | "Add Friend" / "Friends" / "Requested" |

---

### AC-2: Storefront Preview - Follow Button
**Given** I receive a storefront link in chat  
**When** the preview renders  
**Then** I see a "Follow" button at the bottom of the card:
- Initial state: "Follow" with Bell icon
- After following: "Following" with checkmark
- Loading state: Spinner while processing

**Implementation:**
```tsx
function FollowBusinessButton({ businessId, compact = false }: Props) {
  const { isFollowing, isLoading, toggleFollow } = useBusinessFollow(businessId);
  
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        toggleFollow();
      }}
      disabled={isLoading}
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
        isFollowing
          ? 'bg-purple-100 text-purple-700'
          : 'bg-purple-600 text-white hover:bg-purple-700'
      )}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : isFollowing ? (
        <>
          <Check className="w-4 h-4" />
          {!compact && 'Following'}
        </>
      ) : (
        <>
          <Bell className="w-4 h-4" />
          {!compact && 'Follow'}
        </>
      )}
    </button>
  );
}
```

---

### AC-3: Product Preview - Favorite Button
**Given** I receive a product link in chat  
**When** the preview renders  
**Then** I see a "Save" button:
- Initial state: Outline heart with "Save"
- After favoriting: Filled heart with "Saved"
- Works inline without navigation

**Implementation:**
```tsx
function FavoriteProductButton({ productId, iconOnly = false }: Props) {
  const { isFavorite, isLoading, toggleFavorite } = useFavorites();
  const isFavorited = isFavorite(productId);
  
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        toggleFavorite('product', productId);
      }}
      disabled={isLoading}
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
        isFavorited
          ? 'bg-red-100 text-red-600'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      )}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <>
          <Heart className={cn('w-4 h-4', isFavorited && 'fill-current')} />
          {!iconOnly && (isFavorited ? 'Saved' : 'Save')}
        </>
      )}
    </button>
  );
}
```

---

### AC-4: Offer Preview - Favorite Button
**Given** I receive an offer link in chat  
**When** the preview renders  
**Then** I see a "Save" button similar to product favorite

---

### AC-5: Profile Preview - Add Friend Button
**Given** I receive a profile link in chat  
**When** the preview renders  
**Then** I see an "Add Friend" button:

| State | Button Text | Icon |
|-------|-------------|------|
| Not friends, no request | "Add Friend" | UserPlus |
| Request sent | "Requested" | Clock |
| Request received | "Accept" | Check |
| Already friends | "Friends" | Users |
| This is me | (no button) | - |
| Blocked | (no button) | - |

**Implementation:**
```tsx
function AddFriendButton({ userId, compact = false }: Props) {
  const { user } = useAuth();
  const { friendshipStatus, sendRequest, acceptRequest, isLoading } = useFriendship(userId);
  
  // Don't show for self
  if (userId === user?.id) return null;
  
  // Don't show for blocked users
  if (friendshipStatus === 'blocked') return null;
  
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (friendshipStatus === 'none') {
      sendRequest();
    } else if (friendshipStatus === 'request_received') {
      acceptRequest();
    }
  };
  
  const getButtonContent = () => {
    switch (friendshipStatus) {
      case 'friends':
        return { icon: Users, text: 'Friends', disabled: true, style: 'bg-green-100 text-green-700' };
      case 'request_sent':
        return { icon: Clock, text: 'Requested', disabled: true, style: 'bg-yellow-100 text-yellow-700' };
      case 'request_received':
        return { icon: Check, text: 'Accept', disabled: false, style: 'bg-blue-600 text-white' };
      default:
        return { icon: UserPlus, text: 'Add Friend', disabled: false, style: 'bg-blue-500 text-white hover:bg-blue-600' };
    }
  };
  
  const { icon: Icon, text, disabled, style } = getButtonContent();
  
  return (
    <button
      onClick={handleClick}
      disabled={disabled || isLoading}
      className={cn('inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors', style)}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <>
          <Icon className="w-4 h-4" />
          {!compact && text}
        </>
      )}
    </button>
  );
}
```

---

### AC-6: business_follows Table
**Given** users can follow businesses  
**When** implementing the Follow feature  
**Then** create database table:

```sql
CREATE TABLE IF NOT EXISTS business_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, business_id)
);

CREATE INDEX idx_business_follows_user ON business_follows(user_id);
CREATE INDEX idx_business_follows_business ON business_follows(business_id);

-- RLS
ALTER TABLE business_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their follows"
  ON business_follows FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create follows"
  ON business_follows FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their follows"
  ON business_follows FOR DELETE
  USING (auth.uid() = user_id);
```

---

### AC-7: useBusinessFollow Hook
**Given** components need follow state management  
**When** this story is complete  
**Then** create `src/hooks/useBusinessFollow.ts`:

```typescript
interface UseBusinessFollowReturn {
  isFollowing: boolean;
  isLoading: boolean;
  followersCount: number;
  toggleFollow: () => Promise<void>;
  follow: () => Promise<void>;
  unfollow: () => Promise<void>;
}

export function useBusinessFollow(businessId: string): UseBusinessFollowReturn {
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const { user } = useAuth();
  
  // Check follow status on mount
  useEffect(() => {
    if (!user?.id || !businessId) return;
    
    async function checkFollow() {
      const { data } = await supabase
        .from('business_follows')
        .select('id')
        .eq('user_id', user.id)
        .eq('business_id', businessId)
        .single();
      
      setIsFollowing(!!data);
    }
    
    checkFollow();
  }, [user?.id, businessId]);
  
  const toggleFollow = async () => {
    if (isFollowing) {
      await unfollow();
    } else {
      await follow();
    }
  };
  
  const follow = async () => {
    if (!user?.id || isLoading) return;
    
    setIsLoading(true);
    try {
      await supabase
        .from('business_follows')
        .insert({ user_id: user.id, business_id: businessId });
      
      setIsFollowing(true);
      setFollowersCount(prev => prev + 1);
      toast.success('Now following this business');
      
      // Track conversion if from a share
      const ref = new URLSearchParams(window.location.search).get('ref');
      if (ref) {
        await unifiedShareService.trackConversion(ref, 'follow', user.id);
      }
    } catch (error) {
      toast.error('Failed to follow');
    } finally {
      setIsLoading(false);
    }
  };
  
  const unfollow = async () => {
    if (!user?.id || isLoading) return;
    
    setIsLoading(true);
    try {
      await supabase
        .from('business_follows')
        .delete()
        .eq('user_id', user.id)
        .eq('business_id', businessId);
      
      setIsFollowing(false);
      setFollowersCount(prev => Math.max(0, prev - 1));
      toast.success('Unfollowed');
    } catch (error) {
      toast.error('Failed to unfollow');
    } finally {
      setIsLoading(false);
    }
  };
  
  return { isFollowing, isLoading, followersCount, toggleFollow, follow, unfollow };
}
```

---

### AC-8: Remove "Favorite Business" Functionality
**Given** the clarification that businesses should be followed, not favorited  
**When** implementing this story  
**Then**:
1. Audit existing code for "Favorite Business" functionality
2. Remove or migrate to "Follow" where found
3. Update any UI that says "Favorite" for businesses to "Follow"

**Files to audit:**
- `src/components/business/BusinessProfile.tsx`
- `src/components/favorites/FavoriteBusinessButton.tsx` (if exists)
- `src/hooks/useFavorites.ts`

---

### AC-9: Inline Action - No Navigation
**Given** actions should work inline  
**When** a user clicks an action button on a preview  
**Then**:
1. The action is performed immediately
2. The user stays in the chat conversation
3. No navigation to detail page occurs
4. Toast notification confirms the action

---

### AC-10: Conversion Tracking
**Given** shares are tracked  
**When** a user takes an action from a shared preview  
**Then** track the conversion:

```typescript
// When favoriting from a shared link
const handleFavorite = async () => {
  await toggleFavorite();
  
  // Check if this came from a share
  const ref = preview.url && new URL(preview.url).searchParams.get('ref');
  if (ref) {
    await unifiedShareService.trackConversion(ref, 'favorite', user.id);
  }
};
```

---

### AC-11: LinkPreviewCard Integration
**Given** action buttons need to appear on previews  
**When** this story is complete  
**Then** update `LinkPreviewCard.tsx`:

```tsx
interface LinkPreviewCardProps {
  preview: LinkPreview;
  onRemove?: () => void;
  showRemoveButton?: boolean;
  showActions?: boolean; // NEW - default true for received messages
}

function LinkPreviewCard({ preview, showActions = true, ...props }: Props) {
  const { user } = useAuth();
  
  return (
    <div className="...">
      {/* Preview content */}
      {renderPreviewContent()}
      
      {/* Action buttons */}
      {showActions && preview.metadata?.entityType && (
        <div className="flex items-center gap-2 px-3 py-2 border-t bg-white/50">
          {preview.metadata.entityType === 'storefront' && preview.metadata.businessId && (
            <FollowBusinessButton businessId={preview.metadata.businessId} />
          )}
          {preview.metadata.entityType === 'product' && preview.metadata.productId && (
            <FavoriteProductButton productId={preview.metadata.productId} />
          )}
          {preview.metadata.entityType === 'offer' && preview.metadata.offerId && (
            <FavoriteOfferButton offerId={preview.metadata.offerId} />
          )}
          {preview.metadata.entityType === 'profile' && preview.metadata.userId && preview.metadata.userId !== user?.id && (
            <AddFriendButton userId={preview.metadata.userId} />
          )}
        </div>
      )}
    </div>
  );
}
```

---

## 📁 Files to Create/Modify

### New Files
| File | Purpose |
|------|---------|
| `src/components/sharing/FollowBusinessButton.tsx` | Follow button component |
| `src/hooks/useBusinessFollow.ts` | Follow state hook |
| `supabase/migrations/xxx_create_business_follows.sql` | Database migration |

### Modified Files
| File | Changes |
|------|---------|
| `src/components/messaging/LinkPreviewCard.tsx` | Add action buttons section |
| `src/components/favorites/FavoriteProductButton.tsx` | Enhance for inline use |
| `src/components/favorites/FavoriteOfferButton.tsx` | Enhance for inline use |
| `src/components/friends/AddFriendButton.tsx` | Enhance for inline use |

---

## 🎨 UI Mockup Description

### Storefront Preview with Follow Button
```
┌─────────────────────────────────────┐
│ ┌────┐                              │
│ │Logo│  Coffee House NYC            │
│ │    │  Fresh roasted coffee daily  │
│ └────┘  🏪 Business                 │
├─────────────────────────────────────┤
│  [🔔 Follow]                        │
└─────────────────────────────────────┘
```

### Product Preview with Favorite Button
```
┌─────────────────────────────────────┐
│ ┌──────┐                            │
│ │ Img  │  Organic Coffee Beans      │
│ │      │  $24.99                    │
│ └──────┘  at Cafe Delight           │
├─────────────────────────────────────┤
│  [♡ Save]                           │
└─────────────────────────────────────┘
```

### Profile Preview with Add Friend Button
```
┌─────────────────────────────────────┐
│ ┌────┐                              │
│ │ 👤 │  John Doe                    │
│ │    │  Connect on SynC             │
│ └────┘  👤 Profile                  │
├─────────────────────────────────────┤
│  [👤+ Add Friend]                   │
└─────────────────────────────────────┘
```

---

## 🧪 Testing Checklist

### Follow Business
- [ ] Follow button appears on storefront previews
- [ ] Follow toggles correctly
- [ ] Following state persists
- [ ] No navigation when clicking Follow
- [ ] Toast confirmation shown

### Favorite Product/Offer
- [ ] Favorite button appears on product previews
- [ ] Favorite button appears on offer previews
- [ ] Favorite toggles correctly
- [ ] Saved state shows filled heart
- [ ] Works inline without navigation

### Add Friend
- [ ] Add Friend button appears on profile previews
- [ ] Button not shown for own profile
- [ ] Correct state: None → Requested → Friends
- [ ] Accept button for received requests
- [ ] Works inline

### Conversion Tracking
- [ ] Favorite from shared link tracks conversion
- [ ] Follow from shared link tracks conversion
- [ ] Add friend from shared link tracks conversion
- [ ] Conversion linked to share event via ref param

---

## ✅ Definition of Done

- [ ] business_follows table created
- [ ] useBusinessFollow hook implemented
- [ ] FollowBusinessButton component created
- [ ] FavoriteProductButton enhanced
- [ ] FavoriteOfferButton enhanced
- [ ] AddFriendButton enhanced
- [ ] LinkPreviewCard updated with action buttons
- [ ] "Favorite Business" removed (replaced with Follow)
- [ ] Conversion tracking implemented
- [ ] All buttons work inline
- [ ] All tests passing
- [ ] Code reviewed and merged

---

## 📝 Notes

- Follow vs Favorite clarification: Businesses are FOLLOWED (for updates), Products/Offers are FAVORITED (saved)
- Action buttons should only show for the message recipient, not the sender
- Consider caching follow/favorite state to reduce API calls
- Real-time subscription may be needed for follow count updates
- This is a critical feature for in-chat engagement
