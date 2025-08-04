"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  ChevronDown,
  ChevronRight,
  Settings,
  Search,
  FileText,
  Globe,
  Loader2,
  ExternalLink,
  Sparkles,
} from "lucide-react"
import { supabase } from "@/integrations/supabase/client"

interface ScrapedData {
  url: string
  title: string
  content: string
  markdown: string
}

interface FirecrawlOptions {
  // Crawler Options
  limit: number
  maxDepth: number
  excludePaths: string[]
  includePaths: string[]
  ignoreSitemap: boolean
  crawlEntireDomain: boolean
  allowBackwardCrawling: boolean
  allowExternalContentLinks: boolean

  // Page Options
  excludeTags: string[]
  includeTags: string[]
  waitFor: number
  timeout: number
  maxAge: number
  onlyMainContent: boolean
  parsePDF: boolean
  useStealthMode: boolean

  // Output Formats
  markdown: boolean
  links: boolean
  json: boolean

  // HTML Types
  htmlCleaned: boolean
  rawHtml: boolean

  // Screenshot Types
  viewportScreenshot: boolean
  fullPageScreenshot: boolean

  extractionSchema: any
}

interface FirecrawlScraperProps {
  onDataScraped: (data: ScrapedData[]) => void
}

export const FirecrawlScraper = ({ onDataScraped }: FirecrawlScraperProps) => {
  const { toast } = useToast()
  const [url, setUrl] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [extractQuery, setExtractQuery] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [scrapedData, setScrapedData] = useState<ScrapedData[]>([])
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [mode, setMode] = useState<"crawl" | "search" | "extract">("crawl")
  const [urlSuggestions, setUrlSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedSuggestion, setSelectedSuggestion] = useState(-1)
  const urlInputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  // Popular website suggestions for smart autocomplete
  const popularSites = [
    "github.com",
    "stackoverflow.com",
    "reddit.com",
    "medium.com",
    "dev.to",
    "techcrunch.com",
    "vercel.com",
    "supabase.com",
    "openai.com",
    "anthropic.com",
    "wikipedia.org",
    "docs.github.com",
    "developer.mozilla.org",
    "reactjs.org",
    "nextjs.org",
    "tailwindcss.com",
    "news.ycombinator.com",
    "producthunt.com",
  ]

  // Generate smart URL suggestions
  const generateSuggestions = (input: string) => {
    if (!input || input.length < 2) {
      setUrlSuggestions([])
      setShowSuggestions(false)
      return
    }

    const suggestions = []
    const lowerInput = input.toLowerCase()

    // Add protocol if missing for direct input
    if (!input.includes("://")) {
      if (!input.startsWith("http")) {
        suggestions.push(`https://${input}`)
      }
    }

    // Smart matching with popular sites
    const matchingSites = popularSites.filter(
      (site) => site.includes(lowerInput) || site.replace(/\.(com|org|net|io|dev)$/, "").includes(lowerInput),
    )

    matchingSites.forEach((site) => {
      suggestions.push(`https://${site}`)
    })

    // Add common TLD variations for domain-like inputs
    if (!input.includes(".") && !input.includes("://") && lowerInput.length > 2) {
      const commonTlds = [".com", ".org", ".net", ".io", ".dev"]
      commonTlds.forEach((tld) => {
        suggestions.push(`https://${input}${tld}`)
      })
    }

    // Add www variations
    if (input.includes(".") && !input.includes("://") && !input.startsWith("www.")) {
      suggestions.push(`https://www.${input}`)
    }

    const uniqueSuggestions = [...new Set(suggestions)].slice(0, 6)
    setUrlSuggestions(uniqueSuggestions)
    setShowSuggestions(uniqueSuggestions.length > 0)
  }

  // Handle URL input change with debouncing
  const handleUrlChange = (value: string) => {
    setUrl(value)
    setSelectedSuggestion(-1)

    // Debounce the API call
    const timeoutId = setTimeout(() => {
      generateSuggestions(value)
    }, 300)

    return () => clearTimeout(timeoutId)
  }

  // Handle suggestion selection
  const selectSuggestion = (suggestion: string) => {
    setUrl(suggestion)
    setShowSuggestions(false)
    setSelectedSuggestion(-1)
    urlInputRef.current?.focus()
  }

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || urlSuggestions.length === 0) return

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault()
        setSelectedSuggestion((prev) => (prev < urlSuggestions.length - 1 ? prev + 1 : 0))
        break
      case "ArrowUp":
        e.preventDefault()
        setSelectedSuggestion((prev) => (prev > 0 ? prev - 1 : urlSuggestions.length - 1))
        break
      case "Enter":
        if (selectedSuggestion >= 0) {
          e.preventDefault()
          selectSuggestion(urlSuggestions[selectedSuggestion])
        }
        break
      case "Escape":
        setShowSuggestions(false)
        setSelectedSuggestion(-1)
        break
    }
  }

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        !urlInputRef.current?.contains(event.target as Node)
      ) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Default options matching Firecrawl's defaults
  const [options, setOptions] = useState<FirecrawlOptions>({
    // Crawler Options
    limit: 10,
    maxDepth: 2,
    excludePaths: [],
    includePaths: [],
    ignoreSitemap: false,
    crawlEntireDomain: false,
    allowBackwardCrawling: false,
    allowExternalContentLinks: false,

    // Page Options
    excludeTags: [],
    includeTags: [],
    waitFor: 1000,
    timeout: 30000,
    maxAge: 14400000,
    onlyMainContent: true,
    parsePDF: false,
    useStealthMode: false,

    // Output Formats
    markdown: true,
    links: false,
    json: false,

    // HTML Types
    htmlCleaned: false,
    rawHtml: false,

    // Screenshot Types
    viewportScreenshot: false,
    fullPageScreenshot: false,

    extractionSchema: {
      title: { type: "string" },
      text: { type: "string" },
      summary: { type: "string" },
    },
  })

  const handleScrape = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setProgress(0)

    // Simulate progress
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev
        return prev + Math.random() * 10
      })
    }, 500)

    try {
      console.log(`Starting ${mode} for:`, mode === "search" ? searchQuery : url, "with options:", options)

      let functionName = "firecrawl-scraper"
      const body: any = { options }

      if (mode === "search") {
        functionName = "firecrawl-search"
        body.query = searchQuery
      } else if (mode === "extract") {
        functionName = "firecrawl-extract"
        body.url = url
        body.extractQuery = extractQuery
      } else {
        body.url = url
      }

      const { data, error } = await supabase.functions.invoke(functionName, { body })

      if (error) throw error

      if (data.success) {
        const formattedData = data.data.map((item: any) => ({
          url: item.metadata?.sourceURL || item.url || url,
          title: item.metadata?.title || item.title || "Untitled",
          content: item.extract?.text || item.markdown || item.content || "",
          markdown: item.markdown || "",
        }))

        setScrapedData(formattedData)
        onDataScraped(formattedData)
        setProgress(100)

        toast({
          title: "Success!",
          description: `${mode === "search" ? "Searched" : mode === "extract" ? "Extracted from" : "Scraped"} ${formattedData.length} pages successfully`,
        })
      } else {
        throw new Error(data.error || `Failed to ${mode} website`)
      }
    } catch (error) {
      console.error(`Error ${mode}ing:`, error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : `Failed to ${mode} website`,
        variant: "destructive",
      })
    } finally {
      clearInterval(progressInterval)
      setIsLoading(false)
      setTimeout(() => setProgress(0), 2000)
    }
  }

  const updateArrayOption = (key: keyof FirecrawlOptions, value: string) => {
    const items = value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
    setOptions((prev) => ({ ...prev, [key]: items }))
  }

  const getModeIcon = (currentMode: string) => {
    switch (currentMode) {
      case "crawl":
        return Globe
      case "search":
        return Search
      case "extract":
        return FileText
      default:
        return Globe
    }
  }

  const getModeColor = (currentMode: string) => {
    switch (currentMode) {
      case "crawl":
        return "text-blue-600"
      case "search":
        return "text-green-600"
      case "extract":
        return "text-purple-600"
      default:
        return "text-blue-600"
    }
  }

  return (
    <div className="space-y-6">
      {/* Mode Selection */}
      <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-600" />
            Scraping Mode
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={mode} onValueChange={(value) => setMode(value as "crawl" | "search" | "extract")}>
            <TabsList className="grid w-full grid-cols-3 bg-gray-100">
              <TabsTrigger
                value="crawl"
                className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                <Globe className="h-4 w-4" />
                Crawl Website
              </TabsTrigger>
              <TabsTrigger
                value="search"
                className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                <Search className="h-4 w-4" />
                Search Web
              </TabsTrigger>
              <TabsTrigger
                value="extract"
                className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                <FileText className="h-4 w-4" />
                Extract Data
              </TabsTrigger>
            </TabsList>

            <div className="mt-6">
              <TabsContent value="crawl" className="space-y-6 mt-0">
                <form onSubmit={handleScrape} className="space-y-6">
                  {/* URL Input with Smart Autocomplete */}
                  <div className="space-y-2">
                    <Label htmlFor="url" className="text-sm font-medium">
                      Website URL
                    </Label>
                    <div className="relative">
                      <Input
                        ref={urlInputRef}
                        id="url"
                        type="url"
                        value={url}
                        onChange={(e) => handleUrlChange(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onFocus={() => generateSuggestions(url)}
                        placeholder="https://example.com"
                        required
                        className="pr-10"
                      />
                      <Globe className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />

                      {/* Smart URL Suggestions */}
                      {showSuggestions && urlSuggestions.length > 0 && (
                        <div
                          ref={suggestionsRef}
                          className="absolute top-full left-0 right-0 mt-1 bg-white border border-border rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto"
                        >
                          {urlSuggestions.map((suggestion, index) => (
                            <div
                              key={suggestion}
                              className={`px-4 py-3 text-sm cursor-pointer transition-colors hover:bg-gray-50 ${
                                index === selectedSuggestion ? "bg-blue-50 text-blue-700" : ""
                              } ${index === 0 ? "rounded-t-lg" : ""} ${index === urlSuggestions.length - 1 ? "rounded-b-lg" : ""}`}
                              onClick={() => selectSuggestion(suggestion)}
                              onMouseEnter={() => setSelectedSuggestion(index)}
                            >
                              <div className="flex items-center gap-3">
                                <Globe className="h-4 w-4 text-muted-foreground" />
                                <span className="truncate">{suggestion}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-md"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Crawling...
                        </>
                      ) : (
                        <>
                          <Globe className="w-4 h-4 mr-2" />
                          Start Crawling
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Progress Bar */}
                  {isLoading && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Processing...</span>
                        <span className="text-muted-foreground">{Math.round(progress)}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>
                  )}
                </form>
              </TabsContent>

              <TabsContent value="search" className="space-y-6 mt-0">
                <form onSubmit={handleScrape} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="searchQuery" className="text-sm font-medium">
                      Search Query
                    </Label>
                    <div className="relative">
                      <Input
                        id="searchQuery"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Top restaurants in San Francisco"
                        required
                        className="pr-10"
                      />
                      <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white shadow-md"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Searching...
                        </>
                      ) : (
                        <>
                          <Search className="w-4 h-4 mr-2" />
                          Search Web
                        </>
                      )}
                    </Button>
                  </div>

                  {isLoading && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Searching...</span>
                        <span className="text-muted-foreground">{Math.round(progress)}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>
                  )}
                </form>
              </TabsContent>

              <TabsContent value="extract" className="space-y-6 mt-0">
                <form onSubmit={handleScrape} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="extractUrl" className="text-sm font-medium">
                      Website URL
                    </Label>
                    <div className="relative">
                      <Input
                        id="extractUrl"
                        type="url"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="https://example.com"
                        required
                        className="pr-10"
                      />
                      <Globe className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="extractQuery" className="text-sm font-medium">
                      Extraction Instructions
                    </Label>
                    <Textarea
                      id="extractQuery"
                      value={extractQuery}
                      onChange={(e) => setExtractQuery(e.target.value)}
                      placeholder="Extract the company name, mission statement, and key features from this website..."
                      className="min-h-[100px] resize-none"
                      required
                    />
                    <div className="text-xs text-muted-foreground text-right">
                      {extractQuery.length} / 300 characters
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-md"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Extracting...
                        </>
                      ) : (
                        <>
                          <FileText className="w-4 h-4 mr-2" />
                          Extract Data
                        </>
                      )}
                    </Button>
                  </div>

                  {isLoading && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Extracting...</span>
                        <span className="text-muted-foreground">{Math.round(progress)}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>
                  )}
                </form>
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>

      {/* Advanced Options */}
      <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
        <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-gray-50/50 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Settings className="w-5 h-5 text-gray-600" />
                  Advanced Options
                </CardTitle>
                {showAdvanced ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
              </div>
            </CardHeader>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <CardContent className="space-y-6 pt-0">
              {/* Crawler Options */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-semibold text-sm text-gray-700 flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    Crawler Settings
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="limit" className="text-xs font-medium text-muted-foreground">
                        Page Limit
                      </Label>
                      <Input
                        id="limit"
                        type="number"
                        min="1"
                        max="1000"
                        value={options.limit}
                        onChange={(e) =>
                          setOptions((prev) => ({ ...prev, limit: Number.parseInt(e.target.value) || 10 }))
                        }
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="maxDepth" className="text-xs font-medium text-muted-foreground">
                        Max Depth
                      </Label>
                      <Input
                        id="maxDepth"
                        type="number"
                        min="0"
                        max="10"
                        value={options.maxDepth}
                        onChange={(e) =>
                          setOptions((prev) => ({ ...prev, maxDepth: Number.parseInt(e.target.value) || 2 }))
                        }
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold text-sm text-gray-700 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Content Options
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="onlyMainContent"
                        checked={options.onlyMainContent}
                        onCheckedChange={(checked) => setOptions((prev) => ({ ...prev, onlyMainContent: checked }))}
                      />
                      <Label htmlFor="onlyMainContent" className="text-xs">
                        Extract main content only
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="parsePDF"
                        checked={options.parsePDF}
                        onCheckedChange={(checked) => setOptions((prev) => ({ ...prev, parsePDF: checked }))}
                      />
                      <Label htmlFor="parsePDF" className="text-xs">
                        Parse PDF files
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="useStealthMode"
                        checked={options.useStealthMode}
                        onCheckedChange={(checked) => setOptions((prev) => ({ ...prev, useStealthMode: checked }))}
                      />
                      <Label htmlFor="useStealthMode" className="text-xs">
                        Use stealth mode
                      </Label>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Results Preview */}
      {scrapedData.length > 0 && (
        <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-green-600" />
              Scraped Results
              <Badge variant="secondary" className="ml-2">
                {scrapedData.length} pages
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {scrapedData.slice(0, 3).map((item, index) => (
                <div key={index} className="p-4 border border-gray-200 rounded-lg bg-gray-50/50">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-sm line-clamp-1">{item.title}</h4>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2 truncate">{item.url}</p>
                  <p className="text-xs text-gray-600 line-clamp-3">{item.content.substring(0, 200)}...</p>
                </div>
              ))}
              {scrapedData.length > 3 && (
                <div className="text-center">
                  <Badge variant="outline">+{scrapedData.length - 3} more results</Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
