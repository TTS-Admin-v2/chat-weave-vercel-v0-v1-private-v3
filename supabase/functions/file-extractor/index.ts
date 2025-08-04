import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

interface ExtractionRequest {
  fileProcessingId: string;
  storagePath: string;
  fileType: string;
  fileName: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileProcessingId, storagePath, fileType, fileName }: ExtractionRequest = await req.json();
    
    console.log(`Starting extraction for file: ${fileName} (${fileType})`);

    // Update status to processing
    await supabase
      .from('file_processing')
      .update({ 
        extraction_status: 'processing',
        processing_started_at: new Date().toISOString()
      })
      .eq('id', fileProcessingId);

    // Update extraction queue
    await supabase
      .from('file_extraction_queue')
      .update({ 
        status: 'processing',
        started_at: new Date().toISOString(),
        progress: 10
      })
      .eq('file_processing_id', fileProcessingId);

    // Download file from storage
    console.log(`Downloading file from storage: ${storagePath}`);
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('user-files')
      .download(storagePath);

    if (downloadError) {
      throw new Error(`Failed to download file: ${downloadError.message}`);
    }

    // Convert to ArrayBuffer for processing
    const arrayBuffer = await fileData.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    console.log(`File downloaded, size: ${uint8Array.length} bytes`);

    // Update progress
    await supabase
      .from('file_extraction_queue')
      .update({ progress: 30 })
      .eq('file_processing_id', fileProcessingId);

    let extractedContent: any = {};
    let contentText = '';

    // Process based on file type
    if (fileType.includes('text') || fileName.endsWith('.txt') || fileName.endsWith('.md')) {
      // Text file processing
      console.log('Processing as text file');
      const decoder = new TextDecoder('utf-8');
      contentText = decoder.decode(uint8Array);
      extractedContent = {
        type: 'text',
        content: contentText,
        metadata: {
          encoding: 'utf-8',
          lineCount: contentText.split('\n').length,
          characterCount: contentText.length
        }
      };
    } else if (fileType.includes('json') || fileName.endsWith('.json')) {
      // JSON file processing
      console.log('Processing as JSON file');
      const decoder = new TextDecoder('utf-8');
      const jsonText = decoder.decode(uint8Array);
      try {
        const jsonData = JSON.parse(jsonText);
        contentText = JSON.stringify(jsonData, null, 2);
        extractedContent = {
          type: 'json',
          content: jsonData,
          metadata: {
            keys: Object.keys(jsonData).length,
            size: jsonText.length
          }
        };
      } catch (e) {
        contentText = jsonText;
        extractedContent = {
          type: 'text',
          content: jsonText,
          error: 'Invalid JSON format'
        };
      }
    } else if (fileType.includes('zip') || fileName.endsWith('.zip')) {
      // ZIP file processing - for now, just store metadata
      console.log('Processing as ZIP file');
      extractedContent = {
        type: 'archive',
        format: 'zip',
        size: uint8Array.length,
        metadata: {
          note: 'ZIP extraction requires additional processing'
        }
      };
      contentText = `ZIP Archive: ${fileName} (${(uint8Array.length / (1024 * 1024)).toFixed(2)} MB)`;
    } else {
      // Generic binary file
      console.log('Processing as binary file');
      extractedContent = {
        type: 'binary',
        format: fileType,
        size: uint8Array.length,
        metadata: {
          mimeType: fileType,
          fileName: fileName
        }
      };
      contentText = `Binary file: ${fileName} (${fileType}) - ${(uint8Array.length / (1024 * 1024)).toFixed(2)} MB`;
    }

    // Update progress
    await supabase
      .from('file_extraction_queue')
      .update({ progress: 70 })
      .eq('file_processing_id', fileProcessingId);

    // Generate embeddings for text content if available
    let embeddingData = null;
    if (contentText && contentText.length > 0) {
      console.log('Generating embeddings for extracted content');
      try {
        const embeddingResponse = await supabase.functions.invoke('create-embeddings', {
          body: {
            text: contentText,
            metadata: {
              fileName: fileName,
              fileType: fileType,
              source: 'file_upload',
              extractedContent: extractedContent
            }
          }
        });

        if (embeddingResponse.data?.success) {
          embeddingData = embeddingResponse.data;
        }
      } catch (embeddingError) {
        console.error('Error generating embeddings:', embeddingError);
        // Don't fail the whole process if embeddings fail
      }
    }

    // Update progress
    await supabase
      .from('file_extraction_queue')
      .update({ progress: 90 })
      .eq('file_processing_id', fileProcessingId);

    // Update file processing record with extracted content
    await supabase
      .from('file_processing')
      .update({
        content_text: contentText,
        extracted_content: extractedContent,
        embedding_data: embeddingData,
        extraction_status: 'completed',
        status: 'completed',
        processing_completed_at: new Date().toISOString()
      })
      .eq('id', fileProcessingId);

    // Complete extraction queue
    await supabase
      .from('file_extraction_queue')
      .update({
        status: 'completed',
        progress: 100,
        completed_at: new Date().toISOString()
      })
      .eq('file_processing_id', fileProcessingId);

    // Generate smart tags
    if (contentText) {
      try {
        await supabase.functions.invoke('smart-tagging', {
          body: {
            content: contentText,
            title: fileName,
            url: storagePath,
            fileProcessingId: fileProcessingId
          }
        });
      } catch (tagError) {
        console.error('Smart tagging failed:', tagError);
        // Don't fail the process if tagging fails
      }
    }

    console.log(`File extraction completed for: ${fileName}`);

    return new Response(JSON.stringify({ 
      success: true,
      extractedContent,
      embeddingData: embeddingData ? true : false
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in file-extractor function:', error);
    
    // Try to update status to failed if we have the fileProcessingId
    try {
      const body = await req.json();
      if (body.fileProcessingId) {
        await supabase
          .from('file_processing')
          .update({
            extraction_status: 'failed',
            status: 'failed',
            error_message: error.message
          })
          .eq('id', body.fileProcessingId);

        await supabase
          .from('file_extraction_queue')
          .update({
            status: 'failed',
            error_message: error.message
          })
          .eq('file_processing_id', body.fileProcessingId);
      }
    } catch (updateError) {
      console.error('Error updating failed status:', updateError);
    }

    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
