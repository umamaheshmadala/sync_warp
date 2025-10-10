# Story 4B.9: Pricing Engine Integration

**Epic:** 4B - Missing Business Owner Features  
**Priority:** 🟡 P2 - MEDIUM (Revenue Optimization)  
**Effort:** 3 days  
**Status:** 📝 PLANNED  
**Owner:** TBD

---

## 📋 Overview

**Problem:** Enhanced Project Brief references a pricing engine, but current implementation only has fixed prices in the database. Need dynamic pricing based on:
- Business tier (Basic, Premium, Enterprise)
- Volume discounts (bulk purchases)
- Promotional pricing (seasonal campaigns)
- Seasonal rates (holiday pricing)
- Custom business agreements

**Current State:** Static pricing with no flexibility:
- Fixed ad costs
- No volume discounts
- No promotional pricing
- No tier-based benefits
- Manual price overrides only

**Solution:** Build comprehensive pricing engine with:
1. Tiered pricing structure
2. Volume discount calculator
3. Dynamic rate calculation API
4. Pricing preview in UI before commitment
5. Historical pricing tracking
6. Admin override mechanism

**Business Value:**
- 💰 **Revenue Optimization** - maximize pricing flexibility
- 📈 **Competitive Pricing** - adjust to market conditions
- 🎯 **Customer Retention** - reward loyal customers
- 📊 **Analytics** - pricing performance insights

---

## 👥 User Stories

### Primary User Story
```
As a business owner,
I want to see pricing that reflects my business tier and usage,
So that I get fair value for my spend.
```

### Supporting User Stories
```
As a business owner,
I want volume discounts for bulk purchases,
So that I can save money on larger campaigns.

As a business owner,
I want to see the final price before committing,
So that there are no surprises.

As a platform admin,
I want flexible pricing rules,
So that I can optimize revenue and customer satisfaction.

As a sales team member,
I want to offer custom pricing,
So that I can close enterprise deals.
```

---

## ✅ Acceptance Criteria

### Must Have (MVP)

#### 1. Tiered Pricing Structure
- [ ] **Tier Definitions:**
  - [ ] Basic Tier - $0/month base fee
  - [ ] Premium Tier - $99/month
  - [ ] Enterprise Tier - $499/month
  - [ ] Custom Tier - negotiated pricing
- [ ] **Tier Benefits:**
  - [ ] Discount percentages per tier
  - [ ] Feature access by tier
  - [ ] Support levels by tier
  - [ ] Usage limits by tier
- [ ] **Tier Display:**
  - [ ] Clear pricing page
  - [ ] Comparison table
  - [ ] Recommended tier indicator
  - [ ] Upgrade/downgrade options

#### 2. Volume Discount Calculator
- [ ] **Discount Tiers:**
  - [ ] 1-10 ads: Base price
  - [ ] 11-25 ads: 5% off
  - [ ] 26-50 ads: 10% off
  - [ ] 51-100 ads: 15% off
  - [ ] 101+ ads: 20% off
- [ ] **Application:**
  - [ ] Automatic calculation
  - [ ] Monthly aggregate
  - [ ] Real-time preview
  - [ ] Retroactive credits (optional)

#### 3. Dynamic Rate Calculation API
- [ ] **Pricing Factors:**
  - [ ] Base service price
  - [ ] Business tier modifier
  - [ ] Volume discount
  - [ ] Promotional multiplier
  - [ ] Seasonal adjustments
- [ ] **Calculation Engine:**
  - [ ] Rule-based system
  - [ ] Priority ordering
  - [ ] Conflict resolution
  - [ ] Rounding rules
- [ ] **Response Format:**
  - [ ] Base price
  - [ ] Applied rules list
  - [ ] Discount breakdown
  - [ ] Final price
  - [ ] Savings amount

#### 4. Pricing Preview UI
- [ ] **Before Checkout:**
  - [ ] Show estimated cost
  - [ ] Breakdown display
  - [ ] Comparison to base price
  - [ ] Expiry of pricing offer
- [ ] **Interactive Calculator:**
  - [ ] Adjust quantity slider
  - [ ] Select duration
  - [ ] Choose tier
  - [ ] See real-time updates

#### 5. Historical Pricing Tracking
- [ ] **Price Changes:**
  - [ ] Log all calculations
  - [ ] Store applied rules
  - [ ] Track actual vs estimated
  - [ ] Record override reasons
