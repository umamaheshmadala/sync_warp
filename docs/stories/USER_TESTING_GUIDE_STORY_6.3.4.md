# User Testing Guide: Admin Business Management (Story 6.3.4)

**Prerequisites:**
*   Logged in as an Admin user (e.g., `testuser1@gmail.com`).
*   Navigate to the Admin Dashboard > **Business Management** (`/admin/businesses`).

---

## 1. Soft Delete a Business
**Goal:** Verify that an admin can soft-delete a business and that it moves to the "Deleted" tab.

1.  **Locate Business:** Go to the **Pending** or **Approved** tab and find a target business.
2.  **Initiate Delete:** Click the `Actions (...)` menu and select **Delete**.
3.  **Verify Dialog:**
    *   Ensure the **Soft Delete Business** dialog appears.
    *   Verify it asks for a "Reason for deletion".
4.  **Confirm Delete:**
    *   Enter a reason (e.g., "Policy violation review").
    *   Click **Delete Business**.
5.  **Verify Outcome:**
    *   Success toast should appear: "Business deleted successfully".
    *   The business should **disappear** from the current list.
    *   Navigate to the **Deleted** tab.
    *   The business should **appear** in the Deleted list.
    *   *Database Check (Optional):* Status is `deleted`, `deleted_at` is set.

## 2. Restore a Deleted Business
**Goal:** Verify that a soft-deleted business can be restored to active/pending status.

1.  **Locate Deleted Business:** Go to the **Deleted** tab.
2.  **Initiate Restore:** Click the `Actions (...)` menu on a business and select **Restore**.
3.  **Verify Dialog:**
    *   Ensure the **Restore Business** confirmation dialog appears.
4.  **Confirm Restore:** Click **Restore Business**.
5.  **Verify Outcome:**
    *   Success toast should appear: "Business restored successfully".
    *   The business should **disappear** from the Deleted tab.
    *   Navigate to the **Pending** (or Approved) tab.
    *   The business should **reappear** in the list.
    *   *Database Check (Optional):* Status is `active` (or `pending`), `deleted_at` is `NULL`.

## 3. Hard Delete a Business (Permanent)
**Goal:** Verify that a business can be permanently removed from the system.

1.  **Locate Deleted Business:** Go to the **Deleted** tab (soft-delete a business first if empty).
2.  **Initiate Hard Delete:** Click the `Actions (...)` menu and select **Hard Delete**.
3.  **Verify Dialog:**
    *   Ensure the **Permanently Delete Business** dialog appears.
    *   It should verify the gravity of the action ("Cannot be undone").
    *   It should require typing the **exact business name** to confirm.
4.  **Confirm Hard Delete:**
    *   Type the business name exactly as shown.
    *   Enter a reason (e.g., "Spam account final cleanup").
    *   Click **Permanently Delete**.
5.  **Verify Outcome:**
    *   Success toast should appear.
    *   The business should **disappear permanently** from the Deleted tab.
    *   It should **not** exist in any other tab.
    *   *Database Check (Optional):* The record is completely removed from the `businesses` table.

## 4. Edit Business Details
**Goal:** Verify that an admin can update business information.

1.  **Open Details:** Click on any business to open the **Business Detail Modal**.
2.  **Enter Edit Mode:** Click the **Edit** button in the top right.
3.  **Make Changes:** 
    *   Change the **Business Name** or **Phone Number**.
    *   Update **Operating Hours** (if applicable).
4.  **Save:** Click **Save Changes**.
5.  **Verify Outcome:**
    *   Success toast should appear.
    *   The modal should exit edit mode.
    *   The new details should be visible immediately in the modal.
    *   *History Check:* Go to the **Audit History** tab in the modal—a new "Edit" action should be logged.
