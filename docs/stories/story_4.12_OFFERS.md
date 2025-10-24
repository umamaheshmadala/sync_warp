# Story 4.12: Business Offers System

## Overview
Complete promotional offers management system allowing businesses to create, manage, and track static informational offers that can be viewed on storefronts and shared via social media or in-app.

**Status**: 📋 Planning
**Priority**: High
**Estimated Effort**: 8-10 days

---

## Business Context

### What are Offers?
Offers are **static, informational promotional announcements** that businesses create to attract customers. Unlike coupons (which are collectible with codes and limited quantities), offers are:
- **Purely informational** (e.g., "50% off all pizzas this weekend")
- **Always visible** on business storefront until expiry
- **Shareable** via links (WhatsApp, social media) and in-app
- **No redemption codes** - customers just mention the offer at purchase

### Key Differences: Offers vs Coupons

| Feature | Offers | Coupons |
|---------|--------|---------|
| Nature | Static informational | Collectible with codes |
| Display | Always on storefront | Collected to wallet |
| Quantity | Unlimited views | Limited per coupon |
| Redemption | Mention at purchase | Redeem with code |
| Target Audience | Everyone | Can be targeted (drivers, new users, etc.) |
| Editability | Immutable (duplicate to edit) | Can be edited in draft |

---

## User Stories

### Business Owner
- ✅ Create promotional offers with images and details
- ✅ Save offers as drafts and complete later
- ✅ Activate/deactivate offers
- ✅ View offer analytics (views, shares, click-through rates)
- ✅ Extend expiry of expired offers
- ✅ Duplicate offers to create similar ones with edits
- ✅ Manage active and expired offers separately

### End User (Customer)
- ✅ View active offers on business storefront
- ✅ Share offers via WhatsApp/social media/in-app
- ✅ Receive notifications for new offers (if enabled)
- ✅ Get prompted to follow business when viewing shared offer
- ✅ Click shared offer links to view business storefront with offer highlighted

---

## Database Schema

### 1. Offers Table Enhancements

```sql
-- Enhance existing offers table
ALTER TABLE offers ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'expired', 'archived'));
ALTER TABLE offers ADD COLUMN IF NOT EXISTS offer_code VARCHAR(50) UNIQUE;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS icon_image_url TEXT;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS share_count INTEGER DEFAULT 0;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS click_count INTEGER DEFAULT 0;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE offers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();
ALTER TABLE offers ADD COLUMN IF NOT EXISTS activated_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS expired_at TIMESTAMP WITH TIME ZONE;

-- Add comment
COMMENT ON TABLE offers IS 'Business promotional offers - static informational announcements viewable on storefront';
```

### 2. Offer Drafts Table

```sql
CREATE TABLE offer_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  business_id UUID NOT NULL REFERENCES businesses(id),
  draft_name TEXT NOT NULL,
  form_data JSONB NOT NULL DEFAULT '{}',
  step_completed INTEGER DEFAULT 1 CHECK (step_completed >= 1 AND step_completed <= 4),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

COMMENT ON TABLE offer_drafts IS 'Saved draft offers for businesses to complete later';

-- Enable RLS
ALTER TABLE offer_drafts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage own drafts" ON offer_drafts
  FOR ALL USING (auth.uid() = user_id);
```

### 3. Offer Analytics Table

```sql
CREATE TABLE offer_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id),
  
  -- View metrics
  total_views INTEGER DEFAULT 0,
  unique_viewers INTEGER DEFAULT 0,
  
  -- Share metrics
  total_shares INTEGER DEFAULT 0,
  unique_sharers INTEGER DEFAULT 0,
  share_channels JSONB DEFAULT '{}', -- {"whatsapp": 50, "in_app": 30, "facebook": 20}
  
  -- Click metrics
  total_clicks INTEGER DEFAULT 0,
  unique_clickers INTEGER DEFAULT 0,
  click_sources JSONB DEFAULT '{}', -- {"direct": 100, "shared_link": 50}
  
  -- Daily stats for charts
  daily_stats JSONB DEFAULT '[]',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  UNIQUE(offer_id)
);

COMMENT ON TABLE offer_analytics IS 'Analytics and metrics for business offers';

-- Enable RLS
ALTER TABLE offer_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY "Business owners can view own offer analytics" ON offer_analytics
  FOR SELECT USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid() OR user_id = auth.uid()
    )
  );
```

### 4. Offer Shares Table

