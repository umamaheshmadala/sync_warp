# Story 4B.6: QR Code & Barcode Generation

**Epic:** 4B - Missing Business Owner Features  
**Priority:** 🟠 P1 - HIGH (UX Enhancement)  
**Effort:** 3 days  
**Status:** 📝 PLANNED  
**Owner:** TBD

---

## 📋 Overview

**Problem:** Enhanced Project Brief specifies QR codes and barcodes for easy coupon redemption, but this doesn't exist. Businesses currently have to manually type coupon codes, which is slow and error-prone.

**Current State:** Manual code entry only (Story 4B.1)

**Solution:** Generate QR codes and barcodes for:
1. Coupon codes (customer displays, merchant scans)
2. Business check-ins (GPS verification support)
3. Products (future inventory management)

**Business Value:**
- ⚡ **Faster Redemption** - scan vs type (2 sec vs 15 sec)
- ✅ **Fewer Errors** - no typos
- 📱 **Better UX** - mobile-friendly
- 🎯 **Professional** - modern experience

---

## 👥 User Stories

### Primary User Story
```
As a customer,
I want to display my coupon as a QR code,
So that merchants can scan it quickly at checkout.
```

### Supporting User Stories
```
As a merchant,
I want to scan QR codes to redeem coupons,
So that redemption is fast and accurate.

As a customer,
I want to use my phone camera to check in at businesses,
So that I don't have to manually enter location.

As a business owner,
I want to display a check-in QR code at my store,
So that customers can easily check in.
```

---

## ✅ Acceptance Criteria

### Must Have (MVP)

#### 1. Coupon QR Code Generation
- [ ] **Auto-generate QR codes** when coupon collected
  - [ ] Encode coupon redemption code
  - [ ] Include business_id validation
  - [ ] Store QR code URL in database
- [ ] **Customer View:**
  - [ ] Display QR code in coupon details
  - [ ] Full-screen QR view for scanning
  - [ ] Brightness boost option
  - [ ] Coupon code shown below QR
- [ ] **QR Format:**
  - [ ] JSON payload: `{type: 'coupon', code: 'XXX', businessId: 'YYY'}`
  - [ ] PNG image, 300x300px minimum
  - [ ] Error correction: Level M (15%)

#### 2. QR Code Scanning (Merchant)
- [ ] **Camera Scanner Component:**
  - [ ] Request camera permissions
  - [ ] Live preview with scanning frame
  - [ ] Auto-detect QR codes
  - [ ] Haptic/audio feedback on scan
- [ ] **Validation:**
  - [ ] Parse QR payload
  - [ ] Validate format
  - [ ] Call redemption API
  - [ ] Show success/error
- [ ] **Fallback:**
  - [ ] Manual code entry still available
  - [ ] Switch between modes

#### 3. Business Check-In QR Codes
- [ ] **Generate Check-In QR:**
  - [ ] Unique per business
  - [ ] Payload: `{type: 'checkin', businessId: 'XXX'}`
  - [ ] Downloadable/printable
- [ ] **Customer Check-In:**
  - [ ] Scan QR to check in
  - [ ] Alternative to GPS check-in
  - [ ] Record check-in timestamp

#### 4. Barcode Support (Optional for MVP)
- [ ] **1D Barcode Generation:**
  - [ ] Code128 format
  - [ ] For printed coupons
  - [ ] Scannable with traditional scanners

### Should Have
- [ ] QR code customization (colors, logo)
- [ ] Bulk QR generation for events
- [ ] QR analytics (scans, locations)

### Won't Have (This Story)
- ⛔ NFC tags
- ⛔ Apple Wallet integration
- ⛔ Google Pay integration
- ⛔ Product barcode scanning (future)

---

## 🛠️ Technical Requirements

### Libraries

```json
{
  "dependencies": {
    "qrcode": "^1.5.3",          // QR generation
    "qrcode.react": "^3.1.0",    // React QR component
    "jsbarcode": "^3.11.5",       // Barcode generation
    "html5-qrcode": "^2.3.8",    // QR scanning
    "@zxing/library": "^0.20.0"  // Alternative scanner
  }
}
```

### Database Schema

#### Update: `user_coupon_collections` table
```sql
ALTER TABLE user_coupon_collections
ADD COLUMN qr_code_url TEXT,
ADD COLUMN qr_code_generated_at TIMESTAMPTZ;

CREATE INDEX idx_coupon_qr_url ON user_coupon_collections(qr_code_url);
```

#### Update: `businesses` table
```sql
ALTER TABLE businesses
ADD COLUMN checkin_qr_code_url TEXT,
ADD COLUMN checkin_qr_code_generated_at TIMESTAMPTZ;
```

