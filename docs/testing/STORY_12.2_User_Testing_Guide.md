# User Testing Guide: Story 12.2 - Product Modal Redesign (Web)

This guide outlines the steps to verify the new **Desktop Web Product Modal**, which features an Instagram-style split layout (Image Carousel vs. Details Panel).

## Prerequisites
1.  **Screen Size**: Ensure you are testing on a Desktop or Laptop screen (width > 768px).
2.  **User**: Logged in as a Business Owner (to see "Edit" options in grid, though Modal is view-only for visitors mainly).
3.  **Page**: Navigate to `Business Dashboard` -> `Products` tab.

---

## 🏗️ Scenarios

### 1. Modal Opening & Layout
- [ ] **Action**: Click on any product card in the grid.
- [ ] **Expected Result**:
    - The new **Desktop Modal** opens (centered on screen with a dark backdrop).
    - **Layout**: It uses a split layout:
        - **Left (65%)**: Large image area (black background).
        - **Right (35%)**: White panel with details and comments.
    - **Backdrop**: Clicking the dark backdrop closes the modal.

### 2. Image Carousel (Left Panel)
- [ ] **Action**: Hover over the product image.
- [ ] **Expected Result**:
    - **Arrows**: Left/Right navigation arrows appear on hover (if product has multiple images).
    - **Dots**: Indicator dots appear at the bottom.
- [ ] **Action**: Click the Right Arrow (`>`).
- [ ] **Expected Result**: Slides to the next image immediately.
- [ ] **Action**: Press `ArrowRight` key on your keyboard.
- [ ] **Expected Result**: Moves to the next image.
- [ ] **Action**: Press `ArrowLeft` key on your keyboard.
- [ ] **Expected Result**: Moves to the previous image.

### 3. Details Panel (Right Panel)
- [ ] **Header**: Verify Business Avatar, Name, and "Follow" button are visible at the top.
- [ ] **Product Info**:
    - Product Name, Price, and Status (e.g., "Sold Out" if applicable) are clear.
    - **Description**: If long, it should be truncated with a "more" link. Click "more" to expand it.
    - **Tags**: Hashtags (e.g., `#featured`) appear below the description.
- [ ] **Comments Section**:
    - Verify you see a list of **Mock Comments** (e.g., "This looks amazing!", "Is this available?").
    - The section should be scrollable independently of the page.
- [ ] **Actions Footer**:
    - **Like (❤️)**: Click it -> Toast confirms "Like added (Demo)".
    - **Share (🔗)**: Click it -> Toast confirms "Shared (Demo)".
    - **Save (⭐)**: Click it -> Toast confirms "Saved (Demo)".
    - **Comment Input**: Type text and press "Post" -> Toast confirms "Comment posted".

### 4. Responsiveness & Handoff
- [ ] **Action**: While the modal is open, **Resize your browser window** to be narrower (mobile size, < 768px).
- [ ] **Expected Result**:
    - The **Desktop Modal** should disappear.
    - The **Mobile Modal** (full screen, single column) should appear (or you might need to close/re-open depending on strict hot-reload behavior, but ideally it swaps automatically).
    - *Note*: We implemented a `useMediaQuery` hook to handle this swap seamlessly.
- [ ] **Action**: Resize back to Desktop width.
- [ ] **Expected Result**: The **Desktop Modal** reappears.

### 5. Closing
- [ ] **Action**: Press `ESC` key.
- [ ] **Expected Result**: Modal closes.
- [ ] **Action**: Click the `X` button in the top-right corner.
- [ ] **Expected Result**: Modal closes.

---

## 🐞 Known Limitations (For this Story)
- **Mock Data**: Comments and Likes are currently "Demo" interactions (Backend coming in Story 12.5/12.6).
- **Edit/Delete**: Edit/Delete buttons are currently only in the Grid view or Mobile Modal options menu (Desktop design focuses on "Consumer View" experience first, per Instagram style).
