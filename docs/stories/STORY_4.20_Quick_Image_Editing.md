# Story 4.20: Quick Image Editing & Optimization

## Overview
- **Priority:** 🟠 HIGH (UX Improvement)
- **Status:** ✅ COMPLETE
- **Effort:** 3 days
- **Value:** Streamlines business profile management, improves performance via compression.
- **Dependencies:** Story 4.1 (Profile), Story 4.5 (Storefront)

## User Stories (Phase 1 - Completed)
- **As a business owner**, I want to change my logo/cover photo directly from the profile view without entering full edit mode.
- **As a business owner**, I want to crop my images before uploading to ensure they fit perfectly.
- **As a business owner**, I want my images to be automatically compressed (Logo < 400KB, Cover < 600KB).
- **As a business owner**, I want separate View and Edit buttons (icons only).

## User Stories (Phase 2 - Evolution)
- **As a business owner**, I want the "Edit Business Information" form to be compact and efficient, using icons instead of labels to save space.
- **As a business owner**, I want image editing removed from the general "Edit Info" form since it's handled via the profile header.
- **As a business owner**, I want to be able to **Delete** (soft delete) my logo or cover photo. Maximum of six photos that are deleted will be in the soft delete mode, and anything beyond six photos will be a hard delete. 
- **As a business owner**, I want to be able to restore previously uploaded images from a history/gallery ("choose in future").

## Acceptance Criteria

### 1. Form Optimization (Compact Design)
- [ ] **Remove Redundancy**: Remove "Logo" and "Cover Photo" upload fields from the main `BusinessProfile` edit form.
- [ ] **Compact Layout**:
    - Use a multi-column grid layout (e.g., 2 or 3 columns) for fields like Phone, Email, Location.
    - Reduce whitespace and padding.
- [ ] **Iconography**:
    - Replace text labels with clear icons where appropriate (e.g., Phone icon for number, Mail icon for email, MapPin for address).
    - ensure tooltips or placeholders exist for accessibility since labels are removed/minimized.

### 2. Delete & History (Image Lifecycle)
- [ ] **Delete Action**:
    - Add a "Delete" (Trash icon) button in the Image Editor/Viewer.
    - Action: Sets the database field (`logo_url` or `cover_image_url`) to `NULL`.
    - Does **NOT** delete the file from storage (Soft Delete).
    - UI updates immediately to show the placeholder state.
- [ ] **History / Gallery**:
    - **Architecture Change**: Stop overwriting `_logo.jpg` and `_cover.jpg`.
    - **New Naming**: Use `business_images/{businessId}/logo_{timestamp}.jpg`.
    - **Gallery Selection**:
        - In the "Edit" modal, add a "History" or "Gallery" tab/option.
        - Lists previously uploaded images for that slot (Logo vs Cover) from Supabase Storage.
        - Maximum of six photos that are deleted will be in the soft delete mode, and anything beyond six photos will be a hard delete.
        - Selecting an image from history updates the profile to point to that existing URL.

## Technical Requirements (Evo)
- **Storage Strategy**:
    - Switch from `upsert` (overwrite) to new file creation with unique names.
    - Implement `listBuckets` or `listFiles` logic to fetch image history.
- **UI Components**:
    - `InputWithIcon`: A compact input component.
    - `ImageHistoryGrid`: A component to display past uploads.

## Logical Gaps & Recommendations
1.  **Gap**: "Choose in future" requires keeping old files. Currently, we overwrite them.
    - **Recommendation**: We must change the upload logic to generate unique filenames (e.g., `logo_{timestamp}.jpg`) instead of fixed names. This will increase storage usage over time but allows for the requested "History" feature.
2.  **Gap**: "Soft Delete" vs "Restore".
    - **Recommendation**: Deleting just creates a "No Image" state on the profile. The "History" feature is essentially a "Restore" feature.

## Test Plan
- **Verification**:
    - Edit Info: Verify form is compact and has no image inputs.
    - Delete: Verify image disappears from profile but remains in storage (checked via History).
    - History: Upload 3 different logos. Verify you can switch between them using the History tab.