### API Endpoints

#### 1. Generate Coupon QR Code
```typescript
POST /api/coupons/generate-qr
Body: {
  couponCollectionId: string,
  userId: string
}
Response: {
  qrCodeUrl: string,
  qrCodeData: string,
  expiresAt: string
}
```

#### 2. Generate Business Check-In QR
```typescript
POST /api/business/generate-checkin-qr
Body: {
  businessId: string
}
Response: {
  qrCodeUrl: string,
  qrCodeData: string,
  downloadUrl: string
}
```

#### 3. Validate Scanned QR
```typescript
POST /api/qr/validate
Body: {
  qrData: string,
  scannerId: string // merchant or customer
}
Response: {
  valid: boolean,
  type: 'coupon' | 'checkin',
  data: object,
  action: string // what to do next
}
```

### QR Generation Logic

```typescript
// Server-side QR generation
import QRCode from 'qrcode'

async function generateCouponQR(collectionId: string, code: string, businessId: string) {
  const payload = JSON.stringify({
    type: 'coupon',
    code,
    businessId,
    collectionId,
    timestamp: Date.now()
  })
  
  const qrOptions = {
    errorCorrectionLevel: 'M',
    type: 'image/png',
    width: 300,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    }
  }
  
  const qrCodeDataUrl = await QRCode.toDataURL(payload, qrOptions)
  
  // Upload to storage and return URL
  const qrCodeUrl = await uploadToStorage(qrCodeDataUrl, `qr-codes/coupon-${collectionId}.png`)
  
  return { qrCodeUrl, qrCodeData: payload }
}
```

### React Components

#### 1. `QRCodeDisplay.tsx`
```typescript
src/components/common/QRCodeDisplay.tsx
- Display QR code image
- Full-screen modal view
- Brightness controls
- Download option
```

#### 2. `QRScanner.tsx`
```typescript
src/components/business/QRScanner.tsx
- Camera permission request
- Live camera preview
- QR detection overlay
- Success/error states
- Fallback to manual entry
```

#### 3. `CouponQRView.tsx`
```typescript
src/components/customer/CouponQRView.tsx
- QR code centered
- Coupon code below
- Expiry countdown
- Terms & conditions link
```

#### 4. `BusinessCheckinQR.tsx`
```typescript
src/components/business/BusinessCheckinQR.tsx
- Display check-in QR
- Download/print options
- Regenerate option
- Display instructions
```

### Custom Hooks

#### `useQRCode.ts`
```typescript
export function useQRCode() {
  const generate = async (data: object, type: 'coupon' | 'checkin') => {...}
  const download = (qrUrl: string, filename: string) => {...}
  
  return {
    generate,
    download,
    loading,
    error
  }
}
```

#### `useQRScanner.ts`
```typescript
export function useQRScanner(onScan: (data: string) => void) {
  const startScanning = async () => {...}
  const stopScanning = () => {...}
  const requestPermissions = async () => {...}
  
  return {
    startScanning,
    stopScanning,
    requestPermissions,
    isScanning,
    hasPermission,
    error
  }
}
```

---

## 🎨 UI/UX Requirements

### Wireframe: Coupon QR Display (Customer)

```
┌──────────────────────────────────────────┐
│ 20% Off Pizza Special                    │
├──────────────────────────────────────────┤
│                                           │
│        ┌─────────────────────┐           │
│        │                     │           │
│        │   ▓▓▓▓▓▓▓▓▓▓▓▓▓   │           │
│        │   ▓▓     ▓  ▓▓▓   │           │
│        │   ▓▓ ▓▓▓ ▓  ▓▓▓   │           │
│        │   ▓▓ ▓▓▓ ▓▓▓  ▓   │           │
│        │   ▓▓ ▓▓▓ ▓ ▓▓▓▓   │           │
│        │   ▓▓     ▓▓  ▓▓   │           │
│        │   ▓▓▓▓▓▓▓▓▓▓▓▓▓   │           │
│        │                     │           │
│        └─────────────────────┘           │
│                                           │
│        Code: PIZZA-2025-ABC123           │
│                                           │
│        Expires: Jan 31, 2025             │
│        Valid at: Pizza Palace            │
│                                           │
│ [Enlarge QR]  [Show Terms]  [Download]  │
└──────────────────────────────────────────┘
```

### Wireframe: QR Scanner (Merchant)

