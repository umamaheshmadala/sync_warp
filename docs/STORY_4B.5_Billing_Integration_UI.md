# Story 4B.5: Billing Integration UI

**Epic:** 4B - Missing Business Owner Features  
**Priority:** 🟠 P1 - HIGH (Monetization)  
**Effort:** 6 days  
**Status:** 📝 PLANNED  
**Owner:** TBD

---

## 📋 Overview

**Problem:** Database has billing tables (`unbilled_amounts`, `credits`, `disputes`, `billing_credits_usage`) but NO UI exists for businesses to:
- View unbilled balances
- Pay invoices
- Dispute charges
- View payment history
- Manage payment methods

**Current State:** Billing data accumulates in database with no visibility or payment mechanism.

**Solution:** Build comprehensive billing UI with:
1. Billing dashboard showing balances and history
2. Invoice generation and viewing
3. Payment method management
4. Payment processing integration
5. Dispute submission workflow
6. Credits and refunds tracking

**Business Value:**
- 💰 **Revenue Collection** - actually get paid for services
- 📊 **Financial Transparency** - builds trust
- 🚫 **Reduce Disputes** - clear communication
- ⚡ **Cash Flow** - faster payments

---

## 👥 User Stories

### Primary User Story
```
As a business owner,
I want to view and pay my bills through the platform,
So that I can manage my advertising expenses efficiently.
```

### Supporting User Stories
```
As a business owner,
I want to see my unbilled balance in real-time,
So that I know what I owe.

As a business owner,
I want to dispute incorrect charges,
So that I only pay for valid services.

As a business owner,
I want to save payment methods securely,
So that payments are quick and convenient.

As a business owner,
I want to view payment history and invoices,
So that I can track expenses for accounting.

As a platform admin,
I want to track billing and disputes,
So that I can ensure accurate revenue collection.
```

---

## ✅ Acceptance Criteria

### Must Have (MVP)

#### 1. Billing Dashboard
- [ ] **Current Balance Card:**
  - [ ] Unbilled amount (current balance)
  - [ ] Credits available
  - [ ] Next bill date
  - [ ] Payment status indicator
- [ ] **Recent Charges:**
  - [ ] List of recent unbilled items
  - [ ] Date, description, amount
  - [ ] Link to related campaign/ad
- [ ] **Payment History:**
  - [ ] Past invoices with status
  - [ ] Payment method used
  - [ ] Download invoice PDF
- [ ] **Quick Actions:**
  - [ ] Pay Now button
  - [ ] View Full Statement
  - [ ] Dispute Charge
  - [ ] Manage Payment Methods

#### 2. Invoice Generation & Viewing
- [ ] **Auto-generate invoices:**
  - [ ] Monthly billing cycle
  - [ ] On-demand for large balances
  - [ ] Itemized charges
- [ ] **Invoice Details:**
  - [ ] Invoice number and date
  - [ ] Billing period
  - [ ] Line items with descriptions
  - [ ] Subtotal, credits, taxes, total
  - [ ] Payment terms
- [ ] **Actions:**
  - [ ] Download PDF
  - [ ] Email to business
  - [ ] Print
  - [ ] Mark as paid

#### 3. Payment Processing
- [ ] **Payment Methods:**
  - [ ] Credit/Debit card (Stripe)
  - [ ] ACH bank transfer (future)
  - [ ] Multiple saved methods
  - [ ] Default method selection
- [ ] **Payment Flow:**
  - [ ] Select invoice or amount
  - [ ] Choose payment method
  - [ ] Confirm payment
  - [ ] Receipt generation
  - [ ] Email confirmation
- [ ] **Payment Plans:**
  - [ ] Autopay option
  - [ ] Payment reminders
  - [ ] Late fee warnings

#### 4. Payment Method Management
- [ ] **Add Payment Method:**
  - [ ] Card number, expiry, CVV
  - [ ] Billing address
  - [ ] Nickname for method
  - [ ] Set as default
