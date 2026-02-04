# Story 12.8: Favorites Integration - User Testing Guide 🔖

This guide helps you verify the "Save/Favorite" functionality for products across Mobile and Web views.

## 📋 Pre-requisites
1.  **Log in** to your account (User or Business).
2.  Ensure you have at least one product visible in the feed or explorer.

---

## 🧪 Test Scenarios

### 1. Mobile Experience 📱
*   **Step 1:** Open the app in Mobile view (or narrow browser window).
*   **Step 2:** Click on any product to open the **Full Screen Modal**.
*   **Step 3:** Locate the **"Save"** (Star/Heart) icon in the right-side action bar.
*   **Step 4:** Tap the icon.
    *   **Expected:** Icon instantly fills/turns yellow.
    *   **Expected:** A "Saved to Favorites" toast message appears.
*   **Step 5:** Tap it again.
    *   **Expected:** Icon reverts to outline.
    *   **Expected:** A "Removed from Favorites" toast appears.

### 2. Web Experience 💻
*   **Step 1:** Open the app in Desktop view.
*   **Step 2:** Click on a product to open the **Detail Modal**.
*   **Step 3:** Look at the **Bottom Action Bar** (sticky at the bottom).
*   **Step 4:** Click the **Bookmark/Heart** icon.
    *   **Expected:** Icon fills instantly.
    *   **Expected:** Toast notification confirms action.

### 3. Persistence & Sync 🔄
*   **Step 1:** "Save" a product (e.g., "Neon Sneakers").
*   **Step 2:** Refresh the page (F5).
*   **Step 3:** Open the same product again.
    *   **Expected:** The icon is **already filled** (Saved state persisted).

### 4. Favorites Page Verification 📑
*   **Step 1:** Go to your **Profile**.
*   **Step 2:** Click on **"Favorites"** (or "Saved").
*   **Step 3:** Check the "Products" tab (if applicable) or the main list.
    *   **Expected:** The "Neon Sneakers" should appear in this list.
*   **Step 4:** Click the product from this list.
    *   **Expected:** It opens the product detail view.

---

## 🐞 Troubleshooting
*   **Icon doesn't change?** Check console for "401 Unauthorized" (ensure you are logged in).
*   **Toast says "Demo"?** If you see "(Demo)" in the toast, let me know (it means I missed replacing a mock handler).
