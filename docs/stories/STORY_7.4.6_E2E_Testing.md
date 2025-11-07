# Story 7.4.6: End-to-End Push Notification Testing ⚪ PLANNED

**Epic**: EPIC 7.4 - Push Notifications Infrastructure  
**Story Points**: 4  
**Estimated Time**: 2-3 hours  
**Dependencies**: Stories 7.4.1-7.4.5 complete

---

## 📋 Overview

**What**: Perform comprehensive end-to-end testing of the entire push notification system on both iOS and Android, covering all states (foreground, background, killed) and notification types.

**Why**: E2E testing ensures all components work together correctly in real-world scenarios. It validates the complete flow from backend sending to user interaction.

**User Value**: Users receive reliable, working push notifications that lead them to the right content every time, building trust and engagement with the app.

---

## 🎯 Acceptance Criteria

- [ ] Tested on iOS device (real device required)
- [ ] Tested on Android device/emulator
- [ ] Foreground notifications working
- [ ] Background notifications working
- [ ] Killed state notifications working
- [ ] Notification tap actions routing correctly
- [ ] All notification types tested
- [ ] Multi-device scenarios tested
- [ ] Testing documentation created
- [ ] Test results documented
- [ ] Changes committed to git

---

## 📝 Testing Plan

### Test Matrix

| Platform | State | Notification Type | Expected Result |
|----------|-------|-------------------|-----------------|
| Android | Foreground | Review | Toast appears → routes on tap |
| Android | Background | Review | System notification → routes on tap |
| Android | Killed | Review | System notification → launches app → routes |
| iOS | Foreground | Review | Toast appears → routes on tap |
| iOS | Background | Review | System notification → routes on tap |
| iOS | Killed | Review | System notification → launches app → routes |
| Both | All | Offer | Routes to offer page |
| Both | All | Business | Routes to business profile |
| Both | All | Follower | Routes to user profile |

---

## 📝 Implementation Steps

### Step 1: Prepare Test Environment

**Prerequisites**:
- [ ] Android device/emulator available
- [ ] iOS device available (real device, not simulator)
- [ ] Both devices logged in with test account
- [ ] Push tokens registered in database
- [ ] Edge Function deployed

**Get Test User ID**:
```sql
-- In Supabase SQL Editor
SELECT id FROM auth.users WHERE email = 'test@example.com';
```

**Verify Tokens Registered**:
```sql
SELECT * FROM push_tokens WHERE user_id = '<test-user-id>';
```
Should see 2 rows (Android + iOS)

**Acceptance**: ✅ Environment ready

---

### Step 2: Test Android - Foreground Notifications

**Setup**:
- Open app on Android device
- Keep app in foreground

**Send Test Notification**:
```http
POST https://<project>.supabase.co/functions/v1/send-push-notification

{
  "userId": "<test-user-id>",
  "title": "Test: Foreground Review",
  "body": "Android foreground test",
  "data": {
    "type": "review",
    "businessId": "test-business-123",
    "reviewId": "test-review-456"
  }
}
```

**Expected Results**:
- ✅ Toast appears at top of screen within 1-2 seconds
- ✅ Toast shows "📝 Review" badge
- ✅ Tap toast → routes to `/business/test-business-123/reviews/test-review-456`
- ✅ Toast auto-dismisses after 5 seconds if not tapped

**Acceptance**: ✅ Android foreground working

---

### Step 3: Test Android - Background Notifications

**Setup**:
- App is running
- Press home button (app goes to background)

**Send Test Notification**:
```http
POST https://<project>.supabase.co/functions/v1/send-push-notification

{
  "userId": "<test-user-id>",
  "title": "Test: Background Offer",
  "body": "Android background test",
  "data": {
    "type": "offer",
    "businessId": "test-business-123",
    "offerId": "test-offer-789"
  }
}
```

**Expected Results**:
- ✅ Notification appears in system tray
- ✅ Notification shows title and body
- ✅ Tap notification → app comes to foreground
- ✅ App routes to `/business/test-business-123/offers/test-offer-789`

