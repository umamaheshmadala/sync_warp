# 🗄️ Quick Database Setup Guide

## ⚡ **STEP 1: Run Your Database Migration**

Since you're using hosted Supabase, follow these steps:

### **Option A: Manual SQL Execution (Recommended)**

1. **Open your Supabase Dashboard**:
   - Go to https://supabase.com/dashboard
   - Select your project: `sync_warp`

2. **Navigate to SQL Editor**:
   - Click on "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Copy and Paste the Migration**:
   - Open: `supabase/migrations/20241201_create_business_tables.sql`
   - Copy ALL content (322 lines)
   - Paste into the SQL Editor
   - Click "Run" button

4. **Verify Success**:
   - You should see "Success. No rows returned" message
   - Check the "Table Editor" to see new tables:
     - `business_categories`
     - `businesses` 
     - `business_products`
     - `business_reviews`
     - `business_checkins`
     - `business_verification_documents`

### **Option B: Alternative CLI Method**
If you want to use CLI (requires Docker Desktop):

```bash
# Start Docker Desktop first, then:
npx supabase start
npx supabase db push
```

---

## ⚡ **STEP 2: Test Your Business Registration**

Once the migration is complete:

### **1. Start Development Server**
```bash
npm run dev
```

### **2. Navigate to Business Features**
Open your browser and go to:
- **Dashboard**: http://localhost:5173/dashboard
- Look for **"Business Center"** section
- Click **"Register Your Business"**

### **3. Test the 4-Step Registration**

#### **Step 1: Basic Information**
- ✅ Enter business name (required)
- ✅ Select business type (required)
- ✅ Choose category (required)
- ✅ Add description (required)
- ✅ Optional: email and phone

#### **Step 2: Location & Contact**
- ✅ Enter full address (required)
- ✅ Enter city and state (required)
- ✅ Click **"Get Location"** to test geocoding
- ✅ Optional: website URL and social media

#### **Step 3: Operating Hours**
- ✅ Configure hours for each day
- ✅ Toggle "Closed" for days off
- ✅ Test time validation

#### **Step 4: Final Details**
- ✅ Upload logo/cover images (file selection)
- ✅ Add tags for discoverability
- ✅ Review summary and submit

### **4. Test Business Dashboard**
After registration:
- Navigate to `/business/dashboard`
- Should see your registered business
- Click "View" to see business profile
- Click "Edit" to test profile editing

---

## 🎯 **Expected Results**

### **✅ What Should Work:**
- Form validation at each step
- "Get Location" button adds coordinates
- Toast notifications for success/errors
- Business saves with "pending" status
- Business appears in dashboard
- Profile editing works for business owner

### **⚠️ Known Limitations:**
- Image upload requires Supabase storage setup
- Business approval workflow is admin-only
- Some advanced features are in future stories

---

## 🚨 **Troubleshooting**

### **Database Issues:**
```bash
# Check if tables were created
# In Supabase SQL Editor, run:
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'business%';
```

### **Form Issues:**
- Check browser console for errors
- Verify Supabase connection in network tab
- Ensure all required fields are filled

### **Navigation Issues:**
- Clear browser cache and reload
- Check if you're logged in properly
- Verify routes in `src/router/Router.tsx`

---

## 🎉 **SUCCESS CRITERIA**

✅ **Database Migration Complete** - All 6 business tables created
✅ **Business Registration Works** - 4-step wizard completes
✅ **Business Dashboard Shows Data** - Registered businesses appear
✅ **Form Validation Works** - Proper error handling
✅ **Location Services Work** - Geocoding adds coordinates

**Once these work, you're ready for Epic 4 remaining stories!** 🚀

---

**Time Required**: 
- Database setup: 10-15 minutes
- Testing: 15-20 minutes
- **Total**: ~30 minutes

**Next**: Choose your next Epic 4 story from the NEXT_STEPS_GUIDE.md!