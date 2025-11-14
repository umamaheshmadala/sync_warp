-- STORY 8.1.3: Storage Bucket Setup for Message Attachments
-- Creates the message-attachments bucket and RLS policies on storage.objects.

-- Task 1: Create bucket with configuration
INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
) VALUES (
  'message-attachments',
  'message-attachments',
  false, -- Private bucket
  26214400, -- 25 MB in bytes
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/quicktime',
    'video/webm'
  ]
);

-- Task 2: Create RLS Policies on storage.objects

-- Policy 1: Upload Policy
CREATE POLICY "Users can upload their own attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'message-attachments' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 2: View Policy (conversation members only)
CREATE POLICY "Users can view conversation attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'message-attachments' AND
  EXISTS (
    SELECT 1
    FROM public.messages m
    JOIN public.conversation_participants cp ON cp.conversation_id = m.conversation_id
    WHERE
      cp.user_id = auth.uid() AND
      cp.left_at IS NULL AND
      (m.media_urls @> ARRAY[storage.objects.name] OR
       m.thumbnail_url = storage.objects.name)
  )
);

-- Policy 3: Delete Policy
CREATE POLICY "Users can delete their own attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'message-attachments' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
