-- Fix for Story 8.1.3 issues: "Unable to send images"
-- The code uses getPublicUrl() which requires a public bucket for <img> tags to work without auth headers.
-- This migration updates the existing bucket to be public, or creates it if missing.

-- 1. Upsert the bucket
INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
) VALUES (
  'message-attachments',
  'message-attachments',
  true, -- Set to PUBLIC
  26214400, -- 25 MB
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/quicktime',
    'video/webm'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 26214400,
  allowed_mime_types = ARRAY[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/quicktime',
    'video/webm'
  ];

-- 2. Ensure Policies Exist (Idempotent)

-- Policy 1: Upload
DROP POLICY IF EXISTS "Users can upload their own attachments" ON storage.objects;
CREATE POLICY "Users can upload their own attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'message-attachments' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 2: View (Expanded for Public usage, but RLS still good practice)
-- Since it's public, direct URL access works, but SELECT via API still needs RLS.
DROP POLICY IF EXISTS "Users can view conversation attachments" ON storage.objects;
CREATE POLICY "Users can view conversation attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'message-attachments' AND
  (
    -- Allow user to see their own uploads
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    -- Allow viewing if part of conversation (requires message existence)
    EXISTS (
      SELECT 1
      FROM public.messages m
      JOIN public.conversation_participants cp ON cp.conversation_id = m.conversation_id
      WHERE
        cp.user_id = auth.uid() AND
        (m.media_urls @> ARRAY[storage.objects.name] OR
         m.thumbnail_url = storage.objects.name)
    )
  )
);

-- Policy 3: Delete
DROP POLICY IF EXISTS "Users can delete their own attachments" ON storage.objects;
CREATE POLICY "Users can delete their own attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'message-attachments' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
