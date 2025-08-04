"use client"

import { useState, useEffect } from "react"
import { useToast } from "@/components/ui/use-toast"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Progress } from "@/components/ui/progress"
import { supabase } from "@/integrations/supabase/client"
import {
  Search,
  Calendar,
  Tag,
  ExternalLink,
  Trash2,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Filter,
  Download,
  Eye,
  BarChart3,
} from "lucide-react"

interface ProcessingRecord {
  id: string
  content_title: string
  content_url: string
  content_text: string
  status: string
  created_at: string
  processing_completed_at: string
  smart_tags: {
    tag_name: string
    confidence_score: number
    tag_category: string
    tag_description: string
  }[]
}

export const ProcessingHistory = () => {
  const { toast } = useToast()
  const [records, setRecords] = useState<ProcessingRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedRecord, setSelectedRecord] = useState<ProcessingRecord | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null)

  useEffect(() => {
    fetchProcessingHistory()
  }, [])

  const fetchProcessingHistory = async () => {
    try {
      const { data, error } = await supabase
        .from("file_processing")
        .select(`
          id,
          content_title,
          content_url,
          content_text,
          status,
          created_at,
          processing_completed_at,
          smart_tags (
            tag_name,
            confidence_score,
            tag_category,
            tag_description
          )
        `)
        .order("created_at", { ascending: false })

      if (error) throw error

      setRecords(data || [])
    } catch (error) {
      console.error("Error fetching processing history:", error)
      toast({
        title: "Error",
        description: "Failed to load processing history",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const deleteRecord = async (id: string) => {
    setDeleteLoading(id)
    try {
      const { error } = await supabase.from("file_processing").delete().eq("id", id)

      if (error) throw error

      setRecords(records.filter((r) => r.id !== id))
      if (selectedRecord?.id === id) {
        setSelectedRecord(null)
      }

      toast({
        title: "Success",
        description: "Record deleted successfully",
      })
    } catch (error) {
      console.error("Error deleting record:", error)
      toast({
        title: "Error",
        description: "Failed to delete record",
        variant: "destructive",
      })
    } finally {
      setDeleteLoading(null)
    }
  }

  const filteredRecords = records.filter((record) => {
    const matchesSearch =
      record.content_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.content_url?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.smart_tags?.some((tag) => tag.tag_name.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesStatus = statusFilter === "all" || record.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "processing":
        return <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
      case "failed":
        return <AlertCircle className="h-4 w-4 text-red-600" />
      default:
        return <Clock className="h-4 w-4 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-50 text-green-700 border-green-200"
      case "processing":
        return "bg-blue-50 text-blue-700 border-blue-200"
      case "failed":
        return "bg-red-50 text-red-700 border-red-200"
      default:
        return "bg-gray-50 text-gray-700 border-gray-200"
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "topic":
        return "bg-blue-50 text-blue-700 border-blue-200"
      case "industry":
        return "bg-green-50 text-green-700 border-green-200"
      case "content_type":
        return "bg-purple-50 text-purple-700 border-purple-200"
      case "difficulty":
        return "bg-orange-50 text-orange-700 border-orange-200"
      default:
        return "bg-gray-50 text-gray-700 border-gray-200"
    }
  }

  const statusCounts = {
    all: records.length,
    completed: records.filter((r) => r.status === "completed").length,
    processing: records.filter((r) => r.status === "processing").length,
    failed: records.filter((r) => r.status === "failed").length,
  }

  if (loading) {
    return (
      <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
        <CardContent className="p-8">
          <div className="flex items-center justify-center space-x-2">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            <span className="text-lg">Loading processing history...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(statusCounts).map(([status, count]) => (
          <Card
            key={status}
            className={`border-0 shadow-sm bg-white/60 backdrop-blur-sm cursor-pointer transition-all duration-200 hover:shadow-md ${
              statusFilter === status ? "ring-2 ring-blue-500 bg-blue-50/80" : ""
            }`}
            onClick={() => setStatusFilter(status)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground capitalize">
                    {status === "all" ? "Total" : status}
                  </p>
                  <p className="text-2xl font-bold">{count}</p>
                </div>
                <div className="p-2 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg">
                  {status === "completed" && <CheckCircle className="h-5 w-5 text-green-600" />}
                  {status === "processing" && <Loader2 className="h-5 w-5 text-blue-600" />}
                  {status === "failed" && <AlertCircle className="h-5 w-5 text-red-600" />}
                  {status === "all" && <BarChart3 className="h-5 w-5 text-blue-600" />}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content */}
      <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              Processing History
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-4 mt-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by title, URL, or tags..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Badge variant="outline" className="text-sm">
              {filteredRecords.length} records
            </Badge>
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Records List */}
            <div className="space-y-3">
              <ScrollArea className="h-[600px] pr-4">
                <div className="space-y-3">
                  {filteredRecords.map((record) => (
                    <Card
                      key={record.id}
                      className={`cursor-pointer transition-all duration-200 hover:shadow-md border-0 bg-white/60 backdrop-blur-sm ${
                        selectedRecord?.id === record.id ? "ring-2 ring-blue-500 shadow-md" : "hover:bg-white/80"
                      }`}
                      onClick={() => setSelectedRecord(record)}
                    >
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-sm line-clamp-2 mb-1">
                                {record.content_title || "Untitled"}
                              </h4>
                              {record.content_url && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                                  <ExternalLink className="h-3 w-3" />
                                  <span className="truncate">{record.content_url}</span>
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-2 ml-2">
                              <Badge className={`${getStatusColor(record.status)} border text-xs`}>
                                <div className="flex items-center gap-1">
                                  {getStatusIcon(record.status)}
                                  {record.status}
                                </div>
                              </Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  deleteRecord(record.id)
                                }}
                                disabled={deleteLoading === record.id}
                                className="h-6 w-6 p-0 text-gray-400 hover:text-red-600"
                              >
                                {deleteLoading === record.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Trash2 className="h-3 w-3" />
                                )}
                              </Button>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(record.created_at).toLocaleDateString()}
                            </div>
                            {record.smart_tags && record.smart_tags.length > 0 && (
                              <Badge variant="outline" className="text-xs">
                                {record.smart_tags.length} tags
                              </Badge>
                            )}
                          </div>

                          {record.smart_tags && record.smart_tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {record.smart_tags.slice(0, 3).map((tag, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {tag.tag_name}
                                </Badge>
                              ))}
                              {record.smart_tags.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{record.smart_tags.length - 3}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {filteredRecords.length === 0 && (
                    <div className="text-center py-12">
                      <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-muted-foreground mb-2">No records found</h3>
                      <p className="text-sm text-muted-foreground">
                        {searchTerm
                          ? "Try adjusting your search terms"
                          : "Start by uploading files or scraping content"}
                      </p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Record Details */}
            <div>
              {selectedRecord ? (
                <Card className="border-0 shadow-sm bg-white/60 backdrop-blur-sm">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg line-clamp-2">
                          {selectedRecord.content_title || "Untitled"}
                        </CardTitle>
                        {selectedRecord.content_url && (
                          <div className="flex items-center gap-2 mt-2">
                            <ExternalLink className="h-4 w-4 text-muted-foreground" />
                            <a
                              href={selectedRecord.content_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:text-blue-800 transition-colors truncate"
                            >
                              {selectedRecord.content_url}
                            </a>
                          </div>
                        )}
                      </div>
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Badge className={`${getStatusColor(selectedRecord.status)} border`}>
                          <div className="flex items-center gap-1">
                            {getStatusIcon(selectedRecord.status)}
                            {selectedRecord.status}
                          </div>
                        </Badge>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">
                          Created: {new Date(selectedRecord.created_at).toLocaleDateString()}
                        </p>
                        {selectedRecord.processing_completed_at && (
                          <p className="text-xs text-muted-foreground">
                            Completed: {new Date(selectedRecord.processing_completed_at).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>

                    {selectedRecord.smart_tags && selectedRecord.smart_tags.length > 0 && (
                      <>
                        <Separator />
                        <div>
                          <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                            <Tag className="h-4 w-4 text-blue-600" />
                            Smart Tags ({selectedRecord.smart_tags.length})
                          </h4>
                          <div className="space-y-3">
                            {selectedRecord.smart_tags.map((tag, index) => (
                              <div
                                key={index}
                                className="flex items-center justify-between p-3 bg-gray-50/80 rounded-lg border"
                              >
                                <div className="flex-1">
                                  <Badge className={`${getCategoryColor(tag.tag_category)} border mb-1`}>
                                    {tag.tag_name}
                                  </Badge>
                                  {tag.tag_description && (
                                    <p className="text-xs text-muted-foreground mt-1">{tag.tag_description}</p>
                                  )}
                                </div>
                                <div className="text-right ml-3">
                                  <div className="text-xs font-medium text-muted-foreground">
                                    {Math.round(tag.confidence_score * 100)}%
                                  </div>
                                  <Progress value={tag.confidence_score * 100} className="h-1 w-12 mt-1" />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}

                    {selectedRecord.content_text && (
                      <>
                        <Separator />
                        <div>
                          <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                            <FileText className="h-4 w-4 text-green-600" />
                            Content Preview
                          </h4>
                          <ScrollArea className="h-48 p-3 bg-gray-50/80 rounded-lg border">
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                              {selectedRecord.content_text.substring(0, 2000)}
                              {selectedRecord.content_text.length > 2000 && (
                                <span className="text-blue-600 cursor-pointer hover:underline">... Read more</span>
                              )}
                            </p>
                          </ScrollArea>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-0 shadow-sm bg-white/60 backdrop-blur-sm">
                  <CardContent className="p-12 text-center">
                    <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-muted-foreground mb-2">Select a record to view details</h3>
                    <p className="text-sm text-muted-foreground">
                      Click on any record from the list to see its full details and smart tags
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