```
┌──────────────────────────────────────────┐
│ Scan Coupon QR Code      [Switch to Type]│
├──────────────────────────────────────────┤
│                                           │
│  ┌─────────────────────────────────────┐ │
│  │                                     │ │
│  │    [Live Camera Feed]               │ │
│  │                                     │ │
│  │       ┌───────────────┐             │ │
│  │       │               │             │ │
│  │       │  Align QR     │             │ │
│  │       │  code here    │             │ │
│  │       │               │             │ │
│  │       └───────────────┘             │ │
│  │                                     │ │
│  └─────────────────────────────────────┘ │
│                                           │
│  Position QR code within frame           │
│  Scanning will happen automatically...   │
│                                           │
│  [Cancel]          [Enter Code Manually] │
└──────────────────────────────────────────┘
```

### Wireframe: Check-In QR (Business Dashboard)

```
┌──────────────────────────────────────────┐
│ Customer Check-In QR Code                │
├──────────────────────────────────────────┤
│                                           │
│  Display this QR code at your entrance   │
│  for customers to check in easily.       │
│                                           │
│        ┌─────────────────────┐           │
│        │                     │           │
│        │   ▓▓▓▓▓▓▓▓▓▓▓▓▓   │           │
│        │   ▓▓     ▓▓▓  ▓   │           │
│        │   ▓▓ ▓▓▓ ▓▓  ▓▓   │           │
│        │   ▓▓ ▓▓▓ ▓ ▓▓▓▓   │           │
│        │   ▓▓ ▓▓▓ ▓  ▓▓▓   │           │
│        │   ▓▓     ▓▓▓  ▓   │           │
│        │   ▓▓▓▓▓▓▓▓▓▓▓▓▓   │           │
│        │                     │           │
│        │   Check In at       │           │
│        │   Pizza Palace      │           │
│        └─────────────────────┘           │
│                                           │
│  [Download PNG]  [Download PDF]  [Print] │
│                                           │
│  [Regenerate QR Code]                    │
└──────────────────────────────────────────┘
```

---

## 🧪 Test Plan

### Unit Tests

```typescript
describe('QR Code Generation', () => {
  it('generates valid QR code')
  it('includes correct payload')
  it('handles error correction')
  it('returns valid URL')
})

describe('QR Code Validation', () => {
  it('validates correct format')
  it('rejects invalid QR data')
  it('validates business ownership')
  it('checks expiration')
})
```

### Integration Tests

```typescript
describe('QR Flow', () => {
  it('generates QR on coupon collection')
  it('displays QR to customer')
  it('merchant scans QR successfully')
  it('validates and redeems coupon')
})
```

### E2E Test Scenarios

```gherkin
Given a customer has collected a coupon
When QR code is generated
Then customer sees QR in coupon details
When merchant opens scanner
And scans the QR code
Then coupon is validated
And redemption flow starts
```

---

## 📝 Implementation Plan

### Day 1: QR Generation Backend
- [ ] Install QR libraries
- [ ] Implement QR generation logic
- [ ] Create API endpoints
- [ ] Upload to storage
- [ ] Unit tests

### Day 2: Customer QR Display
- [ ] QR display component
- [ ] Full-screen modal
- [ ] Download functionality
- [ ] Integrate into coupon details
- [ ] Mobile optimization

### Day 3: Merchant QR Scanner & Testing
- [ ] QR scanner component
- [ ] Camera permissions
- [ ] Scanning logic
- [ ] Integration with redemption flow
- [ ] Business check-in QR generation
- [ ] E2E testing
- [ ] Documentation

---

## 🔗 Integration Points

### Existing Systems
- **Coupon Collection:** Auto-generate QR
- **Redemption Flow:** Accept QR scans (Story 4B.1)
- **Check-In System:** QR as GPS alternative

---

## 🚨 Edge Cases & Error Handling

### Edge Cases
1. **Camera not available:** Fallback to manual
2. **Poor lighting:** Adjust brightness
3. **QR damaged:** Show code as fallback
4. **Multiple QRs in frame:** Detect first valid
5. **Expired QR:** Clear error message

### Security
- QR payload validation
- Timestamp expiry (15 min)
- Business ownership verification
- Rate limiting on scans

---

## 📊 Success Metrics

### Functional Metrics
- [ ] QR scan success rate >95%
- [ ] QR generation time <1 second
- [ ] Scan time <2 seconds

### Business Metrics
- [ ] QR redemption vs manual entry
- [ ] Merchant adoption rate
- [ ] Customer satisfaction

---

## 📚 Definition of Done

### Code Complete
- [ ] QR generation working
- [ ] QR scanning working
- [ ] Check-in QR functional
- [ ] Mobile responsive

### Testing Complete
- [ ] Unit tests passing
- [ ] Integration tests passing
- [ ] E2E scenarios verified
- [ ] Multiple devices tested

---

**Story Status:** 📝 PLANNED  
**Blocked By:** Story 4B.1 (Redemption Interface)  
**Blocking:** None  
**Ready for Development:** After 4B.1 ✅

