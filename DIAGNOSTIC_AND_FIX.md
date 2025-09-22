# 🔍 **DATABASE DIAGNOSTIC & FIX**

## 🚨 **Still Getting Error: column "user_id" does not exist**

Let's diagnose your exact database structure and create the perfect fix.

---

## **STEP 1: DIAGNOSE YOUR DATABASE** (2 minutes)

### **Run This Query First:**
Copy and paste this in your Supabase SQL Editor:

```sql
-- 1. Check what auth tables exist
SELECT table_name, table_schema 
FROM information_schema.tables 
WHERE table_schema = 'auth' 
ORDER BY table_name;
```

### **Then Run This:**
```sql
-- 2. Check auth.users structure (if it exists)
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'auth' 
AND table_name = 'users'
ORDER BY ordinal_position;
```

### **And This:**
```sql
-- 3. Check if you have a profiles table instead
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'profiles'
ORDER BY ordinal_position;
```

### **Finally This:**
```sql
-- 4. Check ALL public tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
```

---

## **STEP 2: CHOOSE YOUR FIX BASED ON RESULTS**

### **🎯 SCENARIO A: You have `auth.users` with `id` column**
**If Query 2 shows an `id` column**, use this migration:

```sql
-- FIXED MIGRATION FOR auth.users(id)
CREATE TABLE IF NOT EXISTS business_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS businesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    business_name VARCHAR(255) NOT NULL,
    business_type VARCHAR(100) NOT NULL,
    description TEXT,
    business_email VARCHAR(255),
    business_phone VARCHAR(20),
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    postal_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'India',
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    operating_hours JSONB DEFAULT '{}',
    categories TEXT[] DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    logo_url TEXT,
    cover_image_url TEXT,
    gallery_images TEXT[] DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'pending',
    verified BOOLEAN DEFAULT false,
    website_url TEXT,
    social_media JSONB DEFAULT '{}',
    average_rating DECIMAL(3,2) DEFAULT 0.0,
    total_reviews INTEGER DEFAULT 0,
    total_checkins INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Users can manage own businesses" ON businesses
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Anyone can read active businesses" ON businesses
    FOR SELECT USING (status = 'active');

-- Insert categories
INSERT INTO business_categories (name, display_name, sort_order) VALUES
    ('restaurant', 'Restaurants', 1),
    ('retail', 'Retail & Shopping', 2),
    ('services', 'Services', 3),
    ('healthcare', 'Healthcare', 4),
    ('beauty', 'Beauty & Wellness', 5);
```

### **🎯 SCENARIO B: You have `profiles` table instead**
**If Query 3 shows a profiles table**, use this:

```sql
-- MIGRATION FOR profiles table
CREATE TABLE IF NOT EXISTS business_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS businesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    business_name VARCHAR(255) NOT NULL,
    business_type VARCHAR(100) NOT NULL,
    description TEXT,
    business_email VARCHAR(255),
    business_phone VARCHAR(20),
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    postal_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'India',
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    operating_hours JSONB DEFAULT '{}',
    categories TEXT[] DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    logo_url TEXT,
    cover_image_url TEXT,
    gallery_images TEXT[] DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'pending',
    verified BOOLEAN DEFAULT false,
    website_url TEXT,
    social_media JSONB DEFAULT '{}',
    average_rating DECIMAL(3,2) DEFAULT 0.0,
    total_reviews INTEGER DEFAULT 0,
    total_checkins INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (using profiles instead of auth.users)
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;

-- Create policy with current_user instead of auth.uid()
CREATE POLICY "Users can manage own businesses" ON businesses
    FOR ALL USING (user_id = (SELECT id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Anyone can read active businesses" ON businesses
    FOR SELECT USING (status = 'active');

-- Insert categories
INSERT INTO business_categories (name, display_name, sort_order) VALUES
    ('restaurant', 'Restaurants', 1),
    ('retail', 'Retail & Shopping', 2),
    ('services', 'Services', 3),
    ('healthcare', 'Healthcare', 4),
    ('beauty', 'Beauty & Wellness', 5);
```

### **🎯 SCENARIO C: No auth schema access (Fallback)**
**If you can't access auth schema**, use this simplified version:

```sql
-- SIMPLIFIED VERSION (no foreign keys)
CREATE TABLE IF NOT EXISTS business_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS businesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL, -- No foreign key constraint
    business_name VARCHAR(255) NOT NULL,
    business_type VARCHAR(100) NOT NULL,
    description TEXT,
    business_email VARCHAR(255),
    business_phone VARCHAR(20),
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    postal_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'India',
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    operating_hours JSONB DEFAULT '{}',
    categories TEXT[] DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    logo_url TEXT,
    cover_image_url TEXT,
    gallery_images TEXT[] DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'pending',
    verified BOOLEAN DEFAULT false,
    website_url TEXT,
    social_media JSONB DEFAULT '{}',
    average_rating DECIMAL(3,2) DEFAULT 0.0,
    total_reviews INTEGER DEFAULT 0,
    total_checkins INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Simple RLS without auth references
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_businesses_user_id ON businesses(user_id);

-- Insert categories
INSERT INTO business_categories (name, display_name, sort_order) VALUES
    ('restaurant', 'Restaurants', 1),
    ('retail', 'Retail & Shopping', 2),
    ('services', 'Services', 3),
    ('healthcare', 'Healthcare', 4),
    ('beauty', 'Beauty & Wellness', 5);
```

---

## **STEP 3: VERIFY SUCCESS**

After running the appropriate migration, check:

```sql
-- Verify tables were created
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('businesses', 'business_categories');

-- Check categories were inserted
SELECT count(*) as category_count FROM business_categories;
```

**Expected Results:**
- 2 tables: `businesses`, `business_categories`
- 5+ categories inserted

---

## **🚀 QUICK ACTION PLAN:**

1. **Run diagnostic queries** (Step 1) - 2 minutes
2. **Choose appropriate migration** (Step 2) based on your results
3. **Run the migration** - 1 minute
4. **Verify success** (Step 3) - 1 minute
5. **Test your app** at http://localhost:5175/

**Total Time: ~5 minutes**

---

## **❓ STILL HAVING ISSUES?**

**Tell me the exact output from Step 1 queries**, and I'll create a custom migration just for your database structure.

The key is to match your exact auth setup, whether it's:
- `auth.users(id)` 
- `profiles(id)`
- Or no foreign keys at all

**Once we know your structure, the fix is guaranteed to work!** ✅