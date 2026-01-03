# 📱 Mobile Device Testing Checklist

**Story:** 8.8.5 - Mobile Automation & Device Testing  
**Last Updated:** December 2024

---

## Pre-Testing Setup

- [ ] Android device/emulator connected and running
- [ ] iOS device/simulator connected and running (macOS only)
- [ ] App installed on devices (`npx cap run android/ios`)
- [ ] Test user credentials ready

---

## 1. Camera Permission & Capture

### Android
- [ ] App requests camera permission on first access
- [ ] Permission dialog appears with "Allow" option
- [ ] Camera preview displays correctly
- [ ] Photo capture works
- [ ] Captured photo appears in message composer
- [ ] Denying permission shows appropriate error message

### iOS
- [ ] App requests camera permission on first access
- [ ] iOS permission dialog appears
- [ ] Camera preview displays correctly
- [ ] Photo capture works
- [ ] Captured photo appears in message composer
- [ ] Denying permission shows appropriate error message

**Notes:**
```
[Add observations here]
```

---

## 2. Haptic Feedback

### Android
- [ ] Device vibrates on message send (if supported)
- [ ] Vibration pattern is appropriate (not too long)
- [ ] No vibration on devices without haptic motor

### iOS
- [ ] Taptic feedback on message send
- [ ] Haptic feedback on button presses
- [ ] Respects system haptic settings

**Notes:**
```
[Add observations here]
```

---

## 3. Push Notifications

### Android (FCM)
- [ ] Device registers for push notifications
- [ ] Notification appears when app is in background
- [ ] Notification appears when app is closed
- [ ] Tapping notification opens correct conversation
- [ ] Notification badge updates correctly
- [ ] Notification sound plays

### iOS (APNs)
- [ ] Device registers for push notifications
- [ ] Notification appears when app is in background
- [ ] Notification appears when app is closed
- [ ] Tapping notification opens correct conversation
- [ ] Notification badge updates on app icon
- [ ] Notification sound plays

**Notes:**
```
[Add observations here]
```

---

## 4. Network Transitions

### WiFi → Cellular
- [ ] App continues functioning when switching from WiFi to Cellular
- [ ] No crash or freeze during transition
- [ ] Messages in queue are sent after reconnection
- [ ] Real-time updates resume

### Cellular → WiFi
- [ ] App continues functioning when switching from Cellular to WiFi
- [ ] No crash or freeze during transition
- [ ] Messages in queue are sent after reconnection
- [ ] Real-time updates resume

### Airplane Mode
- [ ] App shows offline indicator in airplane mode
- [ ] Messages are queued while offline
- [ ] Messages sync when back online
- [ ] No data loss

**Notes:**
```
[Add observations here]
```

---

## 5. Background/Foreground Transitions

- [ ] App resumes correctly when brought to foreground
- [ ] No crash on resume from background
- [ ] Auth session is preserved
- [ ] Real-time subscriptions reconnect
- [ ] Unread counts are accurate

**Notes:**
```
[Add observations here]
```

---

## 6. Crash Reporting

### Sentry/LogRocket Integration
- [ ] Crashes are reported to Sentry dashboard
- [ ] Stack traces are symbolicated (readable)
- [ ] User context is attached to crash reports
- [ ] JS errors are captured
- [ ] Native crashes are captured

**How to Test:**
1. Force a crash: `throw new Error('Test crash')`
2. Check Sentry dashboard for the error
3. Verify user/device context is included

**Notes:**
```
[Add observations here]
```

---

## Device Information

### Android Device Tested
- **Model:** 
- **OS Version:** 
- **Build Number:**

### iOS Device Tested
- **Model:** 
- **OS Version:** 
- **Build Number:**

---

## Sign-Off

| Tester | Date | Platform | Result |
|--------|------|----------|--------|
|        |      | Android  | ⬜ Pass / ⬜ Fail |
|        |      | iOS      | ⬜ Pass / ⬜ Fail |

---

## Issues Found

| ID | Description | Severity | Status |
|----|-------------|----------|--------|
|    |             |          |        |
