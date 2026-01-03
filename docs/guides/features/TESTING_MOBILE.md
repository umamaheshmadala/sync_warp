# 📱 Mobile App Testing Guide (No-Code Friendly)

**For**: Non-developers who want to test the mobile app  
**Level**: Beginner-friendly  
**Time**: One-time Android Studio setup, then instant testing

---

## 🎯 Two Testing Methods

### Method 1: Desktop Browser (Immediate - No Setup)
**Best for:** Quick UI checks, development testing

1. Open your desktop browser
2. Go to: `http://localhost:5173/`
3. Test all features

✅ **Works right now!** No setup needed.

---

### Method 2: Real Android App (Recommended)
**Best for:** Full mobile testing with native features

**One-time setup** (Story 7.1.3):
1. Install Android Studio (~30 minutes)
2. Build Android APK (~5 minutes)
3. Install APK on phone (~2 minutes)

✅ **Then:** Test like a real user with a real mobile app!

---

---

## 📦 Building Your Android App

### Prerequisites (One-Time Setup)

**Download Android Studio:**
1. Go to: https://developer.android.com/studio
2. Download for Windows (~1 GB)
3. Install (choose "Standard" setup)
4. Wait for SDK download (~10-15 minutes)

✅ **Done!** Android Studio ready.

---

### Build the APK

**In PowerShell:**
```powershell
# Install Android platform
npm install @capacitor/android

# Create Android project
npx cap add android

# Build web app
npm run build

# Sync to Android
npx cap sync android

# Open in Android Studio
npx cap open android
```

**In Android Studio:**
1. Wait for Gradle sync (2-5 minutes first time)
2. Click green **Run** button (▶️)
3. Select your **Android phone** (USB connected) or **Emulator**
4. Wait for install

✅ **Done!** App is now on your phone!

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
