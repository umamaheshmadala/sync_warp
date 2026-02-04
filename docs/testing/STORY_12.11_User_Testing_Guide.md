# User Testing Guide: Story 12.11 (Notification Toggle)

## 🎯 Goal
Verify that business owners can toggle notifications for specific products and that this setting prevents notifications for Likes and Comments.

## 🧪 Scenarios

### 1. Toggle Visibility
*   **Action**: Log in as a Business Owner. Open one of your products.
*   **Expected**: You see the "Product Notifications" toggle (likely at the bottom of the details).
*   **Action**: Open a product belonging to *another* business.
*   **Expected**: You **DO NOT** see the toggle.

### 2. Enabling/Disabling
*   **Action**: Toggle the setting OFF. Refresh the page.
*   **Expected**: The toggle remains OFF (persisted).
*   **Action**: Toggle it back ON.

### 3. Notification Suppression (Requires 2 Accounts)
*   **Setup**: Login as **Owner** (Account A). Turn Notifications **OFF** for Product X.
*   **Action**: Login as **User** (Account B). Like Product X and leave a Comment.
*   **Check**: Login as **Owner** (Account A). Check Notifications.
*   **Expected**: No notification received for that specific Like or Comment.

### 4. Notification Reception
*   **Setup**: Turn Notifications **ON** for Product Y.
*   **Action**: Login as **User** (Account B). Like Product Y.
*   **Check**: Login as **Owner** (Account A). Check Notifications.
*   **Expected**: Notification received ✅.

## 🐛 Troubleshooting
*   **Toggle not appearing?** Ensure you are logged in as the specific business owner of that product.
*   **Notifications still coming?** Check global notification settings (Story 12.11 only adds a product-level filter).