- [ ] **Analytics:**
  - [ ] Average transaction size
  - [ ] Discount utilization
  - [ ] Tier conversion rates
  - [ ] Revenue by tier

#### 6. Admin Override Mechanism
- [ ] **Custom Pricing:**
  - [ ] Set business-specific price
  - [ ] Temporary or permanent
  - [ ] Approval required
  - [ ] Reason documentation
- [ ] **Override UI:**
  - [ ] Search business
  - [ ] Current pricing display
  - [ ] Override form
  - [ ] Expiry date selector
  - [ ] Approval workflow

### Should Have
- [ ] A/B testing for pricing
- [ ] Competitor price matching
- [ ] Automated seasonal pricing
- [ ] ML-based price optimization

### Won't Have (This Story)
- ⛔ Real-time surge pricing
- ⛔ Blockchain-based pricing
- ⛔ Cryptocurrency payment

---

## 🛠️ Technical Requirements

### Database Schema

#### 1. New Table: `pricing_tiers`
```sql
CREATE TABLE pricing_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Tier Definition
  tier_name TEXT NOT NULL UNIQUE, -- 'basic', 'premium', 'enterprise', 'custom'
  display_name TEXT NOT NULL,
  description TEXT,
  
  -- Pricing
  monthly_fee_cents INTEGER NOT NULL DEFAULT 0,
  discount_percentage INTEGER DEFAULT 0 CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
  
  -- Limits
  max_ads_per_month INTEGER,
  max_coupons INTEGER,
  max_products INTEGER,
  
  -- Features
  features JSONB DEFAULT '{}', -- { "priority_support": true, "analytics": true }
  
  -- Status
  active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_pricing_tiers_active ON pricing_tiers(active, sort_order);
```

#### 2. New Table: `pricing_rules`
```sql
CREATE TABLE pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Rule Identity
  rule_name TEXT NOT NULL,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('volume_discount', 'seasonal', 'promotional', 'tier_modifier')),
  
  -- Target
  service_type TEXT NOT NULL CHECK (service_type IN ('ad', 'coupon', 'feature', 'subscription')),
  business_tier TEXT, -- null = applies to all tiers
  
  -- Conditions
  conditions JSONB NOT NULL, -- { "min_quantity": 10, "date_range": ["2025-01-01", "2025-01-31"] }
  
  -- Pricing Modification
  price_modifier_type TEXT NOT NULL CHECK (price_modifier_type IN ('percentage', 'fixed_amount', 'multiplier')),
  price_modifier_value NUMERIC NOT NULL,
  
  -- Priority
  priority INTEGER DEFAULT 10, -- higher = applied first
  
  -- Status
  active BOOLEAN DEFAULT true,
  start_date DATE,
  end_date DATE,
  
  -- Metadata
  description TEXT,
  created_by UUID REFERENCES auth.users(id),
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_pricing_rules_type ON pricing_rules(rule_type);
CREATE INDEX idx_pricing_rules_service ON pricing_rules(service_type);
CREATE INDEX idx_pricing_rules_active ON pricing_rules(active, priority DESC);
CREATE INDEX idx_pricing_rules_dates ON pricing_rules(start_date, end_date);
```

#### 3. New Table: `pricing_calculations`
```sql
CREATE TABLE pricing_calculations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Context
  business_id UUID NOT NULL REFERENCES businesses(id),
  service_type TEXT NOT NULL,
  
  -- Input
  base_price_cents INTEGER NOT NULL,
  quantity INTEGER DEFAULT 1,
  duration_days INTEGER DEFAULT 1,
  
  -- Calculation
  applied_rules JSONB DEFAULT '[]', -- [{ rule_id, rule_name, adjustment }]
  business_tier TEXT,
  
  -- Output
  subtotal_cents INTEGER NOT NULL,
  discount_cents INTEGER DEFAULT 0,
  final_price_cents INTEGER NOT NULL,
  
  -- Status
  calculation_type TEXT CHECK (calculation_type IN ('quote', 'invoice', 'actual')),
  converted_to_purchase BOOLEAN DEFAULT false,
  
  calculated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_pricing_calcs_business ON pricing_calculations(business_id);
CREATE INDEX idx_pricing_calcs_service ON pricing_calculations(service_type);
CREATE INDEX idx_pricing_calcs_date ON pricing_calculations(calculated_at);
```