- [ ] **View Saved Methods:**
  - [ ] Masked card numbers
  - [ ] Expiry dates
  - [ ] Default indicator
- [ ] **Actions:**
  - [ ] Edit billing address
  - [ ] Remove method
  - [ ] Set default

#### 5. Dispute Management
- [ ] **Dispute Submission:**
  - [ ] Select charge to dispute
  - [ ] Reason for dispute (dropdown)
  - [ ] Detailed explanation (text)
  - [ ] Upload supporting documents
  - [ ] Submit for review
- [ ] **Dispute Tracking:**
  - [ ] Status (pending, resolved, rejected)
  - [ ] Admin response
  - [ ] Resolution timeline
  - [ ] Notification on status change
- [ ] **Outcomes:**
  - [ ] Credit applied
  - [ ] Charge upheld
  - [ ] Partial refund

#### 6. Credits & Refunds
- [ ] **Credits Dashboard:**
  - [ ] Total credits available
  - [ ] Credit history
  - [ ] Expiration dates
  - [ ] Usage tracking
- [ ] **Automatic Application:**
  - [ ] Apply credits to new charges
  - [ ] Preference for credit usage
  - [ ] Credit balance alerts

### Should Have
- [ ] Budget alerts and notifications
- [ ] Spending analytics
- [ ] Custom billing cycles
- [ ] Multi-user access (accountant role)

### Won't Have (This Story)
- ⛔ Cryptocurrency payments
- ⛔ Invoice customization (branding)
- ⛔ Tax calculation automation
- ⛔ Integration with accounting software

---

## 🛠️ Technical Requirements

### Database Schema (Already Exists - Need UI Only)

#### Existing Tables to Utilize:
```sql
-- unbilled_amounts: Track charges before invoicing
-- credits: Track available credits
-- disputes: Handle billing disputes
-- billing_credits_usage: Track credit applications
-- invoices (need to create): Store generated invoices
```

#### New Table: `invoices`
```sql
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id),
  
  invoice_number TEXT UNIQUE NOT NULL,
  invoice_date DATE NOT NULL,
  due_date DATE NOT NULL,
  billing_period_start DATE,
  billing_period_end DATE,
  
  -- Amounts
  subtotal_cents INTEGER NOT NULL,
  credits_applied_cents INTEGER DEFAULT 0,
  tax_cents INTEGER DEFAULT 0,
  total_cents INTEGER NOT NULL,
  amount_paid_cents INTEGER DEFAULT 0,
  
  -- Status
  status TEXT DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'paid', 'overdue', 'cancelled')),
  paid_at TIMESTAMPTZ,
  
  -- Payment
  payment_method_id UUID REFERENCES payment_methods(id),
  payment_transaction_id TEXT,
  
  -- PDF
  pdf_url TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_invoices_business ON invoices(business_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);
```

#### New Table: `payment_methods`
```sql
CREATE TABLE payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id),
  
  -- Payment Provider (Stripe, etc.)
  provider TEXT DEFAULT 'stripe',
  provider_payment_method_id TEXT NOT NULL,
  
  -- Card Info (masked)
  type TEXT, -- 'card', 'bank_account'
  brand TEXT, -- 'visa', 'mastercard', 'amex'
  last_4 TEXT,
  exp_month INTEGER,
  exp_year INTEGER,
  
  -- Billing Address
  billing_address JSONB,
  
  -- Metadata
  nickname TEXT,
  is_default BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_payment_methods_business ON payment_methods(business_id);
CREATE INDEX idx_payment_methods_default ON payment_methods(business_id, is_default);
```

#### New Table: `payment_transactions`
```sql
CREATE TABLE payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id),
  invoice_id UUID REFERENCES invoices(id),
  
  -- Transaction Details
  amount_cents INTEGER NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  
  -- Payment Method
  payment_method_id UUID REFERENCES payment_methods(id),
  provider_transaction_id TEXT,
  
  -- Metadata
  failure_reason TEXT,
  receipt_url TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_transactions_business ON payment_transactions(business_id);
CREATE INDEX idx_transactions_invoice ON payment_transactions(invoice_id);
```

