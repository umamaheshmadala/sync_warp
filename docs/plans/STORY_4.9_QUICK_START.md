# Story 4.9: Quick Start Implementation Guide

**Ready to implement?** Start here! 🚀

---

## 📁 Documentation Index

1. **Analysis**: `docs/stories/STORY_4.9_IMPLEMENTATION_STATUS.md`
   - Current state (40% complete)
   - What exists vs what's missing
   - Gap analysis

2. **High-Level Plan**: `docs/plans/STORY_4.9_IMPLEMENTATION_PLAN.md`
   - 4 phases overview
   - PR strategy
   - Testing plan

3. **Detailed Tasks**: `docs/plans/STORY_4.9_TASK_BREAKDOWN.md`
   - Complete code specs
   - Unit tests
   - Acceptance criteria

4. **This Guide**: Quick start instructions

---

## 🎯 What You're Building

**Goal**: Complete social sharing system for storefronts and products with tracking.

**Deliverables**:
- ✅ Reusable `useWebShare` hook
- ✅ Database schema for share tracking
- ✅ Share tracker service with analytics
- ✅ Storefront share button
- ✅ Product share integration
- ✅ Analytics dashboard (optional)

---

## 🚦 Getting Started (Choose Your Path)

### Path A: Full Implementation (5-8 days)
Follow all 4 phases in order:
1. Foundation (2 days)
2. Storefront (1-2 days)
3. Products (1-2 days)
4. Analytics (1-2 days)

### Path B: MVP Only (3-4 days)
Skip analytics (Phase 4), deliver core sharing:
1. Foundation (2 days)
2. Storefront (1 day)
3. Products (1 day)

### Path C: Quick Win (1 day)
Just add storefront sharing:
1. Create useWebShare hook (4 hrs)
2. Create StorefrontShareButton (2 hrs)
3. Integrate into BusinessProfile (2 hrs)

**Recommendation**: Path A for production, Path C for demo

---

## 📝 Phase 1: Foundation (START HERE)

### Step 1.1: Create the Hook (4 hours)

**File**: `src/hooks/useWebShare.ts`

```bash
# Create the file
touch src/hooks/useWebShare.ts
```

**Copy implementation from**: `docs/plans/STORY_4.9_TASK_BREAKDOWN.md` Task 1.1

**Test it**:
```bash
npm test -- useWebShare
```

**✓ Done when**:
- Hook exports share, copyToClipboard, isSupported
- Tests pass (3 tests minimum)
- No TypeScript errors

---

### Step 1.2: Create Database Schema (2 hours)

**File**: `supabase/migrations/20250118_create_shares_table.sql`

```bash
# Create migration file
touch supabase/migrations/20250118_create_shares_table.sql
```

**Copy SQL from**: `docs/plans/STORY_4.9_TASK_BREAKDOWN.md` Task 1.2

**Apply migration**:
```bash
# Local
npx supabase db reset

# Remote (after testing)
npx supabase db push
```

**Test it**:
```sql
-- In Supabase SQL Editor
SELECT track_share(
  p_type := 'product',
  p_entity_id := gen_random_uuid(),
  p_method := 'web_share'
);

-- Verify
SELECT * FROM shares ORDER BY created_at DESC LIMIT 1;
```

**✓ Done when**:
- Table exists with 8 columns
- 6 indexes created
- RLS policies active
- track_share() function works
- No advisor warnings

---

### Step 1.3: Create Share Tracker (3 hours)

**File**: `src/services/shareTracker.ts`

```bash
# Create services directory if needed
mkdir -p src/services
touch src/services/shareTracker.ts
```

**Copy implementation from**: `docs/plans/STORY_4.9_TASK_BREAKDOWN.md` Task 1.3

**Test it**:
```bash
npm test -- shareTracker
```

**✓ Done when**:
- trackShare() logs to database
- getShareStats() returns data
- buildUtmUrl() adds parameters
- Tests pass

---

## 🏪 Phase 2: Storefront Sharing

### Step 2.1: Create StorefrontShareButton (3 hours)

**File**: `src/components/social/StorefrontShareButton.tsx`

```bash
mkdir -p src/components/social
touch src/components/social/StorefrontShareButton.tsx
```

**Copy from**: Task 2.1 in breakdown doc

**✓ Done when**:
- Component renders
- Uses useWebShare
- Tracks to database
- No errors