#### 4. New Table: `pricing_overrides`
```sql
CREATE TABLE pricing_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Target
  business_id UUID NOT NULL REFERENCES businesses(id),
  service_type TEXT NOT NULL,
  
  -- Override
  override_price_cents INTEGER NOT NULL,
  override_type TEXT CHECK (override_type IN ('fixed_price', 'discount_percentage', 'fixed_discount')),
  override_value NUMERIC NOT NULL,
  
  -- Justification
  reason TEXT NOT NULL,
  approval_notes TEXT,
  
  -- Approval
  requested_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  
  -- Validity
  valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until DATE,
  
  -- Status
  active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_overrides_business ON pricing_overrides(business_id);
CREATE INDEX idx_overrides_active ON pricing_overrides(active, valid_from, valid_until);
```

### API Endpoints

#### Customer Endpoints

##### 1. Get Pricing Tiers
```typescript
GET /api/pricing/tiers
Response: {
  tiers: [{
    id: string,
    name: string,
    displayName: string,
    description: string,
    monthlyFee: number,
    discountPercentage: number,
    features: object,
    limits: object
  }]
}
```

##### 2. Calculate Price
```typescript
POST /api/pricing/calculate
Body: {
  businessId: string,
  serviceType: 'ad' | 'coupon' | 'feature' | 'subscription',
  quantity: number,
  duration: number
}
Response: {
  basePrice: number,
  subtotal: number,
  appliedRules: [{
    ruleId: string,
    ruleName: string,
    type: string,
    adjustment: number
  }],
  discounts: [{
    name: string,
    amount: number
  }],
  finalPrice: number,
  savings: number,
  breakdown: {
    basePrice: number,
    tierDiscount: number,
    volumeDiscount: number,
    promotionalDiscount: number,
    total: number
  }
}
```

##### 3. Get Pricing Preview
```typescript
GET /api/pricing/preview?businessId={id}&serviceType={type}&quantity={n}&duration={n}
Response: {
  ... same as calculate
  expiresAt: string // quote expiration
}
```

#### Admin Endpoints

##### 1. Create Pricing Rule
```typescript
POST /api/admin/pricing/rules
Body: {
  ruleName: string,
  ruleType: string,
  serviceType: string,
  conditions: object,
  priceModifierType: string,
  priceModifierValue: number,
  startDate?: string,
  endDate?: string
}
```

##### 2. Update Pricing Tier
```typescript
PUT /api/admin/pricing/tiers/{id}
Body: {
  monthlyFee: number,
  discountPercentage: number,
  features: object,
  limits: object
}
```

##### 3. Create Override
```typescript
POST /api/admin/pricing/overrides
Body: {
  businessId: string,
  serviceType: string,
  overrideType: string,
  overrideValue: number,
  reason: string,
  validUntil?: string
}
```

##### 4. Get Pricing Analytics
```typescript
GET /api/admin/pricing/analytics?startDate={date}&endDate={date}
Response: {
  totalRevenue: number,
  averageTransactionSize: number,
  discountUtilization: number,
  tierDistribution: object,
  topRules: Rule[]
}
```

### Pricing Calculation Logic

```typescript
// Core pricing engine
interface PricingContext {
  businessId: string
  businessTier: string
  serviceType: string
  quantity: number
  duration: number
  basePrice: number
}

async function calculatePrice(context: PricingContext): Promise<PricingResult> {
  let price = context.basePrice * context.quantity * context.duration
  const appliedRules: AppliedRule[] = []
  
  // 1. Check for pricing overrides (highest priority)
  const override = await getActiveOverride(context.businessId, context.serviceType)
  if (override) {
    price = applyOverride(price, override)
    appliedRules.push({ source: 'override', adjustment: price })
    return { finalPrice: price, appliedRules }
  }
  
  // 2. Apply tier discount
  const tierDiscount = await getTierDiscount(context.businessTier)
  if (tierDiscount) {
    const adjustment = price * (tierDiscount.percentage / 100)
    price -= adjustment
    appliedRules.push({ source: 'tier_discount', adjustment })
  }
  
  // 3. Apply active pricing rules (ordered by priority)
  const rules = await getActivePricingRules(context)
  for (const rule of rules) {
    if (evaluateRuleConditions(rule, context)) {
      const adjustment = applyRule(price, rule)
      price = adjustment.newPrice
      appliedRules.push({
        ruleId: rule.id,
        ruleName: rule.name,
        adjustment: adjustment.amount
      })
    }
  }
  
  // 4. Apply volume discount
  const volumeDiscount = calculateVolumeDiscount(context.quantity)
  if (volumeDiscount > 0) {
    const adjustment = price * (volumeDiscount / 100)
    price -= adjustment
    appliedRules.push({ source: 'volume_discount', adjustment })
  }
  
  // 5. Round to cents
  price = Math.round(price)
  
  return {
    basePrice: context.basePrice,
    finalPrice: price,
    appliedRules,
    savings: (context.basePrice - price)
  }
}
```

