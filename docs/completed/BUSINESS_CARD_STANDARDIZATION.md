# Business Card Standardization

## Overview

All business cards across the application now use the `StandardBusinessCard` component for consistent UI/UX. The standardization ensures:

1. **Consistent Design**: All business cards follow the same visual layout matching the design specifications
2. **Proper Icons**: Follow button with user-plus/user-check icons is used consistently (not heart icons)
3. **Flexible Action Buttons**: Each page can customize the action button while maintaining the same card layout

## StandardBusinessCard Component

**Location**: `src/components/common/StandardBusinessCard.tsx`

### Features

- **Default Variant**: Full card with cover image, logo, description, stats, and coupon count
- **Compact Variant**: Simplified horizontal layout for list views or tight spaces
- **Customizable Action Button**: Pass any React node as the `actionButton` prop
- **Field Normalization**: Handles different field name conventions (business_name vs name, etc.)
- **Highlighted Search Results**: Supports HTML highlighting in business names

### Props

```typescript
interface StandardBusinessCardProps {
  business: StandardBusinessCardData;
  onCardClick?: (businessId: string) => void;
  variant?: 'default' | 'compact';
  showChevron?: boolean;
  showCouponCount?: boolean;
  actionButton?: React.ReactNode; // Customizable button (e.g., FollowButton)
  className?: string;
}

interface StandardBusinessCardData {
  id: string;
  business_name?: string;
  name?: string;
  business_type?: string;
  category?: string;
  address?: string;
  city?: string;
  state?: string;
  rating?: number;
  review_count?: number;
  follower_count?: number;
  activeCouponsCount?: number;
  active_coupons_count?: number;
  logo_url?: string;
  cover_image_url?: string;
  description?: string;
  highlightedName?: string; // For search results
}
```

## Updated Components

### 1. Search Page (`src/components/search/BusinessCard.tsx`)

- **Status**: ✅ Updated
- **Usage**: Uses StandardBusinessCard for all variants (default, compact, featured)
- **Action Button**: FollowButton with user-plus/user-check icons
- **Special Features**: Maintains search highlighting support

```typescript
<StandardBusinessCard
  business={businessData}
  onCardClick={onBusinessClick}
  showCouponCount={showCouponCount}
  actionButton={
    <FollowButton
      businessId={business.id}
      businessName={business.business_name}
      variant="ghost"
      size="sm"
      showLabel={false}
      className="h-8 w-8 rounded-full bg-white/90 p-0 shadow-md backdrop-blur hover:bg-green-50"
    />
  }
/>
```

### 2. Following Page (`src/components/following/FollowingPage.tsx`)

- **Status**: ✅ Updated
- **Usage**: Grid layout with StandardBusinessCard
- **Action Button**: FollowButton (shows user-check when already following)
- **Changes**: Removed custom card layout, now uses standardized component

```typescript
<StandardBusinessCard
  business={businessData}
  onCardClick={(id) => navigate(`/business/${id}`)}
  showChevron={false}
  actionButton={
    <FollowButton
      businessId={follow.business_id}
      businessName={follow.business?.business_name}
      variant="ghost"
      size="sm"
      showLabel={false}
      className="h-8 w-8 rounded-full bg-white/90 p-0 shadow-md backdrop-blur hover:bg-green-50"
    />
  }
/>
```

### 3. Favorites Page (`src/components/favorites/FavoritesPage.tsx`)

- **Status**: ✅ Updated
- **Usage**: Grid and list views with StandardBusinessCard
- **Action Button**: FollowButton
- **Changes**: 
  - Removed custom BusinessCard component
  - Uses StandardBusinessCard for both grid and list (compact) views

```typescript
// Grid view
<StandardBusinessCard
  business={businessData}
  onCardClick={onNavigate}
  showChevron={false}
  actionButton={<FollowButton ... />}
/>

// List view (compact variant)
<StandardBusinessCard
  business={businessData}
  onCardClick={onNavigate}
  variant="compact"
  showChevron={false}
  actionButton={<FollowButton ... />}
/>
```

### 4. Business Directory (`src/components/business/BusinessCard.tsx`)

- **Status**: ✅ Updated
- **Usage**: Wrapped StandardBusinessCard with additional metadata footer
- **Action Button**: FollowButton + "New" badge for recent businesses
- **Changes**: Now uses StandardBusinessCard as base, adds owner info and age metadata

```typescript
<StandardBusinessCard
  business={businessData}
  onCardClick={(id) => navigate(`/business/${id}`)}
  showChevron={false}
  showCouponCount={false}
  actionButton={
    <div className="flex items-center gap-2">
      <FollowButton ... />
      {showAge && daysOld <= 7 && <span>New</span>}
    </div>
  }
/>
```

### 5. Dashboard (`src/components/Dashboard.tsx`)

- **Status**: ✅ Updated
- **Usage**: Uses NewBusinesses component which uses the updated BusinessCard
- **Note**: Dashboard's "Spotlight Businesses" section uses a custom simplified card (not full business card), which is appropriate for that context

## Action Button Pattern

All business cards now use **FollowButton** (not heart/save button) with consistent styling:

```typescript
<FollowButton
  businessId={business.id}
  businessName={business.name}
  variant="ghost"
  size="sm"
  showLabel={false}
  className="h-8 w-8 rounded-full bg-white/90 p-0 shadow-md backdrop-blur hover:bg-green-50"
/>
```

### Icons Used

- **Not Following**: `UserPlus` icon (from lucide-react)
- **Following**: `UserCheck` icon (from lucide-react)
- **Color**: Green on hover for follow state

## Benefits

1. **Consistency**: Same card design across search, following, favorites, and business pages
2. **Maintainability**: Single source of truth for business card UI
3. **Flexibility**: Easy to customize action buttons per context while maintaining layout
4. **Correctness**: Proper follow/unfollow icons (not hearts which are for favorites)
5. **Performance**: Reusable component reduces code duplication

## Testing Checklist

- [ ] Search page business cards show FollowButton correctly
- [ ] Following page shows user-check icon for followed businesses
- [ ] Favorites page business cards show FollowButton (not heart)
- [ ] Dashboard NewBusinesses section shows follow buttons correctly
- [ ] All variants (default, compact) render properly
- [ ] Click actions work on all pages
- [ ] Follow/unfollow state updates correctly
- [ ] Icon changes from user-plus to user-check when following

## Migration Notes

### Before
Different card components across pages:
- `src/components/search/BusinessCard.tsx` - Custom search card
- Custom cards in FavoritesPage
- Custom cards in FollowingPage
- `src/components/business/BusinessCard.tsx` - Business directory card

### After
All use `StandardBusinessCard` as base:
- Search BusinessCard wraps StandardBusinessCard
- FavoritesPage uses StandardBusinessCard directly
- FollowingPage uses StandardBusinessCard directly
- Business directory BusinessCard wraps StandardBusinessCard with metadata

## Future Improvements

1. Consider adding a `metadata` prop to StandardBusinessCard for additional footer info
2. Add support for custom badges (e.g., "New", "Verified", "Featured")
3. Consider adding skeleton loading states to StandardBusinessCard
4. Add storybook stories for all variants and states
