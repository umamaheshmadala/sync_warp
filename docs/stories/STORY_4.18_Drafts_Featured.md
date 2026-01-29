# Story 4.18: Drafts & Featured Offers

**Epic**: EPIC 4 - Business Features
**Priority**: Medium
**Effort**: 1-2 days
**Status**: ✅ **COMPLETE**
**Created**: January 29, 2026

---

## Overview
Part 2 of the Offer Tracking suite. Enhances draft management (auto-save, expiry) and implements the "Featured Offers" logic.

---

## User Stories

### US-4.18.1: Draft Management (Ref: US-4.15.3)

**As a** business owner
**I want to** save offers as drafts with auto-save
**So that** I don't lose work

#### Acceptance Criteria
| # | Criterion | Details |
|---|-----------|---------|
| 1 | **Auto-save** | Save automatically every 30s or on blur |
| 2 | **Last saved indicator** | Display "Last saved: X minutes ago" |
| 3 | **Explicit Save** | "Save as Draft" button visible at ALL form steps |
| 4 | **Draft badge** | Yellow/amber "Draft" badge on list |
| 5 | **Auto-delete: 30 days** | Drafts > 30 days inactivity hard-deleted |
| 6 | **Warning banner** | Show valid warnings at 25, 28, 29 days (Detailed text in 4.15.A) |
| 7 | **Draft badge** | Yellow/amber "Draft" badge on offer cards in list |
| 8 | **Filter by drafts** | Status filter dropdown includes "Draft" option |
| 9 | **Warning on card** | Show small warning icon on draft card when < 5 days until deletion |
| 10 | **Audit logging** | Log `draft_created`, `draft_updated` actions (via Story 4.19) |

### US-4.18.2: Feature Offers (Ref: US-4.15.4)

**As a** business owner
**I want to** highlight top offers
**So that** customers see my best deals first

#### Acceptance Criteria
| # | Criterion | Details |
|---|-----------|---------|
| 1 | **Maximum 3** | Limit 3 featured offers per business |
| 2 | **Toggle control** | Simple switch on offer card/edit |
| 3 | **Priority** | Drag-drop or numeric priority (1-3) |
| 4 | **Overview display** | Featured offers shown at top of Overview |
| 5 | **Auto-unfeature** | Pause/Terminate/Archive removes status |
| 6 | **Error on 4th** | "Maximum 3 featured offers. Unfeature one first." |
| 7 | **Only active offers** | Can only feature offers with status = `active` |
| 8 | **Auto-unfeature: Pause** | Unfeatured when paused |
| 9 | **Auto-unfeature: Terminate** | Unfeatured when terminated |
| 10 | **Auto-unfeature: Archive** | Unfeatured when archived/expired |

---

## Technical Implementations
- **Migration**: `is_featured`, `featured_priority` columns.
- **Scheduled Job**: Auto-delete stale drafts.
- **UI**: Auto-save form logic, Featured toggle.
