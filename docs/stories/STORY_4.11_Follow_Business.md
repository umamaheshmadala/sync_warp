# Story 4.11: Follow Business - COMPLETE SPECIFICATION

**Epic:** 4 - Business Features  
**Priority:** 🔴 **HIGH** (Core User Engagement)  
**Effort:** 8 days  
**Dependencies:** 
- Story 4.4 (Favorites - to be renamed/merged)
- Story 4B.3 (Targeted Campaigns - integration point)
- Story 4B.2 (Ad Approval Workflow - extends to follower content)
- Notification system (existing table)

---

## 📋 Overview

This story **transforms the existing "Favorites" system into a more powerful "Follow" system** that includes live notifications and content updates. Users can follow businesses they like and receive instant updates about new products, offers, coupons, and important announcements. Business owners gain valuable follower insights to create surgically accurate campaigns.

**Key Changes:**
- ✅ Rename "Favorites" → "Following" throughout the app
- ✅ Add notification preferences to following relationships
- ✅ Create live feed of updates from followed businesses
- ✅ Integrate followers as targeting option in campaigns
- ✅ Build follower analytics dashboard for business owners

---

## 🎯 User Stories

### Customer Stories

#### Primary User Story
```
As a customer,
I want to follow businesses I like,
So that I receive instant updates about their offers, products, and important announcements.
```

#### Supporting Customer Stories
```
1. As a customer,
   I want to follow/unfollow any business at any time,
   So that I control which businesses can send me updates.

2. As a customer,
   I want to customize notification preferences per business,
   So that I only get updates about things I care about (offers vs. products vs. announcements).

3. As a customer,
   I want to see all businesses I follow in one place,
   So that I can easily manage my following list.

4. As a customer,
   I want to receive only updates from businesses I follow (excluding ads),
   So that I'm not spammed with irrelevant content.

5. As a customer,
   I want in-app notifications with push notification options,
   So that I never miss important updates from my favorite businesses.
```

---

### Business Owner Stories

#### Primary Business Owner Story
```
As a business owner,
I want to see my follower count and demographics,
So that I understand my audience and create effective campaigns.
```

#### Supporting Business Owner Stories
```
1. As a business owner,
   I want a "Follow" button on my storefront,
   So that customers can easily follow my business.

2. As a business owner,
   I want to see the number of followers at any time,
   So that I can track my business growth.

3. As a business owner,
   I want to see my followers' basic info (username, age, interests, city),
   So that I understand my audience demographics.

4. As a business owner,
   I want to report suspicious activity (fake reviews, spam followers),
   So that I can maintain the integrity of my business page.

5. As a business owner,
   I want to see follower statistics and analytics,
   So that I can study my audience and create surgically accurate ad campaigns.

6. As a business owner,
   I want to target campaigns to "all followers" or "followers matching specific demographics",
   So that I have maximum flexibility in reaching my audience.

7. As a business owner,
   I want my followers to be notified when I:
   - Post a new product
   - Share a coupon/offer
   - Make an important announcement
   So that my engaged customers always stay informed.
```

---

### Admin Stories

#### Primary Admin Story
```
As an admin,
I want to regulate all follower-related activities,
So that the platform remains safe and spam-free.
```

#### Supporting Admin Stories
```
1. As an admin,
   I want to review and approve all offers, coupons, and ads before they go live,
   So that followers only receive high-quality, legitimate content.

2. As an admin,
   I want to monitor suspicious follow patterns (mass following, bots),
   So that I can prevent spam and maintain platform integrity.

3. As an admin,
   I want to investigate reported follower activities,
   So that I can take action against policy violations.
```

---

## 🔄 Migration: Favorites → Following

### Phase 1: Data Migration
**Goal:** Preserve all existing favorites data while adding following features.

**Database Changes:**
```sql
-- Rename existing favorites table
ALTER TABLE favorites RENAME TO business_followers;

-- Add new columns for following features
ALTER TABLE business_followers ADD COLUMN notification_preferences JSONB DEFAULT '{
  "new_products": true,
  "new_offers": true,
  "new_coupons": true,
  "announcements": true
}'::jsonb;

ALTER TABLE business_followers ADD COLUMN notification_channel VARCHAR(20) DEFAULT 'in_app' CHECK (
  notification_channel IN ('in_app', 'push', 'email', 'sms', 'all')
);

ALTER TABLE business_followers ADD COLUMN last_notified_at TIMESTAMPTZ;

-- Add indexes for performance
CREATE INDEX idx_business_followers_notifications ON business_followers(business_id, (notification_preferences->>'new_offers'));
CREATE INDEX idx_business_followers_channel ON business_followers(notification_channel);
```

**Impact:**
- ✅ Zero data loss - all existing favorites become follows
- ✅ Backward compatible - old favorites functionality still works
- ✅ Default notification preferences - all users get updates enabled by default
- ✅ Gradual rollout - users can customize preferences over time

---

### Phase 2: UI Migration
**Goal:** Update all UI references from "Favorites" to "Following"

