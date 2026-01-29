# Story 4.15: Offer Lifecycle - Terminate & Archive

**Epic**: EPIC 4 - Business Features
**Priority**: High
**Effort**: 1-2 days
**Status**: ✅ **COMPLETE**
**Created**: January 29, 2026
**Depends On**: Story 4.14 (Delete & Pause)

---

## Overview
Part 2 of the Offer Lifecycle Management suite. This story covers the **termination** of active offers and the **archiving** logic (manual & auto).

---

## User Stories

### US-4.15.1: Terminate Offers (Ref: US-4.14.3)

**As a** business owner
**I want to** permanently end an offer
**So that** it cannot be mistakenly resumed

#### Acceptance Criteria
| # | Criterion | Details |
|---|-----------|---------|
| 1 | **Immediate effect** | Hidden from customers instantly on confirmation |
| 2 | **Cannot resume** | No "Resume" action available (button hidden/disabled) |
| 3 | **Must duplicate** | Only way to re-run is duplicating |
| 4 | **Can terminate when** | Status = `active` or `paused` only |
| 5 | **Terminated badge** | Red "Terminated" badge on dashboard cards |
| 6 | **Terminated tab** | Filter/tab for terminated offers in offers list |
| 7 | **Reason dropdown** | Dropdown: `Stock exhausted`, `Campaign ended early`, `Error in offer details`, `Business decision`, `Other` |
| 8 | **Free text for Other** | Text field appears when "Other" selected (max 255 chars) |
| 9 | **Confirmation** | "Terminate this offer? This cannot be undone." |
| 10 | **Customer message** | If customer had page open, on refresh: "This offer is no longer available" |
| 11 | **Audit logging** | Log `terminated` action with reason to `offer_audit_log` (via Story 4.19) |

---

### US-4.15.2: Archive Offers (Ref: US-4.14.4)

**As a** business owner
**I want** completed offers preserved as templates
**So that** I can reference or duplicate them later

#### Acceptance Criteria
| # | Criterion | Details |
|---|-----------|---------|
| 1 | **Auto-archive on expiry** | When `valid_until` passes → status = `expired` → then `archived` IMMEDIATELY |
| 2 | **Manual archive** | Available for `active` or `paused` offers |
| 3 | **Hidden from customers** | Archived offers not visible on storefront |
| 4 | **Cannot resume** | Must duplicate to re-run |
| 5 | **Archived tab** | Filter/tab for archived offers in offers list |
| 6 | **Archived badge** | Gray "Archived" badge |
| 7 | **Preserved indefinitely** | NOT auto-deleted |
| 8 | **Confirmation** | "Archive this offer? It will be hidden from customers." |
| 9 | **Searchable** | Can search archived offers by title, audit code |
| 10 | **Can duplicate** | Archived offers can be duplicated |
| 11 | **Audit logging** | Log `archived` action to `offer_audit_log` (via Story 4.19) |

---

## Technical Implementations
- **Migration**: Add `terminate_reason`.
- **Trigger**: Auto-archive expired offers.
- **Hook**: `terminateOffer` & `archiveOffer`.
- **UI**: Terminate modal with reasons dropdown.