### API Endpoints

#### Billing Endpoints

##### 1. Get Billing Summary
```typescript
GET /api/business/billing/summary?businessId={id}
Response: {
  unbilledAmount: number,
  creditsAvailable: number,
  nextBillDate: string,
  recentCharges: UnbilledAmount[],
  paymentStatus: string
}
```

##### 2. Generate Invoice
```typescript
POST /api/business/billing/generate-invoice
Body: {
  businessId: string,
  billingPeriodStart?: string,
  billingPeriodEnd?: string
}
Response: {
  invoiceId: string,
  invoiceNumber: string,
  totalCents: number,
  pdfUrl: string
}
```

##### 3. Get Invoice Details
```typescript
GET /api/business/billing/invoice/{invoiceId}
Response: {
  invoice: Invoice,
  lineItems: UnbilledAmount[],
  creditsApplied: Credit[]
}
```

##### 4. Get Payment History
```typescript
GET /api/business/billing/payment-history?businessId={id}&page={n}
Response: {
  invoices: Invoice[],
  transactions: PaymentTransaction[],
  pagination: {...}
}
```

#### Payment Endpoints

##### 1. Add Payment Method
```typescript
POST /api/business/payment-methods/add
Body: {
  businessId: string,
  providerToken: string, // from Stripe
  nickname?: string,
  setAsDefault: boolean
}
Response: {
  paymentMethodId: string,
  last4: string,
  brand: string
}
```

##### 2. Process Payment
```typescript
POST /api/business/billing/process-payment
Body: {
  businessId: string,
  invoiceId?: string,
  amountCents: number,
  paymentMethodId: string
}
Response: {
  success: boolean,
  transactionId: string,
  receiptUrl: string
}
```

##### 3. Setup Autopay
```typescript
POST /api/business/billing/autopay
Body: {
  businessId: string,
  enabled: boolean,
  paymentMethodId: string
}
```

#### Dispute Endpoints

##### 1. Submit Dispute
```typescript
POST /api/business/billing/dispute/submit
Body: {
  businessId: string,
  unbilledAmountId: string,
  reason: string,
  explanation: string,
  supportingDocuments?: string[]
}
Response: {
  disputeId: string,
  status: 'pending'
}
```

##### 2. Get Dispute Status
```typescript
GET /api/business/billing/dispute/{disputeId}
Response: {
  dispute: Dispute,
  timeline: DisputeEvent[],
  resolution?: string
}
```

### React Components

#### 1. `BillingDashboard.tsx`
```typescript
src/components/business/billing/BillingDashboard.tsx
- Current balance card
- Recent charges list
- Payment history
- Quick actions
```

#### 2. `InvoiceViewer.tsx`
```typescript
src/components/business/billing/InvoiceViewer.tsx
- Invoice header
- Line items table
- Total calculation
- Download PDF button
- Payment CTA
```

#### 3. `PaymentMethodsManager.tsx`
```typescript
src/components/business/billing/PaymentMethodsManager.tsx
- List saved methods
- Add new method form (Stripe Elements)
- Edit/delete methods
- Set default
```

#### 4. `PaymentProcessing.tsx`
```typescript
src/components/business/billing/PaymentProcessing.tsx
- Amount display
- Payment method selector
- Stripe payment form
- Confirmation screen
- Receipt display
```

#### 5. `DisputeForm.tsx`
```typescript
src/components/business/billing/DisputeForm.tsx
- Charge details
- Reason dropdown
- Explanation textarea
- Document upload
- Submit button
```

#### 6. `CreditsWidget.tsx`
```typescript
src/components/business/billing/CreditsWidget.tsx
- Available credits display
- Credit history
- Usage tracking
- Expiration alerts
```

