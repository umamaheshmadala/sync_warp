# Story 12.17: Product Drafts System

**Epic:** [EPIC 12: Instagram-Style Product Listing](../epics/EPIC_12_Instagram_Style_Products.md)  
**Status:** 🔴 Extremely Buggy  
**Priority:** P0  
**Estimate:** 5 pts  

---

## 🚨 Known Issues (Bug Report - 2026-02-06)

1.  **Comments in Drafts**: Comments section is visible in draft mode, which makes no sense.
2.  **Writing Comments in Drafts**: Users can actually write comments on drafts. Logic failure.
3.  **Duplicate Drafts**: Two copies of drafts are being created in the drafts tab.
4.  **Incorrect Button Text**: At the end of creation (new product), it says "Save Changes" (edit mode text) instead of "Publish".
5.  **Save Blocking**: "Save as Draft" button is disabled/blocked while auto-save is running, causing bad UX. User has to wait for auto-save to finish.

---

## User Stories

### US-12.17.1: Auto-Save Draft
**As a** Business Owner,  
**I want** my work to be automatically saved as I create a product,  
**So that** I don't lose progress if I accidentally close the browser or get interrupted.

### US-12.17.2: Resume Draft
**As a** Business Owner,  
**I want to** see and resume my incomplete drafts,  
**So that** I can finish creating products at my convenience.

### US-12.17.3: Manage Drafts
**As a** Business Owner,  
**I want to** delete drafts I no longer need,  
**So that** my drafts list stays clean and relevant.

---

## Acceptance Criteria

### AC-1: Auto-Save Logic

#### AC-1.1: First Save Trigger
- **GIVEN** I am in the Product Creation Wizard
- **AND** I have selected at least one image
- **WHEN** I navigate from Step 1 to Step 2 (by tapping "Next")
- **THEN** a draft record is created in the database
- **AND** a visual indicator shows "Saving..." → "Saved"

#### AC-1.2: Debounced Save on Text Changes
- **GIVEN** I am on Step 3 (Details)
- **WHEN** I type in Name or Description fields
- **AND** I pause typing for 2 seconds
- **THEN** the draft is automatically saved
- **AND** a visual indicator shows "Saving..." → "Saved"

#### AC-1.3: Save on Step Navigation
- **GIVEN** I have an active draft
- **WHEN** I navigate between steps (Next/Back)
- **THEN** the current state is saved before navigation

#### AC-1.4: Explicit Save as Draft
- **GIVEN** I am on Step 3
- **WHEN** I tap "Save as Draft" button
- **THEN** the draft is saved
- **AND** the wizard closes
- **AND** a toast confirms: "Draft saved"

#### AC-1.5: Save Indicator UI
- **GIVEN** an auto-save is in progress
- **THEN** the Wizard header shows "Saving..."
- **WHEN** save completes successfully
- **THEN** it changes to "Saved" (with subtle checkmark)
- **AND** fades out after 2 seconds

---

### AC-2: Draft Persistence

#### AC-2.1: Multiple Drafts
- **GIVEN** I am a business owner
- **WHEN** I create new drafts
- **THEN** I can have up to 20 drafts at a time
- **AND** each draft is independent

#### AC-2.2: Draft Limit Enforcement
- **GIVEN** I already have 20 drafts
- **WHEN** I try to create a new product (open wizard)
- **THEN** a modal appears: "You've reached the maximum of 20 drafts. Please delete or publish some drafts first."
- **AND** the wizard does not open

#### AC-2.3: Image Upload for Drafts
- **GIVEN** I am on Step 1 and select images
- **WHEN** I navigate to Step 2 (first save trigger)
- **THEN** all selected images are uploaded to `products/drafts/{draft_id}/`
- **AND** URLs are stored in the draft record
- **FACT:** This ensures images persist across sessions/devices

#### AC-2.4: Drafts Do Not Expire (But Stale Cleanup)
- **GIVEN** a draft exists
- **THEN** it does NOT automatically expire
- **HOWEVER** a background job runs weekly to:
  - Identify drafts older than 90 days
  - Send a push notification: "You have drafts that haven't been updated in 90 days"
  - After 120 days with no activity: Auto-delete and clean up storage

---

### AC-3: Drafts Management UI

#### AC-3.1: Drafts Tab Entry Point
- **GIVEN** I am viewing my Business Profile's Products section
- **WHEN** I see the tabs
- **THEN** I see: "Products" | "Drafts (N)" | "Archived"
- **AND** the count badge shows number of drafts

#### AC-3.2: Draft Card Display
- **GIVEN** I am in the "Drafts" tab
- **WHEN** I view a draft card
- **THEN** I see:
  - Thumbnail (first image, or placeholder if none)
  - "Untitled Product" or the entered Name
  - "Last edited [relative time]" (e.g., "2 hours ago")

#### AC-3.3: Resume Draft
- **GIVEN** I tap a draft card
- **WHEN** the wizard opens
- **THEN** it loads all saved data (images, name, description, tags)
- **AND** it opens at the last step I was on (stored in `last_step` field)

#### AC-3.4: Delete Draft
- **GIVEN** I long-press (mobile) or hover (desktop) on a draft card
- **WHEN** I tap "Delete"
- **THEN** a confirmation appears: "Delete this draft? This cannot be undone."
- **AND** confirming deletes the draft record
- **AND** deletes all images from `products/drafts/{draft_id}/`

---

### AC-4: Publish Transition

#### AC-4.1: Publish from Draft
- **GIVEN** I am editing a draft and on Step 3
- **WHEN** I tap "Publish" (or "Share")
- **THEN** the `status` changes from `'draft'` to `'published'`
- **AND** images are moved from `products/drafts/{id}/` to `products/{id}/` (or paths are updated)
- **AND** the product appears in the public "Products" grid
- **AND** the draft is removed from the "Drafts" tab

---

## Technical Notes

| Component | Change |
|-----------|--------|
| `products` table | Add `last_step` column (`TEXT`, values: `'media' \| 'edit' \| 'details'`). |
| `useProductDraft` hook | Add debounce logic (2s). Track `isDirty` state. |
| Storage paths | Use `products/drafts/{id}/` for draft images. Move to `products/{id}/` on publish. |
| Background job | Create Edge Function or Supabase scheduled job for 90/120 day cleanup. |
| Draft count query | Add `getDraftCount(businessId)` to check limit before wizard opens. |

---

## Out of Scope
- Offline draft support (Capacitor local storage)
- Cross-device sync notifications ("Draft updated on another device")
