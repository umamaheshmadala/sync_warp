# Story 5.5: Following Page Enhancements

**Epic**: [EPIC 5 - Social Features](../epics/EPIC_5_Social_Features.md)  
**Priority**: High  
**Status**: ✅ Done  
**Estimated Effort**: 4-5 days  
**Sprint**: TBD  

---

## Overview

Enhance the Following page (`/Following`) with a redesigned business card layout, accurate offer/coupon counts, functional notification preferences, and push notification integration for Android.

### Business Value

- **Improved UX consistency** - Cards match search results for familiar experience
- **Space efficiency** - Compact design shows more businesses without scrolling
- **User engagement** - Working notifications keep users informed of updates
- **Accuracy** - Real offer counts build trust in platform data

---

## User Stories & Acceptance Criteria

### US-5.5.1: Business Card Redesign (Search Variant)

**As a** user viewing my followed businesses  
**I want** to see business cards in a compact horizontal layout  
**So that** I can quickly scan through my followed businesses and find relevant information efficiently

#### Acceptance Criteria

| ID | Criteria | Verification |
|----|----------|--------------|
| AC-1.1 | The business card MUST display with a **horizontal layout** (not vertical stacked layout) | Visual inspection |
| AC-1.2 | The business card MUST NOT display a **cover photo** at the top | Visual inspection |
| AC-1.3 | The business logo MUST be displayed as a **circular avatar** (80×80px, rounded-full) | Visual inspection, CSS check |
| AC-1.4 | The circular avatar MUST **pop out** to the left of the card (similar to SearchBusinessCard design) | Visual inspection |
| AC-1.5 | The business card MUST NOT display the **business type** (e.g., "Private Limited", "Sole Proprietorship", "Partnership") | Visual inspection |
| AC-1.6 | The business card MUST display the **business name** prominently | Visual inspection |
| AC-1.7 | The business card MUST display the **city/location** | Visual inspection |
| AC-1.8 | The business card MUST display **active offers count** (icon + number) | Visual inspection |
| AC-1.9 | The business card MUST display **follower count** (icon + number) | Visual inspection |
| AC-1.10 | The business card MUST display a **verification badge** if verified | Visual inspection |
| AC-1.11 | The **settings gear icon** MUST remain visible in the top-right area | Visual inspection |
| AC-1.12 | The **follow/unfollow button** MUST remain visible in the card | Visual inspection |
| AC-1.13 | Clicking on the card (excluding action buttons) MUST navigate to the business storefront | Functional test |
| AC-1.14 | The card MUST be responsive and work on mobile, tablet, and desktop viewports | Responsive testing |
| AC-1.15 | If no logo is available, a **placeholder with the first letter** of the business name MUST be shown | Test with business missing logo |

#### Technical Implementation

```
Component: StandardBusinessCard.tsx
New variant: 'search'

Props changes:
- variant?: 'default' | 'compact' | 'search'

When variant === 'search':
- Render horizontal layout
- Circular pop-out avatar (w-20 h-20 rounded-full, positioned -left-8)
- Hide cover photo section
- Hide business_type display
- Show: name, city, offer count, follower count inline
- Maintain actionButton slot for settings + follow
```

---

### US-5.5.2: Accurate Offer Count Display

**As a** user viewing followed business cards  
**I want** to see the accurate count of active offers and coupons  
**So that** I can decide which businesses to visit based on available deals

#### Acceptance Criteria