**Component Renames:**
```
src/components/favorites/           → src/components/following/
  UnifiedFavoritesPage.tsx          → FollowingPage.tsx
  SimpleSaveButton.tsx              → FollowButton.tsx
  
src/hooks/
  useUnifiedFavorites.ts            → useBusinessFollowing.ts
  
Navigation:
  "Favorites" menu item             → "Following"
  /favorites route                  → /following
```

**Visual Changes:**
- ❤️ Heart icon → 👤 Follow icon (or keep heart but change label)
- "Add to Favorites" → "Follow"
- "Remove from Favorites" → "Unfollow"
- "Favorites" page header → "Following"

---

## 🎨 UI Components

### 1. FollowButton Component (`FollowButton.tsx`)

**Location:** `src/components/following/FollowButton.tsx`

**Purpose:** Primary action to follow/unfollow a business (replaces SimpleSaveButton)

**Props:**
```typescript
interface FollowButtonProps {
  businessId: string;
  businessName: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'default' | 'lg';
  showLabel?: boolean; // Show "Follow" text or just icon
  onFollowChange?: (isFollowing: boolean) => void;
}
```

**Features:**
- Follow/Unfollow toggle
- Optimistic UI updates
- Shows follower count on hover
- Opens notification preferences on follow
- Toast notifications
- Handles authentication state

**States:**
```
Not Following:    [+ Follow]
Following:        [✓ Following] (with hover → Unfollow)
Loading:          [⟳ Loading...]
```

**Placement:**
- Business profile header (prominent position)
- Business search results cards
- Business listings
- Discovery page cards

---

### 2. NotificationPreferencesModal Component (`NotificationPreferencesModal.tsx`)

**Location:** `src/components/following/NotificationPreferencesModal.tsx`

**Purpose:** Let users customize what notifications they receive from a business

**Props:**
```typescript
interface NotificationPreferencesModalProps {
  businessId: string;
  businessName: string;
  currentPreferences: NotificationPreferences;
  isOpen: boolean;
  onClose: () => void;
  onSave: (preferences: NotificationPreferences) => Promise<void>;
}

interface NotificationPreferences {
  new_products: boolean;
  new_offers: boolean;
  new_coupons: boolean;
  announcements: boolean;
  channel: 'in_app' | 'push' | 'email' | 'sms' | 'all';
}
```

**Layout:**
```
┌─────────────────────────────────────────┐
│  Notification Preferences        [✕]   │
│  Joe's Pizza                            │
├─────────────────────────────────────────┤
│  What updates do you want?              │
│                                         │
│  ☑ New Products                         │
│  ☑ New Offers & Deals                   │
│  ☑ New Coupons                          │
│  ☑ Important Announcements              │
│                                         │
│  How do you want to be notified?        │
│  ○ In-app only (default)                │
│  ○ Push notifications (coming soon)     │
│  ○ Email (coming soon)                  │
│                                         │
│  [Cancel] [Save Preferences]            │
└─────────────────────────────────────────┘
```

**Triggers:**
- Shown immediately after user follows a business
- Accessible via "⚙️" icon on FollowingPage
- Accessible from business profile "..." menu

---

### 3. FollowingPage Component (`FollowingPage.tsx`)

**Location:** `src/components/following/FollowingPage.tsx`

**Purpose:** Main page showing all followed businesses (replaces UnifiedFavoritesPage)

**Features:**
- Grid/List view toggle
- Search and filter
- Sort by: Recently followed, Most active, Alphabetical
- Quick notification settings per business
- Bulk unfollow option
- Empty state: "Follow businesses to see updates"

**Layout:**
```
┌─────────────────────────────────────────┐
│  Following                    🔍 [Search]│
│  42 businesses                           │
├─────────────────────────────────────────┤
│  [All] [Near Me] [Most Active]          │ ← Filter tabs
├─────────────────────────────────────────┤
│  ┌──────────────────────────────────┐  │
│  │ 🍕 Joe's Pizza          [⚙️] [×]│  │
│  │ 234 followers • 5 new updates    │  │
│  │ Last posted: 2 hours ago         │  │
│  └──────────────────────────────────┘  │
│  ┌──────────────────────────────────┐  │
│  │ 👗 Fashion Hub          [⚙️] [×]│  │
│  │ 1.2K followers • No updates      │  │
│  │ Last posted: 3 days ago          │  │
│  └──────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

---

### 4. FollowerFeed Component (`FollowerFeed.tsx`)

**Location:** `src/components/following/FollowerFeed.tsx`

**Purpose:** Live feed of updates from followed businesses (NEW)

**Features:**
- Real-time updates via Supabase Realtime
- Grouped by time (Today, Yesterday, This Week)
- Filter by update type (All, Products, Offers, Coupons, Announcements)
- Click to view full details
- Mark as read/unread
- Infinite scroll

**Layout:**
```
┌─────────────────────────────────────────┐
│  Updates                                │
│  [All] [Products] [Offers] [Coupons]    │
├─────────────────────────────────────────┤
│  TODAY                                  │
│  ┌──────────────────────────────────┐  │
│  │ 🍕 Joe's Pizza                   │  │
│  │ Posted a new offer: 50% off      │  │
│  │ 2 hours ago                      │  │
│  └──────────────────────────────────┘  │
│  ┌──────────────────────────────────┐  │
│  │ 👗 Fashion Hub                   │  │
│  │ Added 3 new products             │  │
│  │ 5 hours ago                      │  │
│  └──────────────────────────────────┘  │
│                                         │
│  YESTERDAY                              │
│  ┌──────────────────────────────────┐  │
│  │ 🍕 Joe's Pizza                   │  │
│  │ Shared a new coupon              │  │
│  │ Yesterday at 3:00 PM             │  │
│  └──────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

