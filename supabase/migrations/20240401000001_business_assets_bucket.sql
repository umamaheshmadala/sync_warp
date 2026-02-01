-- Create the business-assets bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('business-assets', 'business-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Policies --
-- We removed 'ALTER TABLE' as it requires ownership. RLS is enabled by default on storage.objects.

-- Allow public read access to business-assets
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'business-assets' );

-- Allow authenticated users to upload files to business-assets
DROP POLICY IF EXISTS "Authenticated Insert" ON storage.objects;
CREATE POLICY "Authenticated Insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'business-assets' );

-- Allow authenticated users to update files in business-assets
DROP POLICY IF EXISTS "Authenticated Update" ON storage.objects;
CREATE POLICY "Authenticated Update"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'business-assets' );

-- Allow authenticated users to delete files in business-assets
DROP POLICY IF EXISTS "Authenticated Delete" ON storage.objects;
CREATE POLICY "Authenticated Delete"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'business-assets' );
