# Story 4B.1: Merchant Redemption Interface - DETAILED SPECIFICATION

**Epic:** 4B - Business Owner Platform Extensions  
**Priority:** 🔴 **CRITICAL** (MVP Blocker)  
**Effort:** 5 days  
**Dependencies:** Story 4.5 (Coupon System), Story 3.4 (QR Codes)

---

## 📋 Overview

This story implements the complete merchant-side coupon redemption system, enabling business owners and staff to validate and redeem customer coupons either via QR code scanning or manual code entry, with full offline support, real-time notifications, and comprehensive error handling.

---

## 🎯 Mermaid Nodes Covered (7/7)

| Node ID | Node Name | Description | Status |
|---------|-----------|-------------|--------|
| `B_RedeemPage` | Redemption Page | Main merchant redemption interface | ✅ Specified |
| `B_EnterCode` | Code Entry | Manual code input field | ✅ Specified |
| `B_ScanQR` | QR Scanner | QR code scanning interface | ✅ Specified |
| `B_ValidateCode` | Validation Logic | Code validation & verification | ✅ Specified |
| `B_Redeemed` | Success State | Redemption confirmation | ✅ Specified |
| `B_InvalidCode` | Error Handling | Error states & messages | ✅ Specified |
| `n85` | Notifications | Redemption notifications | ✅ Specified |

**Coverage:** 7/7 nodes (100%)

---

## 💡 User Story

**As a** business owner/staff member  
**I want to** validate and redeem customer coupons quickly  
**So that** customers can use their collected offers efficiently

### Acceptance Criteria

- [x] Merchants can scan QR codes from customer devices
- [x] Merchants can manually enter coupon codes
- [x] System validates codes in real-time (< 500ms)
- [x] All error states are handled gracefully
- [x] Offline redemptions are queued and synced
- [x] Customers receive real-time notifications
- [x] Redemption analytics are updated immediately
- [x] Multi-language support (English, Telugu, Hindi)

---

## 🎨 UI Components

### 1. Redemption Page Component (`MerchantRedemption.tsx`)

**Location:** `src/components/business/redemption/MerchantRedemption.tsx`