```sql
CREATE TABLE offer_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id),
  sharer_id UUID REFERENCES auth.users(id),
  share_channel VARCHAR(50) NOT NULL CHECK (share_channel IN ('whatsapp', 'facebook', 'twitter', 'in_app', 'other')),
  shared_to_user_id UUID REFERENCES auth.users(id), -- For in-app shares only
  shared_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Analytics tracking
  was_clicked BOOLEAN DEFAULT false,
  clicked_at TIMESTAMP WITH TIME ZONE
);

COMMENT ON TABLE offer_shares IS 'Tracks all offer sharing activities for analytics';

-- Enable RLS
ALTER TABLE offer_shares ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY "Anyone can share offers" ON offer_shares
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view shares they created" ON offer_shares
  FOR SELECT USING (sharer_id = auth.uid() OR shared_to_user_id = auth.uid());
```

### 5. Offer Lifecycle Events Table

```sql
CREATE TABLE offer_lifecycle_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id),
  user_id UUID REFERENCES auth.users(id),
  event_type VARCHAR(50) NOT NULL CHECK (event_type IN (
    'created', 'activated', 'deactivated', 'expired', 'extended', 
    'duplicated', 'archived', 'deleted'
  )),
  event_metadata JSONB DEFAULT '{}',
  event_timestamp TIMESTAMP WITH TIME ZONE DEFAULT now()
);

COMMENT ON TABLE offer_lifecycle_events IS 'Audit trail of all offer lifecycle events for compliance and analytics';

-- Enable RLS
ALTER TABLE offer_lifecycle_events ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY "Business owners can view own offer events" ON offer_lifecycle_events
  FOR SELECT USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid() OR user_id = auth.uid()
    )
  );
```

---

## Features & Implementation

### Phase 1: Core Offer CRUD (Days 1-3)

#### 1.1 Offer Creation Modal
- **Reuse**: Adapt existing coupon creation modal
- **Steps**:
  1. Basic Info (title, description, terms)
  2. Icon Image Upload (max 2MB, single image)
  3. Validity Period (valid_from, valid_until)
  4. Review & Activate

**Key Enhancements**:
- Remove: `discount_type`, `discount_value`, `coupon_code`, `target_audience`
- Add: `icon_image_url` (single image upload)
- Simplify: No quantity limits, no redemption tracking
- Generate: Unique `offer_code` for shareable links

#### 1.2 Draft System
```typescript
// Hook: useOfferDrafts.ts
interface OfferDraft {
  id: string;
  draft_name: string;
  form_data: {
    title?: string;
    description?: string;
    terms_conditions?: string;
    icon_image_url?: string;
    valid_from?: string;
    valid_until?: string;
  };
  step_completed: number;
}

const useOfferDrafts = () => {
  const saveDraft = async (draft: Partial<OfferDraft>) => { /* ... */ };
  const loadDraft = async (draftId: string) => { /* ... */ };
  const deleteDraft = async (draftId: string) => { /* ... */ };
  const listDrafts = async (businessId: string) => { /* ... */ };
};
```

#### 1.3 Offer Management Page
- **Location**: `/business/:businessId/offers`
- **Tabs**: 
  - Active Offers (default)
  - Expired Offers
  - Drafts
- **Actions per Offer**:
  - ✅ View Analytics
  - ✅ Deactivate (if active)
  - ✅ Extend Expiry (if expired)
  - ✅ Duplicate & Edit
  - ⚠️ Archive (with confirmation)

#### 1.4 Immutability & Duplication
```typescript
const duplicateOffer = async (offerId: string) => {
  // 1. Fetch original offer
  const original = await supabase
    .from('offers')
    .select('*')
    .eq('id', offerId)
    .single();
  
  // 2. Create draft with same data
  const draftData = {
    title: `${original.title} (Copy)`,
    description: original.description,
    terms_conditions: original.terms_conditions,
    icon_image_url: original.icon_image_url,
    valid_from: null, // User must set new dates
    valid_until: null,
  };
  
  // 3. Save as draft
  await saveDraft({ form_data: draftData, step_completed: 3 });
  
  // 4. Log lifecycle event
  await logLifecycleEvent(offerId, 'duplicated', { 
    duplicated_from: offerId 
  });
};
```

---

### Phase 2: Storefront Display (Days 4-5)

