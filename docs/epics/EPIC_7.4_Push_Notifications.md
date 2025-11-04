# Epic 7.4: Push Notifications Infrastructure ⚪ PLANNED

**Goal**: Implement complete push notification system with Firebase Cloud Messaging (Android) and Apple Push Notification Service (iOS).

**Progress**: 0/6 stories completed (0%)

**Dependencies**: EPIC 7.2 complete (push tokens table exists)

---

## Story 7.4.1: Capacitor Push Notifications Plugin ⚪ PLANNED
**What you'll see**: Push notification capability added to mobile apps.

**What needs to be built**:
- [ ] Install @capacitor/push-notifications
- [ ] Configure plugin in capacitor.config.ts
- [ ] Create pushNotifications service
- [ ] Request permissions on mobile
- [ ] Listen for notification events
- [ ] Handle notification tap actions

**Time Estimate**: 3-4 hours

---

## Story 7.4.2: Firebase Cloud Messaging Setup (Android) ⚪ PLANNED
**What you'll see**: Android devices can receive push notifications.

**What needs to be built**:
- [ ] Create Firebase project
- [ ] Add Android app to Firebase
- [ ] Download google-services.json
- [ ] Configure Android project with FCM
- [ ] Get FCM server key
- [ ] Test notification delivery to Android

**Time Estimate**: 3-4 hours

---

## Story 7.4.3: Apple Push Notification Service Setup (iOS) ⚪ PLANNED
**What you'll see**: iOS devices can receive push notifications.

**What needs to be built**:
- [ ] Create App ID in Apple Developer
- [ ] Enable Push Notifications capability
- [ ] Create APNs key (.p8 file)
- [ ] Configure Xcode project
- [ ] Add Push Notifications capability in Xcode
- [ ] Test notification delivery to iOS

**Time Estimate**: 3-4 hours
**Requires**: Apple Developer Account ($99/year)

---

## Story 7.4.4: Supabase Edge Function for Push Sending ⚪ PLANNED
**What you'll see**: Server-side function to send push notifications to users.

**What needs to be built**:
- [ ] Create send-push-notification Edge Function
- [ ] Integrate with FCM API
- [ ] Integrate with APNs API
- [ ] Fetch user tokens from push_tokens table
- [ ] Send to all user devices
- [ ] Handle errors and retries

**Time Estimate**: 4-5 hours

---

## Story 7.4.5: Notification Handling & Routing ⚪ PLANNED
**What you'll see**: Tapping notifications opens correct screen in app.

**What needs to be built**:
- [ ] Implement notification action handler
- [ ] Route to business profile on business notification
- [ ] Route to offers on offer notification
- [ ] Route to reviews on review notification
- [ ] Show in-app toast when notification received
- [ ] Test all notification types

**Time Estimate**: 3-4 hours

---

## Story 7.4.6: End-to-End Push Notification Testing ⚪ PLANNED
**What you'll see**: Complete push notification flow works on all platforms.

**What needs to be built**:
- [ ] Test on iOS device (real device, not simulator)
- [ ] Test on Android device/emulator
- [ ] Test foreground notifications
- [ ] Test background notifications
- [ ] Test notification tap actions
- [ ] Document testing procedure

**Time Estimate**: 2-3 hours

---

## Epic 7.4 Summary

**Total Stories**: 6 stories
**Estimated Timeline**: 2.5-3 weeks (18-24 hours)

**Deliverables**:
1. Push notification plugin configured
2. Firebase Cloud Messaging for Android
3. Apple Push Notification Service for iOS
4. Supabase Edge Function for sending
5. Notification routing and handling
6. Complete push notification system

**User Impact**: Users receive real-time notifications for new reviews, offers, followers, and business updates

**Next Epic**: EPIC 7.5 - App Store Preparation & Assets