| ID | Criteria | Verification |
|----|----------|--------------|
| AC-2.1 | The offer count MUST include **all active coupons** from `business_coupons` table | Database query + UI check |
| AC-2.2 | The offer count MUST include **all active offers** from `offers` table | Database query + UI check |
| AC-2.3 | A coupon is "active" if: `is_active = true` AND `start_date <= now()` AND `end_date >= now()` | Query logic|
| AC-2.4 | An offer is "active" if: `status = 'active'` AND `valid_from <= now()` AND `valid_until >= now()` | Query logic |
| AC-2.5 | The displayed count MUST be the **sum** of active coupons + active offers | Math verification |
| AC-2.6 | If total count is **0**, display "0" (not "No active offers" text in compact view) | Visual inspection |
| AC-2.7 | If total count is **>0**, display the number with an offer/ticket icon | Visual inspection |
| AC-2.8 | The count MUST update in **real-time** when the user navigates back to Following page | Functional test |
| AC-2.9 | The query MUST NOT cause N+1 query issues (batch or join approach) | Performance test |
| AC-2.10 | If query fails, display count as **0** with no error shown to user | Error handling test |

#### Technical Implementation

```typescript
// In useBusinessFollowing.ts - enhance select query

const { data } = await supabase
  .from('business_followers')
  .select(`
    *,
    business:businesses!inner(
      id, business_name, logo_url, city, claim_status, phone_verified,
      active_coupons:business_coupons(count)
        .filter('is_active', 'eq', true)
        .filter('start_date', 'lte', 'now()')
        .filter('end_date', 'gte', 'now()'),
      active_offers:offers(count)
        .filter('status', 'eq', 'active')
        .filter('valid_from', 'lte', 'now()')
        .filter('valid_until', 'gte', 'now()')
    )
  `)
  .eq('user_id', userId);
```

---

### US-5.5.3: Notification Preferences Save & Persist

**As a** user following a business  
**I want** to toggle notification preferences (Products, Offers, Coupons, Announcements)  
**So that** I only receive updates I care about

#### Acceptance Criteria

| ID | Criteria | Verification |
|----|----------|--------------|
| AC-3.1 | Clicking the **settings gear icon** on a business card MUST open the Notification Preferences modal | Functional test |
| AC-3.2 | The modal MUST display the **business name** in the header | Visual inspection |
| AC-3.3 | The modal MUST show **4 toggleable preferences**: New Products, New Offers & Deals, New Coupons, Important Announcements | Visual inspection |
| AC-3.4 | Each preference MUST be **independently toggleable** (checkbox) | Functional test |
| AC-3.5 | The modal MUST show the **current saved preferences** when opened | Functional test |
| AC-3.6 | Clicking "Save Preferences" MUST **persist changes** to the `business_followers` table | Database verification |
| AC-3.7 | The `notification_preferences` column MUST store: `{new_products: boolean, new_offers: boolean, new_coupons: boolean, announcements: boolean}` | Schema verification |
| AC-3.8 | A **success toast** MUST appear after saving | Functional test |
| AC-3.9 | If save fails, an **error toast** MUST appear and preferences MUST NOT be lost | Error handling test |
| AC-3.10 | Clicking "Cancel" MUST close the modal **without saving changes** | Functional test |
| AC-3.11 | Clicking outside the modal (backdrop) MUST close the modal **without saving** | Functional test |
| AC-3.12 | If **all preferences are disabled**, a warning message MUST appear | Visual inspection |

---

### US-5.5.4: Notification Channel Selection (In-App vs Push)

**As a** user  
**I want** to choose how I receive notifications (in-app or push)  
**So that** I can control my notification experience

#### Acceptance Criteria

| ID | Criteria | Verification |
|----|----------|--------------|
| AC-4.1 | The "How do you want to be notified?" section MUST display **3 options**: In-app only, Push notifications, Email | Visual inspection |
| AC-4.2 | **In-app only** MUST be selectable and work on all platforms | Functional test |
| AC-4.3 | **Push notifications** MUST be selectable on **Android native app** | Functional test on Android |
| AC-4.4 | **Push notifications** MUST show "(Coming soon)" label on **iOS and Web** platforms | Visual inspection on iOS/Web |
| AC-4.5 | **Email** MUST show "(Coming soon)" label and be disabled | Visual inspection |
| AC-4.6 | When user selects "Push notifications" on Android, the system MUST check for **push permission** | Functional test |
| AC-4.7 | If push permission is NOT granted, system MUST **prompt user** for permission | Functional test |
| AC-4.8 | If permission is denied, system MUST **fall back to in-app** with a toast message | Functional test |
| AC-4.9 | The selected channel MUST be **persisted** in `business_followers.notification_channel` column | Database verification |
| AC-4.10 | When push is selected and permission granted, system MUST register **push token** in `push_tokens` table | Database verification |