### React Components

#### 1. `PricingTierSelector.tsx`
```typescript
src/components/pricing/PricingTierSelector.tsx
- Tier cards grid
- Feature comparison
- Recommended badge
- Select button
- Upgrade CTA
```

#### 2. `PriceBreakdown.tsx`
```typescript
src/components/pricing/PriceBreakdown.tsx
- Base price display
- Itemized discounts
- Applied rules list
- Savings highlight
- Final price (bold)
```

#### 3. `PricingCalculator.tsx`
```typescript
src/components/pricing/PricingCalculator.tsx
- Quantity slider
- Duration selector
- Tier selector
- Real-time price update
- Breakdown display
```

#### 4. `AdminPricingDashboard.tsx`
```typescript
src/components/admin/pricing/AdminPricingDashboard.tsx
- Rules management
- Tier configuration
- Override list
- Analytics charts
- Create rule button
```

#### 5. `PricingOverrideForm.tsx`
```typescript
src/components/admin/pricing/PricingOverrideForm.tsx
- Business search
- Override type selector
- Value input
- Reason textarea
- Approval workflow
```

### Custom Hooks

#### `usePricing.ts`
```typescript
export function usePricing() {
  const calculatePrice = async (context: PricingContext) => {...}
  const getTiers = async () => {...}
  const getPreview = async (params: object) => {...}
  
  return {
    calculatePrice,
    getTiers,
    getPreview,
    loading,
    error
  }
}
```

#### `usePricingAdmin.ts`
```typescript
export function usePricingAdmin() {
  const createRule = async (data: RuleData) => {...}
  const updateTier = async (id: string, data: TierData) => {...}
  const createOverride = async (data: OverrideData) => {...}
  const getAnalytics = async (dateRange: DateRange) => {...}
  
  return {
    createRule,
    updateTier,
    createOverride,
    getAnalytics,
    loading,
    error
  }
}
```

---

## 🎨 UI/UX Requirements

### Wireframe: Pricing Calculator

```
┌──────────────────────────────────────────┐
│ Advertising Pricing Calculator           │
├──────────────────────────────────────────┤
│                                           │
│ Service: [Featured Ad ▼]                │
│                                           │
│ Quantity:                                 │
│ 1 ━━━●━━━━━━━━━━━━━━━━━━━━━━━━━━━ 100  │
│                                           │
│ Duration: 7 days                          │
│ ● 7 days  ○ 14 days  ○ 30 days          │
│                                           │
│ Your Tier: Premium                        │
│ Base Price: $100.00                       │
│ Tier Discount (-10%): -$10.00            │
│ Volume Discount: -$0.00                   │
│ ─────────────────────────────             │
│ Final Price: $90.00                       │
│                                           │
│ 💰 You save $10.00!                      │
│                                           │
│ [Get Quote] [Purchase Now]               │
└──────────────────────────────────────────┘
```

### Wireframe: Price Breakdown (Checkout)

```
┌──────────────────────────────────────────┐
│ Order Summary                             │
├──────────────────────────────────────────┤
│                                           │
│ 15 x Featured Ad (7 days each)           │
│                                           │
│ Subtotal:              $1,500.00          │
│                                           │
│ Discounts Applied:                        │
│ • Premium Tier (10% off)    -$150.00     │
│ • Volume Discount (5% off)   -$67.50     │
│ • March Promo Code          -$50.00      │
│ ─────────────────────────────             │
│ Total Discounts:           -$267.50       │
│                                           │
│ ═════════════════════════════             │
│ Total Due:              $1,232.50         │
│ ═════════════════════════════             │
│                                           │
│ 🎉 You saved $267.50 (18%)!              │
│                                           │
│ [Proceed to Payment]                      │
└──────────────────────────────────────────┘
```