#### 2.1 Business Storefront Offers Section
```tsx
// Component: BusinessOffers.tsx
<section className="offers-section">
  <h2>Current Offers & Promotions</h2>
  
  {/* Active Offers Grid */}
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    {activeOffers.map(offer => (
      <OfferCard 
        key={offer.id}
        offer={offer}
        onShare={handleShare}
        onView={handleView}
        highlighted={highlightedOfferId === offer.id} // For shared links
      />
    ))}
  </div>
  
  {/* Expired Offers (Business Owner Only) */}
  {isOwner && expiredOffers.length > 0 && (
    <Accordion>
      <AccordionItem title="Expired Offers">
        {expiredOffers.map(offer => (
          <ExpiredOfferCard 
            key={offer.id}
            offer={offer}
            onExtend={handleExtend}
            onDuplicate={handleDuplicate}
          />
        ))}
      </AccordionItem>
    </Accordion>
  )}
</section>
```

#### 2.2 Offer Card Component
```tsx
interface OfferCardProps {
  offer: Offer;
  onShare: (offer: Offer) => void;
  onView: () => void;
  highlighted?: boolean;
}

const OfferCard: React.FC<OfferCardProps> = ({ offer, onShare, onView, highlighted }) => {
  useEffect(() => {
    // Track view when card is mounted
    onView();
  }, []);

  return (
    <div className={cn(
      "offer-card border rounded-lg p-4",
      highlighted && "ring-2 ring-indigo-500 animate-pulse-once"
    )}>
      {/* Icon Image */}
      {offer.icon_image_url && (
        <img src={offer.icon_image_url} alt={offer.title} className="w-16 h-16 rounded" />
      )}
      
      {/* Title & Description */}
      <h3 className="text-lg font-semibold">{offer.title}</h3>
      <p className="text-sm text-gray-600">{offer.description}</p>
      
      {/* Validity Period */}
      <div className="flex items-center text-xs text-gray-500 mt-2">
        <Clock className="h-3 w-3 mr-1" />
        Valid until {formatDate(offer.valid_until)}
      </div>
      
      {/* Share Button */}
      <button onClick={() => onShare(offer)} className="mt-3 btn-secondary">
        <Share2 className="h-4 w-4 mr-2" />
        Share Offer
      </button>
    </div>
  );
};
```

---

### Phase 3: Sharing & Links (Day 6)

#### 3.1 Share Offer Modal
```tsx
const ShareOfferModal: React.FC<{ offer: Offer }> = ({ offer }) => {
  const shareUrl = `${window.location.origin}/business/${offer.business_id}?offer=${offer.offer_code}`;
  
  const handleShare = async (channel: ShareChannel) => {
    // Track share
    await supabase.from('offer_shares').insert({
      offer_id: offer.id,
      business_id: offer.business_id,
      sharer_id: user.id,
      share_channel: channel,
    });
    
    // Update analytics
    await supabase.rpc('increment_offer_share_count', { 
      p_offer_id: offer.id,
      p_channel: channel 
    });
    
    if (channel === 'whatsapp') {
      window.open(`https://wa.me/?text=${encodeURIComponent(`Check out this offer: ${offer.title} - ${shareUrl}`)}`);
    } else if (channel === 'in_app') {
      // Open friend selector
      setShowFriendSelector(true);
    }
  };
  
  return (
    <Modal>
      <h3>Share This Offer</h3>
      <div className="share-buttons">
        <button onClick={() => handleShare('whatsapp')}>WhatsApp</button>
        <button onClick={() => handleShare('facebook')}>Facebook</button>
        <button onClick={() => handleShare('twitter')}>Twitter</button>
        <button onClick={() => handleShare('in_app')}>Share with Friends</button>
      </div>
      
      {/* Copy Link */}
      <div className="copy-link">
        <input value={shareUrl} readOnly />
        <button onClick={() => copyToClipboard(shareUrl)}>Copy</button>
      </div>
    </Modal>
  );
};
```

#### 3.2 Shared Link Handling
```typescript
// In BusinessProfile.tsx
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const offerCode = params.get('offer');
  
  if (offerCode) {
    // 1. Track click
    trackOfferClick(offerCode);
    
    // 2. Scroll to offer and highlight
    setHighlightedOfferId(offerCode);
    scrollToOffer(offerCode);
    
    // 3. Show follow prompt if not following
    if (!isFollowing) {
      setShowFollowPrompt(true);
    }
  }
}, []);
```

#### 3.3 Follow Prompt Modal
```tsx
const FollowPromptModal: React.FC<{ business: Business }> = ({ business }) => {
  return (
    <Modal>
      <h3>Stay Updated!</h3>
      <p>Follow {business.business_name} to get notified about new offers and promotions.</p>
      
      <div className="flex space-x-3">
        <button onClick={handleFollow} className="btn-primary">
          Follow Business
        </button>
        <button onClick={handleClose} className="btn-secondary">
          Maybe Later
        </button>
      </div>
      
      {/* Notification preferences preview */}
      <p className="text-xs text-gray-500 mt-3">
        You'll receive notifications for new offers, products, and announcements.
      </p>
    </Modal>
  );
};
```

---

### Phase 4: Analytics & Tracking (Day 7)

#### 4.1 Analytics Functions
```sql
-- Increment view count
CREATE OR REPLACE FUNCTION increment_offer_view_count(
  p_offer_id UUID,
  p_user_id UUID DEFAULT NULL
) RETURNS void AS $$
BEGIN
  -- Update offer table
  UPDATE offers SET view_count = view_count + 1 WHERE id = p_offer_id;
  
  -- Update analytics table
  INSERT INTO offer_analytics (offer_id, business_id, total_views)
  VALUES (
    p_offer_id,
    (SELECT business_id FROM offers WHERE id = p_offer_id),
    1
  )
  ON CONFLICT (offer_id) DO UPDATE SET
    total_views = offer_analytics.total_views + 1,
    unique_viewers = CASE 
      WHEN p_user_id IS NOT NULL THEN offer_analytics.unique_viewers + 1
      ELSE offer_analytics.unique_viewers
    END,
    updated_at = now();
