# Story 4B.5: Billing System - DETAILED SPECIFICATION

**Epic:** 4B - Business Owner Platform Extensions  
**Priority:** 🔴 **CRITICAL** (Operations)  
**Effort:** 8 days  
**Dependencies:** Story 4B.2 (Ads), Story 4B.9 (Pricing Engine)

---

## 🎯 Mermaid Nodes Covered (6/6)

| Node ID | Node Name | Description | Status |
|---------|-----------|-------------|--------|
| `B_Billing` | Billing Dashboard | Main billing interface | ✅ Specified |
| `n94` | Balance Summary | Unbilled & credit balance display | ✅ Specified |
| `B_AddToUnbilled` | Charge Accumulation | Add charges to unbilled ledger | ✅ Specified |
| `B_Billing_Dispute` | Dispute Submission | Submit billing disputes | ✅ Specified |
| `P_Billing_Review` | Admin Review | Platform admin reviews disputes (Epic 6) | ✅ Specified |
| `T_Billing_Credit_Issued` | Credit Application | Apply credits to balance | ✅ Specified |

**Coverage:** 6/6 nodes (100%)

---

## 💡 User Story

**As a** business owner  
**I want to** view my billing charges and manage disputes  
**So that** I can track costs and resolve billing issues

---

## 🎨 UI Components

### 1. Billing Dashboard (`BillingDashboard.tsx`)

```
┌─────────────────────────────────────────┐
│  Billing Dashboard                      │
├─────────────────────────────────────────┤
│  💰 Current Balance                     │
│  ────────────────────────────────────── │
│  Unbilled Charges: ₹2,450.00           │
│  Available Credits: -₹500.00           │
│  ────────────────────────────────────── │
│  Net Due: ₹1,950.00                    │
├─────────────────────────────────────────┤
│  📋 Recent Charges                      │
│  • Carousel Ad (7 days)     ₹1,312.50  │
│  • Coupon Generation (50)   ₹1,000.00  │
│  • Trending Ad (5 days)     ₹562.50    │
│  • Credit Applied           -₹500.00   │
├─────────────────────────────────────────┤
│  [View All Charges] [Submit Dispute]    │
└─────────────────────────────────────────┘
```

### 2. Charge Details Table

**Columns:**
- Date
- Description
- Type (ad, coupon, credit)
- Amount
- Status (unbilled, invoiced)
- Actions (Dispute)

### 3. Dispute Form (`DisputeSubmissionForm.tsx`)

**Fields:**
- Charge selection
- Dispute reason (dropdown + text)
- Amount disputed
- Supporting details

**Reasons:**
- Incorrect amount
- Service not provided
- Double charge
- Other (specify)

---

## 🔧 Database Schema

```sql
-- Unbilled ledger
CREATE TABLE unbilled_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id),
  charge_type TEXT NOT NULL CHECK (charge_type IN ('ad', 'coupon', 'premium', 'other')),
  
  -- References
  ad_request_id UUID REFERENCES ad_requests(id),
  
  amount DECIMAL(10,2) NOT NULL,
  description TEXT NOT NULL,
  accrued_at TIMESTAMPTZ DEFAULT NOW(),
  invoiced BOOLEAN DEFAULT false,
  invoice_id UUID REFERENCES invoices(id)
);

-- Billing credits
CREATE TABLE billing_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id),
  amount DECIMAL(10,2) NOT NULL,
  reason TEXT NOT NULL,
  issued_by UUID REFERENCES profiles(id), -- Admin who issued
  issued_at TIMESTAMPTZ DEFAULT NOW(),
  applied BOOLEAN DEFAULT false,
  applied_to_invoice UUID REFERENCES invoices(id)
);

-- Billing disputes
CREATE TABLE billing_disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id),
  charge_id UUID REFERENCES unbilled_ledger(id),
  invoice_id UUID REFERENCES invoices(id),
  
  dispute_reason TEXT NOT NULL,
  dispute_details TEXT,
  amount_disputed DECIMAL(10,2) NOT NULL,
  
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'reviewing', 'resolved', 'rejected')
  ),
  
  -- Admin review
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  resolution_notes TEXT,
  credit_issued DECIMAL(10,2),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🔄 User Flows

### Flow 1: View Balance

```
1. Navigate to billing dashboard
2. See unbilled charges total
3. See available credits
4. See net amount due
5. View charge history
```

### Flow 2: Submit Dispute

```
1. Click "Submit Dispute"
2. Select charge to dispute
3. Choose dispute reason
4. Enter amount disputed
5. Provide details
6. Submit
   ↓
7. Platform admin reviews (Epic 6)
   ↓
8a. Resolved → Credit issued → Applied to balance
8b. Rejected → Notification sent with reason
```

### Flow 3: Credit Application

```
1. Admin issues credit (Epic 6)
2. Credit added to business account
3. Auto-applied to next invoice OR
4. Applied to unbilled balance if no invoice
5. Business owner notified
```

---

## API Endpoints

### 1. Get Billing Summary
```typescript
GET /api/billing/summary?businessId={id}
Response: {
  unbilled: 2450.00,
  credits: 500.00,
  netDue: 1950.00,
  recentCharges: Charge[],
  recentCredits: Credit[]
}
```

### 2. Submit Dispute
```typescript
POST /api/billing/disputes
Request: {
  businessId: string;
  chargeId: string;
  reason: string;
  details: string;
  amountDisputed: number;
}
Response: {
  success: boolean;
  disputeId: string;
  status: 'pending';
}
```

### 3. Review Dispute (Admin - Epic 6)
```typescript
POST /api/admin/billing/disputes/{id}/review
Request: {
  action: 'resolve' | 'reject';
  resolutionNotes: string;
  creditAmount?: number;
}
Response: {
  success: boolean;
  status: 'resolved' | 'rejected';
}
```

---

## ✅ Acceptance Criteria

- [x] Billing dashboard displays current balance
- [x] Unbilled charges listed with details
- [x] Credits tracked and displayed
- [x] Dispute submission functional
- [x] Admin review workflow (Epic 6)
- [x] Credits auto-apply to balance
- [x] Notifications sent at each stage

---

## 🔗 Related Documentation

- [Story 4B.2: Ad System](./STORY_4B.2_AD_SYSTEM_DETAILED.md)
- [Epic 6: Platform Admin Dashboard](../epics/EPIC_6_ADMIN.md)
- [Database Schema: Billing](../database/schema_billing.md)

---

**Status:** ✅ **FULLY SPECIFIED**  
**Mermaid Coverage:** 6/6 nodes (100%)

---

*Last Updated: October 15, 2025*
