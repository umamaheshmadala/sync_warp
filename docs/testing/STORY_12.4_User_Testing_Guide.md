# User Testing Guide - Story 12.4: Instagram-Style Product Creation

## Goal
Verify that business owners can create products using a polished, instagram-style 3-step wizard on both mobile and web, and manage incomplete drafts.

## Pre-requisites
1. Log in as a Business Owner.
2. Select a Business.
3. Navigate to "Products" tab in Business Dashboard.

## Test Scenarios

### 1. Wizard Launch & Media Selection (Step 1)
- [ ] Tap/Click "+ Add Product".
- [ ] Verify the full-screen wizard (Mobile) or Modal (Web) opens.
- [ ] Verify "Select from Device" button launches native file picker (or web input).
- [ ] Select 1-5 images.
- [ ] Verify auto-advance to "Edit & Arrange" step upon selection.

### 2. Edit & Arrange (Step 2)
- [ ] Verify selected images are displayed in the carousel/list.
- [ ] Tap an image to view it in the main preview area.
- [ ] Tap "Crop" icon and verify basic crop modal appears (4:5 ratio).
- [ ] Tap "Add" (+) button to add more images (if less than 5).
- [ ] Drag and drop thumbnails to reorder them using the bottom strip.
- [ ] Tap "Next" to proceed to Details step.

### 3. Product Details (Step 3)
- [ ] Verify Name, Description inputs are available.
- [ ] Tap Tags to select up to 3 status tags.
- [ ] Toggle "Notify Followers".
- [ ] Verify "Save as Draft" button is visible.
- [ ] Verify "Share" (Publish) button is active only when required fields (Name, Images) are valid.

### 4. Details Publishing
- [ ] Fill in required fields.
- [ ] Tap "Share".
- [ ] Verify success message and wizard closure.
- [ ] Verify the new product appears in the "Products" grid immediately.

### 5. Drafts Management
- [ ] Start a new product, add images, then Close the wizard (X).
- [ ] (Optional) Verify confirmation prompt "Save layout as draft?".
- [ ] Choose "Save as Draft" (or use the button in Step 3).
- [ ] Verify wizard closes.
- [ ] Switch to "Drafts" tab in Product Manager.
- [ ] Verify the new draft card is visible with image and name.
- [ ] Tap the draft to resume editing.
- [ ] Verify all previous data (images, name) is restored.
- [ ] Delete a draft and verify it disappears.

## Known Limitations
- "Edit" existing product still uses the legacy form (intended for this story).
- Image cropping saves a new URL but original might persist in storage until cleanup.