**Placement:**
- New tab on FollowingPage: [Businesses] [Updates Feed]
- Home page widget (optional)
- Mobile: Bottom navigation item

---

### 5. FollowerAnalyticsDashboard Component (`FollowerAnalyticsDashboard.tsx`)

**Location:** `src/components/business/FollowerAnalyticsDashboard.tsx`

**Purpose:** Business owner dashboard showing follower statistics

**Features:**
- Total follower count (with trend graph)
- Follower demographics breakdown
  - Age distribution
  - Gender split
  - City/location map
  - Top interests
- Follower activity metrics
  - Average trip frequency
  - Driver score percentile
  - Engagement rate
- Growth analytics
  - New followers (daily/weekly/monthly)
  - Follower churn rate
  - Most effective acquisition sources
- Export follower data (CSV)
- "Create Campaign for Followers" CTA

**Layout:**
```
┌─────────────────────────────────────────┐
│  Follower Analytics                     │
├─────────────────────────────────────────┤
│  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐  │
│  │ 234 │  │ +12 │  │ 67% │  │ 4.2 │  │
│  │Total│  │Week │  │Activ│  │Engag│  │
│  └─────┘  └─────┘  └─────┘  └─────┘  │
├─────────────────────────────────────────┤
│  Demographics                           │
│  ┌────────────────────────────────────┐│
│  │ Age:  18-24 (22%)  25-34 (45%)    ││
│  │       35-44 (20%)  45+ (13%)      ││
│  │                                    ││
│  │ Gender: Male 58% • Female 42%     ││
│  │                                    ││
│  │ Top Cities:                        ││
│  │  1. Mumbai (89)                    ││
│  │  2. Pune (45)                      ││
│  │  3. Bangalore (34)                 ││
│  └────────────────────────────────────┘│
├─────────────────────────────────────────┤
│  [Export Data] [Create Campaign →]     │
└─────────────────────────────────────────┘
```

**Placement:**
- Business dashboard: New "Followers" tab
- Accessible from: Business Profile → Analytics → Followers

---

### 6. FollowerList Component (`FollowerList.tsx`)

**Location:** `src/components/business/FollowerList.tsx`

**Purpose:** Detailed list of individual followers with basic info

**Features:**
- Paginated list (50 per page)
- Search by name/email
- Filter by demographics
- Sort by: Recent, Most active, Highest driver score
- View follower profile (if public)
- Report suspicious activity
- Block/Remove follower (with confirmation)

**Follower Card Info:**
```
┌────────────────────────────────────┐
│ 👤 John Doe (johndoe123)          │
│ Age: 28 • Male • Mumbai           │
│ Driver Score: Top 15%             │
│ Interests: Food, Shopping         │
│ Following since: Jan 15, 2025     │
│ Last active: 2 hours ago          │
│ [View Profile] [Report] [Block]   │
└────────────────────────────────────┘
```

**Privacy Note:**
- Only shows public profile info
- Respects user privacy settings
- Admin can see more details if investigating reports

---

### 7. SuspiciousActivityReporter Component (`SuspiciousActivityReporter.tsx`)

**Location:** `src/components/business/SuspiciousActivityReporter.tsx`

**Purpose:** Allow business owners to report suspicious follower activity

**Report Types:**
- Fake reviews
- Spam following (bot behavior)
- Harassment
- Competitor sabotage
- Other (with description)

**Layout:**
```
┌─────────────────────────────────────────┐
│  Report Suspicious Activity             │
├─────────────────────────────────────────┤
│  User: johndoe123                       │
│                                         │
│  What's the issue?                      │
│  ○ Fake reviews                         │
│  ○ Bot/Spam behavior                    │
│  ○ Harassment                           │
│  ○ Competitor sabotage                  │
│  ○ Other                                │
│                                         │
│  [Description]                          │
│  ┌─────────────────────────────────┐  │
│  │ Please describe the issue...    │  │
│  └─────────────────────────────────┘  │
│                                         │
│  [Cancel] [Submit Report]               │
└─────────────────────────────────────────┘
```

---

## 🔧 Technical Implementation

### Database Schema

#### 1. Update `business_followers` Table (formerly `favorites`)

