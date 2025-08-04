import "https://deno.land/x/xhr@0.1.0/mod.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { content, title, url, fileProcessingId } = await req.json()
    
    if (!content || !fileProcessingId) {
      throw new Error('Content and fileProcessingId are required')
    }

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('Generating smart tags for content:', title || url)

    // Create smart tags using OpenAI
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an AI assistant that analyzes content and generates relevant tags. 
            Generate 3-8 relevant tags for the given content. Return the result as a JSON array of objects with this structure:
            [
              {
                "tag_name": "string",
                "confidence_score": 0.0-1.0,
                "tag_category": "topic|industry|content_type|sentiment|difficulty",
                "tag_description": "brief description of why this tag applies"
              }
            ]
            
            Focus on:
            - Main topics and themes
            - Industry or domain
            - Content type (tutorial, news, documentation, etc.)
            - Difficulty level if applicable
            - Key technologies or tools mentioned
            
            Keep tags concise (1-3 words) and relevant.`
          },
          {
            role: 'user',
            content: `Title: ${title || 'No title'}
            URL: ${url || 'No URL'}
            Content: ${content.substring(0, 4000)}`
          }
        ],
        temperature: 0.3,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`OpenAI API error: ${error}`)
    }

    const aiResponse = await response.json()
    const tagsText = aiResponse.choices[0].message.content

    // Parse the JSON response
    let tags: any[]
    try {
      tags = JSON.parse(tagsText)
    } catch (e) {
      console.error('Failed to parse AI response as JSON:', tagsText)
      // Fallback: extract basic tags from content
      tags = [
        {
          tag_name: "web_content",
          confidence_score: 0.9,
          tag_category: "content_type",
          tag_description: "Web scraped content"
        }
      ]
    }

    // Store tags in database
    const tagInserts = tags.map(tag => ({
      file_processing_id: fileProcessingId,
      tag_name: tag.tag_name,
      confidence_score: tag.confidence_score,
      tag_category: tag.tag_category,
      tag_description: tag.tag_description,
      extracted_entities: tag.entities || []
    }))

    const { error: insertError } = await supabase
      .from('smart_tags')
      .insert(tagInserts)

    if (insertError) {
      console.error('Error inserting tags:', insertError)
      throw insertError
    }

    console.log(`Successfully generated ${tags.length} smart tags`)

    return new Response(JSON.stringify({
      success: true,
      tags: tags,
      count: tags.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error in smart-tagging:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
