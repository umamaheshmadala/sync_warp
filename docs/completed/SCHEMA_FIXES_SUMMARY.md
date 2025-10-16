# Schema Fixes Applied - Quick Summary

**Date:** 2025-01-07  
**Issue:** HTTP 400 errors due to database schema mismatches  
**Status:** ✅ FIXED

---

## Root Causes

### 1. **Missing `sender_id` Column in Notifications Table**
The `notifications` table in production was missing the `sender_id` column that the code was trying to query.

**Solution:**
- ✅ Created migration: `20250107_fix_notifications_sender_id.sql`
- ✅ Applied to production database
- ✅ Added: `sender_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL`
- ✅ Added index: `idx_notifications_sender_id`

### 2. **Wrong Foreign Key Constraint Names**
Code used incorrect FK constraint names that didn't match the actual database schema.

**Solution:**
- Changed: `businesses_user_id_fkey` → `fk_businesses_user_id`  
- Changed: `notifications_sender_id_fkey` → `sender_id`

### 3. **Column Name Mismatches in Businesses Table**
- Changed: `.eq('is_active', true)` → `.eq('status', 'active')`
- Changed: `image_url` → `logo_url, cover_image_url`

---

## Files Modified

| File | Changes |
|------|---------|
| `src/hooks/useNewBusinesses.ts` | Fixed FK name, status column, added normalization |
| `src/hooks/useAdSlots.ts` | Fixed image_url → logo_url/cover_image_url |
| `src/hooks/useNotifications.ts` | Fixed sender FK reference |
| `src/types/business.ts` | Updated interface with both new & legacy fields |
| `src/utils/businessMapper.ts` | NEW - Normalization utility |
| `supabase/migrations/20250107_fix_notifications_sender_id.sql` | NEW - DB migration |

---

## Quick Test Commands

```bash
# Check if changes are working
# Open http://localhost:5173/dashboard in browser
# Check browser console - should have NO 400 errors now

# Verify notifications table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'notifications' 
AND column_name = 'sender_id';
```

---

## What Was Done

1. ✅ Identified actual database schema using Supabase MCP
2. ✅ Created migration to add missing `sender_id` column
3. ✅ Applied migration to production database
4. ✅ Updated all hooks to use correct FK constraint names
5. ✅ Fixed column name mismatches (is_active → status, image_url → logo_url)
6. ✅ Created normalization utility for backward compatibility
7. ✅ Updated TypeScript types to match database schema
8. ✅ Documented all changes

---

## Expected Result

✅ **All HTTP 400 errors should be resolved!**

- Notifications will load without errors
- New businesses carousel will display correctly
- Organic ad fallbacks will work
- Business searches will function properly

---

## Next Steps

1. **Test** the dashboard at http://localhost:5173/dashboard
2. **Verify** no 400 errors in browser console
3. **Commit** all changes to git
4. **Monitor** for any remaining issues

---

**Note:** The `businessMapper.ts` utility provides backward compatibility so existing components using old field names (`business.name`, `business.is_active`) will continue to work during gradual migration.
