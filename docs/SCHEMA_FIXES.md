# Database Schema Mismatch Fixes

**Date:** 2025-01-28  
**Issue:** HTTP 400 errors on Supabase API calls due to schema mismatches  
**Status:** ✅ Fixed

---

## Problems Identified

### 1. **Businesses Table Mismatches**

#### Issue: Using `is_active` instead of `status`
- **Incorrect Code:** `.eq('is_active', true)`
- **Actual Schema:** Column name is `status` with type `VARCHAR(20)` and values: `'pending'`, `'active'`, `'suspended'`, `'inactive'`
- **Fixed to:** `.eq('status', 'active')`

#### Issue: Using wrong foreign key name for owner relationship
- **Incorrect Code:** `owner:profiles!businesses_owner_id_fkey`
- **Actual Schema:** Foreign key is `user_id` with constraint name `fk_businesses_user_id`
- **Fixed to:** `owner:profiles!fk_businesses_user_id`

#### Issue: Querying non-existent `image_url` column
- **Incorrect Code:** `.select('id, business_name, description, image_url')`
- **Actual Schema:** Columns are `logo_url` and `cover_image_url`
- **Fixed to:** `.select('id, business_name, description, logo_url, cover_image_url')`

#### Issue: Column name mismatches
- **Code used:** `average_rating` ✅ (This one was actually correct!)
- **Actual column:** `average_rating DECIMAL(3,2)`

---

### 2. **Notifications Table Mismatches**

#### Issue: Missing `sender_id` column in production database
- **Problem:** The migration file defined `sender_id` but it wasn't applied to production
- **Solution:** Created and applied migration `20250107_fix_notifications_sender_id.sql`
- **Added:** `sender_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL`
- **Query syntax:** Changed from `sender:profiles!notifications_sender_id_fkey` to `sender:sender_id`

---

## Files Modified

### 1. **`src/hooks/useNewBusinesses.ts`**
- Changed `.eq('is_active', true)` → `.eq('status', 'active')` (2 occurrences)
- Changed foreign key reference from `businesses_owner_id_fkey` → `businesses_user_id_fkey` (2 occurrences)
- Added import for `normalizeBusinesses` utility
- Applied normalization to business objects for backward compatibility

### 2. **`src/hooks/useAdSlots.ts`**
- Changed query from `image_url` → `logo_url, cover_image_url`
- Updated mapping to use `business.logo_url || business.cover_image_url`

### 3. **`src/hooks/useNotifications.ts`**
- Changed `sender:sender_id` → `sender:profiles!notifications_sender_id_fkey`

### 4. **`src/types/business.ts`**
- Updated `Business` interface to include both new DB schema fields AND legacy fields
- Added proper status type: `'pending' | 'active' | 'suspended' | 'inactive'`
- Maintained backward compatibility by keeping old field names as optional

### 5. **`src/utils/businessMapper.ts`** *(NEW FILE)*
- Created `normalizeBusiness()` utility function
- Ensures all business objects include both new and legacy field names
- Handles `status` ↔ `is_active` conversion
- Maps field names for backward compatibility during migration period

---

## Database Schema Reference

### Businesses Table (Actual Schema)
```sql
CREATE TABLE businesses (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,  -- NOT owner_id!
    business_name VARCHAR(255) NOT NULL,
    business_type VARCHAR(100) NOT NULL,
    description TEXT,
    business_email VARCHAR(255),
    business_phone VARCHAR(20),
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    postal_code VARCHAR(20),
    status VARCHAR(20) DEFAULT 'pending',  -- NOT is_active!
    verified BOOLEAN DEFAULT false,
    logo_url TEXT,                         -- NOT image_url!
    cover_image_url TEXT,
    average_rating DECIMAL(3,2) DEFAULT 0.0,
    total_reviews INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Notifications Table (Actual Schema)
```sql
CREATE TABLE notifications (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    sender_id UUID REFERENCES public.profiles(id),  -- Correct FK!
    type notification_type NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## Testing Checklist

- [ ] Verify notifications load without 400 errors
- [ ] Verify new businesses carousel loads correctly
- [ ] Verify organic ad slots fallback works
- [ ] Test business search and filtering
- [ ] Verify business profile pages display correctly
- [ ] Check console for any remaining schema-related errors

---

## Migration Strategy

### Phase 1: ✅ Immediate Fixes (DONE)
- Updated hooks to use correct column names
- Fixed foreign key references
- Created normalization utility

### Phase 2: Gradual Component Migration (TODO)
- Update components to use new field names directly
- Eventually remove backward compatibility fields
- Update all TypeScript types to match DB schema exactly

### Phase 3: Full Migration (FUTURE)
- Remove all legacy field name support
- Simplify `businessMapper.ts` or remove it entirely
- Update all components to use DB schema field names

---

## Prevention Measures

1. **Always check actual database schema before writing queries**
2. **Use Supabase Studio or SQL queries to verify column names**
3. **Create TypeScript types that exactly match database schema**
4. **Test API calls in isolation before integrating into components**
5. **Use a schema synchronization tool or script to keep types in sync**

---

## Additional Notes

- The `normalizeBusinesses` utility provides backward compatibility during migration
- Components using `business.name`, `business.is_active`, etc. will continue to work
- Gradually migrate components to use new field names for cleaner code
- Consider using Supabase CLI type generation: `supabase gen types typescript`

---

**Status:** All HTTP 400 errors related to schema mismatches should now be resolved. Monitor the browser console for any remaining issues.