END;
$$ LANGUAGE plpgsql;

-- Increment share count
CREATE OR REPLACE FUNCTION increment_offer_share_count(
  p_offer_id UUID,
  p_channel VARCHAR
) RETURNS void AS $$
BEGIN
  -- Update offer table
  UPDATE offers SET share_count = share_count + 1 WHERE id = p_offer_id;
  
  -- Update analytics with channel breakdown
  UPDATE offer_analytics 
  SET 
    total_shares = total_shares + 1,
    share_channels = jsonb_set(
      share_channels,
      ARRAY[p_channel],
      to_jsonb(COALESCE((share_channels->>p_channel)::int, 0) + 1)
    ),
    updated_at = now()
  WHERE offer_id = p_offer_id;
END;
$$ LANGUAGE plpgsql;

-- Track daily stats
CREATE OR REPLACE FUNCTION update_offer_daily_stats()
RETURNS void AS $$
BEGIN
  -- Aggregate today's stats into daily_stats JSONB array
  UPDATE offer_analytics
  SET daily_stats = daily_stats || jsonb_build_object(
    'date', CURRENT_DATE,
    'views', total_views,
    'shares', total_shares,
    'clicks', total_clicks
  );
END;
$$ LANGUAGE plpgsql;
```

#### 4.2 Analytics Dashboard
```tsx
// Component: OfferAnalyticsDashboard.tsx
const OfferAnalyticsDashboard: React.FC<{ offerId: string }> = ({ offerId }) => {
  const { analytics, loading } = useOfferAnalytics(offerId);
  
  return (
    <div className="analytics-dashboard">
      {/* Key Metrics */}
      <div className="grid grid-cols-3 gap-4">
        <MetricCard
          title="Total Views"
          value={analytics.total_views}
          subtitle={`${analytics.unique_viewers} unique viewers`}
          icon={Eye}
        />
        <MetricCard
          title="Total Shares"
          value={analytics.total_shares}
          subtitle={`${analytics.unique_sharers} unique sharers`}
          icon={Share2}
        />
        <MetricCard
          title="Click-Through Rate"
          value={`${calculateCTR(analytics)}%`}
          subtitle={`${analytics.total_clicks} total clicks`}
          icon={TrendingUp}
        />
      </div>
      
      {/* Charts */}
      <div className="charts mt-6">
        <LineChart
          data={analytics.daily_stats}
          title="Views & Shares Over Time"
        />
        
        <PieChart
          data={analytics.share_channels}
          title="Share Channels Breakdown"
        />
      </div>
      
      {/* Share Details Table */}
      <SharesTable offerId={offerId} />
    </div>
  );
};
```

---

### Phase 5: Notifications (Day 8)

#### 5.1 New Offer Notification Trigger
```sql
CREATE OR REPLACE FUNCTION notify_followers_new_offer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NEW.status = 'active' OR (TG_OP = 'UPDATE' AND OLD.status != 'active' AND NEW.status = 'active') THEN
    INSERT INTO follower_notifications (
      business_id, user_id, notification_type, title, message, action_url, metadata
    )
    SELECT 
      bf.business_id, bf.user_id, 'new_offer',
      'New Offer Available!',
      b.business_name || ' has a new offer: ' || NEW.title,
      '/business/' || bf.business_id || '?offer=' || NEW.offer_code,
      jsonb_build_object(
        'offer_id', NEW.id,
        'offer_title', NEW.title,
        'valid_until', NEW.valid_until
      )
    FROM business_followers bf
    JOIN businesses b ON b.id = bf.business_id
    WHERE bf.business_id = NEW.business_id
      AND bf.is_active = true
      AND (bf.notification_preferences->>'new_offers')::boolean = true
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;

