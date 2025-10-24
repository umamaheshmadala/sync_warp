# Remaining Offers Features - Implementation Guide

## Status: ✅ PARTIALLY COMPLETED

### ✅ Completed Features:
1. **Auto-refresh after publishing** - Fixed with `refreshOffers()` callback
2. **Draft auto-save** - Already working, added "Save & Exit" button  
3. **Image upload** - Created `ImageUpload` component with Supabase Storage

### 🚧 Features Requiring Manual Steps:

#### 4. View Offer Analytics ⚠️
**Status:** Component exists but not integrated

**Required Steps:**
1. Add `onViewAnalytics` prop to OfferCard
2. Create analytics modal in OfferManagerPage
3. Import OfferAnalyticsDashboard component

**Implementation:**
```tsx
// In OfferCard.tsx - Add to actions menu (line 145):
<button
  onClick={() => { onViewAnalytics?.(offer); setShowMenu(false); }}
  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
>
  <BarChart3 className="w-4 h-4 inline mr-2" />
  View Analytics
</button>

// In OfferManagerPage.tsx - Add state and modal:
const [analyticsOfferId, setAnalyticsOfferId] = useState<string | null>(null);

// Add to OffersList props:
onViewAnalytics={(offerId) => setAnalyticsOfferId(offerId)}

// Add modal before closing div:
{analyticsOfferId && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
    <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto p-6">
      <OfferAnalyticsDashboard offerId={analyticsOfferId} />
      <button onClick={() => setAnalyticsOfferId(null)}>Close</button>
    </div>
  </div>
)}
```

#### 5. Extend Expiry Feature ⚠️
**Status:** Needs implementation

**Database Function Required:**
```sql
CREATE OR REPLACE FUNCTION extend_offer_expiry(
  p_offer_id UUID,
  p_extension_days INTEGER
) RETURNS offers AS $$
DECLARE
  v_offer offers;
  v_new_expiry TIMESTAMP WITH TIME ZONE;
  v_max_expiry TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get current offer
  SELECT * INTO v_offer FROM offers WHERE id = p_offer_id;
  
  -- Calculate new expiry (current expiry + extension days)
  v_new_expiry := v_offer.valid_until + (p_extension_days || ' days')::interval;
  
  -- Max 90 days from today
  v_max_expiry := CURRENT_DATE + interval '90 days';
  
  IF v_new_expiry > v_max_expiry THEN
    RAISE EXCEPTION 'Cannot extend beyond 90 days from today';
  END IF;
  
  -- Update offer
  UPDATE offers 
  SET valid_until = v_new_expiry,
      status = CASE WHEN status = 'expired' THEN 'active' ELSE status END,
      updated_at = now()
  WHERE id = p_offer_id
  RETURNING * INTO v_offer;
  
  RETURN v_offer;
END;
$$ LANGUAGE plpgsql;
```

**Hook Update:**
```tsx
// In useOffers.ts - Add method:
const extendExpiry = useCallback(async (id: string, days: number): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .rpc('extend_offer_expiry', {
        p_offer_id: id,
        p_extension_days: days,
      });
    
    if (error) throw error;
    await refreshOffers();
    return true;
  } catch (err: any) {
    setError(err.message);
    return false;
  }
}, [refreshOffers]);
```

**UI Component:**
```tsx
// Create ExtendExpiryModal.tsx
export function ExtendExpiryModal({ offer, onExtend, onClose }) {
  const [days, setDays] = useState(7);
  
  return (
    <div className="p-6">
      <h3>Extend Offer Expiry</h3>
      <input
        type="number"
        min="1"
        max="90"
        value={days}
        onChange={(e) => setDays(Number(e.target.value))}
      />
      <button onClick={() => onExtend(days)}>Extend</button>
    </div>
  );
}
```

#### 6. Duplicate Offer ✅ (Partially implemented)
**Status:** Logic exists in useOffers but needs UI integration

**Existing Hook Method:**
The `duplicateOffer` method already exists in useOffers.ts (line 260+)

**Add to OfferCard Menu:**
```tsx
// In OfferCard.tsx actions menu:
<button
  onClick={() => { onDuplicate?.(offer); setShowMenu(false); }}
  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
>
  <Copy className="w-4 h-4 inline mr-2" />
  Duplicate
</button>
```

**Add to OffersList:**
```tsx
// Pass duplicate handler
onDuplicate={async (offerId) => {
  const newOffer = await duplicateOffer(offerId);
  if (newOffer) {
    toast.success('Offer duplicated as draft');
    refreshOffers();
  }
}}
```

---

## ⚠️ IMPORTANT: Supabase Storage Setup

Before image upload works, create the storage bucket:

```sql
-- Run in Supabase SQL Editor:
INSERT INTO storage.buckets (id, name, public) 
VALUES ('offer-images', 'offer-images', true);

-- Set policy
CREATE POLICY "Anyone can upload offer images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'offer-images');

CREATE POLICY "Anyone can view offer images"
ON storage.objects FOR SELECT
USING (bucket_id = 'offer-images');
```

---

## Testing Checklist

### 1. Create Offer Flow:
- [ ] Navigate to `/business/{id}/offers`
- [ ] Click "Create Offer"
- [ ] Fill in Step 1: Title & Description
- [ ] Click "Save & Exit" - should save draft
- [ ] Return and continue from where you left off
- [ ] Complete all steps
- [ ] Upload image in Step 3
- [ ] Publish - should appear in Active Offers immediately

### 2. Draft Management:
- [ ] Draft auto-saves as you type (see "Saving draft..." indicator)
- [ ] Can exit and resume later
- [ ] Draft appears in Drafts tab

### 3. Image Upload:
- [ ] Can select image file
- [ ] Upload progress shows
- [ ] Preview appears after upload
- [ ] Can remove and re-upload

### 4. Analytics:
- [ ] Click "..." menu on offer
- [ ] Select "View Analytics"
- [ ] See views, shares, CTR stats

### 5. Extend Expiry:
- [ ] For expired offer, click "..." menu
- [ ] Select "Extend Expiry"
- [ ] Choose days (1-90)
- [ ] Confirm - offer becomes active again

### 6. Duplicate:
- [ ] Click "..." menu
- [ ] Select "Duplicate"
- [ ] New draft created with same data
- [ ] Can edit and publish as new offer

---

## Quick Fixes Needed:

```bash
# 1. Add missing icons import to OfferCard.tsx:
import { BarChart3, Copy } from 'lucide-react';

# 2. Export OfferAnalyticsDashboard if not already:
# In src/components/offers/index.ts:
export { OfferAnalyticsDashboard } from './OfferAnalyticsDashboard';

# 3. Create Supabase storage bucket (run SQL above)

# 4. Test image upload with correct permissions
```

---

## Files Modified:
1. ✅ `OfferManagerPage.tsx` - Added refresh callback
2. ✅ `CreateOfferForm.tsx` - Added Save & Exit button, integrated ImageUpload
3. ✅ `ImageUpload.tsx` - NEW file created
4. ⚠️ `OfferCard.tsx` - Needs analytics/extend/duplicate actions
5. ⚠️ `useOffers.ts` - Has duplicateOffer, needs extendExpiry
6. ⚠️ Supabase - Needs storage bucket and extend_expiry function
