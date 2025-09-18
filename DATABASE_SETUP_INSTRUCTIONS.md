# 🗄️ Database Setup Instructions

## Step 1: Apply Base Schema

1. Open your Supabase project dashboard
2. Go to **SQL Editor** in the left sidebar
3. Copy the entire content of `database_schema.sql` 
4. Paste it into the SQL Editor and click **RUN**
5. You should see "Success. No rows returned"

## Step 2: Add Missing Profile Insert Policy

1. In the same SQL Editor, run this command:

```sql
-- Allow users to insert their own profile
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
```

## Step 3: Add Indian Cities Data

1. Copy the entire content of `indian_cities_schema.sql`
2. Paste it into the SQL Editor and click **RUN**
3. This will create the cities table with 100+ Indian cities

## Step 4: Verify Setup

1. Go to **Table Editor** in the left sidebar
2. You should see these tables:
   - `profiles` 
   - `cities`
   - `businesses`
   - `coupons`
   - And many more...

3. Click on the `cities` table - you should see Indian cities like Mumbai, Delhi, Bangalore, etc.

## Step 5: Test the Application

1. Run `npm run dev` in your terminal
2. Go to `http://localhost:5173/onboarding`
3. Try completing the onboarding process
4. In Step 2, you should see Indian cities in the suggestions

## Troubleshooting

### If you get "Unable to save your profile" error:
- Make sure you ran the profile insert policy (Step 2 above)
- Check that your `.env` file exists with correct Supabase credentials

### If cities don't show up:
- Make sure you ran the Indian cities schema (Step 3 above)
- Check browser console for any errors

### If nothing works:
- Check that your Supabase project is active
- Verify your `.env` file has the correct URL and keys
- Make sure all SQL commands ran without errors

## Environment Variables

Your `.env` file should look like this:

```
VITE_SUPABASE_URL=https://ysxmgbblljoyebvugrfo.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzeG1nYmJsbGpveWVidnVncmZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxMDU2MjksImV4cCI6MjA3MzY4MTYyOX0.m1zCtG-Rvrga_g-YX0QqMLVQ0uLxogUqGLqNVTrQBqI
VITE_APP_ENV=development
```