-- Attach trigger
CREATE TRIGGER trigger_notify_followers_new_offer
AFTER INSERT OR UPDATE ON offers
FOR EACH ROW
EXECUTE FUNCTION notify_followers_new_offer();
```

#### 5.2 Notification Preferences Reminder
```tsx
// Component: NotificationPreferencesReminder.tsx
const NotificationPreferencesReminder: React.FC = () => {
  const { user, preferences } = useAuthStore();
  const [dismissed, setDismissed] = useLocalStorage('offer-notif-reminder-dismissed', false);
  
  // Show reminder if user has disabled offer notifications
  if (dismissed || preferences?.new_offers) return null;
  
  return (
    <Banner variant="info" dismissible onDismiss={() => setDismissed(true)}>
      <AlertCircle className="h-4 w-4" />
      <span>
        Enable offer notifications to get updates about new promotions from businesses you follow.
      </span>
      <button 
        onClick={() => navigate('/settings/notifications')}
        className="btn-sm btn-primary ml-3"
      >
        Enable Now
      </button>
    </Banner>
  );
};
```

---

## Testing Checklist

### Unit Tests
- [ ] Offer CRUD operations
- [ ] Draft save/load/delete
- [ ] Analytics increment functions
- [ ] Duplication logic
- [ ] Notification trigger

### Integration Tests
- [ ] Complete offer creation flow
- [ ] Share offer via different channels
- [ ] Click shared offer link
- [ ] Follow prompt after viewing shared offer
- [ ] Extend expired offer
- [ ] Duplicate and edit offer

### E2E Tests (Manual)
- [ ] **Test Scenario A: Create & Activate Offer**
  1. Business owner creates new offer with image
  2. Saves as draft, then completes later
  3. Activates offer
  4. Verify notification sent to followers
  5. Verify offer appears on storefront

- [ ] **Test Scenario B: Share & Track**
  1. User shares offer via WhatsApp
  2. Friend clicks link
  3. Friend views offer on business page (highlighted)
  4. Follow prompt appears if not following
  5. Verify analytics updated (view + share + click)

- [ ] **Test Scenario C: Expiry & Extension**
  1. Wait for offer to expire (or manually set past date)
  2. Verify offer disappears from storefront
  3. Business owner sees expired offer in "Expired" tab
  4. Owner extends expiry by 7 days
  5. Verify offer reappears on storefront

- [ ] **Test Scenario D: Duplicate & Edit**
  1. Business owner clicks "Duplicate & Edit"
  2. Verify draft created with pre-filled data
  3. Owner edits title and image
  4. Activates new offer
  5. Verify old offer still active (not replaced)

---

## Database Migrations

### Migration 1: Enhance Offers Table
```sql
-- File: supabase/migrations/YYYYMMDD_enhance_offers_table.sql

-- Add new columns
ALTER TABLE offers ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'draft' 
  CHECK (status IN ('draft', 'active', 'paused', 'expired', 'archived'));
ALTER TABLE offers ADD COLUMN IF NOT EXISTS offer_code VARCHAR(50) UNIQUE;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS icon_image_url TEXT;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS share_count INTEGER DEFAULT 0;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS click_count INTEGER DEFAULT 0;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE offers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();
ALTER TABLE offers ADD COLUMN IF NOT EXISTS activated_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS expired_at TIMESTAMP WITH TIME ZONE;

-- Generate offer codes for existing offers
UPDATE offers SET offer_code = 'OFFER-' || UPPER(SUBSTR(MD5(id::text), 1, 8)) WHERE offer_code IS NULL;

-- Create index on offer_code for fast lookups
CREATE INDEX IF NOT EXISTS idx_offers_offer_code ON offers(offer_code);
CREATE INDEX IF NOT EXISTS idx_offers_business_status ON offers(business_id, status);

-- Enable RLS (if not already enabled)
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view active offers" ON offers
  FOR SELECT USING (status = 'active');

CREATE POLICY "Business owners can manage own offers" ON offers
  FOR ALL USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid() OR user_id = auth.uid()
    )
  );
```

### Migration 2: Create Supporting Tables
```sql
-- File: supabase/migrations/YYYYMMDD_create_offer_supporting_tables.sql

