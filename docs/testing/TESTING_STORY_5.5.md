# User Testing Guide: Following Page Enhancements

**Story ID:** STORY_5.5  
**Objective:** Verify the new "Following" page UI, accurate data counts, and the end-to-end notification system.

## 📋 Prerequisites
1.  **Tester Accounts:**
    *   **User A (Follower):** Use `TestUser1` (or any regular user).
    *   **User B (Business Owner):** Use `KFC Tadepalli` owner account.
2.  **Environment:** Local development (`npm run dev`) or Staging.

---

## 🧪 Validating the New UI (User Side)

**Step 1: Check the Following Page Layout**
1.  Login as **User A**.
2.  Navigate to the **Following** page (`/Following`).
3.  **Verify:**
    *   [ ] Business cards are displayed in a **horizontal layout** (not vertical).
    *   [ ] The circular logo "pops out" to the left of the card.
    *   [ ] The **Follow** and **Settings (Gear)** buttons are visible on the right.
    *   [ ] **No cover photo** is visible on the card.
    *   [ ] Clicking the card (not the buttons) takes you to the Business Profile.

**Step 2: Check Active Counts**
1.  Find a business that has active offers (e.g., KFC Tadepalli).
2.  **Verify:**
    *   [ ] The card displays an "Active Offers" count (e.g., "• 3 Active Offers").
    *   [ ] This number matches the actual sum of Active Offers + Active Coupons for that business.
    *   [ ] Verify the count updates if you visit the business and see the list.

**Step 3: Notification Preferences**
1.  Click the **Settings (Gear)** icon on any business card.
2.  **Verify:**
    *   [ ] A modal opens with the business name.
    *   [ ] Toggle switches are visible for:
        *   New Products
        *   New Offers & Deals
        *   New Coupons
        *   Announcements
    *   [ ] "In-app only" is selected by default (on web).
    *   [ ] Changing a toggle and clicking **"Save"** shows a success toast.
    *   [ ] Re-opening the modal shows your saved changes persisted.

---

## 🔔 Testing the Notification System (End-to-End)

This is the critical flow we just fixed.

**Step 4: Prepare the Follower**
1.  Login as **User A**.
2.  Ensure you Follow **KFC Tadepalli**.
3.  Open Settings on KFC's card and ensure **"New Offers"** and **"New Products"** are **ON**.
4.  Logout (or open a different browser/incognito window).

**Step 5: Trigger a Notification (Business Side)**
1.  Login as **User B (Business Owner)**.
2.  **Create a New Offer:**
    *   Go to "My Business" -> "Offers" -> "Create New".
    *   Fill in dummy details (Title: "Test Notification Offer").
    *   **Publish** the offer.
    *   *Observation*: You should see a success toast.
3.  **Create a New Product:**
    *   Go to "Products".
    *   Add a test product (Name: "Test Notification Burger").
    *   **Save**.

**Step 6: Verify Receipt**
1.  Switch back to **User A**.
2.  Look at the **Notification Bell** in the header.
    *   **Verify:** [ ] The red badge count has increased.
3.  Click the Bell to open the notification list.
    *   **Verify:**
    *   [ ] You see a notification: **"New Offer from KFC Tadepalli"**.
    *   [ ] You see a notification: **"New Product from KFC Tadepalli"**.
4.  Click the notification.
    *   **Verify:** [ ] It redirects you to the relevant Business Profile user view.

---

## 🐛 Edge Case Testing

**Step 7: Testing Preferences Logic**
1.  Login as **User A**.
2.  Turn **OFF** "New Coupons" for KFC Tadepalli.
3.  Login as **User B** and create a **New Coupon**.
4.  Switch back to **User A**.
5.  **Verify:** [ ] You did **NOT** receive a notification for the coupon.

**Step 8: Testing Platform Constraints**
1.  (Optional) If you have an Android project set up:
    *   Select "Push Notifications" in the Following settings.
    *   Verify the app requests push permissions.
    *   Verify you receive a native system-tray notification when a business posts content.

---

## 🛑 Failure Scenarios to Watch For
If anything fails, check these first:
*   **409 Conflict:** Does the offer save successfully or error out?
*   **Console Logs:** Check for `[NotificationTrigger]` logs in the browser console.
*   **RLS Error:** If logs say "RPC Insert failed", it's a permission issue (should be fixed).
