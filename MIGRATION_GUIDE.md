# Manual Database Migration Guide

## Story 4.10 - Favorite Products Migration

Since the Supabase CLI is showing migration history conflicts, follow these steps to manually apply the migration:

---

## Option 1: Via Supabase Dashboard (RECOMMENDED)

### Steps:

1. **Go to your Supabase Dashboard**
   - URL: https://supabase.com/dashboard
   - Navigate to your project

2. **Open SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Click "+ New query"

3. **Copy the Migration SQL**
   - Open: `supabase/migrations/20250118060000_create_favorite_products.sql`
   - Copy ALL the contents

4. **Paste and Run**
   - Paste the SQL into the editor
   - Click "Run" or press `Ctrl+Enter`

5. **Verify Success**
   - You should see: "Success. No rows returned"
   - Check Tables: You should see `favorite_products` table

---

## Option 2: Via Supabase CLI (Alternative)

If you want to force apply the migration:

```bash
# Reset migration history (CAUTION: Only if you're sure)
npx supabase db reset

# Or apply just this migration manually
npx supabase db push --include-all
```

---

## Verification

After applying the migration, verify it worked:

### Check Table Exists:
```sql
SELECT EXISTS (
  SELECT FROM pg_tables 
  WHERE schemaname = 'public' 
  AND tablename = 'favorite_products'
);
-- Should return: true
```

### Check Functions:
```sql
SELECT proname FROM pg_proc 
WHERE proname IN (
  'get_user_favorite_products_count',
  'is_product_favorited',
  'get_product_favorite_count'
);
-- Should return 3 rows
```

### Check Indexes:
```sql
SELECT indexname FROM pg_indexes 
WHERE tablename = 'favorite_products';
-- Should return 4 indexes
```

---

## What the Migration Creates

1. **Table:** `favorite_products`
   - user_id (uuid, FK to auth.users)
   - product_id (uuid, FK to business_products)
   - created_at (timestamp)

2. **Indexes:**
   - idx_favorite_products_user_id
   - idx_favorite_products_product_id
   - idx_favorite_products_created_at
   - idx_favorite_products_user_product (composite, unique)

3. **RLS Policies:**
   - SELECT: Users can view their own favorites
   - INSERT: Users can add their own favorites
   - DELETE: Users can remove their own favorites

4. **Helper Functions:**
   - get_user_favorite_products_count(user_id)
   - is_product_favorited(user_id, product_id)
   - get_product_favorite_count(product_id)

---

## Troubleshooting

### Error: "relation already exists"
The table is already created. You're good to go!

### Error: "permission denied"
Make sure you're using a database user with sufficient privileges.

### Migration history conflicts
The CLI migration history is out of sync. Use the dashboard method (Option 1) instead.

---

## Next Steps After Migration

1. ✅ Migration applied
2. **Test the application:**
   - Start dev server: `npm run dev`
   - Navigate to a business profile
   - Click the heart icon on a product
   - Check if it appears in your favorites

3. **Push to Git:**
   ```bash
   git push origin main
   ```

---

## Quick Test Query

After migration, test with this query:

```sql
-- Test inserting a favorite (replace UUIDs with real ones)
INSERT INTO favorite_products (user_id, product_id)
VALUES (
  'your-user-id-here',
  'your-product-id-here'
);

-- Check it worked
SELECT * FROM favorite_products WHERE user_id = 'your-user-id-here';

-- Clean up test
DELETE FROM favorite_products WHERE user_id = 'your-user-id-here';
```

---

**Ready to proceed!** Once migration is applied, the favorite products system is fully operational. 🚀
