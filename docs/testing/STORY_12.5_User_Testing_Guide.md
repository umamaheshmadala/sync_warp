# Story 12.5: Likes System - User Testing Guide 🧪

This guide details the steps to manually verify the functionality of the new Likes System on both Mobile and Web platforms.

## 🎯 Objectives
- Verify "Like" and "Unlike" functionality.
- Verify real-time (optimistic) UI updates.
- Verify persistence of "Liked" state after refresh.
- Verify "Liked By" count and friend names display.
- Verify interaction on both Mobile and Web modals.

## 🛠️ Pre-Requisites
1.  **User Logged In:** Ensure you are logged in to the app (e.g., as `testuser1@example.com`).
2.  **Migrations Applied:** Ensure `supabase/migrations/20260204_product_likes.sql` and `supabase/migrations/20260203_fix_product_table_references.sql` have been run.

---

## 📱 Test Case 1: Mobile Product Modal (Like/Unlike)

1.  **Open Mobile View:**
    - Navigate to a business profile on a mobile-sized screen (or DevTools mobile mode).
    - Grid view should be visible.
2.  **Open Product:**
    - Tap on any product image to open the **Mobile Product Modal**.
3.  **Locate Like Button:**
    - Look for the **Heart Icon** in the action bar below the image carousel.
    - *Initial State:* Should be an outline (transparent fill) if not liked.
4.  **Action: Like:**
    - Tap the Heart Icon.
    - **Expected Result:**
        - Icon turns **RED** instantly (❤️).
        - A "burst" animation occurs.
        - The count number (if visible) increments by 1.
5.  **Action: Unlike:**
    - Tap the Heart Icon again.
    - **Expected Result:**
        - Icon turns back to **outline** instantly.
        - The count number decrements by 1.

---

## 💻 Test Case 2: Web Product Modal (Like/Unlike)

1.  **Open Web View:**
    - Navigate to a business profile on a desktop-sized screen.
2.  **Open Product:**
    - Click on any product card to open the **Web Product Modal** (Split view).
3.  **Locate Like Button:**
    - Look for the Heart Icon in the **left side of the action bar** (bottom of the right details panel).
4.  **Action: Like:**
    - Click the Heart Icon.
    - **Expected Result:**
        - Icon turns **RED** nicely.
        - "Like added" toast notification appears.
5.  **Verify Count/Text:**
    - Look at the text above the timestamp (e.g., "1 like" or "Be the first to like this").
    - It should update immediately reflecting the change.

---

## 🔄 Test Case 3: Persistence & Data Consistency

1.  **Like a Product:**
    - Like a product (on Mobile or Web).
2.  **Refresh Page:**
    - Reload the browser.
3.  **Re-open Product:**
    - Open the *same* product.
4.  **Verify State:**
    - The Heart icon should **still be RED**.
    - The count should include your like.

---

## 🛑 Edge Cases

1.  **Unauthenticated User:**
    - Log out.
    - Try to like a product.
    - **Expected:** Should show an error toast "Please login to like products" or prompt login (depending on current auth rules). UI should **not** toggle to red.
2.  **Network Error (Simulated):**
    - (Optional) if you can simulate offline mode.
    - Like a product.
    - Optimistic UI will turn red.
    - If request fails, it should revert back to outline and show an error toast "Failed to update like".

---

## 👥 Test Case 4: Social Proof ("Liked by...")

*Note: This requires having "Friends" in the database who also liked the product.*

1.  **Setup:**
    - Have another user (Friend) like the same product.
2.  **View as Main User:**
    - Open the Web Product Modal.
3.  **Verify Text:**
    - The text should read something like: **"Liked by [Friend Name] and 1 other"**.
    - If no friends, it simply says "**2 likes**".

---

## ✅ Success Criteria Checklist

- [ ] Mobile Like Button works (Animates, Updates Count).
- [ ] Web Like Button works (Animates, Updates Text).
- [ ] Like State persists after page reload.
- [ ] Unlike works correctly (decrements count).
- [ ] "Liked By" text displays correctly (if applicable).