### Wireframe: Admin Pricing Override

```
┌──────────────────────────────────────────┐
│ Create Pricing Override                   │
├──────────────────────────────────────────┤
│                                           │
│ Business: [Search...] 🔍                 │
│ Selected: Pizza Palace                    │
│                                           │
│ Service Type:                             │
│ ● All Services                           │
│ ○ Ads Only                               │
│ ○ Coupons Only                           │
│                                           │
│ Override Type:                            │
│ ● Fixed Discount (%)                     │
│ ○ Fixed Price                            │
│ ○ Fixed Amount Off                       │
│                                           │
│ Value: [15] %                            │
│                                           │
│ Valid Period:                             │
│ From: [01/01/2025]                       │
│ Until: [12/31/2025] (optional)           │
│                                           │
│ Reason (required):                        │
│ ┌────────────────────────────────────┐  │
│ │ Enterprise agreement negotiated... │  │
│ └────────────────────────────────────┘  │
│                                           │
│ [Cancel]          [Request Approval]     │
└──────────────────────────────────────────┘
```

---

## 🧪 Test Plan

### Unit Tests

```typescript
describe('Pricing Engine', () => {
  it('calculates base price correctly')
  it('applies tier discount')
  it('applies volume discount')
  it('applies promotional rules')
  it('handles overrides')
  it('prioritizes rules correctly')
  it('rounds to cents')
})

describe('Rule Evaluation', () => {
  it('checks date range conditions')
  it('checks quantity conditions')
  it('checks tier conditions')
  it('handles complex AND/OR logic')
})
```

### Integration Tests

```typescript
describe('Pricing Flow', () => {
  it('calculates price for new customer')
  it('applies tier discount for premium customer')
  it('applies volume discount for bulk purchase')
  it('respects pricing override')
  it('logs calculation history')
})
```

### E2E Test Scenarios

```gherkin
Given a Premium tier business
When they purchase 15 featured ads
Then tier discount of 10% is applied
And volume discount of 5% is applied
And final price is calculated correctly
And breakdown shows all discounts

Given an admin creates a pricing override
When override is approved
Then business sees new pricing
And override is logged
And old pricing is preserved in history
```

---

## 📝 Implementation Plan

### Day 1: Schema & Engine
- [ ] Create pricing tables
- [ ] Implement calculation engine
- [ ] Create pricing rules API
- [ ] Unit tests for engine
- [ ] Seed initial tiers and rules

### Day 2: Admin UI & Rules
- [ ] Admin pricing dashboard
- [ ] Tier management UI
- [ ] Rule creation form
- [ ] Override workflow
- [ ] Analytics display

### Day 3: Customer UI & Testing
- [ ] Pricing tier selector
- [ ] Price breakdown component
- [ ] Pricing calculator
- [ ] Integration tests
- [ ] E2E scenarios
- [ ] Documentation

---

## 🔗 Integration Points

### Existing Systems
- **Billing:** Use calculated prices
- **Ad Requests:** Apply pricing
- **Business Tiers:** Link to pricing
- **Analytics:** Track pricing performance

---

## 🚨 Edge Cases & Error Handling

### Edge Cases
1. **Multiple applicable rules:** Apply by priority
2. **Conflicting discounts:** Best discount wins
3. **Expired rules:** Automatic deactivation
4. **Price less than cost:** Minimum price floor
5. **Rounding errors:** Always round to cents

---

## 📊 Success Metrics

### Functional Metrics
- [ ] Price calculation time <100ms
- [ ] 100% calculation accuracy
- [ ] Zero pricing errors

### Business Metrics
- [ ] Average revenue per user
- [ ] Discount utilization rate
- [ ] Tier conversion rate
- [ ] Override frequency

---

## 📚 Definition of Done

- [ ] Pricing engine functional
- [ ] All tiers configured
- [ ] Volume discounts working
- [ ] Admin tools complete
- [ ] UI components done
- [ ] Tests passing
- [ ] Documentation complete

---

**Story Status:** 📝 PLANNED  
**Blocked By:** None ✅  
**Blocking:** None  
**Ready for Development:** YES 🚀