#### Technical Implementation Notes

```typescript
// Platform detection for push availability
const isPushAvailable = () => {
  // Only enabled on Android native app
  const isAndroidApp = Capacitor.getPlatform() === 'android';
  return isAndroidApp;
};

// When push selected:
if (channel === 'push') {
  const hasPermission = await PushNotifications.checkPermissions();
  if (hasPermission.receive !== 'granted') {
    const result = await PushNotifications.requestPermissions();
    if (result.receive !== 'granted') {
      toast.error('Push permission denied. Using in-app notifications.');
      setChannel('in_app');
      return;
    }
  }
  // Register token
  await registerPushToken();
}
```

---

### US-5.5.5: In-App Notification Delivery (Follower Updates)

**As a** user following a business with "new_products" enabled  
**I want** to receive an in-app notification when that business adds a new product  
**So that** I stay informed about offerings from businesses I follow

#### Acceptance Criteria

| ID | Criteria | Verification |
|----|----------|--------------|
| AC-5.1 | When a business **creates a new product**, all followers with `new_products: true` MUST receive an in-app notification | E2E test |
| AC-5.2 | When a business **creates a new offer**, all followers with `new_offers: true` MUST receive an in-app notification | E2E test |
| AC-5.3 | When a business **creates a new coupon**, all followers with `new_coupons: true` MUST receive an in-app notification | E2E test |
| AC-5.4 | When a business **posts an announcement**, all followers with `announcements: true` MUST receive an in-app notification | E2E test |
| AC-5.5 | The notification MUST include: business name, notification type icon, brief description | Visual inspection |
| AC-5.6 | The notification MUST be stored in `notification_log` table | Database verification |
| AC-5.7 | The notification MUST appear in the **notification bell dropdown** | Functional test |
| AC-5.8 | The notification badge count MUST **increment** when new notification arrives | Functional test |
| AC-5.9 | If user has `notification_channel: 'in_app'`, notification MUST appear **only in-app** | Functional test |
| AC-5.10 | Clicking the notification MUST navigate to the **business storefront** | Functional test |
| AC-5.11 | Users who have **unfollowed** MUST NOT receive notifications | Negative test |
| AC-5.12 | Users who have preference **disabled** MUST NOT receive that notification type | Negative test |

#### Technical Implementation

```typescript
// New service: followedBusinessNotificationTrigger.ts

export async function notifyFollowersOfNewProduct(businessId: string, productName: string) {
  // 1. Get all followers with new_products: true
  const { data: followers } = await supabase
    .from('business_followers')
    .select('user_id, notification_preferences, notification_channel')
    .eq('business_id', businessId)
    .eq('notification_preferences->new_products', true);
  
  // 2. Get business details
  const { data: business } = await supabase
    .from('businesses')
    .select('business_name')
    .eq('id', businessId)
    .single();
  
  // 3. Create notifications for each follower
  for (const follower of followers) {
    await createNotification({
      user_id: follower.user_id,
      type: 'business_update',
      title: 'New Product Added',
      body: `${business.business_name} added a new product: ${productName}`,
      data: { business_id: businessId, type: 'new_product' },
      channel: follower.notification_channel
    });
  }
}
```

---

### US-5.5.6: Push Notification Delivery (Android)

**As a** user with push notifications enabled  
**I want** to receive push notifications on my Android device  
**So that** I don't miss important updates even when the app is closed

#### Acceptance Criteria

