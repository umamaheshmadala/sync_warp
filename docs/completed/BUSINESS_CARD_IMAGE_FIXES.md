# Business Card Image Rendering Fixes

## Issue
Business cards were not rendering logo and cover images on certain pages:
- **Search Page**: Missing both logo and cover images
- **Following Page**: Missing cover images (logo was rendering)
- **Dashboard**: Working correctly ✅

## Root Cause

The issue was caused by missing fields in the data layer:

### 1. Search Service (`src/services/searchService.ts`)
The `SearchBusiness` interface and the `enhanceBusinessResults` function were missing the following fields:
- `logo_url`
- `cover_image_url`
- `review_count`
- `follower_count`

### 2. Business Following Hook (`src/hooks/useBusinessFollowing.ts`)
The database query for fetching business details was only selecting:
```sql
id, business_name, business_type, logo_url, address
```

Missing fields:
- `cover_image_url`
- `rating`
- `review_count`
- `description`

### 3. Field Name Mapping
The search `BusinessCard` component was using incorrect field names:
- Used `business.reviewCount` instead of `business.review_count`
- Used `business.followerCount` instead of `business.follower_count`
- Used `business.logoUrl` instead of `business.logo_url`
- Used `business.coverImageUrl` instead of `business.cover_image_url`

## Fixes Applied

### 1. Updated SearchBusiness Interface
**File**: `src/services/searchService.ts`

Added missing fields to the interface:
```typescript
export interface SearchBusiness {
  id: string;
  business_name: string;
  business_type?: string;
  description?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  rating?: number;
  review_count?: number;        // ✅ Added
  follower_count?: number;      // ✅ Added
  logo_url?: string;            // ✅ Added
  cover_image_url?: string;     // ✅ Added
  activeCouponsCount: number;
  distance?: number;
  relevanceScore: number;
  highlightedName?: string;
}
```

### 2. Updated enhanceBusinessResults Function
**File**: `src/services/searchService.ts`

Added the missing fields to the returned object:
```typescript
return {
  id: business.id,
  business_name: business.business_name,
  business_type: business.business_type,
  description: business.description,
  address: business.address,
  latitude: business.latitude,
  longitude: business.longitude,
  rating: business.rating,
  review_count: business.review_count,      // ✅ Added
  follower_count: business.follower_count,  // ✅ Added
  logo_url: business.logo_url,              // ✅ Added
  cover_image_url: business.cover_image_url,// ✅ Added
  activeCouponsCount: activeCoupons.length,
  relevanceScore,
  highlightedName,
  distance: undefined
};
```

### 3. Fixed Search BusinessCard Field Mapping
**File**: `src/components/search/BusinessCard.tsx`

Corrected the field name mapping to match snake_case from the database:
```typescript
const businessData: StandardBusinessCardData = {
  id: business.id,
  business_name: business.business_name,
  business_type: business.business_type,
  address: business.address,
  rating: business.rating,
  review_count: business.review_count,        // ✅ Fixed from reviewCount
  follower_count: business.follower_count,    // ✅ Fixed from followerCount
  activeCouponsCount: business.activeCouponsCount,
  logo_url: business.logo_url,                // ✅ Fixed from logoUrl
  cover_image_url: business.cover_image_url,  // ✅ Fixed from coverImageUrl
  description: business.description,
  highlightedName: business.highlightedName,
};
```

### 4. Updated FollowedBusiness Interface
**File**: `src/hooks/useBusinessFollowing.ts`

Added missing fields to the business object within the interface:
```typescript
export interface FollowedBusiness {
  // ... other fields
  business?: {
    id: string;
    business_name: string;
    business_type?: string;
    logo_url?: string;
    cover_image_url?: string;    // ✅ Added
    address?: string;
    rating?: number;             // ✅ Added
    review_count?: number;       // ✅ Added
    description?: string;        // ✅ Added
    follower_count?: number;
  };
}
```

### 5. Updated Business Query in useBusinessFollowing
**File**: `src/hooks/useBusinessFollowing.ts`

Expanded the SELECT query to include all necessary fields:
```typescript
const { data: businessData } = await supabase
  .from('businesses')
  .select('id, business_name, business_type, logo_url, cover_image_url, address, rating, review_count, description')
  .eq('id', follow.business_id)
  .single();
```

## Result

All business cards now properly render:
- ✅ **Search Page**: Shows both logo and cover images
- ✅ **Following Page**: Shows both logo and cover images  
- ✅ **Dashboard**: Continues to work correctly

## Field Name Convention

The project uses **snake_case** for database field names:
- `logo_url` (not `logoUrl`)
- `cover_image_url` (not `coverImageUrl`)
- `review_count` (not `reviewCount`)
- `follower_count` (not `followerCount`)
- `business_name` (not `businessName`)
- `business_type` (not `businessType`)

## Testing Checklist

- [x] Search page shows business card cover images
- [x] Search page shows business card logo images
- [x] Following page shows business card cover images
- [x] Following page shows business card logo images
- [x] Dashboard continues to render correctly
- [x] All stats (rating, review_count, follower_count) display correctly
- [x] Business descriptions show properly

## Related Files

1. `src/services/searchService.ts` - Search service interface and data enhancement
2. `src/components/search/BusinessCard.tsx` - Search page business card component
3. `src/hooks/useBusinessFollowing.ts` - Business following hook with data queries
4. `src/components/following/FollowingPage.tsx` - Following page using the hook
5. `src/components/common/StandardBusinessCard.tsx` - Standardized card component
