"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Globe,
  Upload,
  MessageSquare,
  History,
  Database,
  Zap,
  BarChart3,
  Settings,
  Sparkles,
  FileText,
  Search,
  Brain,
} from "lucide-react"
import { FirecrawlScraper } from "@/components/FirecrawlScraper"
import { GoogleDriveFileUploader } from "@/components/GoogleDriveFileUploader"
import { ProcessingHistory } from "@/components/ProcessingHistory"
import { WeaviateChatbot } from "@/components/WeaviateChatbot"
import { WeaviateManager } from "@/components/WeaviateManager"
import { EmbeddingProcessor } from "@/components/EmbeddingProcessor"

interface ScrapedData {
  url: string
  title: string
  content: string
  markdown: string
}

const Index = () => {
  const [scrapedData, setScrapedData] = useState<ScrapedData[]>([])
  const [activeTab, setActiveTab] = useState("scraper")

  const handleDataScraped = (data: ScrapedData[]) => {
    setScrapedData(data)
  }

  const stats = [
    { label: "Total Documents", value: "1,234", icon: FileText, color: "text-blue-600" },
    { label: "Processing Queue", value: "23", icon: Zap, color: "text-orange-600" },
    { label: "Embeddings Created", value: "5,678", icon: Brain, color: "text-purple-600" },
    { label: "Active Searches", value: "12", icon: Search, color: "text-green-600" },
  ]

  const tools = [
    {
      id: "scraper",
      title: "Web Scraping",
      description: "Extract content from websites using Firecrawl",
      icon: Globe,
      color: "bg-blue-50 border-blue-200 hover:bg-blue-100",
      iconColor: "text-blue-600",
    },
    {
      id: "uploader",
      title: "File Upload",
      description: "Upload and process documents from your device",
      icon: Upload,
      color: "bg-green-50 border-green-200 hover:bg-green-100",
      iconColor: "text-green-600",
    },
    {
      id: "chat",
      title: "AI Assistant",
      description: "Chat with your data using AI",
      icon: MessageSquare,
      color: "bg-purple-50 border-purple-200 hover:bg-purple-100",
      iconColor: "text-purple-600",
    },
    {
      id: "history",
      title: "Processing History",
      description: "View and manage processed content",
      icon: History,
      color: "bg-orange-50 border-orange-200 hover:bg-orange-100",
      iconColor: "text-orange-600",
    },
    {
      id: "weaviate",
      title: "Vector Database",
      description: "Manage your Weaviate vector database",
      icon: Database,
      color: "bg-indigo-50 border-indigo-200 hover:bg-indigo-100",
      iconColor: "text-indigo-600",
    },
    {
      id: "embeddings",
      title: "Embeddings",
      description: "Process and manage document embeddings",
      icon: Sparkles,
      color: "bg-pink-50 border-pink-200 hover:bg-pink-100",
      iconColor: "text-pink-600",
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  ChatWeave
                </h1>
                <p className="text-sm text-muted-foreground">Intelligent Data Processing Platform</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                Online
              </Badge>
              <Button variant="outline" size="sm">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <Card
              key={index}
              className="border-0 shadow-sm bg-white/60 backdrop-blur-sm hover:shadow-md transition-all duration-200"
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-bold mt-1">{stat.value}</p>
                  </div>
                  <div
                    className={`p-3 rounded-xl bg-gradient-to-br ${
                      stat.color.includes("blue")
                        ? "from-blue-100 to-blue-200"
                        : stat.color.includes("orange")
                          ? "from-orange-100 to-orange-200"
                          : stat.color.includes("purple")
                            ? "from-purple-100 to-purple-200"
                            : "from-green-100 to-green-200"
                    }`}
                  >
                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Tool Navigation */}
          <div className="lg:col-span-1">
            <Card className="border-0 shadow-sm bg-white/60 backdrop-blur-sm sticky top-24">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Tools
                </CardTitle>
                <CardDescription>Select a tool to get started</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {tools.map((tool) => (
                  <Button
                    key={tool.id}
                    variant={activeTab === tool.id ? "default" : "ghost"}
                    className={`w-full justify-start h-auto p-4 ${
                      activeTab === tool.id
                        ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md"
                        : `${tool.color} border transition-all duration-200`
                    }`}
                    onClick={() => setActiveTab(tool.id)}
                  >
                    <div className="flex items-start gap-3 text-left">
                      <tool.icon
                        className={`w-5 h-5 mt-0.5 ${activeTab === tool.id ? "text-white" : tool.iconColor}`}
                      />
                      <div className="flex-1 min-w-0">
                        <div
                          className={`font-medium text-sm ${activeTab === tool.id ? "text-white" : "text-gray-900"}`}
                        >
                          {tool.title}
                        </div>
                        <div
                          className={`text-xs mt-1 ${
                            activeTab === tool.id ? "text-blue-100" : "text-muted-foreground"
                          }`}
                        >
                          {tool.description}
                        </div>
                      </div>
                    </div>
                  </Button>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3">
            <div className="space-y-6">
              {activeTab === "scraper" && (
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Globe className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">Web Scraping</h2>
                      <p className="text-muted-foreground">Extract and process content from websites</p>
                    </div>
                  </div>
                  <FirecrawlScraper onDataScraped={handleDataScraped} />
                </div>
              )}

              {activeTab === "uploader" && (
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Upload className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">File Upload</h2>
                      <p className="text-muted-foreground">Upload and process documents from your device</p>
                    </div>
                  </div>
                  <GoogleDriveFileUploader />
                </div>
              )}

              {activeTab === "chat" && (
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <MessageSquare className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">AI Assistant</h2>
                      <p className="text-muted-foreground">Chat with your processed data using AI</p>
                    </div>
                  </div>
                  <WeaviateChatbot />
                </div>
              )}

              {activeTab === "history" && (
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <History className="w-6 h-6 text-orange-600" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">Processing History</h2>
                      <p className="text-muted-foreground">View and manage your processed content</p>
                    </div>
                  </div>
                  <ProcessingHistory />
                </div>
              )}

              {activeTab === "weaviate" && (
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                      <Database className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">Vector Database</h2>
                      <p className="text-muted-foreground">Manage your Weaviate vector database</p>
                    </div>
                  </div>
                  <WeaviateManager />
                </div>
              )}

              {activeTab === "embeddings" && (
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-pink-100 rounded-lg">
                      <Sparkles className="w-6 h-6 text-pink-600" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">Embeddings</h2>
                      <p className="text-muted-foreground">Process and manage document embeddings</p>
                    </div>
                  </div>
                  <EmbeddingProcessor scrapedData={scrapedData} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Index