| ID | Criteria | Verification |
|----|----------|--------------|
| AC-6.1 | When user has `notification_channel: 'push'` and preference enabled, a **push notification** MUST be sent | E2E test on Android |
| AC-6.2 | The push notification MUST be sent via **Firebase Cloud Messaging (FCM)** | Server logs |
| AC-6.3 | The push notification MUST use the **send-push-notification Edge Function** | Edge Function logs |
| AC-6.4 | The push notification MUST appear in the **Android system tray** when app is in background | Device test |
| AC-6.5 | The push notification MUST appear as an **in-app toast** when app is in foreground | Device test |
| AC-6.6 | Tapping the push notification MUST **open the app** and navigate to business storefront | Device test |
| AC-6.7 | The notification MUST include: **title** (e.g., "New Offer!"), **body** (e.g., "Business Name has a new offer"), **icon** | Device test |
| AC-6.8 | If FCM delivery fails, the notification MUST **fallback to in-app** | Error handling test |
| AC-6.9 | Users without registered push tokens MUST receive **in-app notifications** instead | Fallback test |
| AC-6.10 | Rate limiting MUST prevent more than **10 notifications per hour** per user | Rate limit test |

---

### US-5.5.7: Following Page Layout & Consistency

**As a** user  
**I want** the Following page to look consistent with other pages  
**So that** the app feels polished and professional

#### Acceptance Criteria

| ID | Criteria | Verification |
|----|----------|--------------|
| AC-7.1 | The Following page MUST display the **search bar** at the top | Visual inspection |
| AC-7.2 | The Following page MUST display the **sort dropdown** (Recently Followed, Alphabetical, Most Active) | Visual inspection |
| AC-7.3 | Business cards MUST be displayed in a **grid layout** (1 column mobile, 2 columns tablet, 3 columns desktop) | Responsive test |
| AC-7.4 | The grid MUST have consistent **spacing/gaps** between cards | Visual inspection |
| AC-7.5 | When no businesses are followed, MUST display **empty state** with "Discover Businesses" CTA | Functional test |
| AC-7.6 | Search MUST filter followed businesses by **name, type, or address** | Functional test |
| AC-7.7 | Sort by "Most Active" MUST order by businesses with most recent updates | Functional test |
| AC-7.8 | Page title MUST show count: "Following (N)" where N = number of followed businesses | Visual inspection |
| AC-7.9 | Page MUST update in **real-time** when user unfollows from the card | Functional test |

---

### US-5.5.8: Clean Address & Layout Consistency

**As a** user viewing the following list  
**I want** to see a consistent address format (Local Area, City) on all business cards  
**So that** the interface looks professional and easy to read

#### Acceptance Criteria

| ID | Criteria | Verification |
|----|----------|--------------|
| AC-8.1 | The business card address MUST **strictly follow** the format: `Local Area, City` (e.g., "Labbipet, Vijayawada") | Visual inspection |
| AC-8.2 | The card MUST NOT display door numbers, street lines, or zip codes in the short address view | Visual inspection |
| AC-8.3 | If `local_area` is missing, only `city` MUST be shown | Functional test |
| AC-8.4 | The **Offers** and **Followers** icons/counts MUST act as a fixed anchor and **maintain alignment** across all cards | Visual inspection |
| AC-8.5 | Long addresses MUST be **truncated** with ellipses (...) to prevent layout shifting of action buttons or counts | Visual inspection |
| AC-8.6 | The text color for the address should be consistent (muted gray) | Visual inspection |

---

### US-5.5.9: Simplified Notification Preferences

**As a** user setting notification preferences  
**I want** to only see options for features that are currently supported  
**So that** I am not confused by options that don't work

#### Acceptance Criteria

| ID | Criteria | Verification |
|----|----------|--------------|
| AC-9.1 | The Notification Preferences modal MUST **remove** the "New Coupons" option | Visual inspection |
| AC-9.2 | The Notification Preferences modal MUST **remove** the "Important Announcements" option | Visual inspection |
| AC-9.3 | Only "New Products" and "New Offers & Deals" options MUST remain visible | Visual inspection |
| AC-9.4 | Backend logic relying on these keys MUST handle their absence gracefully (defaulting to false or ignoring) | Code review |

