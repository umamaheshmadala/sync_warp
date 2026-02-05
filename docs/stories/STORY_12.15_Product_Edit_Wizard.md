# Story 12.15: Product Edit Wizard

**Epic:** [EPIC 12: Instagram-Style Product Listing](../epics/EPIC_12_Instagram_Style_Products.md)  
**Status:** 📋 To Do  
**Priority:** P0  
**Estimate:** 5 pts  

---

## User Stories

### US-12.15.1: Edit Published Product
**As a** Business Owner,  
**I want to** edit a product I've already published,  
**So that** I can update images, descriptions, or tags without losing my existing likes and comments.

### US-12.15.2: Edit Draft Product
**As a** Business Owner,  
**I want to** resume editing a saved draft,  
**So that** I can continue where I left off without starting over.

---

## Acceptance Criteria

### AC-1: Entry Points

#### AC-1.1: Desktop Hover Edit
- **GIVEN** I am the owner of a business
- **AND** I am viewing the "Products" tab on my Business Profile
- **WHEN** I hover over a product card
- **THEN** an "Edit" (pencil) icon appears in the top-right corner of the card
- **AND** clicking it opens the Product Wizard with that product's data

#### AC-1.2: Modal Three-Dot Menu
- **GIVEN** I am viewing a product I own (in the modal)
- **WHEN** I tap the "Three Dot" (⋯) menu
- **THEN** I see an "Edit" option
- **AND** clicking "Edit" opens the Product Wizard pre-filled with this product's data

#### AC-1.3: Resume Draft Card
- **GIVEN** I have drafts in my "Drafts" tab
- **WHEN** I tap a Draft card
- **THEN** the Product Wizard opens pre-filled with the draft data
- **AND** I am taken to the last step I was on (stored in draft metadata)

---

### AC-2: Wizard Pre-Filling (Data Rehydration)

#### AC-2.1: Step 1 - Media
- **GIVEN** I am editing an existing product/draft
- **WHEN** the Wizard opens at Step 1
- **THEN** all existing images are displayed in the selection area
- **AND** the order of images matches the published order
- **AND** I can add new images (up to the 5 max)
- **AND** I can delete existing images by tapping the "X" on each

#### AC-2.2: Step 2 - Edit/Arrange
- **GIVEN** I am on Step 2 with existing images
- **WHEN** I view the image list
- **THEN** existing images show their current crop (if crop metadata exists)
- **AND** I can re-crop any image
- **AND** new images can be cropped/rotated as usual

#### AC-2.3: Step 3 - Details
- **GIVEN** I am on Step 3 with existing data
- **WHEN** the step loads
- **THEN** Product Name, Description, Tags, and Notification settings are pre-filled
- **AND** the primary button text shows "Save Changes" (not "Publish")

---

### AC-3: Cancel/Discard Behavior

#### AC-3.1: Unsaved Changes Warning
- **GIVEN** I have made changes to any field (images, name, description, tags)
- **WHEN** I tap "Cancel", "Back" (to exit wizard), or the close button
- **THEN** a confirmation dialog appears: "Discard changes? Your edits will not be saved."
- **AND** I see two options: "Discard" and "Keep Editing"

#### AC-3.2: No Changes Made
- **GIVEN** I opened the Edit wizard but made no changes
- **WHEN** I tap "Cancel" or close
- **THEN** the wizard closes immediately without a prompt

---

### AC-4: Logic & Rules

#### AC-4.1: New Arrival Status Preservation
- **GIVEN** a product was created < 14 days ago (has "New Arrival" tag)
- **WHEN** I edit and save changes
- **THEN** the `created_at` timestamp is NOT updated
- **AND** the product retains the "New Arrival" tag based on original creation date

#### AC-4.2: Social Counters Preservation
- **GIVEN** a product has likes, comments, or shares
- **WHEN** I edit and save changes
- **THEN** all `like_count`, `comment_count`, and `share_count` values are preserved
- **AND** existing comments remain visible

#### AC-4.3: Edited Indicator
- **GIVEN** I change ANY field (name, description, images, or tags)
- **WHEN** the product is saved
- **THEN** `updated_at` is set to current timestamp
- **AND** the modal displays "(edited)" next to the product name subtitle

---

## Technical Notes

| Component | Change |
|-----------|--------|
| `useProductWizard` store | Add `editMode: boolean` and `initialProductId: string \| null` to state. Add `loadProduct(id)` action to hydrate state. |
| `ProductCreationWizard.tsx` | Accept optional `productId` prop. If provided, call `loadProduct` on mount. |
| `useProductDraft` | Distinguish between "draft save" (status=draft) and "published edit" (status=published). Use `upsert` pattern. |
| Product types | Add `is_edited: boolean` or compute from `created_at !== updated_at`. |

---

## Out of Scope
- Version history / rollback of edits
- Draft merging (if same product is opened in two tabs)