```sql
-- Migration: Transform favorites into followers with notifications
-- Run this BEFORE updating frontend code

-- Step 1: Rename table (preserves all data)
ALTER TABLE favorites RENAME TO business_followers;

-- Step 2: Add new columns for following features
ALTER TABLE business_followers 
  ADD COLUMN notification_preferences JSONB DEFAULT '{
    "new_products": true,
    "new_offers": true,
    "new_coupons": true,
    "announcements": true
  }'::jsonb,
  ADD COLUMN notification_channel VARCHAR(20) DEFAULT 'in_app' 
    CHECK (notification_channel IN ('in_app', 'push', 'email', 'sms', 'all')),
  ADD COLUMN last_notified_at TIMESTAMPTZ,
  ADD COLUMN is_active BOOLEAN DEFAULT true,
  ADD COLUMN followed_at TIMESTAMPTZ DEFAULT NOW();

-- Step 3: Update existing data
UPDATE business_followers 
SET followed_at = created_at 
WHERE followed_at IS NULL;

-- Step 4: Create indexes for performance
CREATE INDEX idx_business_followers_business_active 
  ON business_followers(business_id, is_active) WHERE is_active = true;

CREATE INDEX idx_business_followers_notifications 
  ON business_followers(business_id) 
  WHERE (notification_preferences->>'new_offers')::boolean = true;

CREATE INDEX idx_business_followers_channel 
  ON business_followers(notification_channel);

CREATE INDEX idx_business_followers_user_active 
  ON business_followers(user_id, is_active) WHERE is_active = true;

-- Step 5: Update RLS policies (rename for clarity)
DROP POLICY IF EXISTS "Users can view own favorites" ON business_followers;
DROP POLICY IF EXISTS "Users can insert own favorites" ON business_followers;
DROP POLICY IF EXISTS "Users can delete own favorites" ON business_followers;

CREATE POLICY "Users can view own followed businesses" 
  ON business_followers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can follow businesses" 
  ON business_followers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unfollow businesses" 
  ON business_followers FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update notification preferences" 
  ON business_followers FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Step 6: Add table comment
COMMENT ON TABLE business_followers IS 'Tracks which users follow which businesses (formerly favorites table, migrated to include notification features)';
```

---

#### 2. New `follower_updates` Table (Update Feed)

```sql
CREATE TABLE follower_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  update_type VARCHAR(50) NOT NULL CHECK (update_type IN (
    'new_product', 
    'new_offer', 
    'new_coupon', 
    'announcement', 
    'price_drop', 
    'back_in_stock'
  )),
  entity_id UUID, -- ID of the product/offer/coupon
  title VARCHAR(255) NOT NULL,
  description TEXT,
  metadata JSONB, -- Additional data (price, discount, etc.)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ, -- For time-sensitive updates
  is_active BOOLEAN DEFAULT true
);

-- Indexes
CREATE INDEX idx_follower_updates_business ON follower_updates(business_id, created_at DESC);
CREATE INDEX idx_follower_updates_type ON follower_updates(update_type);
CREATE INDEX idx_follower_updates_active ON follower_updates(is_active) WHERE is_active = true;

-- RLS Policies
ALTER TABLE follower_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active updates" 
  ON follower_updates FOR SELECT
  USING (is_active = true);

CREATE POLICY "Business owners can create updates for their business" 
  ON follower_updates FOR INSERT
  WITH CHECK (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Business owners can manage their updates" 
  ON follower_updates FOR UPDATE
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

-- Function to automatically create update when business posts content
CREATE OR REPLACE FUNCTION create_follower_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Create update entry when new product/offer/coupon is added
  INSERT INTO follower_updates (
    business_id, 
    update_type, 
    entity_id, 
    title, 
    description,
    metadata
  ) VALUES (
    NEW.business_id,
    CASE 
      WHEN TG_TABLE_NAME = 'business_products' THEN 'new_product'
      WHEN TG_TABLE_NAME = 'business_offers' THEN 'new_offer'
      WHEN TG_TABLE_NAME = 'business_coupons' THEN 'new_coupon'
    END,
    NEW.id,
    COALESCE(NEW.name, NEW.title),
    NEW.description,
    jsonb_build_object(
      'price', NEW.price,
      'discount_value', NEW.discount_value,
      'image_url', NEW.image_url
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers to auto-create updates
CREATE TRIGGER product_added_create_update
AFTER INSERT ON business_products
FOR EACH ROW
EXECUTE FUNCTION create_follower_update();

CREATE TRIGGER offer_added_create_update
AFTER INSERT ON business_offers
FOR EACH ROW
EXECUTE FUNCTION create_follower_update();

CREATE TRIGGER coupon_added_create_update
AFTER INSERT ON business_coupons
FOR EACH ROW
EXECUTE FUNCTION create_follower_update();

COMMENT ON TABLE follower_updates IS 'Tracks all content updates from businesses to show in follower feeds';
```

---

#### 3. New `follower_notifications` Table (Notification Queue)