**Acceptance**: ✅ Android background working

---

### Step 4: Test Android - Killed State

**Setup**:
- Swipe app away (kill app completely)
- App not running at all

**Send Test Notification**:
```http
POST https://<project>.supabase.co/functions/v1/send-push-notification

{
  "userId": "<test-user-id>",
  "title": "Test: Killed Business",
  "body": "Android killed state test",
  "data": {
    "type": "business",
    "businessId": "test-business-123"
  }
}
```

**Expected Results**:
- ✅ Notification appears in system tray
- ✅ Tap notification → app launches
- ✅ App routes to `/business/test-business-123` after launch
- ✅ No errors during cold start

**Acceptance**: ✅ Android killed state working

---

### Step 5: Test iOS - Foreground Notifications

**Setup**:
- Open app on iOS device (MUST be real device)
- Keep app in foreground

**Send Test Notification**:
```http
POST https://<project>.supabase.co/functions/v1/send-push-notification

{
  "userId": "<test-user-id>",
  "title": "Test: iOS Foreground",
  "body": "iOS foreground test",
  "data": {
    "type": "follower",
    "userId": "test-user-789"
  }
}
```

**Expected Results**:
- ✅ Toast appears at top of screen
- ✅ Shows "👥 Follower" badge
- ✅ Tap toast → routes to `/profile/test-user-789`
- ✅ Toast auto-dismisses after 5 seconds

**Acceptance**: ✅ iOS foreground working

---

### Step 6: Test iOS - Background Notifications

**Setup**:
- App running on iOS device
- Press home button (app to background)

**Send Test Notification**:
```http
POST https://<project>.supabase.co/functions/v1/send-push-notification

{
  "userId": "<test-user-id>",
  "title": "Test: iOS Background",
  "body": "iOS background test",
  "data": {
    "type": "message",
    "messageId": "test-message-999"
  }
}
```

**Expected Results**:
- ✅ Notification appears in Notification Center
- ✅ Sound plays
- ✅ Badge appears on app icon
- ✅ Tap notification → app comes to foreground
- ✅ Routes to `/messages/test-message-999`

**Acceptance**: ✅ iOS background working

---

### Step 7: Test iOS - Killed State

**Setup**:
- Swipe app up to close (kill completely)

**Send Test Notification**:
```http
POST https://<project>.supabase.co/functions/v1/send-push-notification

{
  "userId": "<test-user-id>",
  "title": "Test: iOS Killed",
  "body": "iOS killed state test",
  "data": {
    "type": "review",
    "businessId": "test-business-123",
    "reviewId": "test-review-999"
  }
}
```

**Expected Results**:
- ✅ Notification appears
- ✅ Tap notification → app launches
- ✅ Routes to review page after cold start
- ✅ No crashes or errors

**Acceptance**: ✅ iOS killed state working

---

### Step 8: Test Multi-Device Scenario

**Setup**:
- User logged in on both Android AND iOS
- Both devices have valid tokens

**Send Notification to Both**:
```http
POST https://<project>.supabase.co/functions/v1/send-push-notification

{
  "userId": "<test-user-id>",
  "title": "Test: Multi-Device",
  "body": "Should appear on both devices",
  "data": {
    "type": "business",
    "businessId": "test-business-123"
  }
}
```

**Expected Results**:
- ✅ Android device receives notification
- ✅ iOS device receives notification
- ✅ Both route correctly when tapped
- ✅ Response shows: `{"sent": 2, "failed": 0, "total": 2}`

**Acceptance**: ✅ Multi-device working

---

### Step 9: Test Error Scenarios

**Test Invalid User ID**:
```json
{
  "userId": "invalid-uuid",
  "title": "Test",
  "body": "Test"
}
```
✅ Should return: `{"message": "No push tokens found for user"}`

**Test Missing Data**:
```json
{
  "userId": "<test-user-id>"
  // Missing title and body
}
```
✅ Should return: `{"error": "Missing required fields: userId, title, body"}`

