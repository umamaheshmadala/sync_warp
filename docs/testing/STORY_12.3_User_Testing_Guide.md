# Story 12.3 User Testing Guide: Mobile Product Modal

> [!NOTE]
> This guide verifies the new Instagram-style mobile product modal implementation.

## 1. Prerequisites
- [ ] Mobile device or Chrome DevTools (Device Mode: iPhone 12 Pro / Pixel 5).
- [ ] Logged in as a user (owner or visitor).
- [ ] A business with products exists (or use test data).

## 2. Test Scenarios

### 2.1 Opening the Modal
- [ ] Navigate to a Business Profile -> Products tab.
- [ ] Tap on any product card.
- [ ] **Expected**:
  - [ ] Modal opens with a smooth "slide up" or fade animation.
  - [ ] Background is dimmed.
  - [ ] Body scroll is locked (background doesn't move).

### 2.2 Image Carousel
- [ ] Swipe left/right on product images.
- [ ] **Expected**:
  - [ ] Images snap into place (one at a time).
  - [ ] Pagination dots at the bottom update.
  - [ ] Images display in 4:5 aspect ratio.
  - [ ] Double-tap an image (if implemented: usually triggers like).
    - *Note: Like API is Story 12.5, current behavior might be placeholder or just visual double-tap.*

### 2.3 Closing the Modal
- [ ] **Method A (Swipe)**: Drag the modal content downwards from the top.
  - [ ] **Expected**: Modal slides down and closes.
- [ ] **Method B (Back Button)**: Tap the "Back" arrow in the header.
  - [ ] **Expected**: Modal closes.

### 2.4 Header & Options
- [ ] View the header area.
- [ ] **Expected**:
  - [ ] Business Name is displayed.
  - [ ] Back arrow on left.
  - [ ] "More" (three dots) icon on right.
- [ ] Tap "More" icon.
  - [ ] **Expected**: Dropdown menu opens (Share, Report, etc.).

### 2.5 details & Actions
- [ ] Scroll down below images.
- [ ] **Expected**:
  - [ ] Action Bar: Heart (Like), Comment, Share, Star (Favorite) / Bookmark.
  - [ ] **Like**: Tap Heart -> Toggles red (local state for now).
  - [ ] **Favorite**: Tap Star -> Toggles yellow.
  - [ ] **Details**:
    - [ ] Product Name (bold).
    - [ ] Tags (e.g., "Available", "Featured").
    - [ ] Description text.
    - [ ] "Read more" link if description is long (expand/collapse).

### 2.6 Comments Preview
- [ ] View comments section at bottom.
- [ ] **Expected**:
  - [ ] "View all X comments" link (if count > 0).
  - [ ] Recent 1-2 comments displayed.
  - [ ] "Add a comment..." input field.

## 3. Edge Cases
- [ ] **No Images**: Modal should handle product with 0 images (fallback placeholder?).
- [ ] **Long Description**: Verify text truncation works.
- [ ] **Long Product Name**: Verify text wrapping in header/details.
- [ ] **Owner View**: As owner, verify "Edit/Archive" options in "More" menu (if implemented).
