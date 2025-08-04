-- Make user-files bucket public and add policies for unauthenticated access
UPDATE storage.buckets 
SET public = true 
WHERE id = 'user-files';

-- Create policies for public access to user-files bucket
CREATE POLICY "Public can view files in user-files bucket" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'user-files');

CREATE POLICY "Public can upload files to user-files bucket" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'user-files');

CREATE POLICY "Public can update files in user-files bucket" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'user-files');

CREATE POLICY "Public can delete files from user-files bucket" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'user-files');

-- Disable RLS for file processing tables to allow unauthenticated operations
ALTER TABLE public.file_processing DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_extraction_queue DISABLE ROW LEVEL SECURITY;