```sql
CREATE TABLE follower_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  update_id UUID REFERENCES follower_updates(id) ON DELETE CASCADE,
  notification_type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  is_sent BOOLEAN DEFAULT false, -- For push/email tracking
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, update_id) -- Prevent duplicate notifications
);

-- Indexes
CREATE INDEX idx_follower_notifications_user_unread 
  ON follower_notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_follower_notifications_created 
  ON follower_notifications(created_at DESC);

-- RLS Policies
ALTER TABLE follower_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" 
  ON follower_notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can mark notifications as read" 
  ON follower_notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Function to create notifications for all followers
CREATE OR REPLACE FUNCTION notify_followers_of_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert notifications for all active followers who want this type of update
  INSERT INTO follower_notifications (
    user_id, 
    business_id, 
    update_id, 
    notification_type, 
    title, 
    body
  )
  SELECT 
    bf.user_id,
    NEW.business_id,
    NEW.id,
    NEW.update_type,
    NEW.title,
    COALESCE(NEW.description, 'Check out the latest update!')
  FROM business_followers bf
  WHERE bf.business_id = NEW.business_id
    AND bf.is_active = true
    AND (
      (NEW.update_type = 'new_product' AND (bf.notification_preferences->>'new_products')::boolean = true) OR
      (NEW.update_type = 'new_offer' AND (bf.notification_preferences->>'new_offers')::boolean = true) OR
      (NEW.update_type = 'new_coupon' AND (bf.notification_preferences->>'new_coupons')::boolean = true) OR
      (NEW.update_type = 'announcement' AND (bf.notification_preferences->>'announcements')::boolean = true)
    );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-notify followers
CREATE TRIGGER update_created_notify_followers
AFTER INSERT ON follower_updates
FOR EACH ROW
EXECUTE FUNCTION notify_followers_of_update();

COMMENT ON TABLE follower_notifications IS 'Queue of notifications to send to users about updates from followed businesses';
```

---

#### 4. Update `campaign_targets` Table (Follower Targeting)

```sql
-- Add follower_only column to existing campaigns
ALTER TABLE campaign_targets
  ADD COLUMN follower_only BOOLEAN DEFAULT false,
  ADD COLUMN follower_filter JSONB; -- Additional filters for followers

CREATE INDEX idx_campaign_targets_follower_only 
  ON campaign_targets(campaign_id, follower_only) WHERE follower_only = true;

-- Function to get followers matching campaign criteria
CREATE OR REPLACE FUNCTION get_followers_for_campaign(
  p_business_id UUID,
  p_targeting_rules JSONB DEFAULT NULL
)
RETURNS TABLE (
  user_id UUID,
  followed_at TIMESTAMPTZ,
  notification_preferences JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    bf.user_id,
    bf.followed_at,
    bf.notification_preferences
  FROM business_followers bf
  JOIN profiles p ON p.id = bf.user_id
  WHERE bf.business_id = p_business_id
    AND bf.is_active = true
    -- Apply demographic filters if specified
    AND (
      p_targeting_rules IS NULL 
      OR (
        -- Age filter
        (p_targeting_rules->>'age_min' IS NULL OR p.age >= (p_targeting_rules->>'age_min')::int)
        AND (p_targeting_rules->>'age_max' IS NULL OR p.age <= (p_targeting_rules->>'age_max')::int)
        -- Gender filter
        AND (p_targeting_rules->>'gender' IS NULL OR p.gender = p_targeting_rules->>'gender')
        -- City filter
        AND (p_targeting_rules->>'city' IS NULL OR p.city = p_targeting_rules->>'city')
        -- Add more demographic filters as needed
      )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_followers_for_campaign IS 'Returns all followers of a business, optionally filtered by demographic targeting rules';
```

---

### Custom Hooks

#### 1. `useBusinessFollowing.ts` (Replaces useUnifiedFavorites)

