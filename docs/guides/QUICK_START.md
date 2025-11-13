# 🚀 SynC Database Seeding - Quick Start

## ⚡ 60-Second Setup

### Step 1: Open Supabase SQL Editor
```
https://supabase.com/dashboard/project/ysxmgbblljoyebvugrfo
→ Click "SQL Editor" (left sidebar)
```

### Step 2: Run the Seeding Script
1. Open file: `scripts/MANUAL_SEED_DATA.sql`
2. Copy all contents (Ctrl+A, Ctrl+C)
3. Paste into SQL Editor
4. Click "Run" (or Ctrl+Enter)
5. Wait ~5-10 seconds

### Step 3: Verify Results
The script outputs:
```
✅ 100 profiles inserted
✅ 15 driver profiles created
✅ 10 business customer profiles created
✅ RLS re-enabled
```

## 📋 What Gets Seeded

| Item | Count | Details |
|------|-------|---------|  
| User Profiles | 100 | 70 customers, 15 drivers, 15 business owners |
| Driver Profiles | 15 | With realistic scores (1,000-11,000) |
| Business Customers | 10 | With demographics and behavior data |
| Cities | - | Indian metros (Mumbai, Delhi, Bangalore, etc.) |

## 📁 Key Files

- **Main Script**: `scripts/MANUAL_SEED_DATA.sql` ⭐
- **Full Guide**: `docs/DATA_SEEDING_GUIDE.md`
- **Summary Report**: `docs/SEEDING_TASK_SUMMARY.md`

## 🔍 Quick Verification Queries

After seeding, run these in SQL Editor to verify:

```sql
-- Check counts
SELECT 
  'Profiles' as table_name, COUNT(*) FROM profiles
UNION ALL
SELECT 'Drivers', COUNT(*) FROM driver_profiles
UNION ALL
SELECT 'Business Customers', COUNT(*) FROM business_customer_profiles;

-- Check driver scores
SELECT 
  AVG(total_activity_score)::int as avg_score,
  MAX(total_activity_score)::int as max_score,
  MIN(total_activity_score)::int as min_score
FROM driver_profiles;
```

## ⚠️ Important

- **Test Data Only**: All emails use `@sync.app` domain
- **RLS**: Temporarily disabled, then re-enabled automatically
- **Cleanup**: To remove later: `DELETE FROM profiles WHERE email LIKE '%@sync.app'`
- **Time**: Total execution time ~10 minutes (including manual steps)

## 🆘 Need Help?

- **Troubleshooting**: See `docs/DATA_SEEDING_GUIDE.md` Section 5
- **Full Details**: See `docs/SEEDING_TASK_SUMMARY.md`
- **RLS Issues**: Script handles this automatically

---

**Ready?** Open Supabase SQL Editor and paste `MANUAL_SEED_DATA.sql` → Run!

# 🚀 Quick Start - Campaign Targeting UI Testing

## ⚡ 3-Step Quick Start

### 1️⃣ Start Dev Server
```powershell
cd C:\Users\umama\Documents\GitHub\sync_warp
npm run dev
```

### 2️⃣ Open Browser
```
http://localhost:5173/demo/campaign-targeting
```

### 3️⃣ Test Features
- Click **"🌐 Broad Reach"** button
- Switch to **"Reach Estimator"** tab
- Switch to **"AI Recommendations"** tab
- Click **"Apply"** on any recommendation

---

## 🎯 What You're Testing

| Component | What It Does | Key Feature |
|-----------|-------------|-------------|
| **Targeting Validator** | Validates targeting rules in real-time | ✅ Fixed async bug |
| **Reach Estimator** | Estimates audience size & cost | ✅ No NaN values |
| **AI Recommendations** | Smart targeting suggestions | ✅ One-click apply |

---

## ✅ Success Checklist

Quick verification (< 2 minutes):

- [ ] Page loads without errors
- [ ] Numbers show with commas (5,234 not NaN)
- [ ] Preset buttons change the targeting
- [ ] All three tabs work
- [ ] Apply button works on recommendations

**If all checked → Implementation is working! 🎉**

---

## 📖 Full Guide

See detailed testing guide: `docs/CAMPAIGN_TARGETING_UI_GUIDE.md`

---

## 🆘 Quick Troubleshooting

**Page won't load?**
```powershell
npm run dev
```

**Seeing errors?**
- Press F12 → Check Console tab
- Refresh page (Ctrl + R)

**Components not updating?**
- Hard refresh (Ctrl + Shift + R)

---

**Built with ❤️ - Ready for Production!**
