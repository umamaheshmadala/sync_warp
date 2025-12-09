# Story 8.6.6: In-App Notifications (Notification Center)

**Epic:** 8.6 - Notifications & Messaging Improvements
**Status:** Complete ✅
**Priority:** High

## 1. Goal

Provide users with a centralized "Notification Center" where they can view a history of their notifications (likes, comments, system alerts, new messages), distinct from the transient "Toasts". This list must respect the user's Mute settings.

## 2. Requirements

### UI Components

- **Notification List Screen**: A dedicated page (`/notifications`) or a dropdown/modal accessible from the main nav.
- **Notification Item**:
  - Avatar (Sender).
  - Title (e.g., "John Doe").
  - Body (e.g., "Sent you a message").
  - Timestamp ("2m ago").
  - "Read" vs "Unread" styling.
  - **Action**: Tapping navigates to the relevant content (Chat, Product, etc.).

### Functional Requirements

1.  **Source of Truth**: Fetch from the `notification_log` table.
2.  **Pagination**: Support infinite scroll (load more).
3.  **Realtime**: Update the list instantly when a new row is inserted into `notification_log`.
4.  **Mark as Read**:
    - Clicking a notification marks it as `opened = true`.
    - "Mark all as read" button.
5.  **Mute Logic**:
    - **Trigger Level**: The database trigger (fixed in 8.6.5) prevents _new_ muted notifications from being inserted.
    - **Query Level (Safety)**: The fetch query should optionally filter out notifications from conversations that are _currently_ muted (in case of race conditions or retroactive muting).

## 3. Technical Implementation

### Database

- Use existing `notification_log` table.
- Use existing `unread_notifications` view for the badge count.
- **New View (Optional)**: `in_app_notifications` view that joins with `profiles` to get sender details easily and filters active mutes.

### Backend (Edge Functions / RPC)

- `fetch_notifications(limit, offset)`: RPC or simple `.select()` query.
- `mark_notification_opened(id)`: RPC or update.
- `mark_all_notifications_opened()`: RPC.

### Frontend

- `useNotifications` hook (similar to `useMessages`).
- `NotificationScreen.tsx`.
- Integrate with `NotificationRouter` (already exists in `useNotificationHandler`) to handle taps.

## 4. Acceptance Criteria

- [x] User can view a list of past notifications.
- [x] Tapping a notification navigates to the deep link (e.g., Chat).
- [x] Tapping marks it as read.
- [x] Muted conversations do **not** appear in the list (verified by checking `notification_log` is empty for them).
- [x] Realtime updates work (new notification appears at top).
- [x] In-app toast banners display for new messages (when not in conversation and not muted).

## 5. Resolution Summary

> [!NOTE]
> **Issue Resolved: Message Badge vs. Toast Conflict**
>
> **Previous State:**
>
> - When enabling Realtime for `notification_log`, in-app banners (toasts) sometimes failed to appear on mobile.
> - There was a conflict when multiple listeners subscribed to the same `notification_log` table.
>
> **Root Cause:**
>
> - Supabase Realtime has a limitation where only ONE subscription to a table fires when multiple subscriptions exist on the same client, even with unique channel names.
>
> **Solution Implemented:**
>
> - **Event Bridge Pattern**: `useInAppNotifications` receives the Realtime event and dispatches a custom JavaScript event (`notification-log-insert`)
> - `useRealtimeNotifications` listens for this custom event to display toasts
> - Both hooks maintain unique Realtime channels for future compatibility
>
> **Additional Fixes:**
>
> - Added `conversation-updated` event dispatch after mute/unmute to refresh UI
> - Enhanced logging for mobile debugging
> - Improved toast styling with z-index and safe area support
>
> **Current State:**
>
> - ✅ Badge updates work reliably
> - ✅ Toasts display correctly on mobile
> - ✅ Notification list updates in real-time
> - ✅ Mute UI updates properly after operations