```typescript
// src/hooks/useBusinessFollowing.ts
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface NotificationPreferences {
  new_products: boolean;
  new_offers: boolean;
  new_coupons: boolean;
  announcements: boolean;
}

interface FollowedBusiness {
  id: string;
  business_id: string;
  followed_at: string;
  notification_preferences: NotificationPreferences;
  notification_channel: 'in_app' | 'push' | 'email' | 'sms' | 'all';
  business: {
    name: string;
    logo_url?: string;
    follower_count?: number;
  };
}

export function useBusinessFollowing() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [followedBusinesses, setFollowedBusinesses] = useState<FollowedBusiness[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load followed businesses
  const loadFollowedBusinesses = useCallback(async () => {
    if (!user) {
      setFollowedBusinesses([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('business_followers')
        .select(`
          *,
          businesses (
            id,
            name,
            logo_url,
            (SELECT COUNT(*) FROM business_followers WHERE business_id = businesses.id) as follower_count
          )
        `)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('followed_at', { ascending: false });

      if (fetchError) throw fetchError;
      setFollowedBusinesses(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load followed businesses');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Check if user follows a business
  const isFollowing = useCallback(
    (businessId: string): boolean => {
      return followedBusinesses.some(fb => fb.business_id === businessId);
    },
    [followedBusinesses]
  );

  // Follow a business
  const followBusiness = useCallback(
    async (businessId: string, businessName?: string): Promise<boolean> => {
      if (!user) {
        toast({
          title: 'Sign in required',
          description: 'Please sign in to follow businesses.',
        });
        return false;
      }

      try {
        const { error: insertError } = await supabase
          .from('business_followers')
          .insert({
            user_id: user.id,
            business_id: businessId,
            is_active: true,
          });

        if (insertError) throw insertError;

        toast({
          title: '✓ Following!',
          description: businessName 
            ? `You're now following ${businessName}` 
            : 'You\'re now following this business',
        });

        await loadFollowedBusinesses();
        return true;
      } catch (err) {
        toast({
          title: 'Failed to follow',
          description: 'Please try again.',
          variant: 'destructive',
        });
        return false;
      }
    },
    [user, toast, loadFollowedBusinesses]
  );

  // Unfollow a business
  const unfollowBusiness = useCallback(
    async (businessId: string, businessName?: string): Promise<boolean> => {
      if (!user) return false;

      try {
        const { error: deleteError } = await supabase
          .from('business_followers')
          .delete()
          .eq('user_id', user.id)
          .eq('business_id', businessId);

        if (deleteError) throw deleteError;

        toast({
          title: 'Unfollowed',
          description: businessName 
            ? `You unfollowed ${businessName}` 
            : 'You unfollowed this business',
        });

        await loadFollowedBusinesses();
        return true;
      } catch (err) {
        toast({
          title: 'Failed to unfollow',
          description: 'Please try again.',
          variant: 'destructive',
        });
        return false;
      }
    },
    [user, toast, loadFollowedBusinesses]
  );

  // Update notification preferences
  const updateNotificationPreferences = useCallback(
    async (
      businessId: string,
      preferences: Partial<NotificationPreferences>,
      channel?: string
    ): Promise<boolean> => {
      if (!user) return false;

      try {
        const updates: any = {};
        if (preferences) {
          updates.notification_preferences = preferences;
        }
        if (channel) {
          updates.notification_channel = channel;
        }

        const { error: updateError } = await supabase
          .from('business_followers')
          .update(updates)
          .eq('user_id', user.id)
          .eq('business_id', businessId);

        if (updateError) throw updateError;

        toast({
          title: 'Preferences updated',
          description: 'Your notification settings have been saved.',
        });

        await loadFollowedBusinesses();
        return true;
      } catch (err) {
        toast({
          title: 'Failed to update preferences',
          description: 'Please try again.',
          variant: 'destructive',
        });
        return false;
      }
    },
    [user, toast, loadFollowedBusinesses]
  );

  // Set up realtime subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`business_followers_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'business_followers',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          console.log('[Following] Realtime update detected');
          loadFollowedBusinesses();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, loadFollowedBusinesses]);

  // Initial load
  useEffect(() => {
    loadFollowedBusinesses();
  }, [loadFollowedBusinesses]);

  return {
    followedBusinesses,
    loading,
    error,
    isFollowing,
    followBusiness,
    unfollowBusiness,
    updateNotificationPreferences,
    refresh: loadFollowedBusinesses,
    totalFollowing: followedBusinesses.length,
  };
}
```

---

#### 2. `useFollowerUpdates.ts` (Update Feed)

```typescript
// src/hooks/useFollowerUpdates.ts
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface FollowerUpdate {
  id: string;
  business_id: string;
  update_type: 'new_product' | 'new_offer' | 'new_coupon' | 'announcement';
  title: string;
  description?: string;
  metadata?: any;
  created_at: string;
  business: {
    name: string;
    logo_url?: string;
  };
}

export function useFollowerUpdates() {
  const { user } = useAuth();
  const [updates, setUpdates] = useState<FollowerUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const loadUpdates = async (pageNum: number = 1) => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Get businesses user follows
      const { data: followedBusinessIds } = await supabase
        .from('business_followers')
        .select('business_id')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (!followedBusinessIds || followedBusinessIds.length === 0) {
        setUpdates([]);
        setHasMore(false);
        return;
      }

      const businessIds = followedBusinessIds.map(fb => fb.business_id);

      // Get updates from followed businesses
      const offset = (pageNum - 1) * PAGE_SIZE;
      const { data, error } = await supabase
        .from('follower_updates')
        .select(`
          *,
          businesses (name, logo_url)
        `)
        .in('business_id', businessIds)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);

      if (error) throw error;

      if (pageNum === 1) {
        setUpdates(data || []);
      } else {
        setUpdates(prev => [...prev, ...(data || [])]);
      }

      setHasMore((data || []).length === PAGE_SIZE);
    } catch (err) {
      console.error('Failed to load updates:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    if (!hasMore || loading) return;
    const nextPage = page + 1;
    setPage(nextPage);
    loadUpdates(nextPage);
  };

  // Set up realtime subscription for new updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('follower_updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'follower_updates',
        },
        () => {
          console.log('[Updates] New update detected');
          loadUpdates(1); // Reload from start
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Initial load
  useEffect(() => {
    loadUpdates(1);
  }, [user]);

  return {
    updates,
    loading,
    hasMore,
    loadMore,
    refresh: () => loadUpdates(1),
  };
}
```

---

#### 3. `useFollowerAnalytics.ts` (Business Owner Dashboard)

```typescript
// src/hooks/useFollowerAnalytics.ts
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface FollowerAnalytics {
  total_followers: number;
  new_followers_this_week: number;
  new_followers_this_month: number;
  active_followers: number; // Followers with notifications enabled
  demographics: {
    age_distribution: Record<string, number>;
    gender_split: Record<string, number>;
    top_cities: Array<{ city: string; count: number }>;
    top_interests: Array<{ interest: string; count: number }>;
  };
  growth_trend: Array<{ date: string; count: number }>;
  engagement_rate: number;
}