-- Offer Drafts Table
CREATE TABLE offer_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  draft_name TEXT NOT NULL,
  form_data JSONB NOT NULL DEFAULT '{}',
  step_completed INTEGER DEFAULT 1 CHECK (step_completed >= 1 AND step_completed <= 4),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_offer_drafts_user_business ON offer_drafts(user_id, business_id);

ALTER TABLE offer_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own drafts" ON offer_drafts
  FOR ALL USING (auth.uid() = user_id);

-- Offer Analytics Table
CREATE TABLE offer_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id),
  total_views INTEGER DEFAULT 0,
  unique_viewers INTEGER DEFAULT 0,
  total_shares INTEGER DEFAULT 0,
  unique_sharers INTEGER DEFAULT 0,
  share_channels JSONB DEFAULT '{}',
  total_clicks INTEGER DEFAULT 0,
  unique_clickers INTEGER DEFAULT 0,
  click_sources JSONB DEFAULT '{}',
  daily_stats JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(offer_id)
);

CREATE INDEX idx_offer_analytics_business ON offer_analytics(business_id);

ALTER TABLE offer_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners can view own analytics" ON offer_analytics
  FOR SELECT USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid() OR user_id = auth.uid()
    )
  );

-- Offer Shares Table
CREATE TABLE offer_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id),
  sharer_id UUID REFERENCES auth.users(id),
  share_channel VARCHAR(50) NOT NULL CHECK (share_channel IN ('whatsapp', 'facebook', 'twitter', 'in_app', 'other')),
  shared_to_user_id UUID REFERENCES auth.users(id),
  shared_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  was_clicked BOOLEAN DEFAULT false,
  clicked_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_offer_shares_offer ON offer_shares(offer_id);
CREATE INDEX idx_offer_shares_sharer ON offer_shares(sharer_id);

ALTER TABLE offer_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can share offers" ON offer_shares
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view shares they created" ON offer_shares
  FOR SELECT USING (sharer_id = auth.uid() OR shared_to_user_id = auth.uid());

-- Offer Lifecycle Events Table
CREATE TABLE offer_lifecycle_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id),
  user_id UUID REFERENCES auth.users(id),
  event_type VARCHAR(50) NOT NULL CHECK (event_type IN (
    'created', 'activated', 'deactivated', 'expired', 'extended', 
    'duplicated', 'archived', 'deleted'
  )),
  event_metadata JSONB DEFAULT '{}',
  event_timestamp TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_offer_lifecycle_offer ON offer_lifecycle_events(offer_id);
CREATE INDEX idx_offer_lifecycle_business ON offer_lifecycle_events(business_id);

ALTER TABLE offer_lifecycle_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners can view own events" ON offer_lifecycle_events
  FOR SELECT USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid() OR user_id = auth.uid()
    )
  );
```

### Migration 3: Create Functions & Triggers
```sql
-- File: supabase/migrations/YYYYMMDD_create_offer_functions.sql

-- Function: Increment offer view count
CREATE OR REPLACE FUNCTION increment_offer_view_count(
  p_offer_id UUID,
  p_user_id UUID DEFAULT NULL
) RETURNS void AS $$
BEGIN
  UPDATE offers SET view_count = view_count + 1 WHERE id = p_offer_id;
  
  INSERT INTO offer_analytics (offer_id, business_id, total_views)
  VALUES (
    p_offer_id,
    (SELECT business_id FROM offers WHERE id = p_offer_id),
    1
  )
  ON CONFLICT (offer_id) DO UPDATE SET
    total_views = offer_analytics.total_views + 1,
    unique_viewers = CASE 
      WHEN p_user_id IS NOT NULL THEN offer_analytics.unique_viewers + 1
      ELSE offer_analytics.unique_viewers
    END,
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Increment offer share count
CREATE OR REPLACE FUNCTION increment_offer_share_count(
  p_offer_id UUID,
  p_channel VARCHAR
) RETURNS void AS $$
BEGIN
  UPDATE offers SET share_count = share_count + 1 WHERE id = p_offer_id;
  
  UPDATE offer_analytics 
  SET 
    total_shares = total_shares + 1,
    share_channels = jsonb_set(
      share_channels,
      ARRAY[p_channel],
      to_jsonb(COALESCE((share_channels->>p_channel)::int, 0) + 1)
    ),
    updated_at = now()
  WHERE offer_id = p_offer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Increment offer click count
