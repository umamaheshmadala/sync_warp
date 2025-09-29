# 🗃️ Database Setup for Check-in System

## Quick Setup Options

### Option 1: Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** 
3. Copy and paste the contents of `database/migrations/create_checkins_system.sql`
4. Click **Run** to execute the migration

### Option 2: Supabase CLI
```bash
supabase db reset  # Optional: only if you want to reset
supabase migration new create_checkins_system
# Copy the SQL content to the new migration file
supabase db push
```

### Option 3: Direct SQL Execution
If you have direct database access:
```bash
psql -h your-db-host -U postgres -d your-db-name -f database/migrations/create_checkins_system.sql
```

## 📋 What Gets Created

### Tables:
- **`business_checkins`** - Stores all user check-ins with GPS verification

### Functions:
- **`nearby_businesses(lat, lng, radius_km, limit)`** - Finds nearby businesses
- **`get_business_checkin_analytics(business_id, days)`** - Analytics for business owners  
- **`validate_checkin_distance(lat, lng, business_id, max_distance)`** - Validates check-in proximity

### Security:
- **Row Level Security (RLS)** policies
- Users can only see their own check-ins
- Business owners can see check-ins for their businesses

### Sample Data:
- Creates test check-ins if businesses exist

## 🧪 Test After Setup

Once you've run the migration, refresh your browser and test again:

```
http://localhost:5173/debug/checkins/test
```

You should now see:
- ✅ Database Integration test passes
- ✅ Nearby Businesses Discovery works
- ✅ All 7 tests complete successfully

## 🔍 Verification Queries

To verify the setup worked, run these in Supabase SQL Editor:

```sql
-- Check if table exists
SELECT * FROM information_schema.tables 
WHERE table_name = 'business_checkins';

-- Check if functions exist
SELECT routine_name FROM information_schema.routines 
WHERE routine_name IN ('nearby_businesses', 'get_business_checkin_analytics');

-- Test nearby businesses function (replace with your coordinates)
SELECT * FROM nearby_businesses(16.4710657, 80.6146415, 2.0, 10);
```

## 🚨 Troubleshooting

### If you get permission errors:
```sql
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.business_checkins TO authenticated;
```

### If PostGIS is not available:
The migration will work without PostGIS, using standard math functions instead.

### If businesses table doesn't exist:
The check-in system requires the `businesses` table. Make sure your businesses are properly set up first.

---

**Ready?** Run the migration and test again! 🚀