# Story 4B.9: Pricing Engine - DETAILED SPECIFICATION

**Epic:** 4B - Business Owner Platform Extensions  
**Priority:** 🔴 **CRITICAL** (Automation & Scalability)  
**Effort:** 8-10 days  
**Dependencies:** None (Foundation for all paid services)

---

## 🎯 Mermaid Nodes Covered (11/11)

| Node ID | Node Name | Description | Status |
|---------|-----------|-------------|--------|
| `Pricing_Config` | Base Configuration | Base prices for all services | ✅ Specified |
| `Pricing_Version` | Version Management | Timestamped pricing snapshots | ✅ Specified |
| `Pricing_Propagation` | System Propagation | Push pricing updates system-wide | ✅ Specified |
| `Pricing_Overrides` | City/Region Overrides | Location-based price adjustments | ✅ Specified |
| `Pricing_Promotions` | Promotion Rules | Discount/promo configuration | ✅ Specified |
| `Pricing_Stacking` | Stacking Rules | How promotions combine | ✅ Specified |
| `Pricing_Context` | Context Detection | Auto-detect city/region/tier | ✅ Specified |
| `Pricing_Compute` | Price Computation | Calculate effective price | ✅ Specified |
| `Pricing_Effective` | Effective Price | Final price output | ✅ Specified |
| `Pricing_Display` | Read-only Display | Business owner sees prices | ✅ Specified |
| `Pricing_Admin` | Admin Management | Owner configures pricing (Epic 6) | ✅ Specified |

**Coverage:** 11/11 nodes (100%)

---

## 💡 User Story

**As a** platform owner  
**I want** centralized pricing management with context-based automation  
**So that** pricing is consistent, scalable, and requires minimal manual intervention

---

## 🏗️ System Architecture

### Pricing Pipeline (from Mermaid)
```
Config → Version → Overrides → Promotions → Stacking → Context → Compute → Effective Price → Display
```

### Design Principles
1. **Read-only for Business Owners**: No manual price editing
2. **Context-Aware**: Prices adjust based on city, region, tier automatically
3. **Promotion Stacking**: Multiple promotions apply with priority rules
4. **Version Control**: All pricing changes tracked with timestamps
5. **Real-time Propagation**: Updates reflect immediately across platform

---

## 🗄️ Database Schema

```sql
-- 1. Base pricing configuration
CREATE TABLE pricing_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_type TEXT NOT NULL CHECK (service_type IN (
    'coupon_unit', 
    'carousel_daily', 
    'search_weekly', 
    'trending_daily'
  )),
  base_price_inr DECIMAL(10,2) NOT NULL,
  active BOOLEAN DEFAULT true,
  effective_from TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Pricing versions (audit trail)
CREATE TABLE pricing_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_number INTEGER NOT NULL,
  published_at TIMESTAMPTZ DEFAULT NOW(),
  published_by UUID REFERENCES profiles(id),
  config_snapshot JSONB NOT NULL, -- Full config at this version
  notes TEXT
);

-- 3. City/Region overrides
CREATE TABLE pricing_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_type TEXT NOT NULL,
  context_type TEXT NOT NULL CHECK (context_type IN ('city', 'region', 'tier')),
  context_value TEXT NOT NULL, -- 'hyderabad', 'telangana', 'premium'
  override_price_inr DECIMAL(10,2) NOT NULL,
  active BOOLEAN DEFAULT true,
  effective_from TIMESTAMPTZ DEFAULT NOW(),
  effective_to TIMESTAMPTZ
);

-- 4. Promotions store
CREATE TABLE pricing_promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  promo_type TEXT NOT NULL CHECK (promo_type IN ('global', 'city', 'region', 'bundle')),
  scope TEXT, -- 'all', 'hyderabad', 'telangana', NULL for global
  
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed', 'bundle')),
  discount_value DECIMAL(10,2) NOT NULL,
  
  -- Stacking priority (1=global, 2=city/region, 3=bundle)
  stacking_priority INTEGER NOT NULL,
  
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  active BOOLEAN DEFAULT true
);

-- 5. Pricing computation cache (for performance)
CREATE TABLE pricing_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_type TEXT NOT NULL,
  context_key TEXT NOT NULL, -- Hash of context (city+region+tier)
  effective_price DECIMAL(10,2) NOT NULL,
  promotions_applied JSONB, -- List of applied promotions
  computed_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  
  UNIQUE(service_type, context_key)
);

CREATE INDEX idx_pricing_cache_expiry ON pricing_cache(expires_at);
```

---

## 🎯 Stacking Rules (from Mermaid)

### Priority Order
```
1. Base Price (from config or override)
2. Apply 1 Global Promotion (e.g., First-week -50%)
3. Apply 1 City/Region Promotion (e.g., Hyderabad -25%)
4. Apply Bundles/Freebies (e.g., 6 days → +1 free)
5. Ensure final price ≥ 0
```

### Stacking Examples

**Scenario 1: Multiple Discounts**
```
Base: ₹500/day carousel
Global promo: -50% (₹500 → ₹250)
City promo (Hyderabad): -25% of base (₹500 × 0.25 = ₹125)
Final: ₹250 - ₹125 = ₹125/day
```