**Test Invalid Token** (manually update token in DB to invalid):
```sql
UPDATE push_tokens SET token = 'invalid-token' WHERE user_id = '<test-user-id>' AND platform = 'android';
```
Send notification:
✅ Should return: `{"sent": 1, "failed": 1, "total": 2}` (iOS succeeds, Android fails)

**Acceptance**: ✅ Error handling working

---

### Step 10: Create Test Results Documentation

**Create new file**: `docs/PUSH_NOTIFICATIONS_TEST_RESULTS.md`

```markdown
# Push Notifications E2E Test Results ✅

**Test Date**: [Date]  
**Tester**: [Name]  
**Epic**: 7.4 - Push Notifications Infrastructure

---

## Test Summary

| Platform | Foreground | Background | Killed | Total |
|----------|------------|------------|--------|-------|
| Android  | ✅ Pass    | ✅ Pass    | ✅ Pass | 3/3   |
| iOS      | ✅ Pass    | ✅ Pass    | ✅ Pass | 3/3   |
| **Total** | **✅ Pass** | **✅ Pass** | **✅ Pass** | **6/6** |

---

## Detailed Test Results

### Android Tests

#### ✅ Foreground Notification
- **Status**: PASS
- **Delivery Time**: < 2 seconds
- **Toast Display**: Working
- **Routing**: Correct
- **Notes**: No issues

#### ✅ Background Notification
- **Status**: PASS
- **Notification Tray**: Working
- **App Resume**: Working
- **Routing**: Correct
- **Notes**: No issues

#### ✅ Killed State
- **Status**: PASS
- **Cold Start**: Working
- **Routing**: Correct
- **Notes**: No crashes

---

### iOS Tests

#### ✅ Foreground Notification
- **Status**: PASS
- **Delivery Time**: < 2 seconds
- **Toast Display**: Working
- **Routing**: Correct
- **Device**: iPhone [Model]
- **Notes**: Requires real device

#### ✅ Background Notification
- **Status**: PASS
- **Notification Center**: Working
- **Badge**: Working
- **Sound**: Working
- **Routing**: Correct
- **Notes**: No issues

#### ✅ Killed State
- **Status**: PASS
- **Cold Start**: Working
- **Routing**: Correct
- **Notes**: No crashes

---

## Notification Types Tested

| Type | Route | Android | iOS | Notes |
|------|-------|---------|-----|-------|
| Review | `/business/:id/reviews/:reviewId` | ✅ | ✅ | Working |
| Offer | `/business/:id/offers/:offerId` | ✅ | ✅ | Working |
| Business | `/business/:id` | ✅ | ✅ | Working |
| Follower | `/profile/:userId` | ✅ | ✅ | Working |
| Message | `/messages/:messageId` | ✅ | ✅ | Working |

---

## Multi-Device Test

**Scenario**: Same user on Android + iOS

- ✅ Both devices receive notification
- ✅ Both route correctly
- ✅ Response: `{"sent": 2, "failed": 0, "total": 2}`
- ✅ No conflicts or issues

---

## Error Handling Tests

| Test Case | Expected Result | Actual Result | Status |
|-----------|----------------|---------------|--------|
| Invalid User ID | No tokens message | No tokens message | ✅ |
| Missing Fields | 400 error | 400 error | ✅ |
| Invalid Token | Partial success | 1 sent, 1 failed | ✅ |

---

## Performance Metrics

| Metric | Android | iOS | Target | Status |
|--------|---------|-----|--------|--------|
| Delivery Time | 1-2s | 1-2s | < 3s | ✅ |
| Routing Time | < 1s | < 1s | < 2s | ✅ |
| Cold Start | 2-3s | 2-3s | < 5s | ✅ |

---

## Issues Found

### Critical
- None

### Minor
- None

### Nice to Have
- [ ] Add notification sound customization
- [ ] Add custom notification icons

---

## Test Environment

### Android
- **Device**: [Device Name/Emulator]
- **OS Version**: Android [Version]
- **App Version**: [Version]
- **FCM**: Configured

### iOS
- **Device**: iPhone [Model] (Real Device)
- **OS Version**: iOS [Version]
- **App Version**: [Version]
- **APNs**: Configured

### Backend
- **Supabase**: Production
- **Edge Function**: Deployed
- **Secrets**: Configured

---

## Sign-Off

**All tests passed successfully** ✅

The push notification system is production-ready and meets all acceptance criteria defined in EPIC 7.4.

**Tested By**: [Name]  
**Date**: [Date]  
**Status**: ✅ **APPROVED FOR PRODUCTION**

---

## Next Steps

1. ✅ Push notification system complete
2. 🔄 Monitor production notifications
3. 📊 Track delivery rates and open rates
4. 🔔 Add more notification types as features expand

---

## Related

- [EPIC 7.4 Overview](../epics/EPIC_7.4_Push_Notifications.md)
- [Story 7.4.1-7.4.5](./STORY_7.4.1_Capacitor_Push_Plugin.md)
```

