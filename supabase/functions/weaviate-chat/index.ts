import "https://deno.land/x/xhr@0.1.0/mod.ts"
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
    const { message, history = [] } = await req.json()
    
    if (!message) {
      throw new Error('Message is required')
    }

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    const weaviateUrl = Deno.env.get('WEAVIATE_URL')
    const weaviateApiKey = Deno.env.get('WEAVIATE_API_KEY')
    
    if (!openaiApiKey || !weaviateUrl || !weaviateApiKey) {
      throw new Error('OpenAI and Weaviate credentials not configured')
    }

    console.log('Processing chat message:', message)

    // Create embedding for the user's message
    const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: message,
        model: 'text-embedding-3-small',
        dimensions: 1536
      }),
    })

    if (!embeddingResponse.ok) {
      throw new Error('Failed to create embedding for message')
    }

    const embeddingData = await embeddingResponse.json()
    const queryVector = embeddingData.data[0].embedding

    // Search Weaviate for relevant content
    const searchQuery = {
      query: `{
        Get {
          ScrapedContent(
            nearVector: {
              vector: [${queryVector.join(',')}]
              distance: 0.7
            }
            limit: 5
          ) {
            title
            content
            url
            _additional {
              distance
            }
          }
        }
      }`
    }

    const weaviateResponse = await fetch(`${weaviateUrl}/v1/graphql`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${weaviateApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(searchQuery)
    })

    const searchResults = await weaviateResponse.json()
    const relevantContent = searchResults.data?.Get?.ScrapedContent || []

    console.log('Found', relevantContent.length, 'relevant documents')

    // Build context from search results
    const context = relevantContent
      .map(item => `Title: ${item.title}\nURL: ${item.url}\nContent: ${item.content.substring(0, 500)}...`)
      .join('\n\n---\n\n')

    // Generate response using OpenAI with context
    const systemPrompt = `You are an AI assistant that helps users interact with their Weaviate vector database containing scraped web content. 

You can:
1. Answer questions about the content in the database
2. Summarize and analyze the stored information
3. Help users understand what data they have
4. Suggest data modifications or improvements
5. Provide insights based on the scraped content

Context from the vector database:
${context}

If the user asks about modifying or deleting data, provide clear instructions but note that actual modifications would require additional implementation.

Be helpful, accurate, and reference specific content when possible.`

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-10).map((msg: any) => ({
        role: msg.role,
        content: msg.content
      })),
      { role: 'user', content: message }
    ]

    const chatResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.7,
        max_tokens: 1000
      }),
    })

    if (!chatResponse.ok) {
      throw new Error('Failed to generate chat response')
    }

    const chatData = await chatResponse.json()
    const response = chatData.choices[0].message.content

    console.log('Generated response length:', response.length)

    return new Response(JSON.stringify({
      success: true,
      response,
      relevantDocuments: relevantContent.length,
      sources: relevantContent.map(item => ({ title: item.title, url: item.url }))
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error in weaviate-chat:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
