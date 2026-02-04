# Story 12.9 User Testing Guide: Tags System

## 1. Automated "New Arrival" Tag
*   **Goal**: Verify products created recently automatically get the "New Arrival" tag.
*   **Steps**:
    1.  Create a **new product**.
    2.  View the product in the **Business Profile** grid.
    3.  Open the **Product Modal** (Click the product).
    4.  **Confirm**: You see a **💜 New Arrival** tag (Purple/Violet).
    5.  **Note**: This tag is computed automatically based on `created_at` (last 7 days). You cannot manually remove it via the tag selector.

## 2. Manual Tag Management
*   **Goal**: Verify business owners can add/remove tags like "Sale", "Best Seller", etc.
*   **Steps**:
    1.  **Edit** an existing product (or create new).
    2.  Scroll to the **Tags** section in the form.
    3.  Select **"Sale"** (Orange), **"Best Seller"** (Green), or **"Featured"** (Blue).
    4.  **Save** the product.
    5.  **Confirm**: The selected tags appear on the **Product Modal** under the price/title.
    6.  **Confirm**: The "Featured" tag also enables the star icon logic if mapped (legacy compatibility).

## 3. Visual Verification
*   **Goal**: Ensure tags look good and don't break layout.
*   **Steps**:
    1.  **Mobile View**: Check the transparent header area. Tags should appear centered below the title.
    2.  **Web View**: Check the right-side panel. Tags should appear below the price.
    3.  **Grid View (Optional)**: If implemented, check if "Sold Out" status grays out the image.

## 4. "Sold Out" Status
*   **Goal**: Verify "Sold Out" status visual.
*   **Steps**:
    1.  Edit a product.
    2.  Set **Availability** to **False** (or if status dropdown exists, select "Sold Out" - *Note: Current UI uses a toggle for Availability*).
    3.  **Confirm**: Product shows "Sold Out" badge in details panel.

## Notes
*   "Low Stock" is currently a manual tag you can select.
*   Inventory tracking (quantity) is not yet enabled in the database, so "Low Stock" is not automated.
