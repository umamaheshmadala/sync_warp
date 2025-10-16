# Story 4B.2: Ad Management System - DETAILED SPECIFICATION

**Epic:** 4B - Business Owner Platform Extensions  
**Priority:** 🔴 **CRITICAL** (Revenue Generation)  
**Effort:** 8 days  
**Dependencies:** Story 4B.9 (Pricing Engine), Story 4B.5 (Billing System)

---

## 📋 Overview

This story implements the complete ad management system enabling business owners to purchase, schedule, and manage promotional advertising slots across the SynC platform. The system includes ad type selection with dynamic pricing display (read-only from pricing engine), approval workflows, auto-stop mechanisms, proration logic, and integration with unbilled charges for billing.

---

## 🎯 Mermaid Nodes Covered (9/9)

| Node ID | Node Name | Description | Status |
|---------|-----------|-------------|--------|
| `B_ManageAds` | Ad Management Dashboard | Main ad management interface | ✅ Specified |
| `B_AdTypes` | Ad Type Selection | Choose ad type (carousel/search/trending) | ✅ Specified |
| `B_AdTypes_Prices` | Pricing Display | Show context-based effective prices (read-only) | ✅ Specified |
| `B_Ad_Schedule` | Schedule Picker | Set start/end dates for ads | ✅ Specified |
| `B_AdRequest` | Submit Request | Submit ad for owner approval | ✅ Specified |
| `B_AddToUnbilled` | Charge Accumulation | Add charges to unbilled ledger | ✅ Specified |
| `T_Ad_Approved` | Approval State | Ad approved by platform owner | ✅ Specified |
| `T_Ad_Rejected` | Rejection State | Ad rejected with reason | ✅ Specified |
| `B_Ad_AutoStop` | Auto-Stop Mechanism | Automatic ad end + proration | ✅ Specified |

**Coverage:** 9/9 nodes (100%)

---

## 💡 User Story

**As a** business owner  
**I want to** purchase and manage ads for my business  
**So that** I can increase visibility and attract more customers

### Acceptance Criteria

- [x] All 3 ad types (carousel, search, trending) are selectable
- [x] Context-based effective pricing displayed (read-only from pricing engine)
- [x] Schedule picker allows date selection
- [x] Ad requests submitted for platform owner approval
- [x] Approved ads accumulate in unbilled charges
- [x] Auto-stop mechanism triggers on end date
- [x] Proration logic applies if stopped early
- [x] Lifecycle states tracked (pending, approved, active, ended)
- [x] Business owner receives notifications at each state

---

## 🎨 UI Components

### 1. Ad Management Dashboard (`AdManagement.tsx`)

**Location:** `src/components/business/ads/AdManagement.tsx`

**Features:**
- Overview of all ad campaigns
- Active ads count and status
- Upcoming scheduled ads
- Past campaigns history
- "Create New Ad" button
- Quick stats (impressions, clicks, spend)

**Layout:**
```
┌─────────────────────────────────────────┐
│  Ad Management                          │
├─────────────────────────────────────────┤
│  Active: 2  |  Scheduled: 1  |  Past: 5 │
├─────────────────────────────────────────┤
│  [+ Create New Ad]                      │
├─────────────────────────────────────────┤
│  📊 Active Campaigns                    │
│  • Carousel Banner (3 days left)        │
│  • Trending Section (7 days left)       │
├─────────────────────────────────────────┤
│  📅 Scheduled                           │
│  • Search Rank #1 (starts in 2 days)    │
└─────────────────────────────────────────┘
```

### 2. Create Ad Wizard (`CreateAdWizard.tsx`)

**Steps:**
1. Select ad type
2. View pricing (read-only)
3. Set schedule
4. Preview placement
5. Submit for approval

### 3. Ad Type Selector (`AdTypeSelector.tsx`)

**Ad Types:**
- **Carousel Banner** (homepage rotation)
- **Search Rank #1** (top of search results)
- **Trending Section** (trending page featured)

**Display:**
- Type name and description
- Example placement preview
- Effective price (from pricing engine)

### 4. Pricing Display Component (`AdPricingDisplay.tsx`)

**Features:**
- Fetches effective price from pricing engine
- Shows context (city, promotions applied)
- Read-only display (no manual editing)
- Auto-refreshes when context changes

