-- Temporarily drop foreign key constraints for testing without authentication
ALTER TABLE public.file_extraction_queue DROP CONSTRAINT IF EXISTS file_extraction_queue_user_id_fkey;

-- Also check if there are any other user_id foreign key constraints that might cause issues
ALTER TABLE public.file_processing DROP CONSTRAINT IF EXISTS file_processing_user_id_fkey;
