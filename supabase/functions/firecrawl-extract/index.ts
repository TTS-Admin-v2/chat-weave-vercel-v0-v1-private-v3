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
    const { url, extractQuery, options = {} } = await req.json()
    
    if (!url) {
      throw new Error('URL is required')
    }

    if (!extractQuery) {
      throw new Error('Extract query is required')
    }

    const apiKey = Deno.env.get('FIRECRAWL_API_KEY')
    if (!apiKey) {
      throw new Error('Firecrawl API key not configured')
    }

    console.log('Starting extract for URL:', url, 'with query:', extractQuery)
    
    const app = new FirecrawlApp({ apiKey })
    
    // Build extract options
    const extractOptions: any = {
      formats: ['extract'],
      extractorOptions: {
        mode: 'llm-extraction',
        extractionPrompt: extractQuery,
      }
    }

    // Add additional options if provided
    if (options.onlyMainContent !== undefined) {
      extractOptions.onlyMainContent = options.onlyMainContent
    }

    if (options.timeout && options.timeout > 0) {
      extractOptions.timeout = options.timeout
    }

    if (options.waitFor && options.waitFor > 0) {
      extractOptions.waitFor = options.waitFor
    }

    console.log('Final extract options:', JSON.stringify(extractOptions, null, 2))
    
    // Use scrapeUrl for single page extraction
    const extractResponse = await app.scrapeUrl(url, extractOptions)

    if (!extractResponse.success) {
      throw new Error(extractResponse.error || 'Failed to extract data')
    }

    console.log('Extract successful for URL:', url)

    // Format the response to match expected structure
    const formattedData = [{
      url: url,
      title: extractResponse.data?.metadata?.title || 'Extracted Data',
      content: JSON.stringify(extractResponse.data?.extract, null, 2) || '',
      markdown: extractResponse.data?.markdown || '',
      extract: extractResponse.data?.extract || {},
    }]

    return new Response(JSON.stringify({
      success: true,
      data: formattedData
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error in firecrawl-extract:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
