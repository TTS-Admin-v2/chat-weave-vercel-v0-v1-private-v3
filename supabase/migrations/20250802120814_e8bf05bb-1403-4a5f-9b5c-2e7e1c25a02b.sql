-- Update workflow_configs table to support web scraping workflows
ALTER TABLE workflow_configs 
DROP COLUMN google_drive_folder_id,
DROP COLUMN guru_collection_id,
ADD COLUMN workflow_type TEXT DEFAULT 'web_scraping',
ADD COLUMN source_url TEXT,
ADD COLUMN scraping_config JSONB DEFAULT '{}';

-- Update file_processing table for web content
ALTER TABLE file_processing 
DROP COLUMN google_drive_file_id,
DROP COLUMN guru_card_id,
ADD COLUMN content_url TEXT,
ADD COLUMN content_title TEXT,
ADD COLUMN content_text TEXT,
ADD COLUMN embedding_vector VECTOR(1536),
ADD COLUMN weaviate_object_id TEXT;

-- Create index for vector similarity search
CREATE INDEX IF NOT EXISTS idx_file_processing_embedding ON file_processing USING ivfflat (embedding_vector vector_cosine_ops);

-- Update smart_tags table with additional fields
ALTER TABLE smart_tags 
ADD COLUMN tag_description TEXT,
ADD COLUMN extracted_entities JSONB DEFAULT '[]';
