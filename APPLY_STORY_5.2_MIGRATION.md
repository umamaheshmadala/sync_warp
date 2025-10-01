# Apply Story 5.2 Database Migration

**Issue:** Reviews tab showing error: "Could not find the table 'public.business_reviews_with_details'"  
**Cause:** Database migration hasn't been applied to your Supabase instance  
**Solution:** Apply the migration SQL

---

## 🚀 Quick Fix (5 minutes)

### Option 1: Supabase Dashboard (Recommended)

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard
   - Select your project: `ysxmgbblljoyebvugrfo`

2. **Navigate to SQL Editor**
   - Click "SQL Editor" in left sidebar
   - Click "New Query"

3. **Copy and Run Migration**
   - Open file: `supabase/migrations/20251001143956_create_review_system_enhanced.sql`
   - Copy ALL contents (376 lines)
   - Paste into SQL Editor
   - Click "Run" button

4. **Verify Success**
   - You should see "Success. No rows returned"
   - Refresh your app
   - Navigate to business profile → Reviews tab
   - Should now work!

---

## Option 2: Using Supabase CLI

If you have Supabase CLI installed:

```bash
# Navigate to project directory
cd C:\Users\umama\Documents\GitHub\sync_warp

# Apply pending migrations
supabase db push

# Or apply specific migration
supabase migration up
```

---

## 📋 What Gets Created

The migration creates:

### Tables:
- ✅ `business_reviews` - Main reviews table
- ✅ `business_review_responses` - Business owner responses

### Views:
- ✅ `business_reviews_with_details` - Reviews with user profiles & responses
- ✅ `user_review_activity` - User review statistics

### Functions:
- ✅ `get_business_review_stats(p_business_id)` - Review statistics
- ✅ `verify_checkin_for_review()` - Check-in validation
- ✅ `count_words()` - Text word counter

### RLS Policies:
- ✅ Public read access to reviews
- ✅ Authenticated users can write reviews (with check-in)
- ✅ Users can edit own reviews (24h window)
- ✅ Business owners can respond to reviews

### Triggers:
- ✅ Auto-update timestamps
- ✅ Track edit count

---

## 🧪 Verify Migration Applied

Run this query in Supabase SQL Editor:

```sql
-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('business_reviews', 'business_review_responses');

-- Check if view exists
SELECT table_name 
FROM information_schema.views 
WHERE table_schema = 'public' 
AND table_name = 'business_reviews_with_details';

-- Check if function exists
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'get_business_review_stats';
```

**Expected Results:**
- 2 tables found
- 1 view found
- 1 function found

---

## ⚠️ Troubleshooting

### Error: "relation already exists"
**Solution:** Migration already applied! Your issue might be different. Check if view exists:
```sql
SELECT * FROM business_reviews_with_details LIMIT 1;
```

### Error: "permission denied"
**Solution:** Make sure you're logged into the correct Supabase project

### Error: "syntax error"
**Solution:** Make sure you copied the ENTIRE migration file (all 376 lines)

---

## 🎯 After Migration

Once migration is applied:

1. **Refresh your browser** (hard refresh: Ctrl+Shift+R)
2. **Navigate to business profile**
3. **Click Reviews tab**
4. **Should see:** "No Reviews Yet" message (not an error)
5. **Try creating a review** (you'll need to check in first)

---

## 📞 Still Having Issues?

If the error persists after applying migration:

1. Check browser console for different error
2. Verify Supabase project ID matches
3. Check if you're connected to correct database
4. Try logging out and back in
5. Clear browser cache

---

## Migration File Location

**Full Path:**
```
C:\Users\umama\Documents\GitHub\sync_warp\supabase\migrations\20251001143956_create_review_system_enhanced.sql
```

**Quick Access:**
- Right-click file in VS Code
- "Copy Path"
- Navigate to file in Windows Explorer
- Open with text editor
- Copy all contents

---

**Status:** ⏳ PENDING - Migration needs to be applied  
**Next Step:** Apply migration via Supabase Dashboard (Option 1)  
**Estimated Time:** 5 minutes
