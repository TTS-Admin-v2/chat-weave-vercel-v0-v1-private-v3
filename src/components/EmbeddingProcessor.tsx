"use client"

import { useState, useImperativeHandle, forwardRef } from "react"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { supabase } from "@/integrations/supabase/client"
import {
  Sparkles,
  Zap,
  CheckCircle,
  AlertCircle,
  Loader2,
  Brain,
  FileText,
  Globe,
  BarChart3,
  Eye,
  Settings,
  Play,
  Pause,
  RefreshCw,
} from "lucide-react"

interface ScrapedData {
  url: string
  title: string
  content: string
  markdown: string
}

interface EmbeddingData {
  id: string
  content: string
  title: string
  url?: string
  embedding: number[]
  metadata?: any
  status: "pending" | "processing" | "completed" | "error"
  error?: string
}

interface EmbeddingProcessorProps {
  scrapedData: ScrapedData[]
  onEmbeddingsCreated?: (embeddings: EmbeddingData[]) => void
}

export interface EmbeddingProcessorRef {
  processEmbeddings: () => Promise<void>
}

export const EmbeddingProcessor = forwardRef<EmbeddingProcessorRef, EmbeddingProcessorProps>(
  ({ scrapedData, onEmbeddingsCreated }, ref) => {
    const { toast } = useToast()
    const [isProcessing, setIsProcessing] = useState(false)
    const [isPaused, setIsPaused] = useState(false)
    const [progress, setProgress] = useState(0)
    const [embeddings, setEmbeddings] = useState<EmbeddingData[]>([])
    const [currentlyProcessing, setCurrentlyProcessing] = useState<string>("")
    const [processingStats, setProcessingStats] = useState({
      total: 0,
      completed: 0,
      failed: 0,
      avgTime: 0,
    })

    useImperativeHandle(ref, () => ({
      processEmbeddings,
    }))

    const processEmbeddings = async () => {
      if (scrapedData.length === 0) {
        toast({
          title: "No Data",
          description: "No scraped data available to process",
          variant: "destructive",
        })
        return
      }

      setIsProcessing(true)
      setIsPaused(false)
      setProgress(0)

      // Initialize embeddings with pending status
      const initialEmbeddings: EmbeddingData[] = scrapedData.map((data, index) => ({
        id: `embedding-${index}`,
        content: data.content,
        title: data.title,
        url: data.url,
        embedding: [],
        metadata: {
          source: "scraped",
          originalUrl: data.url,
          processedAt: new Date().toISOString(),
        },
        status: "pending",
      }))

      setEmbeddings(initialEmbeddings)
      setProcessingStats({
        total: scrapedData.length,
        completed: 0,
        failed: 0,
        avgTime: 0,
      })

      const startTime = Date.now()
      let completedCount = 0
      let failedCount = 0
      const processingTimes: number[] = []

      try {
        for (let i = 0; i < scrapedData.length; i++) {
          if (isPaused) {
            toast({
              title: "Processing Paused",
              description: "Embedding generation has been paused",
            })
            break
          }

          const data = scrapedData[i]
          const itemStartTime = Date.now()

          setCurrentlyProcessing(data.title)

          // Update status to processing
          setEmbeddings((prev) => prev.map((emb, index) => (index === i ? { ...emb, status: "processing" } : emb)))

          try {
            const { data: embeddingResult, error } = await supabase.functions.invoke("create-embeddings", {
              body: {
                content: data.content,
                title: data.title,
                url: data.url,
                metadata: {
                  source: "scraped",
                  originalUrl: data.url,
                  processedAt: new Date().toISOString(),
                },
              },
            })

            if (error) throw error

            const itemEndTime = Date.now()
            const processingTime = itemEndTime - itemStartTime
            processingTimes.push(processingTime)

            // Update embedding with result
            setEmbeddings((prev) =>
              prev.map((emb, index) =>
                index === i
                  ? {
                      ...emb,
                      embedding: embeddingResult.embedding || [],
                      status: "completed",
                      metadata: {
                        ...emb.metadata,
                        embeddingModel: embeddingResult.model,
                        dimensions: embeddingResult.embedding?.length || 0,
                        processingTime: processingTime,
                      },
                    }
                  : emb,
              ),
            )

            completedCount++
          } catch (error) {
            console.error(`Error processing embedding for ${data.title}:`, error)

            // Update embedding with error
            setEmbeddings((prev) =>
              prev.map((emb, index) =>
                index === i
                  ? {
                      ...emb,
                      status: "error",
                      error: error instanceof Error ? error.message : "Unknown error",
                    }
                  : emb,
              ),
            )

            failedCount++
          }

          const currentProgress = ((i + 1) / scrapedData.length) * 100
          setProgress(currentProgress)

          const avgTime =
            processingTimes.length > 0 ? processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length : 0

          setProcessingStats({
            total: scrapedData.length,
            completed: completedCount,
            failed: failedCount,
            avgTime: Math.round(avgTime),
          })

          // Small delay to prevent overwhelming the API
          await new Promise((resolve) => setTimeout(resolve, 100))
        }

        const finalEmbeddings = embeddings.filter((emb) => emb.status === "completed")

        if (completedCount > 0) {
          toast({
            title: "Processing Complete!",
            description: `Successfully created ${completedCount} embeddings${failedCount > 0 ? `, ${failedCount} failed` : ""}`,
          })

          onEmbeddingsCreated?.(finalEmbeddings)
        }

        if (failedCount > 0) {
          toast({
            title: "Some Processing Failed",
            description: `${failedCount} embeddings failed to process`,
            variant: "destructive",
          })
        }
      } catch (error) {
        console.error("Error processing embeddings:", error)
        toast({
          title: "Processing Failed",
          description: error instanceof Error ? error.message : "Failed to process embeddings",
          variant: "destructive",
        })
      } finally {
        setIsProcessing(false)
        setCurrentlyProcessing("")
        setTimeout(() => setProgress(0), 2000)
      }
    }

    const pauseProcessing = () => {
      setIsPaused(true)
      setIsProcessing(false)
    }

    const resumeProcessing = () => {
      setIsPaused(false)
      // Resume from where we left off
      processEmbeddings()
    }

    const clearEmbeddings = () => {
      setEmbeddings([])
      setProgress(0)
      setProcessingStats({
        total: 0,
        completed: 0,
        failed: 0,
        avgTime: 0,
      })
      toast({
        title: "Embeddings Cleared",
        description: "All processed embeddings have been cleared",
      })
    }

    const getStatusIcon = (status: string) => {
      switch (status) {
        case "completed":
          return <CheckCircle className="h-4 w-4 text-green-600" />
        case "processing":
          return <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
        case "error":
          return <AlertCircle className="h-4 w-4 text-red-600" />
        default:
          return <Brain className="h-4 w-4 text-gray-400" />
      }
    }

    const getStatusColor = (status: string) => {
      switch (status) {
        case "completed":
          return "bg-green-50 text-green-700 border-green-200"
        case "processing":
          return "bg-blue-50 text-blue-700 border-blue-200"
        case "error":
          return "bg-red-50 text-red-700 border-red-200"
        default:
          return "bg-gray-50 text-gray-700 border-gray-200"
      }
    }

    return (
      <div className="space-y-6">
        {/* Processing Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-0 shadow-sm bg-white/60 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Items</p>
                  <p className="text-2xl font-bold">{processingStats.total}</p>
                </div>
                <div className="p-2 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-white/60 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Completed</p>
                  <p className="text-2xl font-bold text-green-600">{processingStats.completed}</p>
                </div>
                <div className="p-2 bg-gradient-to-br from-green-100 to-green-200 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-white/60 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Failed</p>
                  <p className="text-2xl font-bold text-red-600">{processingStats.failed}</p>
                </div>
                <div className="p-2 bg-gradient-to-br from-red-100 to-red-200 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-white/60 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Avg Time</p>
                  <p className="text-2xl font-bold">{processingStats.avgTime}ms</p>
                </div>
                <div className="p-2 bg-gradient-to-br from-purple-100 to-purple-200 rounded-lg">
                  <BarChart3 className="h-5 w-5 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Processing Interface */}
        <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 bg-gradient-to-br from-pink-100 to-purple-100 rounded-lg">
                  <Sparkles className="h-5 w-5 text-pink-600" />
                </div>
                Embedding Processor
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  <Brain className="h-3 w-3 mr-1" />
                  AI Powered
                </Badge>
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {scrapedData.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-pink-50/50 rounded-lg border border-pink-200">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-pink-100 rounded-lg">
                      <Brain className="h-5 w-5 text-pink-600" />
                    </div>
                    <div>
                      <h4 className="font-medium">Ready for Processing</h4>
                      <p className="text-sm text-muted-foreground">
                        {scrapedData.length} documents ready to be converted to embeddings
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-white">
                    {scrapedData.length} items
                  </Badge>
                </div>

                {/* Processing Progress */}
                {(isProcessing || isPaused) && (
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {isPaused ? "Paused" : "Processing embeddings..."}
                        {currentlyProcessing && ` - ${currentlyProcessing}`}
                      </span>
                      <span className="text-muted-foreground">{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                    <div className="text-xs text-muted-foreground">
                      {processingStats.completed} completed, {processingStats.failed} failed
                    </div>
                  </div>
                )}

                {/* Control Buttons */}
                <div className="flex gap-3">
                  {!isProcessing && !isPaused ? (
                    <Button
                      onClick={processEmbeddings}
                      className="bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white flex-1"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Start Processing
                    </Button>
                  ) : isPaused ? (
                    <Button
                      onClick={resumeProcessing}
                      className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white flex-1"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Resume Processing
                    </Button>
                  ) : (
                    <Button onClick={pauseProcessing} variant="outline" className="flex-1 bg-transparent">
                      <Pause className="w-4 h-4 mr-2" />
                      Pause Processing
                    </Button>
                  )}

                  {embeddings.length > 0 && (
                    <Button
                      onClick={clearEmbeddings}
                      variant="outline"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 bg-transparent"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Clear
                    </Button>
                  )}
                </div>

                {/* Source Data Preview */}
                <div className="space-y-3">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    Source Data Preview ({Math.min(3, scrapedData.length)} of {scrapedData.length})
                  </h4>
                  <ScrollArea className="h-32">
                    <div className="space-y-2">
                      {scrapedData.slice(0, 3).map((data, index) => (
                        <div key={index} className="p-3 bg-gray-50/80 rounded-lg border text-sm">
                          <div className="flex items-start justify-between mb-2">
                            <div className="font-medium line-clamp-1">{data.title}</div>
                            <Globe className="h-4 w-4 text-muted-foreground flex-shrink-0 ml-2" />
                          </div>
                          <div className="text-muted-foreground text-xs line-clamp-2 mb-2">
                            {data.content.substring(0, 150)}...
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {data.content.length} chars
                            </Badge>
                            {data.url && (
                              <Badge variant="outline" className="text-xs">
                                {new URL(data.url).hostname}
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <Brain className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-muted-foreground mb-2">No Data to Process</h3>
                <p className="text-sm text-muted-foreground">Scrape some web content first to create embeddings</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Processed Embeddings */}
        {embeddings.length > 0 && (
          <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-600" />
                Processed Embeddings
                <Badge variant="outline" className="ml-2">
                  {embeddings.filter((e) => e.status === "completed").length} ready
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                <div className="space-y-3">
                  {embeddings.map((embedding, index) => (
                    <div key={embedding.id} className="p-4 border border-gray-200 rounded-lg bg-gray-50/50">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm line-clamp-1">{embedding.title}</h4>
                          {embedding.url && (
                            <p className="text-xs text-muted-foreground truncate mt-1">{embedding.url}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 ml-3">
                          <Badge className={`${getStatusColor(embedding.status)} border text-xs`}>
                            <div className="flex items-center gap-1">
                              {getStatusIcon(embedding.status)}
                              {embedding.status}
                            </div>
                          </Badge>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{embedding.content.length} chars</span>
                        {embedding.embedding.length > 0 && <span>{embedding.embedding.length}D vector</span>}
                        {embedding.metadata?.processingTime && <span>{embedding.metadata.processingTime}ms</span>}
                      </div>

                      {embedding.error && (
                        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                          Error: {embedding.error}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </div>
    )
  },
)

EmbeddingProcessor.displayName = "EmbeddingProcessor"
