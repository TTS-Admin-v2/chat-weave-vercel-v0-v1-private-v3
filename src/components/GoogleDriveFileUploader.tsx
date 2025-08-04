"use client"

import type React from "react"

import { useState, useCallback } from "react"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Upload,
  FolderOpen,
  FileText,
  Archive,
  ImageIcon,
  File,
  Loader2,
  CheckCircle,
  AlertCircle,
  X,
} from "lucide-react"
import { supabase } from "@/integrations/supabase/client"

interface FileUploadResult {
  success: boolean
  fileId?: string
  error?: string
}

interface UploadedFile {
  file: File
  status: "pending" | "uploading" | "processing" | "completed" | "error"
  progress: number
  error?: string
}

export const GoogleDriveFileUploader = () => {
  const { toast } = useToast()
  const [isUploading, setIsUploading] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [dragOver, setDragOver] = useState(false)

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return

    // Check file sizes (50MB limit to stay well within Supabase limits)
    const maxSize = 50 * 1024 * 1024 // 50MB
    const oversizedFiles = Array.from(files).filter((file) => file.size > maxSize)

    if (oversizedFiles.length > 0) {
      toast({
        title: "File Too Large",
        description: `Some files exceed the 50MB limit: ${oversizedFiles.map((f) => f.name).join(", ")}`,
        variant: "destructive",
      })
      return
    }

    const newFiles: UploadedFile[] = Array.from(files).map((file) => ({
      file,
      status: "pending",
      progress: 0,
    }))

    setUploadedFiles((prev) => [...prev, ...newFiles])
  }

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const uploadToStorage = async (file: File): Promise<string> => {
    const fileExt = file.name.split(".").pop()
    const fileName = `uploads/${Date.now()}-${file.name}`

    const { data, error } = await supabase.storage.from("user-files").upload(fileName, file, {
      cacheControl: "3600",
      upsert: false,
    })

    if (error) {
      // Handle specific error cases
      if (error.message.includes("exceeded the maximum allowed size") || error.message.includes("413")) {
        throw new Error(`File "${file.name}" is too large. Please use files smaller than 50MB.`)
      }
      throw new Error(`Upload failed: ${error.message}`)
    }

    return data.path
  }

  const createFileRecord = async (file: File, storagePath: string) => {
    const { data, error } = await supabase
      .from("file_processing")
      .insert({
        file_name: file.name,
        original_file_name: file.name,
        file_path: storagePath,
        file_size: file.size,
        mime_type: file.type,
        content_title: file.name,
        status: "pending",
        google_drive_file_id: "",
        extraction_status: "pending",
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }

    return data
  }

  const queueExtraction = async (fileRecord: any, storagePath: string, file: File) => {
    // Use a dummy user ID since authentication is removed
    const dummyUserId = "00000000-0000-0000-0000-000000000000"

    const { error } = await supabase.from("file_extraction_queue").insert({
      user_id: dummyUserId,
      file_processing_id: fileRecord.id,
      storage_path: storagePath,
      file_type: file.type,
      extraction_type: "auto",
    })

    if (error) {
      throw new Error(`Queue error: ${error.message}`)
    }
  }

  const processFiles = async () => {
    if (uploadedFiles.length === 0) return

    setIsUploading(true)

    try {
      for (let i = 0; i < uploadedFiles.length; i++) {
        const uploadedFile = uploadedFiles[i]

        if (uploadedFile.status !== "pending") continue

        // Update status to uploading
        setUploadedFiles((prev) =>
          prev.map((f, index) => (index === i ? { ...f, status: "uploading", progress: 0 } : f)),
        )

        try {
          // Simulate upload progress
          for (let progress = 0; progress <= 50; progress += 10) {
            setUploadedFiles((prev) => prev.map((f, index) => (index === i ? { ...f, progress } : f)))
            await new Promise((resolve) => setTimeout(resolve, 100))
          }

          // Upload to storage
          const storagePath = await uploadToStorage(uploadedFile.file)

          setUploadedFiles((prev) => prev.map((f, index) => (index === i ? { ...f, progress: 70 } : f)))

          // Create database record
          const fileRecord = await createFileRecord(uploadedFile.file, storagePath)

          setUploadedFiles((prev) =>
            prev.map((f, index) => (index === i ? { ...f, status: "processing", progress: 85 } : f)),
          )

          // Queue for extraction
          await queueExtraction(fileRecord, storagePath, uploadedFile.file)

          // Trigger extraction
          await supabase.functions.invoke("file-extractor", {
            body: {
              fileProcessingId: fileRecord.id,
              storagePath,
              fileType: uploadedFile.file.type,
              fileName: uploadedFile.file.name,
            },
          })

          setUploadedFiles((prev) =>
            prev.map((f, index) => (index === i ? { ...f, status: "completed", progress: 100 } : f)),
          )
        } catch (error) {
          console.error(`Error processing ${uploadedFile.file.name}:`, error)
          setUploadedFiles((prev) =>
            prev.map((f, index) =>
              index === i
                ? {
                    ...f,
                    status: "error",
                    error: error instanceof Error ? error.message : "Unknown error",
                  }
                : f,
            ),
          )
        }
      }

      const successCount = uploadedFiles.filter((f) => f.status === "completed").length
      const failureCount = uploadedFiles.filter((f) => f.status === "error").length

      if (successCount > 0) {
        toast({
          title: "Upload Complete!",
          description: `${successCount} files processed successfully${failureCount > 0 ? `, ${failureCount} failed` : ""}`,
        })
      }

      if (failureCount > 0) {
        toast({
          title: "Some Uploads Failed",
          description: "Check the file list for details",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error processing files:", error)
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to process files",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)

    const files = e.dataTransfer.files
    handleFileSelect(files)
  }, [])

  const getFileIcon = (file: File) => {
    if (file.type.includes("zip") || file.type.includes("archive")) {
      return <Archive className="w-5 h-5 text-orange-600" />
    }
    if (file.type.includes("image")) {
      return <ImageIcon className="w-5 h-5 text-green-600" />
    }
    if (file.type.includes("text") || file.name.endsWith(".md") || file.name.endsWith(".txt")) {
      return <FileText className="w-5 h-5 text-blue-600" />
    }
    return <File className="w-5 h-5 text-gray-600" />
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case "error":
        return <AlertCircle className="w-4 h-4 text-red-600" />
      case "uploading":
      case "processing":
        return <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
      default:
        return <File className="w-4 h-4 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "text-green-700 bg-green-50 border-green-200"
      case "error":
        return "text-red-700 bg-red-50 border-red-200"
      case "uploading":
      case "processing":
        return "text-blue-700 bg-blue-50 border-blue-200"
      default:
        return "text-gray-700 bg-gray-50 border-gray-200"
    }
  }

  const clearCompleted = () => {
    setUploadedFiles((prev) => prev.filter((f) => f.status !== "completed"))
  }

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-green-600" />
            File Upload & Processing
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
              dragOver
                ? "border-blue-400 bg-blue-50 scale-[1.02]"
                : "border-gray-300 hover:border-gray-400 hover:bg-gray-50/50"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="flex flex-col items-center gap-4">
              <div className={`p-4 rounded-full transition-colors ${dragOver ? "bg-blue-100" : "bg-gray-100"}`}>
                <FolderOpen className={`w-8 h-8 ${dragOver ? "text-blue-600" : "text-gray-600"}`} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="file-upload" className="cursor-pointer">
                  <div className="text-lg font-medium text-gray-900">Drop files here or click to browse</div>
                  <Input
                    id="file-upload"
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => handleFileSelect(e.target.files)}
                    accept="*/*"
                  />
                </Label>
                <p className="text-sm text-muted-foreground">
                  Supports all file types including ZIP archives • Max 50MB per file
                </p>
              </div>

              <div className="flex flex-wrap gap-2 justify-center">
                <Badge variant="outline" className="text-xs">
                  <FileText className="w-3 h-3 mr-1" />
                  Documents
                </Badge>
                <Badge variant="outline" className="text-xs">
                  <ImageIcon className="w-3 h-3 mr-1" />
                  Images
                </Badge>
                <Badge variant="outline" className="text-xs">
                  <Archive className="w-3 h-3 mr-1" />
                  Archives
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* File List */}
      {uploadedFiles.length > 0 && (
        <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Files ({uploadedFiles.length})
            </CardTitle>
            <div className="flex gap-2">
              {uploadedFiles.some((f) => f.status === "completed") && (
                <Button variant="outline" size="sm" onClick={clearCompleted}>
                  Clear Completed
                </Button>
              )}
              <Button
                onClick={processFiles}
                disabled={isUploading || uploadedFiles.every((f) => f.status !== "pending")}
                className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Process Files
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {uploadedFiles.map((uploadedFile, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border transition-all duration-200 ${getStatusColor(uploadedFile.status)}`}
                >
                  <div className="flex items-center gap-3">
                    {getFileIcon(uploadedFile.file)}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium text-sm truncate">{uploadedFile.file.name}</p>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(uploadedFile.status)}
                          <Badge variant="outline" className="text-xs capitalize">
                            {uploadedFile.status}
                          </Badge>
                          {uploadedFile.status === "pending" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFile(index)}
                              className="h-6 w-6 p-0 text-gray-500 hover:text-red-600"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{(uploadedFile.file.size / (1024 * 1024)).toFixed(1)} MB</span>
                        {(uploadedFile.status === "uploading" || uploadedFile.status === "processing") && (
                          <span>{uploadedFile.progress}%</span>
                        )}
                      </div>

                      {(uploadedFile.status === "uploading" || uploadedFile.status === "processing") && (
                        <Progress value={uploadedFile.progress} className="h-1 mt-2" />
                      )}

                      {uploadedFile.error && <p className="text-xs text-red-600 mt-1">{uploadedFile.error}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