CREATE OR REPLACE FUNCTION increment_offer_click_count(
  p_offer_id UUID,
  p_source VARCHAR DEFAULT 'direct'
) RETURNS void AS $$
BEGIN
  UPDATE offers SET click_count = click_count + 1 WHERE id = p_offer_id;
  
  UPDATE offer_analytics 
  SET 
    total_clicks = total_clicks + 1,
    click_sources = jsonb_set(
      click_sources,
      ARRAY[p_source],
      to_jsonb(COALESCE((click_sources->>p_source)::int, 0) + 1)
    ),
    updated_at = now()
  WHERE offer_id = p_offer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Notify followers of new offer
CREATE OR REPLACE FUNCTION notify_followers_new_offer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NEW.status = 'active' OR (TG_OP = 'UPDATE' AND OLD.status != 'active' AND NEW.status = 'active') THEN
    INSERT INTO follower_notifications (
      business_id, user_id, notification_type, title, message, action_url, metadata
    )
    SELECT 
      bf.business_id, bf.user_id, 'new_offer',
      'New Offer Available!',
      b.business_name || ' has a new offer: ' || NEW.title,
      '/business/' || bf.business_id || '?offer=' || NEW.offer_code,
      jsonb_build_object(
        'offer_id', NEW.id,
        'offer_title', NEW.title,
        'valid_until', NEW.valid_until
      )
    FROM business_followers bf
    JOIN businesses b ON b.id = bf.business_id
    WHERE bf.business_id = NEW.business_id
      AND bf.is_active = true
      AND (bf.notification_preferences->>'new_offers')::boolean = true
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trigger_notify_followers_new_offer
AFTER INSERT OR UPDATE ON offers
FOR EACH ROW
EXECUTE FUNCTION notify_followers_new_offer();

-- Trigger: Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_offer_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_offer_timestamp
BEFORE UPDATE ON offers
FOR EACH ROW
EXECUTE FUNCTION update_offer_updated_at();

-- Trigger: Log lifecycle events
CREATE OR REPLACE FUNCTION log_offer_lifecycle_event()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO offer_lifecycle_events (offer_id, business_id, user_id, event_type, event_metadata)
    VALUES (NEW.id, NEW.business_id, NEW.created_by, 'created', jsonb_build_object('status', NEW.status));
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status != NEW.status THEN
      IF NEW.status = 'active' THEN
        INSERT INTO offer_lifecycle_events (offer_id, business_id, user_id, event_type, event_metadata)
        VALUES (NEW.id, NEW.business_id, auth.uid(), 'activated', jsonb_build_object('from_status', OLD.status));
      ELSIF NEW.status = 'paused' THEN
        INSERT INTO offer_lifecycle_events (offer_id, business_id, user_id, event_type, event_metadata)
        VALUES (NEW.id, NEW.business_id, auth.uid(), 'deactivated', jsonb_build_object('from_status', OLD.status));
      ELSIF NEW.status = 'expired' THEN
        INSERT INTO offer_lifecycle_events (offer_id, business_id, user_id, event_type, event_metadata)
        VALUES (NEW.id, NEW.business_id, NULL, 'expired', jsonb_build_object('expired_at', now()));
      END IF;
    END IF;
    
    IF OLD.valid_until != NEW.valid_until AND NEW.valid_until > OLD.valid_until THEN
      INSERT INTO offer_lifecycle_events (offer_id, business_id, user_id, event_type, event_metadata)
      VALUES (NEW.id, NEW.business_id, auth.uid(), 'extended', jsonb_build_object(
        'old_date', OLD.valid_until,
        'new_date', NEW.valid_until
      ));
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_log_offer_lifecycle
AFTER INSERT OR UPDATE ON offers
FOR EACH ROW
EXECUTE FUNCTION log_offer_lifecycle_event();
```

---

## File Structure

```
src/
├── components/
│   ├── offers/
│   │   ├── OfferCreationModal.tsx          # Adapted from coupon modal
│   │   ├── OfferCard.tsx                   # Display offer on storefront
│   │   ├── ExpiredOfferCard.tsx            # Display expired offer (owner only)
│   │   ├── OfferManagementPage.tsx         # /business/:id/offers
│   │   ├── OfferAnalyticsDashboard.tsx     # Analytics view
│   │   ├── ShareOfferModal.tsx             # Share dialog
│   │   ├── FollowPromptModal.tsx           # Follow prompt for shared links
│   │   ├── NotificationPreferencesReminder.tsx
│   │   └── index.ts
│   └── business/
│       └── BusinessOffers.tsx              # Offers section on storefront
├── hooks/
│   ├── useOffers.ts                        # CRUD operations
│   ├── useOfferDrafts.ts                   # Draft management
│   ├── useOfferAnalytics.ts                # Fetch & display analytics
│   └── useOfferShare.ts                    # Share tracking
├── lib/
│   └── offerUtils.ts                       # Helper functions
└── types/
    └── offers.ts                           # TypeScript interfaces
