# Story 4.20: Quick Image Editing & Optimization

## Overview
- **Priority:** 🟠 HIGH (UX Improvement)
- **Status:** ✅ COMPLETE
- **Effort:** 3 days
- **Value:** Streamlines business profile management, improves performance via compression.
- **Dependencies:** Story 4.1 (Profile), Story 4.5 (Storefront)

## User Stories
- **As a business owner**, I want to change my logo/cover photo directly from the profile view without entering full edit mode.
- **As a business owner**, I want to crop my images before uploading to ensure they fit perfectly.
- **As a business owner**, I want my images to be automatically compressed (Logo < 400KB, Cover < 600KB) to ensure fast loading for customers.
- [NEW] **As a business owner**, I want to see separate View and Edit buttons (icons only) for both logo and cover images.
- [NEW] **As a business owner**, I want to be able to "edit" (resize/realign) the *existing* image without re-uploading it from my device.

## Acceptance Criteria
- [ ] **Dual Buttons**:
    - [ ] "View" button (Eye icon): Opens full-size image preview.
    - [ ] "Edit" button (Pencil/Crop icon): Opens cropping modal with CURRENT image loaded.
- [ ] **Re-Edit Flow**:
    - [ ] If an image exists, clicking "Edit" loads it into the cropper.
    - [ ] Allows zooming/panning to realign based on the source image availability (note: if only cropped version exists, zoom out is limited).
    - [ ] "Change Image" option available within the flow to upload a new one.
- [ ] **Cropping**:
    - [ ] Logo: Force 1:1 aspect ratio (or square crop).
    - [ ] Cover Photo: Force specific aspect ratio (e.g., 16:9 or banner dimensions).
    - [ ] UI allows zooming and panning within the crop area.
- [ ] **Compression**:
    - [ ] Logo compressed to < 400KB.
    - [ ] Cover photo compressed to < 600KB.
    - [ ] Compression happens client-side before upload to save bandwidth and storage.
- [ ] **UI/UX**:
    - [ ] Modal or overlay for the cropping interface.
    - [ ] Loading state during compression and upload.
    - [ ] Success notification upon completion.
    - [ ] New image reflects immediately without full page reload.

## Technical Requirements
- **Frontend**:
    - Use `react-easy-crop` (or similar) for the cropping interface.
    - Use `browser-image-compression` for client-side compression.
    - Create `ImageUploader` component that handles: Select -> Crop -> Compress -> Upload.
- **Storage**:
    - Existing Supabase Storage buckets (`business-logos`, `business-covers`).
    - Overwrite or replace existing file (or update DB reference).

## UI/UX Requirements
- **Overlay**: Quick edit icons should be subtle but visible on hover (desktop) or always visible (mobile).
- **Crop Modal**: Clean interface with "Cancel" and "Save" buttons.

## Test Plan
- **Manual Verification**:
    - Upload large image (>2MB) -> Verify saved size is < limit.
    - Test cropping -> Verify saved image is cropped correctly.
    - Verify owner access only (Guest/Customer cannot see edit icons).
