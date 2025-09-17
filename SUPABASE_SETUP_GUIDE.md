# 🚀 Supabase Setup Guide - CRITICAL BLOCKER RESOLUTION

**Time Required**: ~15 minutes  
**Status**: 🔴 **MUST DO NOW** - Blocking all authentication development

---

## 📋 **Quick Checklist**

- [ ] **Step 1**: Create Supabase account and project (5 min)
- [ ] **Step 2**: Get project credentials (2 min) 
- [ ] **Step 3**: Create .env file (1 min)
- [ ] **Step 4**: Apply database schema (5 min)
- [ ] **Step 5**: Test connection (2 min)

---

## 🔥 **Step 1: Create Supabase Project**

### **1.1 Go to Supabase**
1. Open https://supabase.com in your browser
2. Click **"Start your project"** or **"Sign Up"**
3. Sign up with GitHub, Google, or email (whatever's easiest)

### **1.2 Create New Project**
1. Click **"New Project"** 
2. Choose your organization (or create one)
3. Fill out project details:
   - **Name**: `sync-warp` (or any name you prefer)
   - **Database Password**: Generate a strong password (SAVE THIS!)
   - **Region**: Choose closest to you (e.g., `US East` if in US)
4. Click **"Create new project"**

**⏰ Wait 2-3 minutes** for project to initialize (it will show "Setting up project...")

---

## 🔑 **Step 2: Get Your Credentials**

### **2.1 Find Project Settings**
1. Once project is ready, click **"Settings"** (gear icon) in left sidebar
2. Click **"API"** in the settings menu

### **2.2 Copy These Values**
You'll see a section called **"Project API keys"**. Copy these TWO values:

```
Project URL: https://xyzxyzxyz.supabase.co
anon public key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ey...
```

**📝 Keep these safe** - you'll need them in the next step!

---

## 📁 **Step 3: Create Environment File**

### **3.1 Create .env File**
1. In your `sync_warp` folder, create a new file called `.env` (exactly that name)
2. Copy this template and fill in YOUR values:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Optional: For local development
VITE_APP_ENV=development
```

### **3.2 Replace with Your Values**
- Replace `https://your-project-id.supabase.co` with your Project URL
- Replace `your-anon-key-here` with your anon public key

### **3.3 Save the File**
Make sure it's saved as `.env` (not `.env.txt`)

---

## 🗄️ **Step 4: Create Database Tables**

### **4.1 Open SQL Editor**
1. In your Supabase project dashboard
2. Click **"SQL Editor"** in the left sidebar
3. You'll see a code editor

### **4.2 Apply the Schema**
1. Open the file `database_schema.sql` in your project folder
2. **Copy ALL the content** (Ctrl+A, then Ctrl+C)
3. **Paste it** into the Supabase SQL Editor (Ctrl+V)
4. Click **"RUN"** button (bottom right)

### **4.3 Verify Success**
- You should see ✅ **"Success. No rows returned"**
- If you see any red errors, let me know exactly what they say

### **4.4 Check Tables Were Created**
1. Click **"Table Editor"** in left sidebar
2. You should see many tables like `profiles`, `businesses`, `coupons`, etc.
3. If you see the tables, SUCCESS! 🎉

---

## ✅ **Step 5: Test Connection**

### **5.1 Try Running the App**
1. Open terminal in your project folder
2. Run: `npm install` (if you haven't already)
3. Run: `npm run dev`
4. Open the app in browser (usually http://localhost:5173)

### **5.2 Check for Errors**
- **✅ Good**: App loads without console errors
- **❌ Bad**: Console shows Supabase connection errors

### **5.3 Test Login Page**  
1. Click "Login" on the landing page
2. Try entering any email/password (it won't work yet, but should not crash)
3. Check browser console (F12) for connection errors

---

## 🎯 **Success Criteria**

You'll know it's working when:

1. ✅ Supabase project exists and shows "Active"
2. ✅ `.env` file has correct credentials
3. ✅ Database has all tables (25+ tables created)
4. ✅ App runs without Supabase connection errors
5. ✅ Login page loads without crashing

---

## 🆘 **If You Need Help**

### **Common Issues**:

**"Invalid API key"**: Double-check your `.env` file has the right values

**"Failed to create tables"**: Make sure you copied the ENTIRE `database_schema.sql` content

**"App won't start"**: Run `npm install` first, then `npm run dev`

**"Can't find .env"**: Make sure it's in the root folder next to `package.json`

---

## ✨ **After Success**

Once all steps are ✅ complete:

1. **Update me**: Let me know it's working
2. **I'll update**: Epic files to show Story 1.6 as DONE
3. **We'll proceed**: To Story 2.1 (Sign-up Form)
4. **Development continues**: No more blockers!

---

**🔥 PRIORITY: Do this NOW before any other development work!**