# Archived Files

This folder contains files that have been removed from the main codebase during cleanup but are preserved for reference.

## Folder Structure

### `old-versions/`
Contains old or duplicate versions of components that have been replaced:
- `ModernDashboard.tsx`, `SimpleDashboard.tsx` - Old dashboard implementations
- `SimpleBusinessDashboard.tsx`, `ModernBusinessDashboard.tsx` - Old business dashboard versions
- `SimpleContactsSidebar.tsx` - Unused sidebar version
- `TiltedCard.jsx`, `Folder.jsx` - JSX versions replaced by TSX equivalents
- `CampaignWizard.tsx` (campaigns folder) - Duplicate, using business/CampaignWizard.tsx instead
- `CampaignCard.tsx`, `CampaignDetail.tsx`, `CampaignList.tsx` - Old campaign components
- `examples/` - Example components folder

### `migration-scripts/`
Database migration and diagnostic scripts:
- `apply-review-migration.js`
- `apply-seed-migration.js`
- `check-table-structure.js`
- `run-diagnostic.js`
- `verify-schema-fixes.js`

### `debug-demos/`
Debug components and demo pages (kept in development mode via Router.tsx):
- `debug/` - Debug helper scripts
- Note: Demo pages in `src/pages/` (TargetingDemo, CampaignTargetingDemo) are still active for development

### `old-tests/`
- `coverage/` - Code coverage reports
- `CampaignCard.test.tsx` - Test for removed component

### `temp-cleanup/`
- `temp_cleanup/` - Temporary files from previous cleanup operations

## Notes

- Debug routes (`/debug/*` and `/demo/*`) are still active in development mode
- Files were moved only after verifying they are not imported elsewhere in the codebase
- All active components remain in `src/components/` hierarchy
- Migration scripts can be referenced if database schema changes need to be reviewed

## Restoration

If any archived file needs to be restored:
1. Check current codebase to ensure no conflicts
2. Move file back to original location
3. Update imports if file paths have changed
4. Run `npm run build` to verify no breakage

---
**Archived Date**: October 14, 2025  
**Cleanup Reason**: Directory consolidation and removal of unused/duplicate files
