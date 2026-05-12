# 📚 SynC Documentation

**Last Organized:** 2025-02-06

---

## 📁 **Folder Structure**

### **📖 `/guides`**
Setup, configuration, and how-to guides.

- **Root Level:** General setup guides
  - `ENVIRONMENT_SETUP.md` - Development environment setup
  - `FIREBASE_SETUP.md` - Firebase configuration
  - `MOBILE_WORKFLOW.md` - Mobile development workflow
  - `MOBILE_COMMANDS.md` - Common mobile commands
  - `PWA_SETUP.md` - Progressive Web App setup
  - `MULTI_ENVIRONMENT_BUILD.md` - Multi-environment configuration
  - `ICON_GUIDE.md` - Icon usage guidelines
  - `DUMMY_DATA_REPLACEMENT_GUIDE.md` - Data seeding guide

- **`/database`** - Database-specific guides
  - `DATABASE_PUSH_TOKENS.md` - Push token schema
  - `DATABASE_TABLE_CREATION_CHECKLIST.md` - Table creation workflow
  - `SUPABASE_DATABASE_AUDIT_REPORT.md` - Database audit results
  - `SUPABASE_UUID_MANAGEMENT.md` - UUID handling guide

- **`/features`** - Feature implementation guides
  - `NOTIFICATION_ROUTING.md` - Notification system
  - `PUSH_EDGE_FUNCTION.md` - Push notification backend
  - `PUSH_NOTIFICATIONS_HOOK.md` - Push notifications hook
  - `PUSH_NOTIFICATIONS_SETUP.md` - Push setup guide
  - `MOBILE_PROFILE_DRAWER.md` - Profile drawer implementation
  - `NETWORK_STATUS.md` - Network status handling
  - `OFFLINE_DATA_STORE.md` - Offline data management
  - `OFFLINE_INDICATOR_UI.md` - Offline UI indicators
  - `STATE_PERSISTENCE.md` - State persistence strategy

---

### **📋 `/epics`**
High-level epic documentation (product features).

Contains comprehensive epic documents for major features and initiatives.

---

### **📝 `/stories`**
Individual story breakdowns for epics.

Contains detailed user stories with acceptance criteria, MCP integration, and implementation tasks.

---

### **📊 `/progress`**
Progress tracking and status documents.

- Epic breakdown status documents
- Coverage audit reports
- Progress summaries
- `BUSINESS_SLUG_CONVERSION_STATUS.md` - Slug conversion tracking

---

### **🏗️ `/plans`**
Architecture documents, technical decisions, and planning.

- `CAPACITOR_VS_EXPO_AUDIT.md` - Mobile framework comparison
- `EPIC_7.2_REORGANIZATION.md` - Epic reorganization plan
- `EPIC_7.3_Coverage_Analysis.md` - Epic coverage analysis
- `FAVORITES_VS_FOLLOWERS.md` - Feature comparison
- `FOLLOW_BUSINESS_FLOW.md` - Business follow architecture
- `NEXT_MVP_FEATURES.md` - MVP feature planning
- `MOBILE_APP_STANDARDS_COMPLIANCE.md` - Mobile standards

---

### **✅ `/completed`**
Completed work summaries and implementation reports.

- `BUSINESS_CARD_IMAGE_FIXES.md`
- `BUSINESS_CARD_STANDARDIZATION.md`
- `FRONTEND_FAVORITES_MIGRATION.md`
- `ICON_FIXES_APPLIED.md`
- `ICON_IMPLEMENTATION_SUMMARY.md`
- `IMPLEMENTATION_STATUS.md`
- `FINAL_SUMMARY.md`
- `STORY_4.10_SUMMARY.md`
- `MCP_FIX_PROGRESS_COMPLETE.md`
- `FOLDER_REORGANIZATION_LOG.md`

---

### **🐛 `/bugfixes`**
Bug fixes, issue resolutions, and UI improvements.

- `chrome_devtools_fixes.md`
- `debug_analytics.md`
- `follower_analytics_fixes.md`
- `FOLLOWING_PAGE_400_ERROR_FIX.md`
- `LOGO_POSITIONING_FIX.md`
- `FAVORITES_DISPLAY_FIX.md`
- `RPC_FUNCTIONS_FIX.md`
- `WISHLIST_COLUMN_FIX.md`
- `ui_improvements_summary.md`

---

### **🧪 `/testing`**
Test reports, test results, and testing documentation.

- `MIGRATION_TEST_RESULTS.md`
- `MOBILE_TESTING.md`
- `PUSH_NOTIFICATIONS_TEST_RESULTS.md`
- `SERVICE_WORKER_TESTING.md`
- `TESTING_PUSH_INTEGRATION.md`

---

### **💾 `/sql`**
SQL scripts and database migrations.

- `FIX_BUSINESSES_RLS.sql`
- Other SQL migration scripts

---

### **🗄️ `/migrations`**
Database migration history and migration-related documentation.

---

### **📦 `/archive`**
Archived/deprecated documentation for historical reference.

---

## 🔍 **Finding Documentation**

### **I need to...**

| Task | Folder |
|------|--------|
| Set up my development environment | `/guides` |
| Implement a new feature | `/guides/features` |
| Work with the database | `/guides/database` |
| Understand an epic | `/epics` |
| Work on a story | `/stories` |
| Check project progress | `/progress` |
| Review architecture decisions | `/plans` |
| Fix a bug | Check `/bugfixes` for similar issues |
| Run tests | `/testing` |
| Execute SQL | `/sql` |
| Review completed work | `/completed` |

---

## 📊 **Quick Stats**

- **Total Folders:** 11
- **Files Organized:** 54+
- **Epics:** Multiple in `/epics`
- **Stories:** 8+ in `/stories`
- **Guides:** 21+ across `/guides` and subfolders

---

## 🎯 **Documentation Standards**

1. **File Naming:** Use UPPERCASE_SNAKE_CASE.md for documentation
2. **Dates:** Include last updated date at top of documents
3. **MCP Integration:** Document all MCP commands used
4. **Status Tracking:** Keep progress docs updated in `/progress`
5. **Archiving:** Move obsolete docs to `/archive`

---

**Maintained by:** Development Team  
**Questions?** Check the appropriate folder or create an issue
