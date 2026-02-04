# Story 12.10 User Testing Guide: Description & Read More

## 1. Description Display ("Read More")
*   **Goal**: Verify truncation and expansion logic.
*   **Steps**:
    1.  Find a product with a **long description** (>100 characters).
        *   *Tip: You might need to edit one first (see below).*
    2.  **Mobile View**: Tap the product to open the modal.
        *   Confirm description shows only the first ~3 lines.
        *   Confirm a **"Read more"** link is visible.
        *   Tap "Read more". Confirm text expands.
        *   Tap **"Show less"**. Confirm text collapses.
    3.  **Web View**: Click a product card.
        *   Check the right panel.
        *   Confirm similar truncation logic applies.

## 2. URL Linking
*   **Goal**: Verify URLs are clickable.
*   **Steps**:
    1.  **Edit** a product.
    2.  Add a URL to the description (e.g., `Check out https://google.com for more!`).
    3.  **Save**.
    4.  Open the product details.
    5.  **Confirm**: The URL is blue and clickable.
    6.  **Click it**: It should open in a **new tab**.

## 3. Product Editing (Input Limits)
*   **Goal**: Verify character limits and counter.
*   **Steps**:
    1.  Open **Edit Product** (or Add New).
    2.  Focus on the **Description** field.
    3.  Start typing.
    4.  **Confirm**: A character counter appears in the bottom right (e.g., `45/300`).
    5.  Type past 270 characters (90%).
    6.  **Confirm**: Counter turns **yellow/orange**.
    7.  Type past 300 characters.
    8.  **Confirm**: Counter turns **red**.
    9.  **Note**: The system permits typing >300 but visually warns you (or blocks if using strict mode). *Current implementation: Visual warning, native maxlength may block input.*

## 4. Short Descriptions
*   **Goal**: Verify short descriptions don't show toggle.
*   **Steps**:
    1.  Find/Create product with short description (<100 chars).
    2.  **Confirm**: Full text is shown. NO "Read more" link appears.