**Example:**
```
┌─────────────────────────────────────┐
│  Current Pricing (for Hyderabad)   │
├─────────────────────────────────────┤
│  Carousel Banner: ₹187.50/day      │
│  Search Rank #1: ₹1,312.50/week    │
│  Trending Section: ₹112.50/day     │
├─────────────────────────────────────┤
│  ✨ Promotions Applied:             │
│  • First-week -50% (global)         │
│  • Hyderabad Launch -25% (city)     │
└─────────────────────────────────────┘
```

### 5. Schedule Picker (`AdSchedulePicker.tsx`)

**Features:**
- Start date picker (minimum: tomorrow)
- End date picker
- Duration calculator
- Total cost display (days × effective price)
- Calendar view with availability

### 6. Ad Preview Component (`AdPreview.tsx`)

**Shows:**
- How ad will appear on platform
- Placement location
- Business details
- Duration and cost summary

---

## 🔄 User Flows

### Flow 1: Create Ad Request

```
1. Click "Create New Ad"
   ↓
2. Select ad type → Fetch effective price
   ↓
3. Review pricing (read-only)
   ↓
4. Set schedule (start/end dates)
   ↓
5. Preview ad placement
   ↓
6. Submit for approval
   ↓
7. Platform owner reviews → Approve/Reject
   ↓
8. If approved → Add to unbilled charges
   ↓
9. On start date → Activate ad
   ↓
10. On end date → Auto-stop + prorate if needed
```

**Mermaid Flow:**
```
B_ManageAds → B_AdTypes → B_AdTypes_Prices (read-only) → B_Ad_Schedule
  → B_AdRequest → [Platform Owner Review]
    → T_Ad_Approved → B_AddToUnbilled → [Active on start date]
      → B_Ad_AutoStop (on end date + proration)
    → T_Ad_Rejected → Notification sent
```

### Flow 2: Ad Lifecycle States

```
1. PENDING: Awaiting owner approval
   ↓
2. APPROVED: Owner approved, awaiting start date
   ↓
3. ACTIVE: Currently running (between start & end dates)
   ↓
4. ENDED: Auto-stopped on end date
   ↓
5. REJECTED: Owner rejected request (terminal state)
```

### Flow 3: Auto-Stop & Proration

```
1. Cron job checks ads daily
   ↓
2. Find ads with end_date = TODAY
   ↓
3. For each ad:
   a. Calculate days billed vs. days served
   b. If stopped early → Apply proration
   c. Adjust unbilled charge amount
   d. Update status to ENDED
   e. Notify business owner
```

---

## 🔧 Technical Specifications

### Database Schema

#### Ad Requests Table
```sql
CREATE TABLE ad_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id),
  ad_type TEXT NOT NULL CHECK (ad_type IN ('carousel', 'search', 'trending')),
  
  -- Pricing context at time of request
  pricing_context JSONB, -- { city, region, tier, promotions }
  daily_effective_price DECIMAL(10,2) NOT NULL, -- From pricing engine
  
  -- Schedule
  schedule_start TIMESTAMPTZ NOT NULL,
  schedule_end TIMESTAMPTZ NOT NULL,
  days_billed INTEGER GENERATED ALWAYS AS (
    EXTRACT(EPOCH FROM (schedule_end - schedule_start)) / 86400
  ) STORED,
  
  -- Costs
  total_cost DECIMAL(10,2) GENERATED ALWAYS AS (
    daily_effective_price * days_billed
  ) STORED,
  actual_cost DECIMAL(10,2), -- After proration if stopped early
  
  -- Lifecycle
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'approved', 'rejected', 'active', 'ended')
  ),
  
  -- Approval
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ad_requests_business ON ad_requests(business_id);
CREATE INDEX idx_ad_requests_status ON ad_requests(status);
CREATE INDEX idx_ad_requests_schedule ON ad_requests(schedule_start, schedule_end);
```

#### Unbilled Charges Table (from Story 4B.5)
```sql
CREATE TABLE unbilled_charges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id),
  charge_type TEXT NOT NULL CHECK (charge_type IN ('ad', 'coupon', 'premium')),
  
  -- Ad-specific
  ad_request_id UUID REFERENCES ad_requests(id),
  
  amount DECIMAL(10,2) NOT NULL,
  description TEXT NOT NULL,
  accrued_at TIMESTAMPTZ DEFAULT NOW(),
  invoiced BOOLEAN DEFAULT false
);
```

