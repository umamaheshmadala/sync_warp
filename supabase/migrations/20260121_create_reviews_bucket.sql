-- Create 'reviews' storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('reviews', 'reviews', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: Everyone can view reviews (public)
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'reviews' );

-- Policy: Authenticated users can upload review photos
CREATE POLICY "Authenticated users can upload review photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'reviews' 
  AND auth.role() = 'authenticated'
);

-- Policy: Users can update their own review photos (if needed, though usually we just add/remove)
CREATE POLICY "Users can update own review photos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'reviews' 
  AND auth.uid() = owner
);

-- Policy: Users can delete their own review photos
CREATE POLICY "Users can delete own review photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'reviews' 
  AND auth.uid() = owner
);
