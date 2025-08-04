import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import FirecrawlApp from 'https://esm.sh/@mendable/firecrawl-js@1.7.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { query, options = {} } = await req.json()
    
    if (!query) {
      throw new Error('Search query is required')
    }

    const apiKey = Deno.env.get('FIRECRAWL_API_KEY')
    if (!apiKey) {
      throw new Error('Firecrawl API key not configured')
    }

    console.log('Starting search for query:', query, 'with options:', options)
    
    const app = new FirecrawlApp({ apiKey })
    
    // Build search options from user input with defaults
    const searchOptions: any = {
      limit: options.limit || 5,
      tbs: options.timeBased || undefined,
      filter: options.location || undefined,
    }

    // Add scraping options if user wants to scrape content from search results
    if (options.onlyMainContent) {
      searchOptions.scrapeOptions = {
        formats: ['markdown'],
        onlyMainContent: true,
      }
    }

    console.log('Final search options:', JSON.stringify(searchOptions, null, 2))
    
    // Use search method for web search
    const searchResponse = await app.search(query, searchOptions)

    if (!searchResponse.success) {
      throw new Error(searchResponse.error || 'Failed to search')
    }

    console.log('Search successful, found', searchResponse.data?.length, 'results')

    return new Response(JSON.stringify({
      success: true,
      data: searchResponse.data || []
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error in firecrawl-search:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