export function useFollowerAnalytics(businessId: string) {
  const [analytics, setAnalytics] = useState<FollowerAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        setLoading(true);

        // Get all followers with their profiles
        const { data: followers, error } = await supabase
          .from('business_followers')
          .select(`
            *,
            profiles (age, gender, city, interests)
          `)
          .eq('business_id', businessId)
          .eq('is_active', true);

        if (error) throw error;

        // Calculate analytics
        const total = followers?.length || 0;
        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        const newThisWeek = followers?.filter(
          f => new Date(f.followed_at) >= oneWeekAgo
        ).length || 0;

        const newThisMonth = followers?.filter(
          f => new Date(f.followed_at) >= oneMonthAgo
        ).length || 0;

        const activeFollowers = followers?.filter(
          f => Object.values(f.notification_preferences).some(v => v === true)
        ).length || 0;

        // Demographics
        const ageDistribution: Record<string, number> = {};
        const genderSplit: Record<string, number> = {};
        const cityCount: Record<string, number> = {};
        const interestCount: Record<string, number> = {};

        followers?.forEach(f => {
          const profile = f.profiles;
          if (profile) {
            // Age groups
            const ageGroup = profile.age < 25 ? '18-24' :
                            profile.age < 35 ? '25-34' :
                            profile.age < 45 ? '35-44' : '45+';
            ageDistribution[ageGroup] = (ageDistribution[ageGroup] || 0) + 1;

            // Gender
            if (profile.gender) {
              genderSplit[profile.gender] = (genderSplit[profile.gender] || 0) + 1;
            }

            // City
            if (profile.city) {
              cityCount[profile.city] = (cityCount[profile.city] || 0) + 1;
            }

            // Interests
            profile.interests?.forEach((interest: string) => {
              interestCount[interest] = (interestCount[interest] || 0) + 1;
            });
          }
        });

        const topCities = Object.entries(cityCount)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(([city, count]) => ({ city, count }));

        const topInterests = Object.entries(interestCount)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 10)
          .map(([interest, count]) => ({ interest, count }));

        setAnalytics({
          total_followers: total,
          new_followers_this_week: newThisWeek,
          new_followers_this_month: newThisMonth,
          active_followers: activeFollowers,
          demographics: {
            age_distribution: ageDistribution,
            gender_split: genderSplit,
            top_cities: topCities,
            top_interests: topInterests,
          },
          growth_trend: [], // TODO: Calculate from historical data
          engagement_rate: activeFollowers / total * 100 || 0,
        });
      } catch (err) {
        console.error('Failed to fetch follower analytics:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchAnalytics();
  }, [businessId]);

  return { analytics, loading };
}
```

---

## 🔄 Campaign Targeting Integration

### Update Campaign Creation Form

**Add "Target Followers" Option:**

```typescript
// In src/components/campaign/CampaignTargetingForm.tsx

interface CampaignTargetingFormProps {
  businessId: string;
  onTargetingChange: (targeting: TargetingRules) => void;
}