**Save as**: `docs/PUSH_NOTIFICATIONS_TEST_RESULTS.md`

**Acceptance**: ✅ Test results documented

---

### Step 11: Create Testing Checklist

**Create new file**: `docs/PUSH_TESTING_CHECKLIST.md`

```markdown
# Push Notifications Testing Checklist ✅

Use this checklist for future testing of push notifications.

---

## Pre-Test Setup

- [ ] Android device/emulator available
- [ ] iOS real device available (NOT simulator)
- [ ] Test user account created
- [ ] User logged in on both devices
- [ ] Push tokens verified in database
- [ ] Edge Function deployed
- [ ] FCM and APNs secrets configured

---

## Android Tests

### Foreground
- [ ] App is in foreground
- [ ] Send test notification
- [ ] Toast appears within 2 seconds
- [ ] Toast shows correct type badge
- [ ] Tapping toast routes correctly
- [ ] Toast auto-dismisses after 5 seconds

### Background
- [ ] App in background (home button pressed)
- [ ] Send test notification
- [ ] Notification appears in system tray
- [ ] Tapping notification brings app to foreground
- [ ] App routes to correct screen

### Killed
- [ ] App completely closed (swiped away)
- [ ] Send test notification
- [ ] Notification appears in system tray
- [ ] Tapping notification launches app
- [ ] App routes to correct screen on cold start
- [ ] No crashes or errors

---

## iOS Tests

### Foreground
- [ ] App in foreground on **real device**
- [ ] Send test notification
- [ ] Toast appears within 2 seconds
- [ ] Tapping toast routes correctly
- [ ] Toast auto-dismisses

### Background
- [ ] App in background
- [ ] Send test notification
- [ ] Notification appears in Notification Center
- [ ] Sound plays
- [ ] Badge appears on app icon
- [ ] Tapping notification brings app forward
- [ ] App routes correctly

### Killed
- [ ] App closed completely
- [ ] Send test notification
- [ ] Notification appears
- [ ] Tapping launches app
- [ ] Routes correctly on cold start
- [ ] No crashes

---

## Notification Types

- [ ] Review notification routes to review page
- [ ] Offer notification routes to offer page
- [ ] Business notification routes to business profile
- [ ] Follower notification routes to user profile
- [ ] Message notification routes to messages

---

## Multi-Device

- [ ] User logged in on Android + iOS
- [ ] Send one notification
- [ ] Both devices receive notification
- [ ] Both route correctly when tapped

---

## Error Scenarios

- [ ] Invalid user ID returns "no tokens" message
- [ ] Missing fields returns 400 error
- [ ] Invalid token returns partial success

---

## Sign-Off

- [ ] All tests passed
- [ ] Test results documented
- [ ] Issues logged (if any)
- [ ] Approved for production

**Tested By**: ______________  
**Date**: ______________  
**Status**: ______________
```

**Save as**: `docs/PUSH_TESTING_CHECKLIST.md`

