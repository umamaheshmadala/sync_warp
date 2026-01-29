# Story 4.17: Audit Codes & Display

**Epic**: EPIC 4 - Business Features
**Priority**: High
**Effort**: 1-2 days
**Status**: ✅ **COMPLETE**
**Created**: January 29, 2026

---

## Overview
Part 1 of the Offer Tracking suite. Implements unique audit codes for every offer and their display on offer cards.

---

## User Stories

### US-4.17.1: Unique Audit Code (Ref: US-4.15.1)

**As a** business owner
**I want** each offer to have a unique tracking code
**So that** I can identify and track offers internally

#### Acceptance Criteria
| # | Criterion | Details |
|---|-----------|---------|
| 1 | **Auto-generated** | Created automatically when offer is saved as draft |
| 2 | **Format** | `AUDIT-{PREFIX}-{YYYYMM}-{SEQ}` |
| 3 | **PREFIX** | First 3 chars of business slug (e.g., "TB1") |
| 4 | **Unique constraint** | Database enforces uniqueness |
| 5 | **Not editable** | Read-only in all forms |
| 6 | **Sequence reset** | Resets to 0001 each month per business |
| 7 | **Shown in details** | Full code visible in offer edit/detail view |
| 8 | **Example** | `AUDIT-TB1-202601-0042` |
| 9 | **Custom reference** | Separate optional field for business notes |

### US-4.17.2: Display Short Code (Ref: US-4.15.2)

**As a** user
**I want to** see a short identifier on each offer card
**So that** I can distinguish similar offers

#### Acceptance Criteria
| # | Criterion | Details |
|---|-----------|---------|
| 1 | **Extract last 6** | From `AUDIT-TB1-202601-0042` → `01-0042` |
| 2 | **Location** | Right section of TicketOfferCard, below banner |
| 3 | **Business view** | Visible on dashboard offer cards |
| 4 | **Customer view** | Visible on storefront offer cards |
| 5 | **Tooltip** | Desktop hover shows "Offer ID: 01-0042" |
| 6 | **Styling** | Monospace font, 10px, text-gray-500 |
| 7 | **Not a redemption code** | No "use this code" messaging |

---

## Technical Implementations
- **Migration**: Add `audit_code` column.
- **SQL Function**: `generate_audit_code`.
- **UI**: Update `TicketOfferCard` to display code.