---

### Step 2.2: Integrate into BusinessProfile (2 hours)

**File**: `src/components/business/BusinessProfile.tsx`

**Add**:
1. Import: `import { StorefrontShareButton } from '@/components/social/StorefrontShareButton';`
2. In header (find SimpleSaveButton), add:
```tsx
<StorefrontShareButton
  businessId={businessId!}
  businessName={business?.business_name || ''}
  businessDescription={business?.description}
  businessImage={business?.logo_url}
  variant="icon"
/>
```

**Test manually**:
```bash
npm run dev
# Navigate to any business
# Click share button
# Verify toast appears
```

**✓ Done when**:
- Button visible in header
- Sharing works (mobile & desktop)
- Database entry created

---

## 📦 Phase 3: Product Integration

### Step 3.1: Refactor ProductShareModal (2 hours)

**File**: `src/components/products/ProductShareModal.tsx`

**Changes**:
1. Import useWebShare: `import { useWebShare } from '@/hooks/useWebShare';`
2. Replace navigator.share logic with: `const { share } = useWebShare();`
3. Add tracking after success
4. Fix URL to: `/business/${businessId}/product/${productId}`

**✓ Done when**:
- Modal uses hook
- Tracking works
- URL format correct

---

### Step 3.2: Create ProductShareButton (2 hours)

**File**: `src/components/social/ProductShareButton.tsx`

**Similar to StorefrontShareButton** but with product props

**✓ Done when**:
- Component works
- Tracks with type: 'product'

---

### Step 3.3: Add to Product Views (2 hours)

**Files to update**:
- ProductCard.tsx (action buttons)
- ProductDetails.tsx (header)
- Wishlist components

**✓ Done when**:
- Share buttons visible everywhere
- All track correctly

---

## 🎨 Phase 4: Analytics & Polish (Optional)

### Enhanced Modal (4 hours)
- Desktop fallback with platform buttons
- QR code generation
- Better UX

### Analytics Dashboard (3 hours)
- Show share counts
- Method breakdown
- Recent shares

---

## ✅ Verification Checklist

Before marking complete:

- [ ] useWebShare hook created and tested
- [ ] Database schema applied
- [ ] shareTracker service working
- [ ] Storefront share button in BusinessProfile
- [ ] Product sharing integrated
- [ ] All unit tests pass: `npm test`
- [ ] No TypeScript errors: `npm run type-check`
- [ ] No lint errors: `npm run lint`
- [ ] E2E tests pass: `npm run test:e2e`
- [ ] Manual testing on Chrome, Safari, Firefox
- [ ] Manual testing on mobile (iOS/Android)
- [ ] Documentation updated

---

## 🐛 Common Issues & Solutions

### Issue: "navigator.share is undefined"
**Solution**: This is expected on desktop Chrome. Fallback to clipboard should work.

### Issue: "Clipboard write failed"
**Solution**: Check HTTPS (required for clipboard API). Use localhost for dev.

### Issue: "track_share() doesn't exist"
**Solution**: Run migration: `npx supabase db reset`

### Issue: "Toast doesn't show"
**Solution**: Ensure react-hot-toast provider is in App.tsx

### Issue: "Share button not visible"
**Solution**: Check import path and component props

---

## 📞 Need Help?

1. **Code specs**: See `docs/plans/STORY_4.9_TASK_BREAKDOWN.md`
2. **Status**: See `docs/stories/STORY_4.9_IMPLEMENTATION_STATUS.md`
3. **Original story**: See `docs/stories/STORY_4.9_Social_Sharing_Actions.md`

---

## 🎯 Success Criteria

**You're done when**:
1. ✅ Can share storefront from BusinessProfile
2. ✅ Can share product from product card/details
3. ✅ Shares logged to database with referral codes
4. ✅ UTM parameters added to URLs
5. ✅ All tests green
6. ✅ Works on mobile & desktop
7. ✅ Fallback to clipboard works

---

## 🚀 Quick Commands

```bash
# Start dev server
npm run dev

# Run tests
npm test

# Type check
npm run type-check

# Lint
npm run lint

# E2E tests
npm run test:e2e

# Apply migrations
npx supabase db reset

# Check migration status
npx supabase migration list
```

---

**Ready? Start with Phase 1, Step 1.1! 🎉**

*Updated: January 18, 2025*
