# Epic 8.6 Gap Analysis & Best Practices Report

**Date:** 2025-12-09
**Scope:** Stories 8.6.1 - 8.6.9
**Status:** ⚠️ Analysis Completed (Major Gap: Story 8.6.6 Missing)

---

## 📱 Story 8.6.1: Capacitor Push Setup

**Status:** Implemented
**Current Plan:** Basic setup of FCM (Android) and APNs (iOS).

### 🚩 Gaps & Questions

1.  **Environment Isolation:** The plan uses a single `google-services.json`. Using the same Firebase project for Dev, Staging, and Prod leads to test notifications being sent to real users or analytics pollution.
2.  **Badge Management:** No explicit mention of clearing the app icon badge (red dot with number) when the app is opened.

### 🏭 Industry Practice

- **Build Flavors:** Use Android "Product Flavors" and iOS "Schemes" (Dev, Staging, Prod). Each flavor has a distinct `applicationId` (e.g., `com.app` vs `com.app.dev`) and uses a different `google-services.json`.
- **Badge Reset:** Automatically clear the badge number on `AppState.change` to 'active'.

### 💡 Recommendation

- **Action:** Create a `config/` folder with `dev` and `prod` subfolders for Google/Apple config files. Update `build.gradle` to copy the correct file based on build type.
- **Code:** Add `PushNotifications.removeAllDeliveredNotifications()` and clear badge count in `usePushNotifications` on resume.

---

## 🔑 Story 8.6.2: Token Management

**Status:** Implemented
**Current Plan:** Upsert token to `user_push_tokens` table on launch.

### 🚩 Gaps & Questions

1.  **Token Rotation:** FCM tokens can change (e.g., app restore, OS update). The current plan only upserts on "registration". Does it listen for `onTokenRefresh`?
2.  **Stale Tokens:** If a user uninstalls, the token remains in the DB. Sending to invalid tokens repeatedly can hurt FCM sender reputation/quota.
3.  **Concurrency:** `upsert` on `(user_id, device_token)` is good, but what if one user logs into multiple devices? (Handled: `device_id` column exists).

### 🏭 Industry Practice

- **Lifecycle Handling:** Listen to the FCM `onNewToken` event (not just initial registration).
- **Cleanup Job:** Backend cron job to delete tokens that return "NotRegistered" error from FCM (already in 8.6.3 logic, which is good) OR delete tokens not updated in >6 months.

### 💡 Recommendation

- **Action:** Ensure `PushNotifications.addListener('registration', ...)` catches refreshes, not just initial grant.
- **Action:** Add a scheduled Edge Function (pg_cron) to `DELETE FROM user_push_tokens WHERE updated_at < NOW() - INTERVAL '6 months'`.

---

## 🚀 Story 8.6.3: Backend Notification Sender

**Status:** Implemented (Waiting for trigger)
**Current Plan:** Postgres Trigger (`AFTER INSERT`) calls Edge Function via `pg_net` (HTTP POST).

### 🚩 Gaps & Questions

1.  **Scalability (The "Thundering Herd"):** A database trigger making an outbound HTTP request for _every_ message is strictly 1:1. If 1,000 messages are sent in a second, 1,000 Edge Functions spin up. This is expensive and can hit rate limits or timeout.
2.  **Payload Security:** `show_preview` preference is checked in the _backend_? If `show_preview=false` is set in Story 8.6.5, the backend must NOT send the message content in the push body.
3.  **Error Handling:** If `pg_net` fails (timeout), the notification is lost. Triggers are "fire and forget" for `pg_net`.

### 🏭 Industry Practice

- **Async Queues:** Instead of direct HTTP calls, insert into a `notification_queue` table. A separate "Worker" (or Supabase Edge Function running cron every minute, or a specialized queue service like Supabase Queues) processes them in batches (e.g., send 500 notification requests in one FCM batch call).
- **Webhooks:** Alternatively, use Database Webhooks (which handle retries) instead of raw `pg_net`.

### 💡 Recommendation

- **Immediate Fix:** For current scale, `pg_net` is acceptable but risky. Ensure the Edge Function respects the `show_preview` flag (from Notification Settings) before adding `message.content` to the body.
- **Scalable Fix:** Move to a Queue pattern. `INSERT INTO messages` -> Trigger -> `INSERT INTO notification_jobs`. Cron -> Process Jobs (Batch FCM send).

---

## 📬 Story 8.6.4: Notification Handling (Client)

**Status:** Implemented
**Current Plan:** In-app toast + Deep linking.

### 🚩 Gaps & Questions

1.  **Deep Link Reliability:** "Deep linking works from cold start" is complex. Often `App.getLaunchUrl()` returns null if the React app takes too long to hydrate.
2.  **Navigation Stack:** If I tap a notification for "Chat A", then press "Back", do I go to "Home" or exit the app? Users expect to go to the Conversation List.

### 🏭 Industry Practice

