# 📱 Mobile App Testing Guide (No-Code Friendly)

**For**: Non-developers who want to test the mobile app  
**Level**: Beginner-friendly  
**Time**: 5 minutes to setup, instant testing after

---

## 🎯 Quick Start: Test on Your Phone in 3 Steps

### Step 1: No App Installation Needed!

**Good News:** You don't need to install anything special! Just use your phone's regular web browser:
- **Android**: Chrome, Firefox, or Samsung Internet
- **iPhone**: Safari, Chrome, or any browser

✅ **Done!** Your phone already has everything you need.

---

### Step 2: Start the Development Server

**On Your Computer** (Windows PowerShell):

```powershell
# Navigate to project folder (if not already there)
cd C:\Users\umama\Documents\GitHub\sync_warp

# Start the development server
npm run dev
```

**What You'll See:**
```
  VITE v5.x.x  ready in 234 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.1.100:5173/
```

**Important:** Keep this terminal window open while testing!

---

### Step 3: Open App on Your Phone's Browser

**Instructions:**
1. Make sure your phone and computer are on the **same WiFi network**
2. On your phone, open your **web browser** (Chrome, Safari, etc.)
3. In the address bar, type the **Network URL** from your terminal
   - Example: `http://192.168.1.3:5173/`
   - Use the IP that starts with `192.168.1.x` (not 192.168.56.x)
4. Press Go/Enter

**Tip:** Bookmark this URL on your phone for quick access!

✅ **Done!** Your app should now load on your phone!

---

## 🔄 Hot Reloading (Instant Updates)

**The Magic:**  
Every time you save changes in your code, the app **automatically updates on your phone** within 1-2 seconds!

**Try it:**
1. Open any React file in VS Code
2. Make a small change (e.g., change text)
3. Save the file (`Ctrl+S`)
4. Watch your phone update instantly 🎉

**No need to:**
- ❌ Rebuild the app
- ❌ Reinstall anything
- ❌ Refresh manually
- ✅ Just save and watch!

---

## 🧪 What to Test After Each Story

### Story 7.1.1 (Current Story)
- [ ] App loads successfully on phone
- [ ] You see the Sync App interface
- [ ] Hot reload works when you change code

### Story 7.2.1 (Secure Storage)
- [ ] App asks for storage permissions
- [ ] Login credentials save properly

### Story 7.2.2 (Auth Flow)
- [ ] Login screen appears
- [ ] Can login with Supabase credentials
- [ ] Stays logged in after closing app

### Story 7.2.3 (Push Token Hook)
- [ ] App asks for notification permissions
- [ ] Can accept or deny permissions
- [ ] Token registered (we'll verify in logs)

### Story 7.2.4 (Push Database)
- [ ] Push token saved to database
- [ ] Can send test notification

### Story 7.2.5 (Integration)
- [ ] Complete login → notification flow works
- [ ] All features work together smoothly

---

## 🚨 Troubleshooting

### Issue: Can't connect to app / "This site cannot be reached"
**Solution:**
1. Check both phone and computer are on **same WiFi**
2. **Check Windows Firewall:**
   - Press `Windows + R`, type `firewall.cpl`, press Enter
   - Click "Allow an app through firewall"
   - Click "Change settings" (admin required)
   - Find "Node.js" or click "Allow another app" → Browse to `C:\Program Files\nodejs\node.exe`
   - Make sure both **Private** and **Public** are checked
   - Click OK
3. Use the correct Network IP (starts with `192.168.1.x`, NOT `192.168.56.x`)
4. Restart the dev server: `Ctrl+C` then `npm run dev`

### Issue: White screen on phone
**Solution:**
1. Check terminal for errors (red text)
2. Refresh in Expo Go (shake phone, tap "Reload")
3. Restart dev server

### Issue: Changes not updating on phone
**Solution:**
1. Save the file in VS Code (`Ctrl+S`)
2. Wait 2-3 seconds
3. If still not updating, shake phone → tap "Reload"

### Issue: "Network error"
**Solution:**
1. Check WiFi connection on both devices
2. Try the computer's IP address directly
3. Disable VPN if running

---

## 📊 Testing Checklist Template

Copy this for each testing session:

```
Date: ___________
Story: ___________
Tester: ___________

✅ App loads on phone
✅ No error messages
✅ Hot reload works
✅ Feature tested: ___________
✅ Feature works as expected

Issues Found:
- 
- 

Notes:
- 
```

---

## 🎓 Pro Tips

1. **Keep Dev Server Running**: Don't close the terminal window
2. **Use Same WiFi**: Faster and more reliable connection
3. **Shake to Refresh**: Shake your phone to bring up Expo Go menu
4. **Check Terminal**: Errors always show in the terminal first
5. **Clear Cache**: In Expo Go menu → "Clear bundler cache" if weird bugs occur

---

## 🔗 Next Steps

After testing works smoothly:
1. ✅ Story 7.1.1: Environment Setup (Current)
2. ⏭️ Story 7.1.2: iOS Platform Setup (Optional for iPhone testing)
3. ⏭️ Story 7.1.3: Android Platform Setup (Optional for Android testing)

---

## 📞 Need Help?

**Common Commands:**
```powershell
# Start dev server
npm run dev

# Stop dev server
Ctrl+C

# Rebuild if needed
npm run build

# Check for errors
npm run type-check
```

**Remember:** Testing should be fun and easy! If something doesn't work, check the troubleshooting section first.

---

**Last Updated**: Story 7.1.1  
**Tested On**: Windows 11, Android, iOS
