# User Testing Guide - Story 12.7: Share & Tracking

## 1. Feature Overview
**Objective**: Allow users to share products with friends via social platforms and track these shares to highlight popular products.

**Key Components**:
- **Mobile Share**: Uses the device's native share sheet (iOS/Android).
- **Web Share**: Opens a custom modal with options for WhatsApp, Facebook, Twitter, Email, and Copy Link.
- **Tracking**: Every share increments the product's share count and is logged in `share_events`.

## 2. Test Scenarios

### Scenario A: Mobile Native Share
1.  **Open Product**: Use the mobile emulator or resize browser to mobile view. Open any product.
2.  **Click Share**: Tap the "Share" button (paper plane icon).
3.  **Expected Behavior**:
    -   *If supported*: The OS native share sheet opens.
    -   *Fallback*: If not supported, it might copy the link or show a fallback.
4.  **Verify**: Check that the share text includes "Check out [Product Name] from [Business Name]" and a valid URL.

### Scenario B: Web Share Modal
1.  **Open Product**: Use desktop view. Open any product modal.
2.  **Click Share**: Click the Share icon (next to Message and Like).
3.  **Expected Behavior**: A modal titled "Share Product" appears.
4.  **Test Options**:
    -   **Copy Link**: Click it. Verify toast "Link copied to clipboard". Paste the link to specific it looks like `.../products?productId=...` or similar.
    -   **WhatsApp**: Click it. Verify it opens `wa.me` with pre-filled text.

### Scenario C: Share Count Increment
1.  **Observation**: Note the current share count (if visible) or check the database `products` table for a specific product.
2.  **Action**: Perform a share action (e.g., Copy Link).
3.  **Verify**:
    -   The `share_count` column in `products` table should increment by 1.
    -   A new row should appear in `share_events` table.

### Scenario D: Deep Linking
1.  **Generate Link**: Use the "Copy Link" feature.
2.  **Navigate**: Open a new browser tab/window and paste the link.
3.  **Expected Behavior**: The app should load the business profile and *automatically* open the correct product modal.

## 3. Troubleshooting
-   **Link doesn't open modal**: Ensure the URL contains `?productId=UUID`.
-   **Share count not updating**: It might take a refresh to see the UI update, but the DB update happens via trigger.
