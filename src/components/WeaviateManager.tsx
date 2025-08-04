"use client"

import React, { useState, useImperativeHandle, forwardRef } from "react"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { supabase } from "@/integrations/supabase/client"
import {
  Database,
  Upload,
  CheckCircle,
  AlertCircle,
  Loader2,
  Server,
  Zap,
  BarChart3,
  Settings,
  RefreshCw,
  Trash2,
  Eye,
  Activity,
} from "lucide-react"

interface EmbeddingData {
  id: string
  content: string
  title: string
  url?: string
  embedding: number[]
  metadata?: any
}

interface WeaviateManagerProps {
  embeddings?: EmbeddingData[]
  onDataUploaded?: () => void
}

export interface WeaviateManagerRef {
  uploadToWeaviate: () => Promise<void>
}

export const WeaviateManager = forwardRef<WeaviateManagerRef, WeaviateManagerProps>(
  ({ embeddings = [], onDataUploaded }, ref) => {
    const { toast } = useToast()
    const [isUploading, setIsUploading] = useState(false)
    const [uploadProgress, setUploadProgress] = useState(0)
    const [uploadedCount, setUploadedCount] = useState(0)
    const [connectionStatus, setConnectionStatus] = useState<"checking" | "connected" | "disconnected">("checking")
    const [databaseStats, setDatabaseStats] = useState({
      totalObjects: 0,
      totalClasses: 0,
      storageSize: "0 MB",
      lastUpdated: new Date(),
    })

    useImperativeHandle(ref, () => ({
      uploadToWeaviate,
    }))

    const checkConnection = async () => {
      setConnectionStatus("checking")
      try {
        const { data, error } = await supabase.functions.invoke("weaviate-upload", {
          body: { action: "health_check" },
        })

        if (error) throw error

        setConnectionStatus(data.connected ? "connected" : "disconnected")

        if (data.connected && data.stats) {
          setDatabaseStats({
            totalObjects: data.stats.totalObjects || 0,
            totalClasses: data.stats.totalClasses || 0,
            storageSize: data.stats.storageSize || "0 MB",
            lastUpdated: new Date(),
          })
        }

        toast({
          title: data.connected ? "Connected" : "Disconnected",
          description: data.connected ? "Successfully connected to Weaviate" : "Failed to connect to Weaviate",
          variant: data.connected ? "default" : "destructive",
        })
      } catch (error) {
        console.error("Error checking connection:", error)
        setConnectionStatus("disconnected")
        toast({
          title: "Connection Error",
          description: "Failed to check Weaviate connection",
          variant: "destructive",
        })
      }
    }

    const uploadToWeaviate = async () => {
      if (embeddings.length === 0) {
        toast({
          title: "No Data",
          description: "No embeddings available to upload",
          variant: "destructive",
        })
        return
      }

      setIsUploading(true)
      setUploadProgress(0)
      setUploadedCount(0)

      try {
        const batchSize = 10
        const totalBatches = Math.ceil(embeddings.length / batchSize)

        for (let i = 0; i < totalBatches; i++) {
          const batch = embeddings.slice(i * batchSize, (i + 1) * batchSize)

          const { data, error } = await supabase.functions.invoke("weaviate-upload", {
            body: {
              action: "upload_batch",
              embeddings: batch,
              batchIndex: i,
              totalBatches: totalBatches,
            },
          })

          if (error) throw error

          const progress = ((i + 1) / totalBatches) * 100
          setUploadProgress(progress)
          setUploadedCount((i + 1) * batchSize)

          // Small delay to show progress
          await new Promise((resolve) => setTimeout(resolve, 200))
        }

        setUploadProgress(100)
        setUploadedCount(embeddings.length)

        toast({
          title: "Upload Complete!",
          description: `Successfully uploaded ${embeddings.length} embeddings to Weaviate`,
        })

        onDataUploaded?.()

        // Refresh stats
        await checkConnection()
      } catch (error) {
        console.error("Error uploading to Weaviate:", error)
        toast({
          title: "Upload Failed",
          description: error instanceof Error ? error.message : "Failed to upload embeddings",
          variant: "destructive",
        })
      } finally {
        setIsUploading(false)
        setTimeout(() => {
          setUploadProgress(0)
          setUploadedCount(0)
        }, 2000)
      }
    }

    const clearDatabase = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("weaviate-upload", {
          body: { action: "clear_database" },
        })

        if (error) throw error

        toast({
          title: "Database Cleared",
          description: "All data has been removed from Weaviate",
        })

        await checkConnection()
      } catch (error) {
        console.error("Error clearing database:", error)
        toast({
          title: "Clear Failed",
          description: "Failed to clear database",
          variant: "destructive",
        })
      }
    }

    React.useEffect(() => {
      checkConnection()
    }, [])

    const getConnectionStatusColor = () => {
      switch (connectionStatus) {
        case "connected":
          return "bg-green-50 text-green-700 border-green-200"
        case "disconnected":
          return "bg-red-50 text-red-700 border-red-200"
        default:
          return "bg-yellow-50 text-yellow-700 border-yellow-200"
      }
    }

    const getConnectionIcon = () => {
      switch (connectionStatus) {
        case "connected":
          return <CheckCircle className="h-4 w-4" />
        case "disconnected":
          return <AlertCircle className="h-4 w-4" />
        default:
          return <Loader2 className="h-4 w-4 animate-spin" />
      }
    }

    return (
      <div className="space-y-6">
        {/* Connection Status */}
        <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-lg">
                  <Database className="h-5 w-5 text-indigo-600" />
                </div>
                Weaviate Vector Database
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge className={`${getConnectionStatusColor()} border`}>
                  <div className="flex items-center gap-1">
                    {getConnectionIcon()}
                    {connectionStatus === "checking"
                      ? "Checking..."
                      : connectionStatus === "connected"
                        ? "Connected"
                        : "Disconnected"}
                  </div>
                </Badge>
                <Button variant="outline" size="sm" onClick={checkConnection}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Database Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-0 shadow-sm bg-white/60 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Objects</p>
                  <p className="text-2xl font-bold">{databaseStats.totalObjects.toLocaleString()}</p>
                </div>
                <div className="p-2 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-white/60 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Classes</p>
                  <p className="text-2xl font-bold">{databaseStats.totalClasses}</p>
                </div>
                <div className="p-2 bg-gradient-to-br from-green-100 to-green-200 rounded-lg">
                  <Server className="h-5 w-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-white/60 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Storage</p>
                  <p className="text-2xl font-bold">{databaseStats.storageSize}</p>
                </div>
                <div className="p-2 bg-gradient-to-br from-purple-100 to-purple-200 rounded-lg">
                  <Activity className="h-5 w-5 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-white/60 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Ready to Upload</p>
                  <p className="text-2xl font-bold">{embeddings.length}</p>
                </div>
                <div className="p-2 bg-gradient-to-br from-orange-100 to-orange-200 rounded-lg">
                  <Zap className="h-5 w-5 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Upload Interface */}
        <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-blue-600" />
              Upload Embeddings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {embeddings.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-blue-50/50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Database className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-medium">Ready for Upload</h4>
                      <p className="text-sm text-muted-foreground">
                        {embeddings.length} embeddings prepared for Weaviate
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-white">
                    {embeddings.length} items
                  </Badge>
                </div>

                {/* Upload Progress */}
                {isUploading && (
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Uploading embeddings... ({uploadedCount}/{embeddings.length})
                      </span>
                      <span className="text-muted-foreground">{Math.round(uploadProgress)}%</span>
                    </div>
                    <Progress value={uploadProgress} className="h-2" />
                  </div>
                )}

                {/* Preview of embeddings */}
                <div className="space-y-3">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    Preview ({Math.min(3, embeddings.length)} of {embeddings.length})
                  </h4>
                  <ScrollArea className="h-32">
                    <div className="space-y-2">
                      {embeddings.slice(0, 3).map((embedding, index) => (
                        <div key={index} className="p-3 bg-gray-50/80 rounded-lg border text-sm">
                          <div className="font-medium line-clamp-1">{embedding.title}</div>
                          <div className="text-muted-foreground text-xs line-clamp-2 mt-1">
                            {embedding.content.substring(0, 100)}...
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className="text-xs">
                              {embedding.embedding.length}D vector
                            </Badge>
                            {embedding.url && (
                              <Badge variant="outline" className="text-xs">
                                Has URL
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={uploadToWeaviate}
                    disabled={isUploading || connectionStatus !== "connected"}
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white flex-1"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Uploading... ({Math.round(uploadProgress)}%)
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Upload to Weaviate
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <Database className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-muted-foreground mb-2">No Embeddings Ready</h3>
                <p className="text-sm text-muted-foreground">
                  Process some embeddings first to upload them to Weaviate
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Database Management */}
        <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-gray-600" />
              Database Management
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50/50 rounded-lg border">
                <div>
                  <h4 className="font-medium text-sm">Database Information</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Last updated: {databaseStats.lastUpdated.toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={checkConnection}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh Stats
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearDatabase}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 bg-transparent"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear Database
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  },
)

WeaviateManager.displayName = "WeaviateManager"
