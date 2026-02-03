# User Testing Guide: Story 6.3.5 - Admin Global Audit Log

## 🎯 Objective
Verify the functionality of the new Global Audit Log system, which tracks all administrative actions (approvals, rejections, deletions, edits) across the platform.

## 📋 Prerequisites
- You must be logged in as an **Admin** user.
- You should have performed some actions (editing, approving, or rejecting businesses) recently to populate the log.

## 🧪 Test Scenarios

### 1. Navigation & Access
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1.1 | Login as Admin and go to `/admin` Dashboard. | Dashboard loads. |
| 1.2 | Locate the "Security & Compliance" section. | A new card "Global Audit Log" is visible. |
| 1.3 | Click "Global Audit Log". | Redirects to `/admin/audit-log`. |
| 1.4 | Verify Page Header. | Header "Global Audit Log" is displayed with a descriptive subtitle. |

### 2. Audit Log Table Presentation
| Step | Action | Expected Result |
|------|--------|-----------------|
| 2.1 | Observe the table columns. | Columns: Date & Time, Admin, Action, Business, Details/Changes. |
| 2.2 | Check "Date & Time". | Should show properly formatted date and time. |
| 2.3 | Check "Admin". | Should show Admin Name and Email. |
| 2.4 | Check "Action". | Should show colored badges (Joined -> Green, Rejected -> Red, Edited -> Blue, etc.). |
| 2.5 | Check "Business". | Should show the Business Name. |

### 3. Filtering Functionality
| Step | Action | Expected Result |
|------|--------|-----------------|
| 3.1 | **Filter by Action**: Select "Edit" from the Action dropdown. | Table refreshes and shows ONLY rows with "Edited" badge. |
| 3.2 | **Filter by Admin**: Select a specific Admin. | Table shows only actions performed by that admin. |
| 3.3 | **Filter by Date**: Select a "From" date (e.g., yesterday). | Table filters out older logs. |
| 3.4 | **Reset Filters**: Click the "Reset" button. | All filters clear and full list is shown. |

### 4. Diff Viewer (Changes)
| Step | Action | Expected Result |
|------|--------|-----------------|
| 4.1 | Filter by Action "Edit". | Locate a row with `Changes` JSON data. |
| 4.2 | Click "View Changes" (Chevron icon). | The row expands to show a "Before -> After" comparison. |
| 4.3 | Verify Diff Content. | Field names are readable (e.g., "business name"), followed by Old Value (Red, Strikethrough) -> New Value (Green). |
| 4.4 | Click "Hide Changes". | The details collapse. |

### 5. Responsiveness
| Step | Action | Expected Result |
|------|--------|-----------------|
| 5.1 | Resize browser to mobile size (or use DevTools). | Layout adapts. Filters might stack or remain accessible. Table might scroll horizontally if needed. |

## 🛑 Troubleshooting
- **No Logs Found?**
    - If you haven't performed any actions, the table will be empty. Go to `/admin/businesses` and Edit or Reject a business to generate a log entry, then refresh the Audit Log page.
- **"Unknown System" as Admin?**
    - This happens if the `admin_id` in the log doesn't match a profile in the `profiles` table (e.g., if the user was deleted or it was a system action).
