# Story 4.16: Offer Lifecycle - Duplicate

**Epic**: EPIC 4 - Business Features
**Priority**: High
**Effort**: 0.5 days
**Status**: ✅ **COMPLETE**
**Created**: January 29, 2026
**Depends On**: Story 4.15 (Terminate & Archive)

---

## Overview
Part 3 of the Offer Lifecycle Management suite. Focuses solely on the **Duplication** workflow.

---

## User Stories

### US-4.16.1: Duplicate Offers (Ref: US-4.14.5)

**As a** business owner
**I want to** duplicate successful offers
**So that** I can quickly create similar campaigns

#### Acceptance Criteria
| # | Criterion | Details |
|---|-----------|---------|
| 1 | **Any status** | Can duplicate: Draft, Active, Paused, Expired, Terminated, Archived |
| 2 | **Copied fields** | `title`, `description`, `discount_value`, `discount_type`, `terms_conditions`, `offer_type_id`, `category_id`, `target_audience`, `icon_image_url` |
| 3 | **Reset: Dates** | `valid_from = NULL`, `valid_until = NULL` |
| 4 | **Reset: Analytics** | `view_count = 0`, `share_count = 0`, `click_count = 0` |
| 5 | **Reset: Status** | `status = 'draft'` |
| 6 | **New audit code** | Fresh `audit_code` auto-generated (if feature exists) |
| 7 | **Title suffix** | Append " (Copy)" to title |
| 8 | **Opens edit mode** | Navigate to edit form with new offer pre-loaded |
| 9 | **UI feedback** | Toast: "Offer duplicated! You can now edit the copy." |
| 10 | **New offer code** | Fresh `offer_code` if applicable |
| 11 | **Audit logging** | Log `duplicated` action on ORIGINAL offer with new offer ID in metadata (via Story 4.19) |

---

## Technical Implementations
- **Hook**: `duplicateOffer(id)`.
- **UI**: Duplicate action in menu.