### Custom Hooks

#### `useBilling.ts`
```typescript
export function useBilling(businessId: string) {
  const getSummary = async () => {...}
  const generateInvoice = async () => {...}
  const getInvoice = async (id: string) => {...}
  const getPaymentHistory = async () => {...}
  
  return {
    getSummary,
    generateInvoice,
    getInvoice,
    getPaymentHistory,
    loading,
    error
  }
}
```

#### `usePayment.ts`
```typescript
export function usePayment(businessId: string) {
  const addPaymentMethod = async (token: string) => {...}
  const processPayment = async (invoiceId: string, methodId: string) => {...}
  const setupAutopay = async (enabled: boolean, methodId: string) => {...}
  
  return {
    addPaymentMethod,
    processPayment,
    setupAutopay,
    loading,
    error
  }
}
```

#### `useDispute.ts`
```typescript
export function useDispute(businessId: string) {
  const submitDispute = async (data: DisputeData) => {...}
  const getDispute = async (id: string) => {...}
  const listDisputes = async () => {...}
  
  return {
    submitDispute,
    getDispute,
    listDisputes,
    loading,
    error
  }
}
```

### Third-Party Integration: Stripe

```typescript
// Stripe Setup
import { loadStripe } from '@stripe/stripe-js'
import { Elements, CardElement } from '@stripe/react-stripe-js'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_KEY!)

// Payment Intent Creation (Backend)
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)

const paymentIntent = await stripe.paymentIntents.create({
  amount: totalCents,
  currency: 'usd',
  metadata: {
    businessId,
    invoiceId
  }
})
```

---

## 🎨 UI/UX Requirements

### Wireframe: Billing Dashboard

```
┌──────────────────────────────────────────────────────┐
│ Billing & Payments                                    │
├──────────────────────────────────────────────────────┤
│                                                       │
│ ┌──────────────────┐  ┌──────────────────┐          │
│ │ Current Balance  │  │ Credits          │          │
│ │ $247.50          │  │ $50.00           │          │
│ │ Due: Jan 31      │  │ Available        │          │
│ │ [Pay Now]        │  │ [View Details]   │          │
│ └──────────────────┘  └──────────────────┘          │
│                                                       │
│ Recent Charges                         [View All]    │
│ ┌──────────────────────────────────────────────────┐│
│ │ Jan 10 | Featured Ad Campaign     | $100.00     ││
│ │ Jan 15 | Banner Ad (7 days)        | $50.00      ││
│ │ Jan 20 | Sponsored Post            | $75.00      ││
│ │ Jan 22 | Coupon Redemption Fee     | $22.50      ││
│ └──────────────────────────────────────────────────┘│
│                                                       │
│ Payment History                        [View All]    │
│ ┌──────────────────────────────────────────────────┐│
│ │ Dec 2024 | Paid: $320.00 | Visa •••• 1234       ││
│ │ Nov 2024 | Paid: $280.00 | Visa •••• 1234       ││
│ │ Oct 2024 | Paid: $150.00 | Visa •••• 1234       ││
│ └──────────────────────────────────────────────────┘│
│                                                       │
│ [Manage Payment Methods] [Setup Autopay] [Dispute]  │
└──────────────────────────────────────────────────────┘
```

### Wireframe: Invoice Viewer

