# Clean SQL Scripts for Friend Search Filters

Copy and paste these SQL queries directly into your Supabase SQL Editor (without the markdown code fences).

---

## Script 1: Check what search_users RPC returns

Replace `YOUR_USER_ID_HERE` with your actual user ID from the auth.users table.

```
SELECT * FROM search_users(
  'test',
  'YOUR_USER_ID_HERE',
  20,
  0
) LIMIT 1;
```

**Purpose:** See what columns the search_users RPC returns (especially check for `is_online`)

---

## Script 2: View search_users function definition

```
SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'search_users';
```

**Purpose:** See the actual SQL code of the search_users function

---

## Script 3: Verify profiles table columns and data

```
SELECT 
  id,
  full_name,
  location,
  is_online,
  last_active,
  city
FROM profiles
WHERE location IS NOT NULL OR city IS NOT NULL
LIMIT 10;
```

**Purpose:** Confirm location, city, and is_online columns have data

---

## Script 4: Test search query with all needed fields

```
SELECT 
  p.id as user_id,
  p.full_name,
  p.location,
  p.city,
  p.is_online,
  p.last_active,
  p.avatar_url
FROM profiles p
WHERE p.full_name ILIKE '%test%'
LIMIT 5;
```

**Purpose:** See what a typical search result looks like

---

## What to Share

After running these scripts, please share:

1. **From Script 1**: What columns does the result have? (Look for `is_online`, `location`, `mutual_friends_count`)
2. **From Script 2**: The function definition (so I can see if it includes `is_online`)
3. **From Script 3**: Confirm data exists in `location` and `is_online` columns
4. **From Script 4**: Sample search results

This will help me ensure the filters work correctly with your database!