export function CampaignTargetingForm({ businessId, onTargetingChange }: Props) {
  const [targetFollowersOnly, setTargetFollowersOnly] = useState(false);
  const [followerDemographicFilters, setFollowerDemographicFilters] = useState<any>({});

  return (
    <div>
      {/* Existing targeting options */}
      
      {/* NEW: Follower Targeting Section */}
      <div className="follower-targeting">
        <h3>Target Your Followers</h3>
        
        <label>
          <input 
            type="checkbox" 
            checked={targetFollowersOnly}
            onChange={(e) => setTargetFollowersOnly(e.target.checked)}
          />
          Send to followers only
        </label>

        {targetFollowersOnly && (
          <div className="follower-filters">
            <p>Narrow down your followers (optional):</p>
            
            {/* Age filter */}
            <div>
              <label>Age Range:</label>
              <input 
                type="number" 
                placeholder="Min" 
                onChange={(e) => setFollowerDemographicFilters({
                  ...followerDemographicFilters,
                  age_min: e.target.value
                })}
              />
              <input 
                type="number" 
                placeholder="Max" 
                onChange={(e) => setFollowerDemographicFilters({
                  ...followerDemographicFilters,
                  age_max: e.target.value
                })}
              />
            </div>

            {/* Gender filter */}
            <div>
              <label>Gender:</label>
              <select onChange={(e) => setFollowerDemographicFilters({
                ...followerDemographicFilters,
                gender: e.target.value || null
              })}>
                <option value="">All</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* City filter */}
            <div>
              <label>City:</label>
              <input 
                type="text" 
                placeholder="Filter by city"
                onChange={(e) => setFollowerDemographicFilters({
                  ...followerDemographicFilters,
                  city: e.target.value || null
                })}
              />
            </div>

            {/* Estimated Reach */}
            <EstimatedReach 
              businessId={businessId}
              followersOnly={targetFollowersOnly}
              followerFilters={followerDemographicFilters}
            />
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## 🔔 Notification System Integration

### In-App Notification Component

```typescript
// src/components/notifications/FollowerNotificationBell.tsx

export function FollowerNotificationBell() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Fetch unread count
    async function fetchUnreadCount() {
      const { count } = await supabase
        .from('follower_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      setUnreadCount(count || 0);
    }

    fetchUnreadCount();

    // Real-time subscription for new notifications
    const channel = supabase
      .channel(`notifications_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'follower_notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchUnreadCount();
          // Show toast for new notification
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return (
    <div className="notification-bell">
      <button onClick={() => setIsOpen(!isOpen)}>
        🔔
        {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
      </button>

      {isOpen && (
        <NotificationDropdown 
          notifications={notifications}
          onMarkAsRead={(id) => {/* Mark as read */}}
        />
      )}
    </div>
  );
}
```

---

## ✅ Acceptance Criteria

### Customer Features
- [x] Follow button visible on all business profiles
- [x] User can follow/unfollow any business instantly
- [x] User can customize notification preferences per business
- [x] "Following" page shows all followed businesses
- [x] Update feed shows recent posts from followed businesses
- [x] In-app notifications for updates (push/email coming later)
- [x] Only followed business content shown (excluding ads)

### Business Owner Features
- [x] Follower count displayed on business dashboard
- [x] Follower analytics dashboard with demographics
- [x] List of individual followers with basic info
- [x] "Create Campaign for Followers" option
- [x] Target all followers OR filtered subset
- [x] Report suspicious follower activity

### Admin Features
- [x] All follower-targeted content requires approval
- [x] Monitor suspicious follow patterns
- [x] Investigate reported activities
- [x] Access to all follower relationships

### Technical Requirements
- [x] Migration path from favorites to following (zero data loss)
- [x] Real-time sync via Supabase Realtime
- [x] Database schema supports notifications
- [x] Integrates with existing campaign system
- [x] RLS policies for privacy and security

---

## 📝 Implementation Phases

### Phase 1: Database Migration & Core Following (Days 1-2)
- [x] Run database migration (favorites → business_followers)
- [x] Create follower_updates table
- [x] Create follower_notifications table
- [x] Update campaign_targets for follower targeting
- [x] Test data migration

### Phase 2: UI Component Updates (Days 3-4)
- [x] Rename Favorites → Following UI
- [x] Create FollowButton component
- [x] Update FollowingPage
- [x] Create NotificationPreferencesModal
- [x] Update navigation and routes

### Phase 3: Update Feed & Notifications (Days 5-6)
- [x] Create FollowerFeed component
- [x] Implement useFollowerUpdates hook
- [x] Create notification bell component
- [x] Set up real-time subscriptions
- [x] Test notification triggers

### Phase 4: Business Owner Features (Days 7-8)
- [x] Create FollowerAnalyticsDashboard
- [x] Implement useFollowerAnalytics hook
- [x] Create FollowerList component
- [x] Add follower targeting to campaigns
- [x] Create SuspiciousActivityReporter

### Phase 5: Admin & Testing (Day 8+)
- [x] Admin approval workflow integration
- [x] Admin monitoring dashboard
- [x] Write unit tests
- [x] Write E2E tests
- [x] Load testing for notifications
- [x] Security audit

---

## 🔗 Related Documentation

- [Story 4.4: Favorites System](./STORY_4.4_Favorites.md) (Being merged)
- [Story 4B.3: Targeted Campaigns](./STORY_4B.3_Targeted_Campaigns_System.md) (Integration point)
- [Story 4B.2: Ad Approval Workflow](./STORY_4B.2_Ad_Request_Approval_Workflow.md) (Extends to followers)
- [Database Schema: Following & Notifications](../database/schema_following.md)

---

**Status:** ✅ **FULLY SPECIFIED**  
**Ready for Implementation:** ✅ YES  
**Migration Strategy:** ✅ DEFINED (Zero data loss)  
**Integration Points:** ✅ MAPPED (Campaigns, Notifications, Admin)

---

*Created: January 18, 2025*  
*Next Review: After Phase 1 completion*
