import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { className, objects } = await req.json()
    
    if (!className || !objects || !Array.isArray(objects)) {
      throw new Error('className and objects array are required')
    }

    const weaviateUrl = Deno.env.get('WEAVIATE_URL') || 'https://otv0nclnrjge62eizqvxhg.c0.us-west3.gcp.weaviate.cloud'
    const weaviateApiKey = Deno.env.get('WEAVIATE_API_KEY') || 'NzRFTWRHclVoZmFobERzZl9nZGlvWTZjMWt5b3Z1bWg3ekwvU2FWa09QcUJMTHZON3RUV2pIQ1ZEdzlrPV92MjAw'
    
    if (!weaviateUrl || !weaviateApiKey) {
      throw new Error('Weaviate URL and API key not configured')
    }

    console.log(`Uploading ${objects.length} objects to Weaviate class: ${className}`)

    // First, ensure the class exists
    const classSchema = {
      class: className,
      description: `Class for storing scraped content with embeddings`,
      vectorizer: "none", // We provide our own vectors
      properties: [
        {
          name: "title",
          dataType: ["text"],
          description: "Title of the content"
        },
        {
          name: "content", 
          dataType: ["text"],
          description: "Main content text"
        },
        {
          name: "url",
          dataType: ["text"],
          description: "Source URL"
        },
        {
          name: "source",
          dataType: ["text"],
          description: "Source of the data"
        }
      ]
    }

    // Create class if it doesn't exist
    try {
      const createClassResponse = await fetch(`${weaviateUrl}/v1/schema`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${weaviateApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(classSchema)
      })
      
      if (createClassResponse.status !== 200 && createClassResponse.status !== 422) {
        console.error('Failed to create class:', await createClassResponse.text())
      }
    } catch (error) {
      console.log('Class might already exist:', error.message)
    }

    // Upload objects in batches
    const batchSize = 100
    let uploaded = 0

    for (let i = 0; i < objects.length; i += batchSize) {
      const batch = objects.slice(i, i + batchSize)
      
      const batchRequest = {
        objects: batch.map(obj => ({
          class: className,
          properties: obj.properties,
          vector: obj.vector
        }))
      }

      const batchResponse = await fetch(`${weaviateUrl}/v1/batch/objects`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${weaviateApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(batchRequest)
      })

      if (!batchResponse.ok) {
        const error = await batchResponse.text()
        throw new Error(`Weaviate batch upload error: ${error}`)
      }

      const batchResult = await batchResponse.json()
      uploaded += batchResult.length || batch.length
      
      console.log(`Uploaded batch ${Math.floor(i/batchSize) + 1}, total: ${uploaded}`)
    }

    console.log(`Successfully uploaded ${uploaded} objects to Weaviate`)

    return new Response(JSON.stringify({
      success: true,
      uploaded,
      className
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error in weaviate-upload:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