```

---

## Success Metrics

### Launch Criteria (MVP)
- [ ] Business owners can create offers with images
- [ ] Offers display on storefront when active
- [ ] Offers can be shared via WhatsApp and in-app
- [ ] Shared links work and highlight offer
- [ ] Basic analytics (views, shares) tracking
- [ ] Notifications sent to followers with preferences enabled
- [ ] Expired offers hidden from public, visible to owners
- [ ] Duplicate & Edit functionality works

### Phase 2 Goals (Post-Launch)
- [ ] 80%+ of businesses create at least 1 offer per month
- [ ] Average 50+ views per offer
- [ ] 10%+ share rate (shares / views)
- [ ] 20%+ click-through rate on shared links
- [ ] 30%+ of users enable offer notifications

---

## Known Limitations & Future Enhancements

### Current Limitations
1. ❌ No offer categories/tags for filtering
2. ❌ No A/B testing of offer variants
3. ❌ No scheduled activation (must manually activate)
4. ❌ No multi-language support
5. ❌ No video support (images only)

### Future Enhancements
1. **Scheduled Offers**: Auto-activate on specific date/time
2. **Recurring Offers**: Weekly/monthly auto-generation
3. **Offer Templates**: Pre-built templates for common promotions
4. **Advanced Analytics**: Conversion tracking, revenue impact
5. **Offer Targeting**: Show different offers to different user segments
6. **Push Notifications**: Send push notifs (not just in-app)

---

## Appendix

### A. Offer vs Coupon Comparison Table

| Aspect | Offer | Coupon |
|--------|-------|--------|
| **Purpose** | Informational promotion | Redeemable discount |
| **Collection** | No (always visible) | Yes (collect to wallet) |
| **Redemption** | Mention at purchase | Redeem with code |
| **Quantity** | Unlimited | Limited (per user or total) |
| **Tracking** | Views, shares, clicks | Collections, redemptions |
| **Code** | Share link only | Unique coupon code |
| **Targeting** | Everyone | Can be targeted |
| **Example** | "50% off all pizzas this weekend" | "Use code PIZZA50 for 50% off" |

### B. Notification Types Reference

```typescript
type NotificationType = 
  | 'new_product'   // Product added to catalog
  | 'new_offer'     // Offer activated (this story)
  | 'new_coupon'    // Coupon created and active
  | 'announcement'; // General business announcement
```

### C. Analytics Metrics Glossary

- **View**: User sees offer card on storefront or via shared link
- **Unique Viewer**: Count of distinct users who viewed
- **Share**: User clicks share button and selects channel
- **Unique Sharer**: Count of distinct users who shared
- **Click**: User clicks on shared link
- **Click-Through Rate (CTR)**: `(clicks / shares) * 100`
- **Share Rate**: `(shares / views) * 100`

---

## Timeline & Dependencies

### Dependencies
- ✅ Story 4.11 (Notification system) - **Required**
- ✅ Business storefront page - **Required**
- ✅ File upload system - **Required**
- ⚠️ Friend connections - **Optional** (for in-app sharing)

### Estimated Timeline
- **Day 1-3**: Core CRUD + Draft system
- **Day 4-5**: Storefront display + Highlighting
- **Day 6**: Sharing functionality
- **Day 7**: Analytics tracking
- **Day 8**: Notifications + Testing
- **Day 9-10**: E2E testing + Bug fixes

**Total**: 8-10 days

---

## Questions & Decisions Log

| Date | Question | Decision | Rationale |
|------|----------|----------|-----------|
| 2025-10-23 | Should offers have redemption tracking? | No, purely informational | Differentiate from coupons |
| 2025-10-23 | Can offers be edited after creation? | No, must duplicate & edit | Maintain audit trail |
| 2025-10-23 | Should offers have categories? | Not in MVP | Can add later if needed |
| 2025-10-23 | Draft system - reuse coupon_drafts? | No, create separate table | Different schema needs |
| 2025-10-23 | Analytics depth? | Track views, shares, clicks | Sufficient for MVP |

---

**Document Version**: 1.0  
**Created**: 2025-10-23  
**Last Updated**: 2025-10-23  
**Status**: ✅ Ready for Implementation