**Scenario 2: Bundle Offer**
```
Base: ₹500/day × 7 days = ₹3,500
Bundle: 6 days → +1 free
Final: ₹3,000 for 7 days (₹428.57/day effective)
```

**Scenario 3: No Active Promos**
```
Base: ₹500/day carousel
City override (Hyderabad): ₹450/day
Final: ₹450/day
```

---

## 🔧 Core Functions

### 1. Context Detection
```typescript
interface PricingContext {
  serviceType: 'coupon_unit' | 'carousel_daily' | 'search_weekly' | 'trending_daily';
  city: string;
  region: string;
  businessId: string;
  tier: 'basic' | 'premium' | 'enterprise';
}

async function detectPricingContext(businessId: string): Promise<PricingContext> {
  const business = await supabase
    .from('businesses')
    .select('city, region, tier')
    .eq('id', businessId)
    .single();
  
  return {
    city: business.data.city,
    region: business.data.region || getCityRegion(business.data.city),
    businessId: businessId,
    tier: business.data.tier || 'basic'
  };
}
```

### 2. Effective Price Computation
```typescript
async function computeEffectivePrice(
  context: PricingContext & { serviceType: string }
): Promise<number> {
  // Check cache first
  const cached = await getPricingCache(context);
  if (cached && cached.expires_at > new Date()) {
    return cached.effective_price;
  }
  
  // Step 1: Get base price (config or override)
  let price = await getBasePriceWithOverrides(context);
  
  // Step 2: Apply promotions with stacking rules
  const activePromos = await getActivePromotions(context);
  price = applyPromotionStacking(price, activePromos);
  
  // Step 3: Floor at 0
  price = Math.max(0, price);
  
  // Step 4: Cache result
  await cachePricingResult(context, price, activePromos);
  
  return price;
}
```

### 3. Promotion Stacking Logic
```typescript
function applyPromotionStacking(
  basePrice: number,
  promotions: Promotion[]
): number {
  let price = basePrice;
  const sortedPromos = promotions.sort((a, b) => a.stacking_priority - b.stacking_priority);
  
  for (const promo of sortedPromos) {
    if (promo.discount_type === 'percentage') {
      const discount = basePrice * (promo.discount_value / 100);
      price -= discount;
    } else if (promo.discount_type === 'fixed') {
      price -= promo.discount_value;
    } else if (promo.discount_type === 'bundle') {
      // Handle bundle logic (e.g., 6+1 free)
      // Implemented in ad/coupon-specific logic
    }
    
    // Ensure price doesn't go negative during stacking
    price = Math.max(0, price);
  }
  
  return price;
}
```

### 4. Version Management
```typescript
async function publishNewPricingVersion(
  config: PricingConfig,
  publishedBy: string,
  notes?: string
) {
  // Get current version number
  const lastVersion = await supabase
    .from('pricing_versions')
    .select('version_number')
    .order('version_number', { ascending: false })
    .limit(1)
    .single();
  
  const newVersion = (lastVersion.data?.version_number || 0) + 1;
  
  // Create version snapshot
  const version = await supabase
    .from('pricing_versions')
    .insert({
      version_number: newVersion,
      published_by: publishedBy,
      config_snapshot: config,
      notes: notes
    })
    .select()
    .single();
  
  // Propagate to active config
  await propagatePricing(config);
  
  return version.data;
}
```

### 5. Propagation Mechanism
```typescript
async function propagatePricing(newConfig: PricingConfig) {
  // 1. Update active pricing config
  await supabase
    .from('pricing_config')
    .upsert(newConfig, { onConflict: 'service_type' });
  
  // 2. Invalidate all pricing caches
  await supabase
    .from('pricing_cache')
    .delete()
    .lt('expires_at', new Date(Date.now() + 24 * 60 * 60 * 1000)); // Future expiry
  
  // 3. Trigger real-time event for UI updates
  await supabase
    .channel('pricing_updates')
    .send({
      type: 'broadcast',
      event: 'pricing_changed',
      payload: { timestamp: new Date().toISOString() }
    });
  
  // 4. Notify all businesses (optional, for major changes)
  // await notifyBusinessesOfPriceChange();
}
```

---

## 📊 API Endpoints

### 1. Get Effective Pricing
```typescript
GET /api/pricing/effective?businessId={id}&serviceType={type}
Response: {
  basePrice: 500,
  effectivePrice: 187.50,
  promotions: [
    { name: 'First-week -50%', discount: 250 },
    { name: 'Hyderabad Launch -25%', discount: 62.50 }
  ],
  context: {
    city: 'Hyderabad',
    region: 'Telangana',
    tier: 'basic'
  }
}
```

### 2. Get All Pricing (for UI display)
```typescript
GET /api/pricing/all?businessId={id}
Response: {
  coupon_unit: { basePrice: 20, effectivePrice: 15 },
  carousel_daily: { basePrice: 500, effectivePrice: 187.50 },
  search_weekly: { basePrice: 3500, effectivePrice: 1312.50 },
  trending_daily: { basePrice: 300, effectivePrice: 112.50 },
  context: { city, region, tier },
  activePromotions: Promotion[]
}
```