```
┌──────────────────────────────────────────────────────┐
│ Invoice #INV-2025-001                    [Download] │
├──────────────────────────────────────────────────────┤
│                                                       │
│ Billing Period: Jan 1 - Jan 31, 2025                │
│ Due Date: Feb 15, 2025                               │
│                                                       │
│ Bill To:                                              │
│ Pizza Palace                                          │
│ 123 Main Street                                       │
│ City, State 12345                                     │
│                                                       │
│ ┌──────────────────────────────────────────────────┐│
│ │ Description             Qty    Price    Total    ││
│ ├──────────────────────────────────────────────────┤│
│ │ Featured Ad Campaign     1    $100.00  $100.00   ││
│ │ Banner Ad (7 days)       1     $50.00   $50.00   ││
│ │ Sponsored Post           1     $75.00   $75.00   ││
│ │ Coupon Redemptions      15      $1.50   $22.50   ││
│ │                                                   ││
│ │                          Subtotal:      $247.50   ││
│ │                          Credits:       -$50.00   ││
│ │                          Tax (8%):       $15.80   ││
│ │                          ─────────────────────    ││
│ │                          Total Due:     $213.30   ││
│ └──────────────────────────────────────────────────┘│
│                                                       │
│ Payment Status: Unpaid                                │
│                                                       │
│ [Pay Now] [Dispute Charges] [Print]                  │
└──────────────────────────────────────────────────────┘
```

### Wireframe: Payment Processing

```
┌──────────────────────────────────────────────────────┐
│ Make a Payment                                        │
├──────────────────────────────────────────────────────┤
│                                                       │
│ Amount Due: $213.30                                   │
│ Invoice: INV-2025-001                                 │
│                                                       │
│ Select Payment Method:                                │
│ ● Visa •••• 1234 (Exp: 12/26) [Default]             │
│ ○ Mastercard •••• 5678 (Exp: 03/27)                 │
│ ○ Add New Payment Method                             │
│                                                       │
│ [If new method selected:]                             │
│ ┌────────────────────────────────────────────────┐  │
│ │ Card Number: [________________]                │  │
│ │ Expiry: [MM/YY]  CVV: [___]                    │  │
│ │ Billing ZIP: [_____]                           │  │
│ │ ☐ Save for future payments                     │  │
│ └────────────────────────────────────────────────┘  │
│                                                       │
│ Payment Summary:                                      │
│ Amount:                              $213.30          │
│ Processing Fee:                        $0.00          │
│ ────────────────────────────────────────────          │
│ Total:                               $213.30          │
│                                                       │
│ [Cancel]                     [Confirm Payment]        │
└──────────────────────────────────────────────────────┘
```

### Wireframe: Dispute Form

```
┌──────────────────────────────────────────────────────┐
│ Dispute Charge                                        │
├──────────────────────────────────────────────────────┤
│                                                       │
│ Charge Details:                                       │
│ Date: Jan 15, 2025                                    │
│ Description: Banner Ad (7 days)                       │
│ Amount: $50.00                                        │
│                                                       │
│ Reason for Dispute:                                   │
│ ┌────────────────────────────────────────────────┐  │
│ │ ▼ Select a reason                              │  │
│ │   • Never approved this charge                 │  │
│ │   • Charged incorrect amount                   │  │
│ │   • Service not delivered                      │  │
│ │   • Duplicate charge                           │  │
│ │   • Other                                      │  │
│ └────────────────────────────────────────────────┘  │
│                                                       │
│ Please explain in detail:                             │
│ ┌────────────────────────────────────────────────┐  │
│ │ This ad was never approved by me. I did not    │  │
│ │ submit this ad request...                      │  │
│ └────────────────────────────────────────────────┘  │
│                                                       │
│ Supporting Documents (optional):                      │
│ [Upload Files]                                        │
│                                                       │
│ Note: Disputes are typically reviewed within 3-5     │
│ business days. You'll receive email updates.         │
│                                                       │
│ [Cancel]                        [Submit Dispute]      │
└──────────────────────────────────────────────────────┘
```

---

## 🧪 Test Plan

### Unit Tests

```typescript
describe('Billing Calculations', () => {
  it('calculates subtotal correctly')
  it('applies credits')
  it('calculates tax')
  it('generates invoice number')
})

describe('Payment Processing', () => {
  it('validates payment method')
  it('processes payment successfully')
  it('handles payment failures')
  it('creates transaction record')
})

describe('Dispute Workflow', () => {
  it('validates dispute submission')
  it('tracks dispute status')
  it('applies credits on resolution')
})
```

