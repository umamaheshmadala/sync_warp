# Story 12.24: Product Interaction Enhancements

**Status:** Completed
**Epic:** [Epic 12: Instagram-Style Products](../epics/EPIC_12_Instagram_Style_Products.md)

## Goal
Enhance the product action bar and related components based on new user requirements, improving visibility of social metrics and fixing navigation/interaction bugs in the mobile layout.

## Requirements
1. **Counts Adjacent to Icons:** Show like count, friend count, and trending rank adjacent to their respective icons in the product modal (both mobile and web).
2. **Friends Like Navigation:** In the `FriendsLikeSheet`, tapping a friend's card must open the `FriendProfileModal` for that specific user.
3. **Mobile Sheet Dismissal:** Fix bottom sheets (like `FriendsLikeSheet` and `TrendingCategorySheet`) not dismissing when tapping outside on mobile devices.
4. **Trending Navigation Bug:** Correct the navigation from the `TrendingCategorySheet` to open the correct product modal instead of navigating to a blank page.
5. **Back Button Presence:** Ensure a back button exists on the product modal (mobile and web) to navigate to the previous context.
6. **Sticky Comment Input:** Make the comment input box stick to the bottom of the product modal on mobile, above the bottom navigation bar, ensuring it's always visible while scrolling comments.

## Implementation Details

### Data Visualization
- Added inline counts to the `MobileProductActions` component for Like, Friends, and Trending.
- Kept the `ProductLikedBy` text row at the bottom of the action bar based on user preference.

### Component Updates
- **MobileProductModal:** Restructured flex layout. Added `stickyFooter` prop to pin content to the bottom while allowing the main content to scroll.
- **StickyCommentInput:** Created a new self-contained component wrapping `ProductCommentInput` configured for the sticky footer. Added `hideInput` to `MobileProductComments` to prevent duplicate inputs.
- **BusinessProductsTab, FeaturedProducts, FavoritesPage:** Updated all mobile modal callers to use the new `stickyFooter` pattern.

### Social Sheets
- **FriendsLikeSheet:** Wired `FriendProfileModal` to friend cards. Added tap-to-select interaction.
- **TrendingCategorySheet:** Fixed the navigation callback to use `business_id` (via query param `?productId=`) instead of the broken `business_name` string routing.
- **Vaul Sheets Fix:** Added `dismissible` prop and boosted overlay z-index to `250`/`300` so they render properly above `MobileProductModal` (z-100) and can detect outside taps.

### Database Updates
- **SQL Migration:** Dropped and recreated `get_trending_products_by_category` to return `business_id UUID`. This was the root cause of the broken navigation in requirement #4.
- **Types:** Updated `TrendingProduct` interface in `trendingService.ts` to include `business_id`.
