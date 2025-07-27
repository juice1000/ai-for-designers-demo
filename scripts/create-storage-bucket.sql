-- Create the 'images' storage bucket for post images
-- Run this in your Supabase SQL editor

-- Create the storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('images', 'images', true)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies for the images bucket
-- Allow public read access
CREATE POLICY "Public read access for images" ON storage.objects
FOR SELECT USING (bucket_id = 'images');

-- Allow authenticated users to upload images
CREATE POLICY "Allow authenticated uploads to images" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'images' AND auth.role() = 'authenticated');

-- Allow users to delete their own images (optional - you might want to restrict this)
CREATE POLICY "Allow authenticated deletes from images" ON storage.objects
FOR DELETE USING (bucket_id = 'images' AND auth.role() = 'authenticated');

-- Allow authenticated users to update image metadata
CREATE POLICY "Allow authenticated updates to images" ON storage.objects
FOR UPDATE USING (bucket_id = 'images' AND auth.role() = 'authenticated');

-- Note: Since we're using the service role key in our API routes,
-- these policies will be bypassed. This setup is for if you want
-- to allow direct client-side uploads in the future.
