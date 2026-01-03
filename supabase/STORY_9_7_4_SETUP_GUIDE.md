# Story 9.7.4: Database Setup Guide

## Quick Setup (Manual - Supabase SQL Editor)

Since the Supabase MCP isn't active, follow these steps to apply the migration manually:

### Step 1: Apply Migration

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Navigate to **SQL Editor**
4. Click **New Query**
5. Copy the entire contents of: `supabase/migrations/20250128_create_friend_leaderboard.sql`
6. Paste into the SQL Editor
7. Click **Run** or press `Ctrl+Enter`

**Expected Result**: ✅ Function created successfully

### Step 2: Seed Test Data

1. In the same SQL Editor, create a **New Query**
2. Copy the entire contents of: `supabase/seed_story_9_7_4_leaderboard.sql`
3. Paste into the SQL Editor
4. Click **Run** or press `Ctrl+Enter`

**Expected Result**: 
```
✅ Leaderboard test data seeded successfully!

Expected leaderboard ranking:
  1. Test User 8 - 100+ deals (Legend 🏆)
  2. Test User 3 - 54 deals (Expert 🥇)
  3. Test User 1 - 16 deals (Hunter 🥈)
  4. Test User 4 - 12 deals (Hunter 🥈)
  5. Test User 5 - 2 deals (No badge)
```

### Step 3: Verify

Run this query to verify the data:

```sql
SELECT * FROM get_friend_leaderboard('all', 50);
```

**Expected**: Should return the leaderboard with all test users ranked by deal count.

### Step 4: Test in App

1. Navigate to `http://localhost:5173/friends`
2. Look for the "Top Deal Hunters" card
3. Verify the leaderboard displays correctly
4. Test the time range filters

---

## Alternative: Using Supabase CLI (if Docker is running)

If you have Docker running, you can use the Supabase CLI:

```bash
# Apply migration
npx supabase db push

# Seed data (run in SQL Editor or create a seed file)
npx supabase db seed
```

---

## Troubleshooting

### Issue: Function already exists
**Solution**: The migration includes `CREATE OR REPLACE`, so it's safe to run multiple times.

### Issue: No data in leaderboard
**Solution**: 
1. Verify friendships exist between test users
2. Check that offers exist in Test Business 1
3. Run the seed script again

### Issue: "User must be authenticated" error
**Solution**: Make sure you're logged in as Test User 1 when testing the RPC function.

---

**Files to Use**:
1. Migration: `supabase/migrations/20250128_create_friend_leaderboard.sql`
2. Seed Data: `supabase/seed_story_9_7_4_leaderboard.sql`
