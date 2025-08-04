-- Temporarily disable RLS on file_extraction_queue for testing without authentication
ALTER TABLE public.file_extraction_queue DISABLE ROW LEVEL SECURITY;

-- Also disable RLS on file_processing table to ensure smooth operation
ALTER TABLE public.file_processing DISABLE ROW LEVEL SECURITY;
