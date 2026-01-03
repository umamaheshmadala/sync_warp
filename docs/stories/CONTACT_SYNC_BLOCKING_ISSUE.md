# Contact Sync Matching Issue - UNRESOLVED

**Status:** ❌ BLOCKED - Unable to resolve with current AI model  
**Date:** 2025-11-22  
**Story:** STORY_9.3.6_Contact_Sync.md

## Problem Summary

Contact sync successfully uploads hashes to the database, but `match_contacts` returns 0 friends even when:
- Test users have phone numbers in their profiles
- Test users have synced their contacts (588+ hashes uploaded)
- Phone numbers are added to device contacts
- Multiple normalization strategies attempted

## What Works

✅ Contact permission flow  
✅ Reading contacts from device  
✅ Hashing phone numbers  
✅ Uploading hashes to `contact_hashes` table via `upsert_contact_hashes` RPC  
✅ Database functions exist and are callable  
✅ Inline profile editing (separate feature)

## What Doesn't Work

❌ `match_contacts` RPC returns empty array (0 matches)  
❌ Hashes uploaded from device don't match hashes in `profiles.phone_hash`

## Diagnostic Evidence

### Database State (as of 2025-11-22 15:05)

**Profiles table:**
- Phone: `+917000000001`
- Last 10 digits: `7000000001`
- phone_hash: `f2aee6a0738c354a7ce6fa9a9694c6c11ccd0a0c7e170b41cf8e330734dbb414`

**Test User 1 uploaded hashes (sample):**
- `02d403e2aaf31733510acbbf92f7262a89029b4c00f6209955b6dafb977f31f0`
- `03060df70024c678b5765f2fdb92170d689917cdcdc696ea0756c10e7a104e3a`
- `0316f40b88f3a2f97a66225a4e08e4ea266eeef8828e356200e7d5ca8940014f`

**Cross-check result:** ❌ NO MATCHES between uploaded hashes and profile hashes

### Expected Hash Verification

```bash
node -e "const crypto = require('crypto'); console.log(crypto.createHash('sha256').update('7000000001').digest('hex'));"
# Output: f2aee6a0738c354a7ce6fa9a9694c6c11ccd0a0c7e170b41cf8e330734dbb414
```

This matches the database phone_hash, confirming the SQL normalization is correct.

## Attempted Fixes

### 1. Fixed Missing RPC Function
- **Issue:** `upsert_contact_hashes` function didn't exist
- **Fix:** Created migration `20250122_create_upsert_contact_hashes.sql`
- **Result:** ✅ Function created, uploads work

### 2. Fixed Matching Logic
- **Issue:** `match_contacts` was matching contact_hashes against contact_hashes (mutual friends logic)
- **Fix:** Updated to match against `profiles.phone_hash` in migration `20250201_fix_contact_matching_logic.sql`
- **Result:** ✅ Logic corrected, but still no matches

### 3. Simplified Normalization to Last 10 Digits
- **Issue:** Country code variations (+91, 91, 0, none)
- **Fix:** Updated both JS and SQL to use `slice(-10)` / `right(..., 10)`
  - `contactSyncService.ts`: `phone.replace(/\D/g, '').slice(-10)`
  - SQL trigger: `right(regexp_replace(phone, '\D', '', 'g'), 10)`
- **Migration:** `20250201_fix_phone_normalization_last10.sql`
- **Result:** ✅ Database updated, but uploaded hashes still don't match

### 4. Multiple Rebuild Attempts
- Cleaned project in Android Studio
- Rebuilt from scratch
- Uninstalled and reinstalled app
- Verified `npm run build` and `npx cap sync android` completed
- **Result:** ❌ Still uploading wrong hashes

## Root Cause Hypothesis

The uploaded hashes (`02d403e2...`, `03060df7...`) are completely different from expected hashes (`f2aee6a0...`), suggesting one of:

1. **Build cache issue:** Despite clean/rebuild, old code is running
2. **Different hashing in production:** The app is using a different hashing method than expected
3. **Contact format issue:** Device contacts are in a format that's not being normalized correctly
4. **Capacitor plugin issue:** The contacts plugin is returning data in an unexpected format

## Files Modified

### Frontend
- `src/services/contactSyncService.ts` - Updated normalization to last 10 digits
- `src/components/profile/InlineEditField.tsx` - Inline editing (separate feature)
- `src/components/Profile.tsx` - Inline editing integration

### Database Migrations
- `supabase/migrations/20250122_create_upsert_contact_hashes.sql` - Created upsert function
- `supabase/migrations/20250201_fix_contact_matching_logic.sql` - Added phone_hash column and trigger
- `supabase/migrations/20250201_fix_phone_normalization_last10.sql` - Updated to last 10 digits

### Diagnostic Scripts
- `verify_sync.mjs` - Check sync status
- `debug_matching.mjs` - Debug matching logic
- `verify_hashing.mjs` - Verify hash generation
- `final_diagnostic.sql` - Comprehensive database check

## Next Steps for Future Investigation

1. **Add extensive logging to production build:**
   - Log the raw contact data from Capacitor plugin
   - Log normalized phone numbers before hashing
   - Log generated hashes
   - Compare with database hashes

2. **Test with a single known contact:**
   - Add one specific number to device contacts
   - Log exactly what the app reads
   - Manually verify the hash matches database

3. **Verify Capacitor plugin behavior:**
   - Check if plugin returns formatted or raw numbers
   - Test on different Android versions
   - Check plugin documentation for data format

4. **Consider alternative approaches:**
   - Use a phone number parsing library (libphonenumber-js)
   - Store multiple hash variations per user
   - Use server-side normalization

## Recommendation

This issue requires deeper investigation with:
- Real device debugging with extensive logging
- Possibly a different AI model with better debugging capabilities
- Or manual debugging by examining actual contact data from the device

The core infrastructure is in place and working (permissions, upload, database functions). The issue is specifically in the hash matching between uploaded contacts and stored profiles.

---

**For future AI:** Start by adding comprehensive logging to `contactSyncService.ts` to see exactly what data is being processed at each step, especially the raw contact data from the Capacitor plugin and the normalized phone numbers before hashing.
