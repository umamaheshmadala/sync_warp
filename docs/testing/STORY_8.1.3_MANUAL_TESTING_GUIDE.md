# STORY 8.1.3 – Message Attachments Storage Manual Testing Guide

This guide describes how to manually verify the `message-attachments` storage bucket, RLS policies, and upload/download flows for web, iOS, and Android.

Use this alongside the STORY 8.1.3 specification and `docs/messaging/STORAGE_STRUCTURE.md`.

---

## 1. Prerequisites

- Supabase project configured (sync_warp).
- `message-attachments` bucket and RLS policies deployed (via migrations / SQL).
- At least two test users created and able to log into the app.
- Messaging flows using the `messages` table from STORY 8.1.1/8.1.2.
- Frontend environment(s):
  - Web dev (localhost) and/or hosted web app.
  - iOS and Android builds using Capacitor (optional but recommended).

---

## 2. Configuration Tests

### 2.1 Bucket properties

1. Open Supabase Dashboard → **Storage** → **Buckets**.
2. Confirm a bucket with ID and name `message-attachments` exists.
3. Click into the bucket and verify:
   - `public` is **disabled** (bucket is private).
   - `file_size_limit` is **25 MB**.
   - `allowed_mime_types` contain only the allowed image/video types.

### 2.2 CORS configuration

1. Open Supabase Dashboard → **Storage** → **Settings / CORS**.
2. Confirm CORS entry includes:
   - `https://yourdomain.com` (or your production domain).
   - `http://localhost:*`.
   - `capacitor://localhost`.
   - `http://localhost`.
3. Confirm allowed methods include `GET`, `POST`, `PUT`, `DELETE`.
4. Confirm `allowedHeaders` is `*` and `maxAge` is `3600`.

---

## 3. Upload Tests

### 3.1 Web – valid image upload

1. Log in as **User A** in the web app.
2. Open a conversation where User A is a participant.
3. Use the UI to attach and send an image (`.jpg` or `.png`).
4. Expected:
   - Message is created successfully.
   - A file appears in the `message-attachments` bucket under:
     - `user_id` = User A ID.
     - `conversation_id` = conversation ID.
     - Path format `{user_id}/{conversation_id}/{timestamp}-{filename}`.
   - `messages.media_urls` for that message contains the storage path.

### 3.2 Web – valid video upload

Repeat 3.1 with a small video file (`.mp4` or `.webm`).

Expected:
- Video is uploaded.
- Path structure is correct.
- Message row references the video path.

### 3.3 Web – oversize file (>25MB)

1. Attempt to upload a file larger than 25MB.
2. Expected:
   - Upload fails with a clear error.
   - No object created in `message-attachments`.

### 3.4 Web – invalid MIME type

1. Attempt to upload a `.zip` or `.exe` file.
2. Expected:
   - Upload fails due to MIME / bucket restrictions.
   - No object created.

### 3.5 Cross-user upload isolation

1. Log in as **User B**.
2. Attempt to upload a file into another user’s folder (by forcing a custom path in dev tools if possible).
3. Expected:
   - RLS prevents uploading into a `{user_id}` prefix different from `auth.uid()`.

> If your UI never exposes arbitrary paths, this can be simulated by a direct Storage API call in a dev script.

---

## 4. Access Tests

### 4.1 Conversation member can view attachments

1. Log in as **User A**.
2. Open a conversation where **User A** and **User B** participate.
3. Ensure messages exist with `media_urls` pointing to files.
4. Verify images/videos render for User A.

Repeat as **User B**.

Expected:
- Both participants can see attachments for that conversation.

### 4.2 Non-member cannot view attachments

1. Log in as **User C** (not a participant in the conversation).
2. Directly open the same attachment URL (using a signed URL generated for User A/B) in User C’s session, or issue a direct Storage fetch using User C’s auth.
3. Expected:
   - RLS denies access; Attachment does not load.

### 4.3 Signed URL behavior

1. Generate a signed URL for an attachment with `expiresIn = 3600`.
2. Verify that the URL works for the first hour.
3. After >1 hour, attempt to use the same URL again.

Expected:
- Before expiry: file loads successfully.
- After expiry: URL no longer grants access.

---

## 5. Delete Tests

### 5.1 User can delete their own attachment

1. Log in as **User A**.
2. Locate an attachment uploaded by User A.
3. Use the UI or an admin tool to trigger delete of that attachment.

Expected:
- The file is removed from `message-attachments`.
- The corresponding `messages.media_urls` entry is cleared or the message is handled gracefully (depending on UI behavior).

### 5.2 User cannot delete others’ attachments

1. Log in as **User B**.
2. Attempt to delete an attachment whose path is under User A’s `{user_id}` prefix.

Expected:
- RLS prevents delete; operation fails.

---

## 6. Mobile Tests (iOS & Android via Capacitor)

> These tests can be run on device or simulator/emulator.

### 6.1 iOS – image upload

1. Open the iOS app as **User A**.
2. Use the Camera or Photo Library to select an image.
3. Send it as a message in a conversation.

Expected:
- Upload succeeds without CORS issues.
- Attachment appears in the same path structure as web uploads.
- Image renders using a signed URL.

### 6.2 Android – image upload

Repeat 6.1 on Android (Camera or Gallery).

Expected:
- Same as iOS.

### 6.3 Offline behavior (optional)

1. Put the device in airplane mode.
2. Attempt to upload an image.
3. Expected:
   - Upload fails or is queued according to the app’s offline strategy (Epic 8.4).

---

## 7. Performance Tests

### 7.1 Upload time

1. Measure time to upload a ~5MB image on a normal network.
2. Expected: < 3 seconds (target from story).

### 7.2 Signed URL generation

1. Log timestamp before and after calling `.createSignedUrl()`.
2. Expected: < 100ms in typical conditions.

---

## 8. Acceptance Checklist Mapping

Use this table to confirm STORY 8.1.3 is satisfied:

- [ ] Bucket exists and is private (`message-attachments`).
- [ ] File size limit is 25MB.
- [ ] Only allowed MIME types accepted.
- [ ] CORS configured correctly for web + mobile.
- [ ] User can upload image/video to their own folder.
- [ ] User CANNOT upload to another user’s folder.
- [ ] User can view attachments in their conversations.
- [ ] User CANNOT view attachments from other conversations.
- [ ] Signed URLs work and expire at 1 hour.
- [ ] User can delete their own attachments.
- [ ] User CANNOT delete others’ attachments.
- [ ] Unauthorized access attempts are blocked.
- [ ] Basic performance targets met (upload & signed URL).

When all items above are checked, STORY 8.1.3 can be considered fully verified.
