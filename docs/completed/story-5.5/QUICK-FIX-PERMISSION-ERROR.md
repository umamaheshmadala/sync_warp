# Quick Fix for Permission Denied Error

## 🚨 Do These 3 Things Now

### 1. Run This SQL Script (Most Important!)

Open Supabase SQL Editor and run:
```
docs/story-5.5/FIX-RLS-POLICIES.sql
```

This fixes the database permissions.

### 2. Clear Your Browser and Log In Again

```javascript
// Open browser console (F12) and run:
localStorage.clear();
sessionStorage.clear();
location.reload();
```

Then:
1. Log out
2. Log back in
3. Try to collect a coupon

### 3. Check the Browser Console

Look for these messages:
- 🔐 User from store
- 🔐 User ID
- 🔐 Current session

If you see ❌ errors, that's the problem!

## What Each Error Means

| Console Message | What It Means | Fix |
|----------------|---------------|-----|
| ❌ No active session! | Session expired | Log out and log in |
| ❌ User ID mismatch! | Auth state corrupted | Clear storage, log in |
| Insert error: 42501 | RLS policy issue | Run FIX-RLS-POLICIES.sql |

## Still Not Working?

Run the diagnostic:
```
docs/story-5.5/DIAGNOSE-RLS-POLICIES.sql
```

This will tell you exactly what's wrong.

## Need More Help?

Read the full guide:
```
docs/story-5.5/FIX-PERMISSION-DENIED-ERROR.md
```

---

**TL;DR**: Run FIX-RLS-POLICIES.sql, clear browser storage, log in again.
