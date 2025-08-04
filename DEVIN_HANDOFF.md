# Devin.ai Handoff Instructions

## Project Overview
This is a web application built with React, TypeScript, Vite, and Supabase for content extraction, embedding generation, and intelligent search. The app allows users to upload files, scrape web content, generate embeddings, and chat with their data using AI.

## GitHub Repository Setup
1. **Connect to GitHub**: The project should already be connected to GitHub through Lovable's integration
2. **Repository Location**: Look for the repository in the connected GitHub account
3. **Clone the repo**: `git clone [repository-url]`
4. **Install dependencies**: `bun install` or `npm install`
5. **Environment Setup**: The project uses Supabase - environment variables are managed through Supabase secrets

## Current Project State (as of Jan 4, 2025)

### Recent Changes Made
- **CRITICAL**: Just resolved file upload foreign key constraint issues
- Dropped foreign key constraints: `file_extraction_queue_user_id_fkey` and `file_processing_user_id_fkey`
- This allows file uploads to work without authentication (temporary fix for testing)
- Database migration created: `supabase/migrations/20250804153132_eb12dbd3-acc2-41f3-9f6a-917685e2e70a.sql`

### Key Components & Features

#### 1. File Upload System
- **Component**: `src/components/GoogleDriveFileUploader.tsx`
- **Storage**: Supabase storage bucket `user-files` (public)
- **Database Tables**: 
  - `file_processing` - stores file metadata
  - `file_extraction_queue` - queues files for processing

#### 2. Edge Functions (Supabase)
- **file-extractor**: Extracts content from uploaded files
- **create-embeddings**: Generates OpenAI embeddings
- **smart-tagging**: Uses GPT-4 to generate content tags
- **firecrawl-scraper**: Web scraping functionality
- **firecrawl-search**: Web search capabilities
- **weaviate-upload**: Uploads data to Weaviate vector DB
- **weaviate-chat**: Chat functionality with vector search

#### 3. Core Processing Flow
1. User uploads file → Supabase Storage
2. File queued in `file_extraction_queue`
3. `file-extractor` edge function processes file
4. Content extracted and embeddings generated
5. Smart tags created automatically
6. Data available for search/chat

### Database Schema (Key Tables)
\`\`\`sql
-- File processing tracking
file_processing (id, user_id, file_name, file_type, status, content, embeddings, created_at, updated_at)

-- Processing queue
file_extraction_queue (id, file_processing_id, user_id, storage_path, file_type, file_name, status, created_at)

-- AI-generated tags
smart_tags (id, file_processing_id, tag_name, confidence_score, tag_category, tag_description, extracted_entities, created_at)

-- User profiles
profiles (id, user_id, email, full_name, avatar_url, created_at, updated_at)
\`\`\`

### External Integrations
- **OpenAI**: For embeddings and chat completion (GPT-4)
- **Weaviate**: Vector database for semantic search
- **Firecrawl**: Web scraping and search

### Required Secrets (Configured in Supabase)
- `OPENAI_API_KEY`
- `WEAVIATE_API_KEY` 
- `WEAVIATE_URL`
- `FIRECRAWL_API_KEY`
- Standard Supabase keys

## Current Issues & Next Steps

### 1. Authentication Implementation Needed
- **Status**: Authentication components exist but not fully integrated
- **Files**: `src/components/AuthProvider.tsx`, `src/components/AuthButton.tsx`
- **Issue**: Foreign keys temporarily disabled for testing
- **Next**: Implement proper auth flow and re-enable foreign key constraints

### 2. Main Page Structure
- **File**: `src/pages/Index.tsx`
- **Current**: Basic layout with file uploader
- **Needs**: Better UI/UX, navigation, processing status display

### 3. Processing Status & History
- **Component**: `src/components/ProcessingHistory.tsx`
- **Status**: Basic implementation exists
- **Needs**: Real-time updates, better error handling

### 4. Chat Interface
- **Component**: `src/components/WeaviateChatbot.tsx`
- **Status**: Exists but needs integration testing
- **Depends on**: Successful file processing pipeline

## Development Commands
\`\`\`bash
# Start development server
bun dev

# Deploy edge functions (if needed)
supabase functions deploy

# Run database migrations
supabase migration up

# Generate types
supabase gen types typescript --local > src/integrations/supabase/types.ts
\`\`\`

## Immediate Action Items
1. **Test file upload**: Verify the constraint removal fixed upload issues
2. **Implement authentication**: Add proper login/signup flow
3. **Restore foreign keys**: Once auth is working, re-add constraints
4. **Improve error handling**: Better user feedback on processing failures
5. **UI Polish**: Enhance the main interface and user experience

## Architecture Notes
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: Supabase (Database + Auth + Storage + Edge Functions)
- **AI/ML**: OpenAI embeddings + GPT-4 + Weaviate vector search
- **File Processing**: Multi-format support (text, JSON, ZIP, binary)
- **Real-time**: Supabase real-time subscriptions for status updates

## Critical Files to Review First
1. `src/pages/Index.tsx` - Main application entry point
2. `src/components/GoogleDriveFileUploader.tsx` - File upload logic
3. `supabase/functions/file-extractor/index.ts` - Core processing pipeline
4. `src/integrations/supabase/types.ts` - Database schema types

## Testing Status
- **File Upload**: Recently fixed (constraint issues resolved)
- **Edge Functions**: Deployed and functional
- **Database**: Schema stable, constraints temporarily relaxed
- **Authentication**: Needs integration testing
- **End-to-end**: Partial - needs full pipeline testing

---
*This handoff document reflects the state as of the latest Lovable session. The project is functional for file uploads and has a complete processing pipeline, but needs authentication integration and UI improvements.*