### API Endpoints

#### 1. Get Effective Ad Pricing
```typescript
GET /api/ads/pricing?businessId={id}
Response: {
  carousel: {
    effectivePrice: 187.50,
    basePrice: 500,
    promotions: [
      { name: 'First-week -50%', discount: 50 },
      { name: 'Hyderabad -25%', discount: 25 }
    ],
    billingCycle: 'daily'
  },
  search: {
    effectivePrice: 1312.50,
    basePrice: 3500,
    promotions: [...],
    billingCycle: 'weekly'
  },
  trending: {
    effectivePrice: 112.50,
    basePrice: 300,
    promotions: [...],
    billingCycle: 'daily'
  },
  context: {
    city: 'Hyderabad',
    region: 'Telangana',
    tier: 'basic'
  }
}
```

#### 2. Submit Ad Request
```typescript
POST /api/ads/requests
Request: {
  businessId: string;
  adType: 'carousel' | 'search' | 'trending';
  scheduleStart: string; // ISO timestamp
  scheduleEnd: string;
  effectivePrice: number; // From pricing API
  pricingContext: object; // From pricing API
}
Response: {
  success: boolean;
  requestId: string;
  status: 'pending';
  message: 'Ad request submitted for approval';
}
```

#### 3. Approve/Reject Ad (Owner Only - Epic 6)
```typescript
POST /api/admin/ads/{requestId}/review
Request: {
  action: 'approve' | 'reject';
  reason?: string; // Required for rejection
}
Response: {
  success: boolean;
  status: 'approved' | 'rejected';
  message: string;
}
```

#### 4. Get Ad Campaigns
```typescript
GET /api/ads/campaigns?businessId={id}&status={status}
Response: {
  active: AdRequest[];
  scheduled: AdRequest[];
  past: AdRequest[];
}
```

### Pricing Integration

**Fetch Effective Price:**
```typescript
import { computeEffectivePrice } from '@/lib/pricing-engine';

async function getAdPricing(businessId: string) {
  const business = await getBusiness(businessId);
  
  const context: PricingContext = {
    city: business.city,
    region: business.region,
    tier: business.tier || 'basic',
    businessId: businessId
  };
  
  const carouselPrice = await computeEffectivePrice({
    ...context,
    serviceType: 'carousel_daily'
  });
  
  const searchPrice = await computeEffectivePrice({
    ...context,
    serviceType: 'search_weekly'
  });
  
  const trendingPrice = await computeEffectivePrice({
    ...context,
    serviceType: 'trending_daily'
  });
  
  return {
    carousel: carouselPrice,
    search: searchPrice,
    trending: trendingPrice,
    context: context
  };
}
```

### Auto-Stop & Proration Logic

**Cron Job (runs daily):**
```typescript
// pages/api/cron/stop-expired-ads.ts
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verify cron secret
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const expiredAds = await supabase
    .from('ad_requests')
    .select('*')
    .eq('status', 'active')
    .lte('schedule_end', new Date().toISOString());
  
  for (const ad of expiredAds.data || []) {
    await stopAd(ad.id);
  }
  
  res.json({ stopped: expiredAds.data?.length || 0 });
}

async function stopAd(adId: string) {
  const ad = await getAdRequest(adId);
  
  // Calculate actual days served
  const daysBilled = calculateDays(ad.schedule_start, ad.schedule_end);
  const daysServed = calculateDays(ad.schedule_start, new Date());
  
  let actualCost = ad.total_cost;
  
  // Proration if stopped early
  if (daysServed < daysBilled) {
    actualCost = (daysServed / daysBilled) * ad.total_cost;
    
    // Adjust unbilled charge
    await supabase
      .from('unbilled_charges')
      .update({ amount: actualCost })
      .eq('ad_request_id', adId);
  }
  
  // Update ad status
  await supabase
    .from('ad_requests')
    .update({
      status: 'ended',
      actual_cost: actualCost,
      updated_at: new Date().toISOString()
    })
    .eq('id', adId);
  
  // Notify business owner
  await sendNotification(ad.business_id, 'ad_ended', {
    adId: ad.id,
    adType: ad.ad_type,
    daysServed: daysServed,
    actualCost: actualCost
  });
}

function calculateDays(start: string, end: string | Date): number {
  const startDate = new Date(start);
  const endDate = typeof end === 'string' ? new Date(end) : end;
  return Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
}
```

