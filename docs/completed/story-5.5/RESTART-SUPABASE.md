# 🔥 Nuclear Option: Restart Supabase

## The Issue
Supabase Cloud's PostgREST has cached the OLD function signature and won't reload despite:
- Running `NOTIFY pgrst, 'reload schema'`
- Restarting dev server
- Clearing browser cache

## Solution: Restart Supabase Project

### **For Supabase Cloud:**

1. **Go to:** [Supabase Dashboard](https://app.supabase.com/)

2. **Select your project**

3. **Go to:** Settings → General

4. **Scroll down** to "Pause project" or "Restart project"

5. **Click "Pause project"**
   - Wait 30 seconds

6. **Click "Resume project"** (or it might auto-resume)
   - Wait 2-3 minutes for full restart

7. **Try the test page again**

---

### **Alternative: Restart via SQL (Might work)**

Run this in Supabase SQL Editor:

```sql
-- Force PostgREST reload (last resort)
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE application_name LIKE '%postgrest%';

-- Then reload
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';
```

---

### **Or: Wait 5-10 Minutes**

Sometimes Supabase Cloud's PostgREST cache expires after 5-10 minutes. Just wait and try again.

---

### **Or: Use SQL Directly (Bypass PostgREST)**

Instead of using the app, test the function directly in SQL to prove it works:

```sql
-- This WILL work because SQL doesn't use PostgREST
DO $$
DECLARE
  v_sender_id UUID;
  v_receiver_id UUID;
  v_collection_id UUID;
  v_coupon_id UUID;
  v_result JSON;
BEGIN
  SELECT ucc.user_id, ucc.id, ucc.coupon_id
  INTO v_sender_id, v_collection_id, v_coupon_id
  FROM user_coupon_collections ucc
  WHERE ucc.is_shareable = TRUE
    AND ucc.has_been_shared = FALSE
    AND ucc.status = 'active'
  LIMIT 1;
  
  SELECT id INTO v_receiver_id
  FROM auth.users
  WHERE id != v_sender_id
  LIMIT 1;
  
  SELECT log_coupon_share(
    v_sender_id,
    v_receiver_id,
    v_coupon_id,
    v_collection_id,
    false
  ) INTO v_result;
  
  RAISE NOTICE '✅ SQL works! Result: %', v_result;
END $$;
```

If this works but the app doesn't, it's 100% a PostgREST cache issue.

---

## Why This Is Happening

When you change a function signature in PostgreSQL:
1. ✅ PostgreSQL knows immediately
2. ❌ PostgREST (API layer) caches the old signature
3. ❌ `NOTIFY pgrst` should reload but sometimes doesn't on Cloud
4. ✅ Restarting the project forces PostgREST to reload

This is a known issue with Supabase Cloud's PostgREST caching.