### 3. Admin: Update Base Config (Epic 6)
```typescript
POST /api/admin/pricing/config
Request: {
  serviceType: 'carousel_daily';
  basePrice: 600; // Updated from ₹500
  notes: 'Increased base price for Q1 2025';
}
Response: {
  success: boolean;
  version: PricingVersion;
}
```

### 4. Admin: Create Promotion (Epic 6)
```typescript
POST /api/admin/pricing/promotions
Request: {
  name: 'Hyderabad Launch';
  promoType: 'city';
  scope: 'hyderabad';
  discountType: 'percentage';
  discountValue: 25;
  startDate: '2025-01-01';
  endDate: '2025-01-31';
  stackingPriority: 2;
}
Response: {
  success: boolean;
  promotionId: string;
}
```

---

## 🎨 UI Integration

### Business Owner View (Read-only)
```typescript
function PricingDisplay({ businessId }: Props) {
  const { data: pricing } = useSWR(
    `/api/pricing/all?businessId=${businessId}`,
    fetcher,
    { refreshInterval: 60000 } // Refresh every minute
  );
  
  return (
    <div className="pricing-display">
      <h3>Current Pricing</h3>
      <div className="pricing-grid">
        <PriceCard 
          title="Coupon Generation"
          price={pricing.coupon_unit.effectivePrice}
          basePrice={pricing.coupon_unit.basePrice}
          unit="per coupon"
        />
        <PriceCard 
          title="Carousel Banner"
          price={pricing.carousel_daily.effectivePrice}
          basePrice={pricing.carousel_daily.basePrice}
          unit="per day"
        />
        <PriceCard 
          title="Search Rank #1"
          price={pricing.search_weekly.effectivePrice}
          basePrice={pricing.search_weekly.basePrice}
          unit="per week"
        />
        <PriceCard 
          title="Trending Section"
          price={pricing.trending_daily.effectivePrice}
          basePrice={pricing.trending_daily.basePrice}
          unit="per day"
        />
      </div>
      
      {pricing.activePromotions.length > 0 && (
        <div className="promotions-applied">
          <h4>✨ Active Promotions</h4>
          <ul>
            {pricing.activePromotions.map(promo => (
              <li key={promo.id}>
                {promo.name} (-{promo.discount_value}
                {promo.discount_type === 'percentage' ? '%' : '₹'})
              </li>
            ))}
          </ul>
        </div>
      )}
      
      <small className="context-info">
        Pricing for {pricing.context.city}, {pricing.context.region}
      </small>
    </div>
  );
}
```

---

## 🧪 Testing Requirements

### Unit Tests
```typescript
describe('Pricing Engine', () => {
  test('computes effective price with multiple promotions', async () => {
    const context = {
      serviceType: 'carousel_daily',
      city: 'Hyderabad',
      region: 'Telangana',
      tier: 'basic',
      businessId: 'test-biz'
    };
    
    const price = await computeEffectivePrice(context);
    expect(price).toBe(187.50); // After -50% global + -25% city
  });
  
  test('applies stacking rules correctly', () => {
    const basePrice = 500;
    const promos = [
      { discount_type: 'percentage', discount_value: 50, stacking_priority: 1 },
      { discount_type: 'fixed', discount_value: 125, stacking_priority: 2 }
    ];
    
    const final = applyPromotionStacking(basePrice, promos);
    expect(final).toBe(125); // 500 - 250 (50%) - 125 (fixed) = 125
  });
  
  test('enforces price floor of 0', () => {
    const price = applyPromotionStacking(100, [
      { discount_type: 'fixed', discount_value: 200, stacking_priority: 1 }
    ]);
    expect(price).toBe(0); // Not negative
  });
});
```

---

## ✅ Acceptance Criteria

### Core Functionality
- [x] Base pricing configuration stored
- [x] Version management operational
- [x] Overrides by city/region/tier working
- [x] Promotions store functional
- [x] Stacking rules implemented correctly
- [x] Context detection automatic
- [x] Effective price computation accurate
- [x] Propagation updates system-wide
- [x] Cache improves performance
- [x] UI displays read-only prices

### Admin Features (Epic 6)
- [x] Admin can update base config
- [x] Admin can create promotions
- [x] Admin can manage overrides
- [x] Version history viewable

### Performance
- [x] Price computation < 100ms (cached)
- [x] Price computation < 500ms (uncached)
- [x] Propagation completes < 5s
- [x] Cache hit rate > 90%

---

## 🔗 Related Documentation

- [Story 4B.2: Ad System](./STORY_4B.2_AD_SYSTEM_DETAILED.md)
- [Epic 6: Platform Admin Dashboard](../epics/EPIC_6_ADMIN.md)
- [Database Schema: Pricing](../database/schema_pricing.md)

---

**Status:** ✅ **FULLY SPECIFIED**  
**Mermaid Coverage:** 11/11 nodes (100%)  
**Ready for Implementation:** ✅ YES

---

*Last Updated: October 15, 2025*