### Integration Tests

```typescript
describe('Billing Flow', () => {
  it('generates invoice from unbilled amounts')
  it('processes payment via Stripe')
  it('updates invoice status')
  it('sends receipt email')
})
```

### E2E Test Scenarios

```gherkin
Given a business has $247.50 in unbilled charges
When admin generates an invoice
Then invoice shows correct line items
And total is calculated with credits and tax
When business clicks "Pay Now"
And selects payment method
And confirms payment
Then payment processes successfully
And invoice is marked as paid
And receipt is sent via email
```

---

## 📝 Implementation Plan

### Day 1: Database & Stripe Setup
- [ ] Create invoices table
- [ ] Create payment_methods table
- [ ] Create payment_transactions table
- [ ] Setup Stripe account
- [ ] Configure Stripe API keys
- [ ] Test Stripe integration

### Day 2: Billing API Endpoints
- [ ] Billing summary endpoint
- [ ] Generate invoice endpoint
- [ ] Get invoice endpoint
- [ ] Payment history endpoint
- [ ] Unit tests

### Day 3: Payment API & Integration
- [ ] Add payment method endpoint
- [ ] Process payment endpoint
- [ ] Stripe webhook handling
- [ ] Receipt generation
- [ ] Unit tests

### Day 4: Billing UI Components
- [ ] Billing dashboard
- [ ] Invoice viewer
- [ ] Payment history
- [ ] Credits widget

### Day 5: Payment UI & Methods
- [ ] Payment methods manager
- [ ] Payment processing form (Stripe Elements)
- [ ] Autopay setup
- [ ] Confirmation screens

### Day 6: Dispute & Testing
- [ ] Dispute submission form
- [ ] Dispute tracking
- [ ] Admin dispute review (basic)
- [ ] Integration tests
- [ ] E2E scenarios
- [ ] Documentation

---

## 🔗 Integration Points

### Existing Systems
- **Ad Requests:** Link charges to campaigns
- **Notifications:** Payment reminders and receipts
- **Dashboard:** Show billing widget

### External Services
- **Stripe:** Payment processing
- **Email:** Receipts and invoices
- **PDF Generation:** Invoice PDFs

---

## 🚨 Edge Cases & Error Handling

### Edge Cases
1. **Payment declined:** Retry logic
2. **Partial payments:** Track remaining balance
3. **Refunds:** Reverse transactions
4. **Card expiry:** Proactive reminders
5. **Disputed then paid:** Handle status conflicts

### Security
- PCI compliance via Stripe
- No card data stored directly
- Encrypted billing addresses
- Secure webhook verification

---

## 📊 Success Metrics

### Functional Metrics
- [ ] Payment success rate >95%
- [ ] Payment processing time <5 seconds
- [ ] Dispute resolution time <3 days

### Business Metrics
- [ ] Monthly collected revenue
- [ ] Autopay adoption rate
- [ ] Dispute rate <2%

---

## 📚 Definition of Done

### Code Complete
- [ ] All database migrations applied
- [ ] Stripe integration functional
- [ ] All UI components complete
- [ ] Payment flow working end-to-end
- [ ] Dispute system operational

### Testing Complete
- [ ] Unit tests passing (>80% coverage)
- [ ] Integration tests passing
- [ ] E2E payment flow verified
- [ ] Stripe webhooks tested

### Documentation Complete
- [ ] API documentation
- [ ] Stripe integration guide
- [ ] User payment guide
- [ ] Admin billing guide

---

## 🔄 Future Enhancements

### Phase 2
- ACH bank transfers
- Payment plans
- Tax calculation automation
- QuickBooks integration

### Phase 3
- Multi-currency support
- Cryptocurrency payments
- Subscription management
- Advanced reporting

---

**Story Status:** 📝 PLANNED  
**Blocked By:** Story 4B.2 (Ad system creates charges)  
**Blocking:** None  
**Ready for Development:** After 4B.2 ✅