**Features:**
- Toggle between QR scanner and manual entry
- Real-time validation feedback
- Success/error modals
- Offline indicator
- Redemption history (last 10)
- Quick stats (today's redemptions)

**Layout:**
```
┌─────────────────────────────────────┐
│  Merchant Redemption                │
├─────────────────────────────────────┤
│  [📷 Scan QR]  [⌨️ Enter Code]      │
├─────────────────────────────────────┤
│                                     │
│    [QR Scanner View / Input Field]  │
│                                     │
├─────────────────────────────────────┤
│  Today: 23 redeemed                 │
│  Last: COUP-ABC123 (2 mins ago)     │
└─────────────────────────────────────┘
```

### 2. QR Scanner View (`QRScannerView.tsx`)

**Features:**
- Camera access with permissions handling
- Auto-detect QR codes
- Manual focus controls
- Flashlight toggle (mobile)
- Camera switch (front/back)

**Library:** `react-qr-scanner` or `@zxing/browser`

### 3. Manual Entry Field (`ManualCodeEntry.tsx`)

**Features:**
- Auto-uppercase input
- Format validation (COUP-XXXXXX)
- Real-time format hints
- Auto-submit on valid format

### 4. Success Modal (`RedemptionSuccess.tsx`)

**Display:**
- ✅ Success icon
- Coupon details (offer title, value)
- Customer name (first name only)
- Redemption timestamp
- "Done" button

### 5. Error Modal (`RedemptionError.tsx`)

**States:**
- Invalid code
- Already redeemed
- Expired
- Wrong business
- Network error (offline)

---

## 🔄 User Flows

### Flow 1: QR Code Redemption (Primary)

```
1. Merchant clicks "Scan QR" button
   ↓
2. Camera opens with QR scanner overlay
   ↓
3. Customer shows QR code on phone
   ↓
4. System auto-detects QR code
   ↓
5. Code sent to validation API
   ↓
6a. [Valid] → Mark as redeemed → Show success modal → Send notification
6b. [Invalid] → Show error modal → Allow retry
```

**Mermaid Flow:**
```
B_RedeemPage → B_ScanQR → B_ValidateCode → [Valid?]
  → Yes → B_Redeemed + n85 (notification)
  → No → B_InvalidCode → B_RedeemPage (retry)
```

### Flow 2: Manual Code Entry (Fallback)

```
1. Merchant clicks "Enter Code"
   ↓
2. Input field appears with format hint
   ↓
3. Merchant types code (e.g., COUP-ABC123)
   ↓
4. On valid format, auto-submit to validation
   ↓
5. Same validation flow as QR scan
```

### Flow 3: Offline Redemption

```
1. No network detected → Show offline indicator
   ↓
2. Merchant scans/enters code
   ↓
3. Validation fails (no network)
   ↓
4. Show "Queued for sync" message
   ↓
5. Code stored in local queue with timestamp
   ↓
6. When online → Auto-sync all queued redemptions
   ↓
7. Send notifications for synced redemptions
```

---

## 🔧 Technical Specifications

### API Endpoints

#### 1. Validate Coupon Code
```typescript
POST /api/coupons/validate
Request: {
  code: string;
  businessId: string;
}
Response: {
  valid: boolean;
  couponId?: string;
  status?: 'collected' | 'redeemed' | 'expired';
  offerTitle?: string;
  customerName?: string;
  error?: 'not_found' | 'already_redeemed' | 'expired' | 'wrong_business';
}
```

#### 2. Redeem Coupon
```typescript
POST /api/coupons/redeem
Request: {
  couponId: string;
  businessId: string;
  redeemedBy: string; // Staff/Owner user ID
  timestamp: string;
}
Response: {
  success: boolean;
  redemptionId?: string;
  error?: string;
}
```

#### 3. Sync Offline Redemptions
```typescript
POST /api/coupons/sync-offline
Request: {
  redemptions: Array<{
    code: string;
    businessId: string;
    redeemedBy: string;
    timestamp: string;
  }>;
}
Response: {
  synced: number;
  failed: Array<{ code: string; error: string }>;
}
```

### Database Operations

#### Validation Query
```sql
SELECT 
  c.id,
  c.code,
  c.status,
  c.business_id,
  c.customer_id,
  c.expires_at,
  o.title as offer_title,
  p.full_name as customer_name
FROM coupons c
JOIN offers o ON c.offer_id = o.id
JOIN profiles p ON c.customer_id = p.id
WHERE c.code = $1;
```

#### Redemption Update
```sql
-- Start transaction
BEGIN;

-- 1. Update coupon status
UPDATE coupons 
SET 
  status = 'redeemed',
  redeemed_at = NOW(),
  redeemed_by = $1
WHERE id = $2 AND status = 'collected';

-- 2. Insert redemption record
INSERT INTO coupon_redemptions (
  id,
  coupon_id,
  business_id,
  redeemed_by,
  redeemed_at
) VALUES (
  gen_random_uuid(),
  $2,
  $3,
  $1,
  NOW()
);

-- 3. Update analytics
INSERT INTO redemption_stats (
  business_id,
  date,
  count
) VALUES (
  $3,
  CURRENT_DATE,
  1
) ON CONFLICT (business_id, date) 
DO UPDATE SET count = redemption_stats.count + 1;

COMMIT;
```

### Offline Support Implementation

**Technology:** IndexedDB via Dexie.js

```typescript
// Database schema
class OfflineRedemptionDB extends Dexie {
  redemptions!: Dexie.Table<OfflineRedemption, number>;

  constructor() {
    super('MerchantRedemptionDB');
    this.version(1).stores({
      redemptions: '++id, code, businessId, timestamp, synced'
    });
  }
}

interface OfflineRedemption {
  id?: number;
  code: string;
  businessId: string;
  redeemedBy: string;
  timestamp: string;
  synced: boolean;
}

// Queue redemption
async function queueOfflineRedemption(redemption: OfflineRedemption) {
  await db.redemptions.add({
    ...redemption,
    synced: false
  });
}

// Sync when online
async function syncOfflineRedemptions() {
  const pending = await db.redemptions
    .where('synced')
    .equals(false)
    .toArray();
  
  if (pending.length === 0) return;
  
  const response = await fetch('/api/coupons/sync-offline', {
    method: 'POST',
    body: JSON.stringify({ redemptions: pending }),
    headers: { 'Content-Type': 'application/json' }
  });
  
  const { synced, failed } = await response.json();
  
  // Mark synced redemptions
  await db.redemptions
    .where('id')
    .anyOf(synced.map((s: any) => s.id))
    .modify({ synced: true });
}

// Auto-sync on reconnect
window.addEventListener('online', syncOfflineRedemptions);
```

### Notification System

**Trigger:** Real-time via Supabase Realtime

```typescript
// After successful redemption
async function sendRedemptionNotification(couponId: string) {
  const coupon = await getCouponDetails(couponId);
  
  // Send push notification to customer
  await supabase
    .from('notifications')
    .insert({
      user_id: coupon.customer_id,
      type: 'coupon_redeemed',
      title: 'Coupon Redeemed! 🎉',
      body: `Your ${coupon.offer_title} coupon was just used at ${coupon.business_name}`,
      data: {
        coupon_id: couponId,
        business_id: coupon.business_id
      },
      read: false
    });
  
  // Trigger real-time event
  await supabase
    .channel('user_notifications')
    .send({
      type: 'broadcast',
      event: 'coupon_redeemed',
      payload: { couponId, customerId: coupon.customer_id }
    });
}
```

---

## 🎭 Error States & Handling

### Error Types

| Error Code | User Message | Action |
|------------|-------------|--------|
| `not_found` | "Invalid code. Please try again." | Allow retry |
| `already_redeemed` | "This coupon has already been used." | Show details + timestamp |
| `expired` | "This coupon expired on {date}." | No retry |
| `wrong_business` | "This coupon is not valid at this location." | No retry |
| `offline` | "No internet. Redemption queued for sync." | Queue locally |
| `network_error` | "Connection error. Please try again." | Allow retry |

### Error Modal Component

```typescript
interface RedemptionErrorProps {
  errorType: 'not_found' | 'already_redeemed' | 'expired' | 'wrong_business' | 'offline';
  details?: {
    redeemedAt?: string;
    expiredAt?: string;
    validBusinessName?: string;
  };
  onRetry: () => void;
  onClose: () => void;
}

function RedemptionError({ errorType, details, onRetry, onClose }: RedemptionErrorProps) {
  const errorMessages = {
    not_found: {
      title: 'Invalid Code',
      message: 'This code was not found. Please check and try again.',
      allowRetry: true,
      icon: '❌'
    },
    already_redeemed: {
      title: 'Already Used',
      message: `This coupon was redeemed on ${formatDate(details?.redeemedAt)}.`,
      allowRetry: false,
      icon: '⚠️'
    },
    expired: {
      title: 'Expired',
      message: `This coupon expired on ${formatDate(details?.expiredAt)}.`,
      allowRetry: false,
      icon: '🕐'
    },
    wrong_business: {
      title: 'Invalid Location',
      message: `This coupon is only valid at ${details?.validBusinessName}.`,
      allowRetry: false,
      icon: '🏪'
    },
    offline: {
      title: 'Queued for Sync',
      message: 'No internet connection. This redemption will sync when online.',
      allowRetry: false,
      icon: '📡'
    }
  };
  
  const error = errorMessages[errorType];
  
  return (
    <Modal>
      <div className="error-icon">{error.icon}</div>
      <h2>{error.title}</h2>
      <p>{error.message}</p>
      <div className="button-group">
        {error.allowRetry && <Button onClick={onRetry}>Try Again</Button>}
        <Button onClick={onClose} variant="secondary">Close</Button>
      </div>
    </Modal>
  );
}
```

---

## 📊 Analytics Integration

### Metrics Tracked

1. **Redemption Count** (per business, per day)
2. **Redemption Rate** (redeemed / collected)
3. **Average Redemption Time** (collected → redeemed)
4. **Offline Redemption Count**
5. **Error Rate** (by type)

### Analytics Events

```typescript
// Track redemption event
trackEvent('coupon_redeemed', {
  business_id: businessId,
  coupon_id: couponId,
  offer_id: offerId,
  redemption_method: 'qr' | 'manual',
  offline: boolean,
  time_to_redeem: seconds // from collection to redemption
});

// Track error event
trackEvent('redemption_error', {
  business_id: businessId,
  error_type: errorType,
  code: code
});
```

---

## 🧪 Testing Requirements

### Unit Tests

```typescript
describe('Redemption Validation', () => {
  test('validates correct code format', () => {
    expect(isValidCodeFormat('COUP-ABC123')).toBe(true);
    expect(isValidCodeFormat('invalid')).toBe(false);
  });
  
  test('handles already redeemed codes', async () => {
    const result = await validateCoupon('COUP-USED123', 'biz-id');
    expect(result.error).toBe('already_redeemed');
  });
  
  test('handles expired codes', async () => {
    const result = await validateCoupon('COUP-OLD123', 'biz-id');
    expect(result.error).toBe('expired');
  });
});

describe('Offline Queue', () => {
  test('queues redemption when offline', async () => {
    mockOffline();
    await redeemCoupon('COUP-TEST123', 'biz-id');
    const queued = await db.redemptions.toArray();
    expect(queued.length).toBe(1);
  });
  
  test('syncs queued redemptions when online', async () => {
    await queueOfflineRedemption({ code: 'COUP-TEST123', ... });
    mockOnline();
    await syncOfflineRedemptions();
    const pending = await db.redemptions.where('synced').equals(false).count();
    expect(pending).toBe(0);
  });
});
```

### Integration Tests

```typescript
describe('Redemption Flow', () => {
  test('complete QR redemption flow', async () => {
    // 1. Scan QR code
    const scannedCode = await scanQRCode();
    expect(scannedCode).toBe('COUP-ABC123');
    
    // 2. Validate
    const validation = await validateCoupon(scannedCode, 'biz-id');
    expect(validation.valid).toBe(true);
    
    // 3. Redeem
    const redemption = await redeemCoupon(scannedCode, 'biz-id');
    expect(redemption.success).toBe(true);
    
    // 4. Verify notification sent
    const notifications = await getNotifications(validation.customerId);
    expect(notifications).toContainEqual(
      expect.objectContaining({ type: 'coupon_redeemed' })
    );
  });
});
```

### E2E Tests (Playwright)

```typescript
test('merchant can redeem coupon via QR scan', async ({ page }) => {
  await page.goto('/business/redemption');
  
  // Click scan QR button
  await page.click('[data-testid="scan-qr-button"]');
  
  // Mock QR scanner to detect code
  await page.evaluate(() => {
    window.mockQRScan('COUP-TEST123');
  });
  
  // Wait for success modal
  await expect(page.locator('[data-testid="success-modal"]')).toBeVisible();
  await expect(page.locator('.offer-title')).toHaveText('Test Offer');
});

test('handles invalid code gracefully', async ({ page }) => {
  await page.goto('/business/redemption');
  await page.click('[data-testid="enter-code-button"]');
  await page.fill('[data-testid="code-input"]', 'INVALID');
  await page.press('[data-testid="code-input"]', 'Enter');
  
  // Verify error modal
  await expect(page.locator('[data-testid="error-modal"]')).toBeVisible();
  await expect(page.locator('.error-message')).toContainText('Invalid code');
});
```

---

## 🌍 Multi-language Support

### Translations (i18n keys)

```json
{
  "en": {
    "redemption.title": "Redeem Coupon",
    "redemption.scanQR": "Scan QR Code",
    "redemption.enterCode": "Enter Code",
    "redemption.codePlaceholder": "COUP-XXXXXX",
    "redemption.validating": "Validating...",
    "redemption.success": "Coupon Redeemed!",
    "redemption.error.invalid": "Invalid code. Please try again.",
    "redemption.error.alreadyUsed": "This coupon has already been used.",
    "redemption.error.expired": "This coupon has expired."
  },
  "te": {
    "redemption.title": "కూపన్ రీడీమ్ చేయండి",
    "redemption.scanQR": "QR కోడ్ స్కాన్ చేయండి",
    "redemption.enterCode": "కోడ్ నమోదు చేయండి",
    ...
  },
  "hi": {
    "redemption.title": "कूपन रिडीम करें",
    "redemption.scanQR": "QR कोड स्कैन करें",
    "redemption.enterCode": "कोड दर्ज करें",
    ...
  }
}
```

---

## ✅ Acceptance Criteria Checklist

### Functional Requirements
- [x] QR scanner opens camera and detects codes
- [x] Manual code entry accepts valid formats
- [x] Validation happens within 500ms
- [x] Success state shows coupon details
- [x] All 6 error states are handled
- [x] Offline redemptions are queued
- [x] Auto-sync when reconnected
- [x] Notifications sent to customers

### Non-Functional Requirements
- [x] Response time < 500ms
- [x] Offline support for 50+ redemptions
- [x] Camera works on iOS & Android
- [x] Accessible (WCAG 2.1 AA)
- [x] Multi-language support (EN, TE, HI)

### Security Requirements
- [x] Redemption requires authentication
- [x] Business ID validated server-side
- [x] Rate limiting (10 redemptions/minute)
- [x] Audit trail for all redemptions

---

## 📝 Implementation Notes

### Phase 1: Core Redemption (Days 1-2)
- Database schema & migrations
- Validation API endpoint
- Basic UI components
- Manual code entry

### Phase 2: QR Scanner (Day 3)
- Camera permissions
- QR scanner integration
- Auto-detection logic

### Phase 3: Offline Support (Day 4)
- IndexedDB setup
- Queue mechanism
- Auto-sync logic

### Phase 4: Polish (Day 5)
- Error handling
- Notifications
- Analytics
- Multi-language
- Testing

---

## 🔗 Related Documentation

- [Story 4.5: Coupon System](./STORY_4.5_COUPON_SYSTEM.md)
- [Story 3.4: QR Code Generation](./STORY_3.4_QR_CODES.md)
- [Database Schema: Coupons](../database/schema_coupons.md)
- [API Reference: Redemption](../api/redemption_endpoints.md)

---

**Status:** ✅ **FULLY SPECIFIED**  
**Mermaid Coverage:** 7/7 nodes (100%)  
**Ready for Implementation:** ✅ YES

---

*Last Updated: October 15, 2025*
*Next Review: After Phase 2 Implementation*
