# Story 4.14: Offer Lifecycle - Delete & Pause

**Epic**: EPIC 4 - Business Features
**Priority**: High
**Effort**: 1-2 days
**Status**: 📝 Specified
**Created**: January 29, 2026

---

## Overview
Part 1 of the Offer Lifecycle Management suite. This story covers the **Deletion** (Hard/Soft) and **Pause/Resume** workflows.

---

## User Stories

### US-4.14.1: Delete Offers

**As a** business owner
**I want to** delete offers I no longer need
**So that** my storefront stays clean and relevant

#### Acceptance Criteria
| # | Criterion | Details |
|---|-----------|---------|
| 1 | **Draft: Hard delete** | Status = `draft` → permanently remove from database (no recovery) |
| 2 | **Active: Soft delete** | Status = `active` → set `deleted_at = NOW()` |
| 3 | **Paused: Soft delete** | Status = `paused` → set `deleted_at = NOW()` |
| 4 | **Archived: Soft delete** | Status = `archived` → set `deleted_at = NOW()` |
| 5 | **Expired: Soft delete** | Status = `expired` → set `deleted_at = NOW()` |
| 6 | **Terminated: Soft delete** | Status = `terminated` → set `deleted_at = NOW()` |
| 7 | **Hidden from queries** | All queries filter `WHERE deleted_at IS NULL` |
| 8 | **Confirmation dialog** | "Are you sure you want to delete this offer? This action cannot be undone." |
| 9 | **Draft confirmation** | "Delete draft? This will be permanently removed." |
| 10 | **UI feedback** | Success toast: "Offer deleted successfully" |
| 11 | **Audit logging** | Log `deleted` action to `offer_audit_log` before deletion (via Story 4.19) |

---

### US-4.14.2: Pause Offers

**As a** business owner
**I want to** temporarily pause an offer
**So that** I can resume it later

#### Acceptance Criteria
| # | Criterion | Details |
|---|-----------|---------|
| 1 | **Hides completely** | Paused offers NOT visible to customers |
| 2 | **Immediate effect** | Hidden from storefront as soon as pause is confirmed |
| 3 | **Resume available** | "Resume" button restores to `active` status instantly |
| 4 | **Can resume anytime** | No time limit |
| 5 | **Can pause when** | Status = `active` only |
| 6 | **Paused badge** | Orange "Paused" badge on dashboard cards |
| 7 | **Stays in active list** | Paused offers visible in business dashboard with badge |
| 8 | **Pause reason** | Optional text field (max 255 chars) |
| 9 | **Confirmation** | "Pause this offer? It will be hidden from customers until you resume it." |
| 10 | **Can duplicate** | Paused offers can be duplicated |
| 11 | **Audit logging** | Log `paused` action with reason to `offer_audit_log` (via Story 4.19) |
| 12 | **Resume logging** | Log `resumed` action to `offer_audit_log` when offer is resumed |

---

## Technical Implementations
- **Migration**: Add `deleted_at` and `pause_reason` columns.
- **Hook**: `deleteOffer` (soft/hard logic).
- **Hook**: `pauseOffer` & `resumeOffer`.
- **UI**: Confirmation modals for Delete and Pause.