### Charge Accumulation

**When Ad Approved:**
```typescript
async function onAdApproved(adId: string) {
  const ad = await getAdRequest(adId);
  
  // Add to unbilled charges
  await supabase
    .from('unbilled_charges')
    .insert({
      business_id: ad.business_id,
      charge_type: 'ad',
      ad_request_id: ad.id,
      amount: ad.total_cost,
      description: `${adTypeNames[ad.ad_type]} ad (${formatDate(ad.schedule_start)} - ${formatDate(ad.schedule_end)})`,
      accrued_at: new Date().toISOString()
    });
  
  // Update ad status
  await supabase
    .from('ad_requests')
    .update({ status: 'approved' })
    .eq('id', adId);
  
  // Notify business owner
  await sendNotification(ad.business_id, 'ad_approved', {
    adId: ad.id,
    adType: ad.ad_type,
    totalCost: ad.total_cost
  });
}
```

### Notification System

**Events:**
```typescript
type AdNotificationEvent = 
  | 'ad_submitted' // Request submitted for approval
  | 'ad_approved'  // Owner approved ad
  | 'ad_rejected'  // Owner rejected ad
  | 'ad_started'   // Ad activated on start date
  | 'ad_ended';    // Ad stopped on end date

async function sendAdNotification(
  businessId: string,
  event: AdNotificationEvent,
  data: AdNotificationData
) {
  const messages = {
    ad_submitted: {
      title: 'Ad Request Submitted',
      body: `Your ${data.adType} ad request is under review.`
    },
    ad_approved: {
      title: 'Ad Approved! 🎉',
      body: `Your ${data.adType} ad will start on ${formatDate(data.startDate)}.`
    },
    ad_rejected: {
      title: 'Ad Request Declined',
      body: `Your ${data.adType} ad was not approved. Reason: ${data.reason}`
    },
    ad_started: {
      title: 'Ad Now Live! 🚀',
      body: `Your ${data.adType} ad is now active.`
    },
    ad_ended: {
      title: 'Ad Campaign Ended',
      body: `Your ${data.adType} ad has ended. Served ${data.daysServed} days.`
    }
  };
  
  const message = messages[event];
  
  await supabase
    .from('notifications')
    .insert({
      user_id: businessId,
      type: event,
      title: message.title,
      body: message.body,
      data: data,
      read: false
    });
}
```

---

## 🧪 Testing Requirements

### Unit Tests

```typescript
describe('Ad Pricing', () => {
  test('fetches effective prices from pricing engine', async () => {
    const pricing = await getAdPricing('business-id');
    expect(pricing.carousel).toBeGreaterThan(0);
    expect(pricing.context.city).toBe('Hyderabad');
  });
  
  test('calculates total cost correctly', () => {
    const cost = calculateAdCost(187.50, '2025-01-01', '2025-01-08');
    expect(cost).toBe(1312.50); // 7 days × ₹187.50
  });
});

describe('Ad Lifecycle', () => {
  test('transitions through states correctly', async () => {
    const adId = await createAdRequest({ /* ... */ });
    expect(await getAdStatus(adId)).toBe('pending');
    
    await approveAd(adId);
    expect(await getAdStatus(adId)).toBe('approved');
    
    await activateAd(adId); // On start date
    expect(await getAdStatus(adId)).toBe('active');
    
    await stopAd(adId); // On end date
    expect(await getAdStatus(adId)).toBe('ended');
  });
});

describe('Proration Logic', () => {
  test('applies proration when stopped early', async () => {
    const ad = {
      daily_effective_price: 500,
      schedule_start: '2025-01-01',
      schedule_end: '2025-01-08', // 7 days billed
      total_cost: 3500
    };
    
    // Stopped after 5 days
    const actualCost = calculateProration(ad, '2025-01-06');
    expect(actualCost).toBe(2500); // 5 days × ₹500
  });
  
  test('no proration if served full duration', async () => {
    const ad = { /* ... */ schedule_end: '2025-01-08' };
    const actualCost = calculateProration(ad, '2025-01-08');
    expect(actualCost).toBe(ad.total_cost);
  });
});
```