- **Navigation State:** When deep-linking, "rebuild" the stack. Pushing `ChatScreen` should ideally sit on top of `MessageList`.
- **Initialization Race:** Buffer deep link events until the Router is fully mounted.

### 💡 Recommendation

- **Action:** In `handleNotificationTap`, check navigation history. If empty, replace route with `['/messages', '/messages/id']` to ensure a valid back button experience.

---

## ⚙️ Story 8.6.5: Notification Preferences

**Status:** Implementation In Progress
**Current Plan:** Mute conversation, Quiet Hours.

### 🚩 Gaps & Questions

1.  **Granularity:** Does "Quiet Hours" blocking happen at the Edge Function level? Yes (in 8.6.3 plan).
2.  **Encryption:** Privacy of "Quiet Hours" times? (Minor concern).
3.  **Conflict:** If I mute a chat, but someone @mentions me?

### 🏭 Industry Practice

- **Mentions Override:** Standard practice (Slack/Discord/WhatsApp) is that @mentions _bypass_ mute (unless "Mute Mentions" is also checked).
- **Timezones:** "Quiet hours 10PM - 7AM". 10PM in _what timezone_? The backend is stateless. It needs the user's timezone stored in `notification_settings` to calculate "Is it 10PM for User X right now?". **This is a MISSING FIELD.**

### 💡 Recommendation

- **Critical:** Add `timezone` column to `notification_settings`. The Edge Function runs in UTC; it cannot know if it's 10PM for the user without an offset/timezone string (e.g., 'America/New_York').
- **Action:** Update Schema to include `timezone`. Update Frontend to send `Intl.DateTimeFormat().resolvedOptions().timeZone` on save.

---

## ❌ Story 8.6.6: Email Notifications (MISSING)

**Status:** ❌ FILE NOT FOUND
**Inferred Goal:** Email alerts for missed messages.

### 🚩 Gaps & Questions

1.  **Spam Risk:** Sending an email for _every_ missed message is terrible UX.
2.  **Implementation:** Unknown.

### 🏭 Industry Practice

- **Smart Digest:** Send an email only if:
  - User has been offline for > X minutes.
  - User has unread messages.
  - _Throttle_: Max 1 email per 4 hours (digest).

### 💡 Recommendation

- **Action:** **Create this Story immediately.** Define logic for "Smart Digest" to avoid spamming users.

---

## 📜 Story 8.6.7: Long Message Expansion

**Status:** Planned
**Current Plan:** CSS `line-clamp` + "Read More" button.

### 🚩 Gaps & Questions

1.  **Data Usage:** Does the client download the full 5MB text string and just hide it with CSS?
2.  **Search:** Is the hidden text searchable in the browser (Ctrl+F)? Yes, usually.

### 🏭 Industry Practice

- **Server Truncation:** For extremely long messages (e.g., pasted logs), standard practice is to truncate at 2KB on the server and send a `content_url` to fetch the rest, or strictly enforce a max character limit (e.g., 4096 chars).

### 💡 Recommendation

- **Action:** If messages can be unlimited length, implement `read_more_content` API. If limited (e.g., 5000 chars), Client-side CSS hiding (current plan) is acceptable and better for UX (instant expand).

---

## 💎 Story 8.6.8: Messaging UX Improvements

**Status:** Completed
**Current Plan:** Read receipts visibility, smart auto-scroll.

### 🚩 Gaps & Questions

1.  **Data Loss:** "Batching logic 500ms". If app is killed at 200ms, the read receipt is lost.
2.  **Optimistic UI:** Does the sender see "gray double checks" instantly, or wait for the round trip?

### 🏭 Industry Practice

- **Persistence:** Pending read receipts should be saved to `localStorage` or SQLite. On next app launch, flush the queue.

### 💡 Recommendation

- **Action:** Wrap the batcher in a `persistQueue` function using local storage.

---

## 📜 Story 8.6.9: Smart Scroll-to-Unread

**Status:** Planned
**Current Plan:** Scroll to first unread, fetch "chunk" around it.

### 🚩 Gaps & Questions

1.  **Pagination Hell:** Standard pagination is "Page 1 (Newest)". If the user jumps to "Page 50 (old unread)", how do they scroll _down_ to Page 49?
2.  **Gap Detection:** If I load messages 500-550 (unread), and then scroll to bottom (messages 1-50), there is a gap of 450 messages. Does the UI handle "gaps" in the list?

### 🏭 Industry Practice

- **Bi-directional Pagination:** The hardest part of chat apps. You need `before_id` AND `after_id` cursors. You cannot simply use `OFFSET`.
- **Jump & Fill:** When jumping to unread, clear the current list and load _only_ that context. Show "Load More" buttons in gaps if the user scrolls erratically.

### 💡 Recommendation

- **Action:** This is the highest risk story. Ensure the `useMessageList` hook supports "Conversation Context Mode" (centered on a message ID) distinct from "Latest Mode" (centered on bottom). Do not try to merge them into one list unless using a sophisticated library (like `virtuoso`) with gap detection logic.
