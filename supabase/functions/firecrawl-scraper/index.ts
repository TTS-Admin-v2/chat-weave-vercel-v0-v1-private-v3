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
    const { url, options = {} } = await req.json()
    
    if (!url) {
      throw new Error('URL is required')
    }

    const apiKey = Deno.env.get('FIRECRAWL_API_KEY')
    if (!apiKey) {
      throw new Error('Firecrawl API key not configured')
    }

    console.log('Starting crawl for URL:', url, 'with options:', options)
    
    const app = new FirecrawlApp({ apiKey })
    
    // Build formats array from boolean options
    const formats = []
    if (options.markdown) formats.push('markdown')
    if (options.links) formats.push('links')
    if (options.json) formats.push('extract')
    if (options.htmlCleaned) formats.push('html')
    if (options.rawHtml) formats.push('rawHtml')
    if (options.viewportScreenshot) formats.push('screenshot')
    if (options.fullPageScreenshot) formats.push('screenshot@fullPage')
    
    // Build crawl options from user input with defaults
    const crawlOptions: any = {
      limit: options.limit || 10,
      maxDepth: options.maxDepth || 2,
      ignoreSitemap: options.ignoreSitemap || false,
      scrapeOptions: {
        formats: formats.length > 0 ? formats : ['markdown'],
        onlyMainContent: options.onlyMainContent !== undefined ? options.onlyMainContent : true
      }
    }

    // Add extraction schema only if extract format is requested
    if (formats.includes('extract') && options.extractionSchema) {
      crawlOptions.scrapeOptions.extract = {
        schema: options.extractionSchema
      }
    }

    // Add optional parameters if provided
    if (options.includePaths && options.includePaths.length > 0) {
      crawlOptions.includePaths = options.includePaths
    }
    
    if (options.excludePaths && options.excludePaths.length > 0) {
      crawlOptions.excludePaths = options.excludePaths
    }

    if (options.waitFor && options.waitFor > 0) {
      crawlOptions.scrapeOptions.waitFor = options.waitFor
    }

    if (options.timeout && options.timeout > 0) {
      crawlOptions.scrapeOptions.timeout = options.timeout
    }

    if (options.maxAge && options.maxAge > 0) {
      crawlOptions.scrapeOptions.maxAge = options.maxAge
    }

    if (options.includeTags && options.includeTags.length > 0) {
      crawlOptions.scrapeOptions.includeTags = options.includeTags
    }

    if (options.excludeTags && options.excludeTags.length > 0) {
      crawlOptions.scrapeOptions.excludeTags = options.excludeTags
    }

    if (options.parsePDF) {
      crawlOptions.scrapeOptions.parsePDF = true
    }

    if (options.useStealthMode) {
      crawlOptions.scrapeOptions.actions = [{ type: 'wait', milliseconds: 2000 }]
    }

    console.log('Final crawl options:', JSON.stringify(crawlOptions, null, 2))
    
    // Use crawlUrl for comprehensive scraping
    const crawlResponse = await app.crawlUrl(url, crawlOptions)

    if (!crawlResponse.success) {
      throw new Error(crawlResponse.error || 'Failed to crawl website')
    }

    console.log('Crawl successful, found', crawlResponse.data?.length, 'pages')

    return new Response(JSON.stringify({
      success: true,
      data: crawlResponse.data || []
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error in firecrawl-scraper:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
