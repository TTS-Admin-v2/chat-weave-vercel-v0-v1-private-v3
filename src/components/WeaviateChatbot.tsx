"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { supabase } from "@/integrations/supabase/client"
import {
  MessageSquare,
  Send,
  Bot,
  User,
  Loader2,
  Sparkles,
  Copy,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  Settings,
  Zap,
} from "lucide-react"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
  sources?: string[]
  loading?: boolean
}

interface ChatSettings {
  temperature: number
  maxTokens: number
  searchLimit: number
}

export const WeaviateChatbot = () => {
  const { toast } = useToast()
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content:
        "Hello! I'm your AI assistant. I can help you search through your processed documents and answer questions based on your data. What would you like to know?",
      timestamp: new Date(),
    },
  ])
  const [inputMessage, setInputMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [settings, setSettings] = useState<ChatSettings>({
    temperature: 0.7,
    maxTokens: 500,
    searchLimit: 5,
  })
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputMessage.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputMessage.trim(),
      timestamp: new Date(),
    }

    const loadingMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: "",
      timestamp: new Date(),
      loading: true,
    }

    setMessages((prev) => [...prev, userMessage, loadingMessage])
    setInputMessage("")
    setIsLoading(true)

    try {
      const { data, error } = await supabase.functions.invoke("weaviate-chat", {
        body: {
          message: inputMessage.trim(),
          settings: settings,
        },
      })

      if (error) throw error

      const assistantMessage: Message = {
        id: (Date.now() + 2).toString(),
        role: "assistant",
        content: data.response || "I apologize, but I couldn't generate a response. Please try again.",
        timestamp: new Date(),
        sources: data.sources || [],
      }

      setMessages((prev) => prev.slice(0, -1).concat(assistantMessage))

      toast({
        title: "Response Generated",
        description: "AI assistant has responded to your query",
      })
    } catch (error) {
      console.error("Error sending message:", error)

      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        role: "assistant",
        content:
          "I apologize, but I encountered an error while processing your request. Please try again or check your connection.",
        timestamp: new Date(),
      }

      setMessages((prev) => prev.slice(0, -1).concat(errorMessage))

      toast({
        title: "Error",
        description: "Failed to get response from AI assistant",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content)
      toast({
        title: "Copied!",
        description: "Message copied to clipboard",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      })
    }
  }

  const clearChat = () => {
    setMessages([
      {
        id: "1",
        role: "assistant",
        content:
          "Hello! I'm your AI assistant. I can help you search through your processed documents and answer questions based on your data. What would you like to know?",
        timestamp: new Date(),
      },
    ])
    toast({
      title: "Chat Cleared",
      description: "Conversation history has been reset",
    })
  }

  const suggestedQuestions = [
    "What are the main topics in my documents?",
    "Summarize the key findings from my data",
    "What are the most common themes?",
    "Show me documents about technology",
    "What insights can you provide from my content?",
  ]

  return (
    <div className="space-y-6">
      {/* Chat Header */}
      <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <div className="p-2 bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg">
                <MessageSquare className="h-5 w-5 text-purple-600" />
              </div>
              AI Assistant
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                Online
              </Badge>
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowSettings(!showSettings)}>
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
              <Button variant="outline" size="sm" onClick={clearChat}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Clear
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Settings Panel */}
      {showSettings && (
        <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Chat Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Temperature</label>
                <Input
                  type="number"
                  min="0"
                  max="1"
                  step="0.1"
                  value={settings.temperature}
                  onChange={(e) => setSettings((prev) => ({ ...prev, temperature: Number.parseFloat(e.target.value) }))}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">Controls randomness (0-1)</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Max Tokens</label>
                <Input
                  type="number"
                  min="50"
                  max="2000"
                  value={settings.maxTokens}
                  onChange={(e) => setSettings((prev) => ({ ...prev, maxTokens: Number.parseInt(e.target.value) }))}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">Maximum response length</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Search Limit</label>
                <Input
                  type="number"
                  min="1"
                  max="20"
                  value={settings.searchLimit}
                  onChange={(e) => setSettings((prev) => ({ ...prev, searchLimit: Number.parseInt(e.target.value) }))}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">Documents to search</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Chat Interface */}
      <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
        <CardContent className="p-0">
          {/* Messages Area */}
          <ScrollArea className="h-[500px] p-6">
            <div className="space-y-6">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-4 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {message.role === "assistant" && (
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center">
                        {message.loading ? (
                          <Loader2 className="h-4 w-4 text-purple-600 animate-spin" />
                        ) : (
                          <Bot className="h-4 w-4 text-purple-600" />
                        )}
                      </div>
                    </div>
                  )}

                  <div className={`flex-1 max-w-[80%] ${message.role === "user" ? "order-first" : ""}`}>
                    <div
                      className={`rounded-2xl px-4 py-3 ${
                        message.role === "user"
                          ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white ml-auto"
                          : "bg-gray-50 border border-gray-200"
                      }`}
                    >
                      {message.loading ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-sm">Thinking...</span>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>

                          {message.sources && message.sources.length > 0 && (
                            <div className="pt-2 border-t border-gray-200">
                              <p className="text-xs text-muted-foreground mb-2">Sources:</p>
                              <div className="flex flex-wrap gap-1">
                                {message.sources.map((source, index) => (
                                  <Badge key={index} variant="outline" className="text-xs">
                                    {source}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {!message.loading && (
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-muted-foreground">{message.timestamp.toLocaleTimeString()}</span>
                        {message.role === "assistant" && (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(message.content)}
                              className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-muted-foreground hover:text-green-600"
                            >
                              <ThumbsUp className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-muted-foreground hover:text-red-600"
                            >
                              <ThumbsDown className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {message.role === "user" && (
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
                        <User className="h-4 w-4 text-blue-600" />
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          <Separator />

          {/* Suggested Questions */}
          {messages.length === 1 && (
            <div className="p-4 bg-gray-50/50">
              <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Suggested Questions
              </h4>
              <div className="flex flex-wrap gap-2">
                {suggestedQuestions.map((question, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => setInputMessage(question)}
                    className="text-xs h-8 bg-white hover:bg-blue-50 hover:border-blue-200"
                  >
                    {question}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="p-4">
            <form onSubmit={handleSendMessage} className="flex gap-3">
              <div className="flex-1 relative">
                <Input
                  ref={inputRef}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Ask me anything about your data..."
                  disabled={isLoading}
                  className="pr-12"
                />
                {inputMessage && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <Badge variant="outline" className="text-xs">
                      {inputMessage.length}
                    </Badge>
                  </div>
                )}
              </div>
              <Button
                type="submit"
                disabled={!inputMessage.trim() || isLoading}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </form>
            <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-4">
                <span>Press Enter to send</span>
                <div className="flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  <span>Powered by AI</span>
                </div>
              </div>
              <span>{messages.length - 1} messages</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
