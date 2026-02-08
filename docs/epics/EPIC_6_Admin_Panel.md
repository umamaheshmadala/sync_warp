# Epic 6: Admin Panel ⚪ PLANNED

**Goal**: Build a comprehensive admin panel on admin.myproject.com for platform management.

**Progress**: 0/4 stories completed (0%) 

---

## Story 6.1: Admin Authentication & Setup ⚪ PLANNED
**What you'll see**: Secure admin login system on separate subdomain.

**User Experience**:
- As an admin, I want secure access to the admin panel
- As an admin, I want role-based permissions (super admin, moderator, etc.)
- As an admin, I want separate authentication from the main app
- As an admin, I want secure session management

**What needs to be built**:
- [ ] Admin subdomain setup (admin.myproject.com)
- [ ] Admin-specific authentication system
- [ ] Role and permission management
- [ ] Admin user management interface
- [ ] Secure admin session handling
- [ ] Admin activity logging

**Time Estimate**: 4-5 days

---

## Story 6.2: User Management Interface ⚪ PLANNED
**What you'll see**: Complete user account management and moderation tools.

**User Experience**:
- As an admin, I want to view and search all user accounts
- As an admin, I want to suspend or ban problematic users
- As an admin, I want to view user activity and statistics
- As an admin, I want to manage user reports and disputes

**What needs to be built**:
- [ ] User listing with search and filters
- [ ] User profile viewing and editing
- [ ] Account suspension/ban controls
- [ ] User activity timeline
- [ ] User statistics dashboard
- [ ] Report management system

**Time Estimate**: 5-6 days

---

## Story 6.3: Admin Business Management & Moderation 🟡 IN PROGRESS (6.3.1-6.3.5 COMPLETE)
**What you'll see**: Comprehensive business listing management with advanced filtering, individual approval workflow, and audit logging.

**User Experience**:
- As an admin, I want to **view all businesses** with pagination and status tabs
- As an admin, I want to **filter businesses** by city, category, registration date (range + year/month)
- As an admin, I want to **search businesses** by name, email, phone, or owner name
- As an admin, I want to **approve pending businesses individually** after thorough verification
- As an admin, I want to **reject businesses** with required reason notes
- As an admin, I want to **edit business information** to fix incorrect entries
- As an admin, I want to **soft-delete or hard-delete** businesses (spam/fraud)
- As an admin, I want to **view complete audit history** of all admin actions
- As an admin, I want **business owners to receive push + in-app notifications** when approved/rejected
- As an admin, I want to **contact business owners** directly via email/phone
- As an admin, I want to **review and approve/reject owner edits** to sensitive business fields

**What needs to be built**:
- [ ] Business management dashboard with tab-based interface (Pending/Approved/Rejected/Deleted/Pending Edits/All)
- [ ] Advanced filtering system (city, category, date range, year, month - all combinable)
- [ ] Real-time search by business name, email, phone, owner
- [ ] Individual approval workflow (NO bulk operations - manual verification required)
- [ ] Individual rejection workflow with required reason notes
- [ ] Business editing interface with full field access
- [ ] Soft-delete (default) and hard-delete (for spam) options
- [ ] Audit log system (`admin_business_actions` table)
- [ ] Status history tracking (`business_status_history` table)
- [ ] Push + in-app notifications for approval/rejection/edits
- [ ] Business detail modal with tabs (Details/Audit History/Owner Info)
- [ ] Pagination (50 per page default, options: 20, 50, 100)
- [ ] Multi-sort options (registration date, name, city, category, last modified)
- [ ] Active filter chips with clear-all functionality
- [ ] Comprehensive RLS policies for admin-only access
- [ ] API endpoints: list, approve, reject, delete, edit, audit-log, filter-options
- [ ] **NEW: Pending Edit Review System** (Story 6.3.6):
  - [ ] Owner edits to sensitive fields (name, address, categories) require admin approval
  - [ ] Owner edits to non-sensitive fields (phone, email, hours, images) apply immediately
  - [ ] "Pending Edits" tab in admin dashboard with queue
  - [ ] Side-by-side diff view for admin review
  - [ ] Partial approval/rejection of individual field changes
  - [ ] Business remains ACTIVE during edit review (approved values stay visible)
  - [ ] Owner sees "Changes pending approval" banner on their storefront
  - [ ] Notifications to owner on edit approval/rejection

**Database Changes**:
- New table: `admin_business_actions` (audit trail)
- New table: `business_status_history` (status change tracking)
- **New table: `business_pending_edits`** (queued owner edits for sensitive fields)
- Modified: `businesses` table (add rejection_reason, approved_at, approved_by, deleted_at, is_hard_deleted, **has_pending_edits**)
- Indexes: city, status, created_at, business_type, deleted_at, has_pending_edits

**Key Design Decisions**:
- **NO Bulk Operations**: Each business requires individual verification
- **Push + In-App Notifications**: Both channels for critical actions
- **Soft-Delete Default**: Preserves audit trail, allows recovery
- **Hard-Delete Option**: For spam/fraud with extra confirmation
- **Required Rejection Reason**: Mandatory notes for accountability
- **Tab-Based UI**: Pending tab default for admin workflow
- **Sensitive Field Moderation**: Name/Address/Categories changes require re-approval
- **Partial Approval**: Admins can approve some fields while rejecting others

**Detailed Documentation**: 
- See `STORY_6.3.1_Admin_Business_Database_Infrastructure.md` 🟢 COMPLETE
- See `STORY_6.3.2_Admin_Business_Listing_Filtering.md` 🟢 COMPLETE
- See `STORY_6.3.3a_Admin_Business_Detail_Modal.md` 🟢 COMPLETE
- See `STORY_6.3.3b_Admin_Business_Approve_Reject_Actions.md` 🟢 COMPLETE
- See `STORY_6.3.4_Admin_Business_Editing_Deletion.md` 🟢 COMPLETE
- See `STORY_6.3.5_Admin_Audit_Logging_Notifications.md` 🟢 COMPLETE
- See `STORY_6.3.6_Pending_Edits_Infrastructure.md` 🟢 COMPLETE
- See `STORY_6.3.7_Owner_Pending_Edits_Experience.md` 🟢 COMPLETE
- See `STORY_6.3.8_Admin_Pending_Edits_Review.md` ⚪ PLANNED

**Time Estimate**: 9-10 days (increased from 7-8 days to include pending edits workflow)

---


## Story 6.4: Platform Analytics & Settings ⚪ PLANNED
**What you'll see**: Comprehensive platform analytics and configurable settings.

**User Experience**:
- As an admin, I want to see platform usage statistics
- As an admin, I want to configure coupon sharing limits globally
- As an admin, I want to manage platform-wide settings
- As an admin, I want to monitor system health and performance

**What needs to be built**:
- [ ] Analytics dashboard with key metrics
- [ ] User growth and engagement charts
- [ ] Revenue and business metrics
- [ ] Configurable platform settings
- [ ] Coupon sharing limit controls
- [ ] System monitoring and alerts

**Time Estimate**: 5-6 days

---

## Epic 6 Summary

**Total Stories**: 4 stories
**Status**: ⚪ Planned for final development phase
**Prerequisites**: All previous epics should be substantially complete

**Estimated Timeline**: 4-5 weeks
**User Impact**: Essential for platform maintenance and scaling