### Integration Tests

```typescript
describe('Ad Request Flow', () => {
  test('complete ad creation and approval flow', async () => {
    // 1. Get pricing
    const pricing = await getAdPricing('business-id');
    
    // 2. Submit request
    const request = await submitAdRequest({
      businessId: 'business-id',
      adType: 'carousel',
      scheduleStart: '2025-01-10',
      scheduleEnd: '2025-01-17',
      effectivePrice: pricing.carousel
    });
    expect(request.status).toBe('pending');
    
    // 3. Approve
    await approveAdRequest(request.id);
    
    // 4. Verify unbilled charge created
    const charges = await getUnbilledCharges('business-id');
    expect(charges).toContainEqual(
      expect.objectContaining({
        charge_type: 'ad',
        ad_request_id: request.id
      })
    );
  });
});
```

### E2E Tests (Playwright)

```typescript
test('business owner can create ad request', async ({ page }) => {
  await page.goto('/business/ads');
  await page.click('[data-testid="create-ad-button"]');
  
  // Select carousel ad
  await page.click('[data-testid="ad-type-carousel"]');
  
  // Verify pricing displayed
  await expect(page.locator('[data-testid="effective-price"]')).toContainText('₹');
  
  // Set schedule
  await page.fill('[data-testid="start-date"]', '2025-01-10');
  await page.fill('[data-testid="end-date"]', '2025-01-17');
  
  // Verify total cost
  await expect(page.locator('[data-testid="total-cost"]')).toContainText('₹');
  
  // Submit
  await page.click('[data-testid="submit-ad-button"]');
  
  // Verify success message
  await expect(page.locator('[data-testid="success-message"]'))
    .toContainText('submitted for approval');
});
```

---

## ✅ Acceptance Criteria Checklist

### Functional Requirements
- [x] All 3 ad types selectable
- [x] Context-based pricing displayed (read-only)
- [x] Schedule picker functional
- [x] Total cost calculated correctly
- [x] Ad requests submitted successfully
- [x] Approval workflow operational (Epic 6)
- [x] Unbilled charges accumulate on approval
- [x] Auto-stop mechanism functional
- [x] Proration logic applied when needed
- [x] All notifications sent

### Non-Functional Requirements
- [x] Pricing fetches < 200ms
- [x] Request submission < 1s
- [x] Auto-stop cron runs daily
- [x] Proration accuracy 100%

### Security Requirements
- [x] Only authenticated business owners can create ads
- [x] Only platform admins can approve/reject
- [x] Business ID validated server-side
- [x] Rate limiting (5 requests/day per business)

---

## 📝 Implementation Notes

### Phase 1: UI & Pricing (Days 1-3)
- Ad management dashboard
- Create ad wizard
- Pricing display integration
- Schedule picker

### Phase 2: Approval Workflow (Days 4-5)
- Request submission API
- Approval/rejection logic (Epic 6)
- Charge accumulation
- Notifications

### Phase 3: Lifecycle & Auto-Stop (Days 6-7)
- Cron job setup
- Proration logic
- Status transitions
- Analytics integration

### Phase 4: Testing & Polish (Day 8)
- Unit/integration tests
- E2E tests
- Bug fixes
- Documentation

---

## 🔗 Related Documentation

- [Story 4B.9: Pricing Engine](./STORY_4B.9_PRICING_ENGINE_DETAILED.md)
- [Story 4B.5: Billing System](./STORY_4B.5_BILLING_SYSTEM_DETAILED.md)
- [Epic 6: Platform Admin Dashboard](../epics/EPIC_6_ADMIN.md)
- [Database Schema: Ads](../database/schema_ads.md)

---

**Status:** ✅ **FULLY SPECIFIED**  
**Mermaid Coverage:** 9/9 nodes (100%)  
**Ready for Implementation:** ✅ YES

---

*Last Updated: October 15, 2025*
*Next Review: After Pricing Engine Implementation*