---

## Non-Functional Requirements

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-1 | Page load time (Following page) | < 2 seconds |
| NFR-2 | Offer count query performance | < 500ms |
| NFR-3 | Notification delivery latency (in-app) | < 1 second |
| NFR-4 | Push notification delivery latency | < 5 seconds |
| NFR-5 | UI responsiveness during save | No blocking, show loading state |
| NFR-6 | Accessibility | WCAG 2.1 AA compliant |
| NFR-7 | Mobile support | iOS Safari, Android Chrome |

---

## Database Schema Requirements

### business_followers table columns

```sql
-- Required columns (verify exist):
notification_preferences JSONB DEFAULT '{"new_products":true,"new_offers":true,"new_coupons":true,"announcements":true}'::jsonb
notification_channel VARCHAR(20) DEFAULT 'in_app' CHECK (notification_channel IN ('in_app', 'push', 'email', 'sms', 'all'))
```

---

## Files to Create/Modify

### New Files
| File | Purpose |
|------|---------|
| `src/services/followedBusinessNotificationTrigger.ts` | Service to trigger notifications when businesses create content |

### Modified Files
| File | Changes |
|------|---------|
| `src/components/common/StandardBusinessCard.tsx` | Add `variant: 'search'` with horizontal layout |
| `src/components/following/FollowingPage.tsx` | Use `variant="search"` and pass correct data |
| `src/components/following/NotificationPreferencesModal.tsx` | Enable push option for Android, platform detection |
| `src/hooks/useBusinessFollowing.ts` | Enhance query to fetch active offer/coupon counts |
| `src/services/productService.ts` | Trigger follower notifications on product create |
| `src/services/offerService.ts` | Trigger follower notifications on offer create |
| `src/services/couponService.ts` | Trigger follower notifications on coupon create |

---

## Testing Plan

### Unit Tests
- [x] `StandardBusinessCard` renders correctly with `variant="search"`
- [x] Offer count calculation is accurate
- [x] Notification preferences toggle correctly

### Integration Tests
- [x] Saving preferences persists to database
- [x] Push permission flow works on Android

### E2E Tests
- [x] Business creates product → followers with preference receive notification
- [x] Push notification received on Android device in background
- [x] Complete flow: follow → set preferences → business posts → notification received

---

## Definition of Done

- [x] All acceptance criteria verified and passing
- [x] Code reviewed and merged to main
- [x] Unit tests written and passing
- [x] E2E tests written and passing
- [x] No console errors or warnings
- [x] Responsive design verified on mobile/tablet/desktop
- [x] Push notifications tested on physical Android device
- [x] Documentation updated if needed

---

## Dependencies

| Dependency | Status |
|------------|--------|
| EPIC 7.4 - Push Notifications (Android) | ✅ Complete |
| FCM Edge Function deployed | ✅ Complete |
| `business_followers` table exists | ✅ Complete |
| `notification_log` table exists | ✅ Complete |
| `push_tokens` table exists | ✅ Complete |

---

## Out of Scope

- iOS push notifications (requires Mac + Apple Developer account)
- Email notifications (marked "Coming soon")
- SMS notifications (marked "Coming soon")
- Announcement posting UI for businesses (separate story)

---

## Mockups & References

### Current Design (to be replaced)
![Current Following Card](file:///c:/Users/umama/.gemini/antigravity/brain/6381f1db-9177-491f-b90a-17f5e59413d0/uploaded_media_2_1770038351646.png)

### Target Design (search results style)
![Target Search Card](file:///c:/Users/umama/.gemini/antigravity/brain/6381f1db-9177-491f-b90a-17f5e59413d0/uploaded_media_1770037731134.png)

### Notification Preferences Modal
![Notification Modal](file:///c:/Users/umama/.gemini/antigravity/brain/6381f1db-9177-491f-b90a-17f5e59413d0/uploaded_media_1_1770038351646.png)
