# Story 12.16: Product Archive & Delete Flows

**Epic:** [EPIC 12: Instagram-Style Product Listing](../epics/EPIC_12_Instagram_Style_Products.md)  
**Status:** ✅ Done  
**Priority:** P0  
**Estimate:** 5 pts  

---

## User Stories

### US-12.16.1: Archive Product
**As a** Business Owner,  
**I want to** archive a product temporarily,  
**So that** I can hide it from public view without losing its data, likes, or comments.

### US-12.16.2: Unarchive Product
**As a** Business Owner,  
**I want to** restore an archived product,  
**So that** it becomes visible to customers again without re-creating it.

### US-12.16.3: Delete Product Permanently
**As a** Business Owner,  
**I want to** permanently delete a product,  
**So that** it is completely removed from my inventory and storage.

### US-12.16.4: View Archived Products
**As a** Business Owner,  
**I want to** see a list of my archived products,  
**So that** I can manage them (unarchive or delete).

---

## Acceptance Criteria

### AC-1: Archive Flow

#### AC-1.1: Archive from Modal
- **GIVEN** I am viewing a product I own (in the modal)
- **WHEN** I tap the "Three Dot" (⋯) menu
- **THEN** I see an "Archive" option
- **AND** tapping it immediately archives the product (no confirmation needed)
- **AND** a toast confirms: "Product archived"

#### AC-1.2: Archive from Grid Quick Action
- **GIVEN** I am on Desktop viewing "Products" tab
- **WHEN** I hover over a product card I own
- **THEN** a quick-action menu appears (Edit, Archive, Delete)
- **AND** tapping "Archive" archives the product immediately

#### AC-1.3: Mobile Long-Press Archive
- **GIVEN** I am on Mobile viewing "Products" tab
- **WHEN** I long-press a product card I own
- **THEN** a bottom sheet appears with options: Edit, Archive, Delete
- **AND** tapping "Archive" archives the product immediately

#### AC-1.4: Archive Behavior
- **GIVEN** a product is archived
- **THEN** `status` is set to `'archived'`
- **AND** product is hidden from: Public grid, Search results, "New Arrivals", Feeds
- **AND** product is visible in: Owner's "Archived" tab only

---

### AC-2: Unarchive Flow

#### AC-2.1: Instant Unarchive
- **GIVEN** I am viewing a product in my "Archived" tab
- **WHEN** I tap the "Unarchive" button (or menu option)
- **THEN** the product status changes from `'archived'` to `'published'` immediately
- **AND** a toast confirms: "Product restored"
- **AND** the product reappears in the public "Products" grid
- **AND** No wizard is required (instant action)

---

### AC-3: Delete Flow

#### AC-3.1: Delete with Social Interactions
- **GIVEN** a product has `(likes + comments) > 0`
- **WHEN** I tap "Delete" from any entry point
- **THEN** a destructive confirmation modal appears
- **AND** it says: "This product has [X] likes and [Y] comments. This action cannot be undone."
- **AND** I must type "DELETE" in an input field to confirm
- **AND** the "Delete" button is disabled until I type it correctly

#### AC-3.2: Delete with No Interactions
- **GIVEN** a product has `likes = 0 AND comments = 0`
- **WHEN** I tap "Delete"
- **THEN** a simple confirmation appears: "Are you sure you want to delete this product?"
- **AND** I see "Cancel" and "Delete" buttons

#### AC-3.3: Delete Cascade Behavior
- **GIVEN** I confirm deletion
- **WHEN** the delete executes
- **THEN** the `products` row is hard-deleted
- **AND** all related `product_comments` rows are cascade-deleted
- **AND** all related `product_likes` rows are cascade-deleted
- **AND** all related `product_views` rows are cascade-deleted (or retained as orphan stats—see Technical Notes)
- **AND** all images in `products/{id}/` storage bucket are deleted

---

### AC-4: Archived Tab UI

#### AC-4.1: Archived Tab Visibility
- **GIVEN** I am the business owner
- **WHEN** I view my Business Profile's Products section
- **THEN** I see tabs: "Products" | "Drafts" | "Archived"
- **AND** "Archived" tab shows a count badge if > 0

#### AC-4.2: Archived Card Appearance
- **GIVEN** I am viewing the "Archived" tab
- **WHEN** I see a product card
- **THEN** the card has a semi-transparent overlay
- **AND** an "Archived" badge is displayed

#### AC-4.3: Archived Card Actions
- **GIVEN** I tap a card in "Archived" tab
- **WHEN** the modal opens
- **THEN** I see options: "Unarchive" (primary) and "Delete" (destructive)

---

### AC-5: Dead Link Handling

#### AC-5.1: Shared Link to Archived Product
- **GIVEN** a product is archived
- **AND** a user visits a direct link `/products/{id}`
- **WHEN** the page loads
- **THEN** they see a card: "This product is currently unavailable"
- **AND** a link/button: "View more from [Business Name]" → navigates to Business Profile

#### AC-5.2: Shared Link to Deleted Product
- **GIVEN** a product was hard-deleted
- **AND** a user visits `/products/{id}`
- **WHEN** the page loads
- **THEN** they see a generic 404 page or "Product not found" card

---

### AC-6: Favorites Handling

#### AC-6.1: Favorited Product Becomes Unavailable
- **GIVEN** I favorited a product
- **AND** the owner archives or deletes it
- **WHEN** I view my Favorites list
- **THEN** the product still appears in my list
- **AND** the image is grayed out / dimmed
- **AND** a label shows "Currently Unavailable"

#### AC-6.2: Tapping Unavailable Favorite
- **GIVEN** I tap an unavailable favorite
- **WHEN** the action triggers
- **THEN** a toast appears: "This product is no longer available"
- **AND** no modal opens

---

## Technical Notes

| Component | Change |
|-----------|--------|
| `products` table | Ensure `status` can be `'draft' \| 'published' \| 'archived'`. |
| Cascade FK | Ensure `product_comments`, `product_likes` have `ON DELETE CASCADE`. |
| `productService.ts` | Add `archiveProduct(id)`, `unarchiveProduct(id)`, `deleteProduct(id)` methods. |
| `useProducts` hook | Filter by `status != 'archived'` for public queries. |
| Storage cleanup | Use Supabase Storage API to delete `products/{id}/*` on hard delete. |
| Analytics decision | **Question:** Retain `product_views` for historical stats, or cascade delete? Recommend: Cascade delete for simplicity. |

---

## Out of Scope
- Bulk archive/delete
- Scheduled auto-delete after X days in archive
