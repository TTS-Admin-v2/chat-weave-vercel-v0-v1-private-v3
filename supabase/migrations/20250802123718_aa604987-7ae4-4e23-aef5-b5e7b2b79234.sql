-- Update workflow_configs table to support web scraping workflows
ALTER TABLE workflow_configs 
ADD COLUMN workflow_type TEXT DEFAULT 'web_scraping',
ADD COLUMN source_url TEXT,
ADD COLUMN scraping_config JSONB DEFAULT '{}';

-- Update file_processing table for web content
ALTER TABLE file_processing 
ADD COLUMN content_url TEXT,
ADD COLUMN content_title TEXT,
ADD COLUMN content_text TEXT,
ADD COLUMN embedding_data JSONB,
ADD COLUMN weaviate_object_id TEXT;

-- Update smart_tags table with additional fields
ALTER TABLE smart_tags 
ADD COLUMN tag_description TEXT,
ADD COLUMN extracted_entities JSONB DEFAULT '[]';
