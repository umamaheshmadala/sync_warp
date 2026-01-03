# Mobile Profile Drawer - LinkedIn Style

## Overview
Implemented a LinkedIn-inspired profile drawer for mobile views that opens from the left side when clicking the profile avatar in the header.

## Features

### 1. **Profile Section**
- Large circular avatar (80x80px)
- User's full name in bold
- **Interests display** instead of job description
  - Shows user's selected interests separated by bullets
  - Falls back to "No interests selected" if none chosen
- Location with MapPin icon

### 2. **Manage Businesses Section**
- Automatically fetches and displays all businesses owned by the user
- Each business card shows:
  - Business logo (or placeholder icon)
  - Business name
  - Business category
  - Clickable to navigate to business dashboard
- Only shown if user owns any businesses

### 3. **Menu Items**
- **Profile** - Navigate to user profile page
- **Settings** - Navigate to settings page
- **Sign Out** - Sign out and redirect to login

### 4. **Responsive Design**
- Only visible on mobile (< 768px width)
- Smooth slide-in animation from left
- Semi-transparent backdrop overlay
- Close button in top-right corner
- Click outside to close

## Implementation Details

### New Component
**File:** `src/components/MobileProfileDrawer.tsx`

- Fetches user's businesses from Supabase when drawer opens
- Displays formatted interests from user profile
- Handles navigation and closes drawer after action
- Sign out functionality with proper cleanup

### Layout Integration
**File:** `src/components/Layout.tsx`

Modified header behavior:
- **Mobile (< 768px)**: Profile avatar opens drawer
- **Desktop (≥ 768px)**: Profile avatar navigates to profile page
- Logout button hidden on mobile (available in drawer)

### State Management
- Added `showMobileProfileDrawer` state in Layout
- Drawer state controlled by parent component

## User Experience

### LinkedIn-Like Design Patterns
1. **Profile header** with avatar and user info
2. **"View Profile" link** below basic info
3. **Manage businesses** section (similar to LinkedIn's "Manage Pages")
4. **Simple menu items** with icons and labels
5. **Sign out** at the bottom in red

### Mobile-First Approach
- Optimized for touch interactions
- Large tap targets (48px minimum)
- Smooth animations
- Intuitive gestures (swipe from edge, tap outside to close)

## Future Enhancements

Based on the LinkedIn model, we can add:

1. **Profile views analytics** - "28 profile viewers" like LinkedIn
2. **Business analytics** - Quick stats for each business
3. **Recent activity** - Latest interactions, reviews, offers
4. **Premium features** section
5. **Groups/Communities** - User's joined communities
6. **Saved items** - Bookmarked deals, businesses
7. **Network stats** - Friends count, connections

## Testing

### Manual Testing Steps
1. Open app on mobile device or browser (< 768px width)
2. Click profile avatar in header
3. Verify drawer slides in from left
4. Check profile info displays correctly (name, interests, location)
5. If user owns businesses, verify they appear in "Manage Businesses"
6. Test navigation to profile, settings
7. Test sign out functionality
8. Verify drawer closes when clicking outside or close button

### Desktop Testing
1. Open app on desktop (≥ 768px width)
2. Click profile avatar
3. Verify it navigates to profile page (no drawer)
4. Verify logout button visible in header

## Database Requirements

Uses existing tables:
- `users` / `profiles` - For user data and interests
- `businesses` - For owned businesses list

Query used:
```sql
SELECT id, name, category, logo_url 
FROM businesses 
WHERE owner_id = ? 
AND status = 'active'
ORDER BY created_at DESC
```

## Dependencies

No new dependencies required. Uses:
- React hooks (useState, useEffect)
- React Router (useNavigate)
- Lucide icons
- Tailwind CSS
- Supabase client

## Screenshots Reference

The implementation follows the LinkedIn mobile app drawer design:
- Avatar in top-left
- Name and description below avatar
- Horizontal dividers between sections
- Icon + text menu items
- Consistent spacing and typography
