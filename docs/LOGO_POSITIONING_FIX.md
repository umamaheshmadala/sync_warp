# Logo Positioning and Following Page Image Fix

## Issues Addressed

1. **Logo positioning**: Logo needs to be above cover image, not overlapping it
2. **Following page images**: Not rendering logo and cover images

## Changes Made

### 1. StandardBusinessCard Logo Positioning

**File**: `src/components/common/StandardBusinessCard.tsx`

#### Changes:
- Changed card `overflow-hidden` to `overflow-visible` to allow logo to extend above cover
- Increased logo size from `12x12` to `16x16` pixels for better visibility
- Positioned logo with `-mt-8` (negative margin) to pull it up over the cover image
- Added `z-20` to logo container to ensure it's above the cover
- Added `border-4 border-white` to logo for clear separation from cover image
- Updated action button z-index to `z-30` to stay above logo
- Changed content padding from `p-4` to `p-4 pt-0` to reduce gap
- Added `pt-2` to title container for proper spacing below logo

#### Before:
```tsx
<div className="overflow-hidden">
  <div className="h-32"> {/* cover */} </div>
  <div className="p-4">
    <div className="flex-shrink-0">
      <img className="w-12 h-12 -mt-6" /> {/* logo partially hidden */}
    </div>
  </div>
</div>
```

#### After:
```tsx
<div className="overflow-visible">
  <div className="h-32 rounded-t-lg"> {/* cover */} </div>
  <div className="p-4 pt-0">
    <div className="flex-shrink-0 -mt-8 relative z-20">
      <img className="w-16 h-16 border-4 border-white shadow-lg" /> {/* logo fully visible */}
    </div>
  </div>
</div>
```

### 2. Debug Logging Added

Added console logging to help diagnose following page image issues:

#### StandardBusinessCard Component
```typescript
console.log('🎴 [StandardBusinessCard] Rendering with data:', {
  business_id: business.id,
  business_name: business.business_name || business.name,
  logo_url: business.logo_url,
  cover_image_url: business.cover_image_url,
  has_logo: !!business.logo_url,
  has_cover: !!business.cover_image_url
});
```

#### FollowingPage Component
```typescript
console.log('🔍 [FollowingPage] Business data:', {
  business_id: follow.business_id,
  business_name: follow.business?.business_name,
  logo_url: follow.business?.logo_url,
  cover_image_url: follow.business?.cover_image_url,
  has_business: !!follow.business
});
```

## Visual Result

### Logo Positioning
```
┌─────────────────────────┐
│                         │
│   Cover Image (h-32)    │
│                         │
├─────────────────────────┤  ← Border line
│  ╔═══════╗              │
│  ║ LOGO  ║  Business    │  ← Logo sits above border
│  ║ 16x16 ║  Name        │     with white border
│  ╚═══════╝              │
│                         │
│  Description...         │
│                         │
│  ★ Stats               │
│                         │
└─────────────────────────┘
```

### Key Measurements
- **Logo size**: 16x16 pixels (increased from 12x12)
- **Logo position**: -8px margin-top (pulls it up over cover edge)
- **Logo border**: 4px white border for clear separation
- **Logo shadow**: Large shadow for depth
- **Cover height**: 32 units (128px)
- **Z-index layers**:
  - Cover: z-0 (default)
  - Logo: z-20
  - Action button: z-30

## Debugging Following Page Images

### Steps to Debug:

1. **Open browser console** when on `/following` page
2. **Look for logs**:
   ```
   🔍 [FollowingPage] Business data: { ... }
   🎴 [StandardBusinessCard] Rendering with data: { ... }
   ```
3. **Check values**:
   - `has_business`: Should be `true`
   - `logo_url`: Should be a valid URL or `null`
   - `cover_image_url`: Should be a valid URL or `null`

### Possible Issues:

1. **Database doesn't have image URLs**
   - If `logo_url` and `cover_image_url` are `null`, images need to be uploaded
   - Businesses need to be updated with image URLs

2. **Query not fetching fields**
   - Already fixed in `useBusinessFollowing.ts` to include:
     ```sql
     logo_url, cover_image_url, rating, review_count, description
     ```

3. **Business data not loading**
   - If `has_business` is `false`, the business details query is failing
   - Check Supabase RLS policies for `businesses` table

### Testing Checklist

To verify the fixes work:

- [ ] Create a test business with logo and cover images
- [ ] Follow that business
- [ ] Navigate to `/following` page
- [ ] Verify logo appears ABOVE the cover image line
- [ ] Verify logo has white border for clear separation
- [ ] Verify logo is larger (16x16) and more visible
- [ ] Check browser console for debug logs
- [ ] Verify both images load (if URLs exist in database)

## Sample Business Data Structure

For reference, a business with images should look like:
```json
{
  "id": "uuid-here",
  "business_name": "Test Business",
  "business_type": "restaurant",
  "logo_url": "https://example.com/logo.jpg",
  "cover_image_url": "https://example.com/cover.jpg",
  "address": "123 Main St",
  "rating": 4.5,
  "review_count": 42,
  "description": "A great business"
}
```

## Next Steps

1. **Run the app** and check console logs on `/following` page
2. **If URLs are null**: Add sample images to test businesses
3. **If URLs exist but images don't load**: Check CORS/image hosting
4. **Remove debug logs** once issue is confirmed fixed

## Related Files

1. `src/components/common/StandardBusinessCard.tsx` - Logo positioning fix
2. `src/components/following/FollowingPage.tsx` - Debug logging added
3. `src/hooks/useBusinessFollowing.ts` - Already fixed to fetch image fields
4. `docs/BUSINESS_CARD_IMAGE_FIXES.md` - Previous image field fixes
