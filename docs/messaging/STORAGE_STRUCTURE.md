# Message Attachments Storage Structure (STORY 8.1.3)

This document describes how message attachments are stored in Supabase Storage, how paths are structured, and how clients (web, iOS, Android) should interact with the `message-attachments` bucket.

---

## 1. Bucket Overview

- **Bucket ID/Name:** `message-attachments`
- **Visibility:** Private (`public = false`)
- **File size limit:** 25 MB (26214400 bytes)
- **Allowed MIME types:**
  - Images: `image/jpeg`, `image/png`, `image/gif`, `image/webp`
  - Video: `video/mp4`, `video/quicktime`, `video/webm`

All uploads and reads go through Supabase Storage with RLS enforced on `storage.objects`.

---

## 2. Path Structure

**Root convention:**

```text
message-attachments/
  {user_id}/
    {conversation_id}/
      {timestamp}-{original_filename}
      {timestamp}-{original_filename}_thumb.jpg  (optional thumbnail)
```

- `{user_id}` – UUID of the user who uploaded the file (`auth.uid()`).
- `{conversation_id}` – UUID of the conversation the attachment belongs to.
- `{timestamp}` – typically `Date.now()` in milliseconds.
- `{original_filename}` – original client filename (sanitized by the client).

**Example:**

```text
message-attachments/
  550e8400-e29b-41d4-a716-446655440000/
    8b7df143-d91c-4ecf-8d5a-2e0ffb9b8a5d/
      1704150000000-vacation.jpg
      1704150000000-vacation_thumb.jpg
      1704150120000-video.mp4
      1704150120000-video_thumb.jpg
```

---

## 3. Relationship to `messages` Table

The `messages` table stores references to attachment paths:

- `messages.media_urls` – `TEXT[]` of storage paths (e.g. `"user_id/conversation_id/ts-file.jpg"`).
- `messages.thumbnail_url` – `TEXT` path to a thumbnail image, if present.

**Important:**

- Paths stored in `media_urls` and `thumbnail_url` are **relative to the bucket**, e.g.
  - `"550e.../8b7d.../1704150000000-vacation.jpg"`
- When you call Storage APIs, you always address files via:
  - Bucket: `message-attachments`
  - Path: the string stored in `media_urls` / `thumbnail_url`.

RLS policies on `storage.objects` use these columns to decide if a user may view an object.

---

## 4. RLS Summary for Storage

RLS is enforced on `storage.objects` with three policies:

1. **Upload** – `Users can upload their own attachments`
   - `INSERT` policy.
   - Conditions:
     - `bucket_id = 'message-attachments'`.
     - First folder segment matches the authenticated user ID: `(storage.foldername(name))[1] = auth.uid()::text`.
   - Effect: users can only upload into their own `"{user_id}/..."` folder.

2. **View** – `Users can view conversation attachments`
   - `SELECT` policy.
   - Conditions:
     - `bucket_id = 'message-attachments'`.
     - User must be an active participant (`left_at IS NULL`) of a conversation that references the file in `messages.media_urls` or `messages.thumbnail_url`.
   - Effect: users only see attachments that belong to conversations they participate in.

3. **Delete** – `Users can delete their own attachments`
   - `DELETE` policy.
   - Conditions:

- Web (React/Next/etc.)
- iOS/Android via Capacitor (using the same JS code in a WebView).

### 6.1 Building the File Path

```typescript
// Pseudo-code for constructing a storage path
const userId = (await supabase.auth.getUser()).data.user!.id;
const timestamp = Date.now();
const path = `${userId}/${conversationId}/${timestamp}-${file.name}`;
```

### 6.2 Uploading a File

Web example (file from `<input type="file" />`):

```typescript
const { data, error } = await supabase.storage
  .from("message-attachments")
  .upload(path, file); // `file` is a File/Blob

if (error) {
  console.error("Upload failed", error);
} else {
  console.log("Uploaded", data?.path);
}
```

Mobile (Capacitor) example outline:

1. Use Capacitor Camera/Filesystem to get a file URI.
2. Convert that URI to a `Blob`/`File` object.
3. Call the same `.upload(path, blob)` API as the web example.

The resulting `path` should be saved to `messages.media_urls` for that message.

### 6.3 Generating a Signed URL (1-hour expiration)

```typescript
const { data, error } = await supabase.storage
  .from("message-attachments")
  .createSignedUrl(path, 3600); // 3600 seconds = 1 hour

if (error) {
  console.error("Signed URL failed", error);
} else {
  const signedUrl = data.signedUrl;
  // Use signedUrl in <img>, <video>, or native WebView
}
```

---

## 7. Thumbnails

Thumbnails are optional but recommended for performance.

- Convention: same path as original, with `_thumb` suffix before extension.
  - Original: `"{user_id}/{conversation_id}/{ts}-{filename}.jpg"`
  - Thumbnail: `"{user_id}/{conversation_id}/{ts}-{filename}_thumb.jpg"`
- Store thumbnail paths in `messages.thumbnail_url`.
- Generate thumbnails on the client (e.g. using `browser-image-compression`) or via a future serverless function.

---

## 8. Cleanup and Orphans

Some edge cases require cleanup:

- **Orphaned files** – upload succeeded but message row insert failed.
  - Strategy: periodic job that finds objects not referenced by any `messages.media_urls` / `thumbnail_url`.
- **Deleted messages** – message removed, file left behind.
  - Strategy: job that deletes any storage objects only referenced by deleted messages.

These jobs are planned for a later story (8.1.6).

---

## 9. Summary

- All attachments are stored under a single private bucket: `message-attachments`.
- Paths are structured `{user_id}/{conversation_id}/{timestamp}-{filename}`.
- RLS ensures users may upload and delete only under their own user folder, and view only attachments for conversations they are in.
- CORS must be configured in the Supabase Dashboard to allow web and Capacitor clients to access storage.
- Frontends use `supabase-js` for both upload and signed URL generation.
