# Story 8.6.6: In-App Notifications (Notification Center)

**Epic:** 8.6 - Notifications & Messaging Improvements
**Status:** In Progress (Stalled)
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

- [ ] User can view a list of past notifications.
- [ ] Tapping a notification navigates to the deep link (e.g., Chat).
- [ ] Tapping marks it as read.
- [ ] Muted conversations do **not** appear in the list (verified by checking `notification_log` is empty for them).
- [ ] Realtime updates work (new notification appears at top).

## 5. Known Issues (Deferred)

> [!WARNING]
> **Regression: Message Badge vs. Toast Conflict**
> When enabling Realtime for `notification_log` and updating `subscribeToConversations` to listen to it (for reliable badge updates), the in-app banner (toast) sometimes fails to appear. There seems to be a conflict or race condition when multiple listeners (hook + service) subscribe to the same `notification_log` table simultaneously.
>
> **Current State:**
>
> - `notification_log` is enabled for Realtime.
> - `in_app_notifications` view excludes messages (Correct).
> - `subscribeToConversations` (RealtimeService) listens to `notification_log` for updates.
> - **Bug:** Badge updates work, but Toasts are inconsistent (sometimes missing).
>
> **Next Steps:**
>
> - Debug the interaction between `useRealtimeNotifications` and `realtimeService`.
> - Consider consolidating the listeners or investigating if Supabase Realtime is dropping events due to duplicate channel filters.