**Acceptance**: ✅ Checklist created

---

### Step 12: Commit Test Documentation

**Terminal Commands**:
```powershell
git add docs/PUSH_NOTIFICATIONS_TEST_RESULTS.md
git add docs/PUSH_TESTING_CHECKLIST.md

git commit -m "feat: Complete E2E push notification testing - Story 7.4.6

- Tested on iOS device (real device)
- Tested on Android device/emulator
- Verified foreground notifications working
- Verified background notifications working
- Verified killed state notifications working
- Tested all notification types (review, offer, business, follower, message)
- Tested multi-device scenarios
- Tested error handling
- All routing working correctly
- Created test results documentation
- Created testing checklist for future tests

Changes:
- docs/PUSH_NOTIFICATIONS_TEST_RESULTS.md: Test results
- docs/PUSH_TESTING_CHECKLIST.md: Testing checklist

Epic: 7.4 - Push Notifications Infrastructure
Story: 7.4.6 - End-to-End Push Notification Testing

Result: ✅ ALL TESTS PASSED - Production Ready

🎉 EPIC 7.4 COMPLETE - Push Notifications System Fully Functional!"

git push origin mobile-app-setup
```

**Acceptance**: ✅ All changes committed

---

## ✅ Verification Checklist

- [ ] Android foreground tested
- [ ] Android background tested
- [ ] Android killed state tested
- [ ] iOS foreground tested
- [ ] iOS background tested
- [ ] iOS killed state tested
- [ ] All notification types tested
- [ ] Multi-device scenario tested
- [ ] Error handling tested
- [ ] Routing verified for all types
- [ ] Test results documented
- [ ] Testing checklist created
- [ ] All changes committed to git

**All items checked?** ✅ Story 7.4.6 is COMPLETE  
**🎉 EPIC 7.4 is COMPLETE (100%)**

---

## 🚨 Troubleshooting

### Issue: Notifications not received
**Solution**:
- Check push tokens in database
- Verify Edge Function deployed
- Check FCM/APNs secrets configured
- Ensure devices have internet
- Check device notification settings

### Issue: Routing not working
**Solution**:
- Check notification data format
- Verify routes exist in app
- Check console for errors
- Ensure NotificationRouter integrated

### Issue: iOS not working
**Solution**:
- **MUST use real device** (simulator doesn't work)
- Verify APNs key configured
- Check provisioning profile
- Ensure app has notification permission

---

## 📚 Additional Notes

### What We Tested
- ✅ Complete end-to-end flow
- ✅ All notification states
- ✅ All notification types
- ✅ Multi-device support
- ✅ Error scenarios
- ✅ Performance metrics

### EPIC 7.4 Complete Features
1. ✅ **Story 7.4.1**: Capacitor Push Plugin
2. ✅ **Story 7.4.2**: Firebase Cloud Messaging (Android)
3. ✅ **Story 7.4.3**: Apple Push Notifications (iOS)
4. ✅ **Story 7.4.4**: Supabase Edge Function
5. ✅ **Story 7.4.5**: Notification Routing
6. ✅ **Story 7.4.6**: E2E Testing

### Production Ready! 🚀
The push notification system is fully tested and ready for production use.

---

## 🔗 Related Documentation

- [Push Testing Best Practices](https://firebase.google.com/docs/cloud-messaging/concept-options)
- [APNs Testing Guide](https://developer.apple.com/documentation/usernotifications/testing_notifications_using_the_push_notification_console)
- [EPIC 7.4 Overview](../epics/EPIC_7.4_Push_Notifications.md)

---

**Story Status**: ⚪ PLANNED  
**Previous Story**: [STORY_7.4.5_Notification_Handling.md](./STORY_7.4.5_Notification_Handling.md)  
**Next Story**: None - EPIC 7.4 COMPLETE! 🎉  
**Epic Progress**: Story 6/6 complete (83% → 100%) ✅

🎊 **Congratulations! Complete push notification system is now production-ready!**
