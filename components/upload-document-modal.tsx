'use client'

import React, { useState, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Upload, FileText, X, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/auth-context'
import * as pdfjsLib from 'pdfjs-dist'

interface UploadDocumentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  onUploadComplete?: () => void
}

export function UploadDocumentModal({
  open,
  onOpenChange,
  projectId,
  onUploadComplete
}: UploadDocumentModalProps) {
  const { user } = useAuth()
  const supabase = createClient()
  const [files, setFiles] = useState<File[]>([])
  const [version, setVersion] = useState<'Draft' | 'Revised Draft' | 'Final'>('Draft')
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState<string>('')

  // Configure PDF.js worker
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`
    }
  }, [])

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    setError(null)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files)
      const pdfFiles = droppedFiles.filter(file => file.type === 'application/pdf')

      if (pdfFiles.length === 0) {
        setError('Please upload PDF files only')
        return
      }

      if (pdfFiles.length !== droppedFiles.length) {
        setError(`Only PDF files are allowed. ${pdfFiles.length} of ${droppedFiles.length} files will be uploaded.`)
      }

      setFiles(prev => [...prev, ...pdfFiles])
    }
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null)
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files)
      const pdfFiles = selectedFiles.filter(file => file.type === 'application/pdf')

      if (pdfFiles.length === 0) {
        setError('Please upload PDF files only')
        return
      }

      if (pdfFiles.length !== selectedFiles.length) {
        setError(`Only PDF files are allowed. ${pdfFiles.length} of ${selectedFiles.length} files will be uploaded.`)
      }

      setFiles(prev => [...prev, ...pdfFiles])
    }
  }

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
    setError(null)
  }

  const extractPageCount = async (file: File): Promise<number | null> => {
    try {
      // Read the file as ArrayBuffer
      const arrayBuffer = await file.arrayBuffer()

      // Load the PDF document
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer })
      const pdf = await loadingTask.promise

      // Return the number of pages
      return pdf.numPages
    } catch (error) {
      console.error('Error extracting page count:', error)
      return null
    }
  }

  const handleUpload = async () => {
    if (files.length === 0) {
      setError('Please select at least one file')
      return
    }

    setUploading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      let successCount = 0
      let errorCount = 0

      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const documentName = file.name.replace('.pdf', '')

        setUploadProgress(`Uploading ${i + 1} of ${files.length}: ${documentName}`)

        try {
          // Check if a document with this name already exists in this project
          const { data: existingDocs } = await supabase
            .from('documents')
            .select('id')
            .eq('project_id', projectId)
            .eq('name', documentName)
            .limit(1)

          if (existingDocs && existingDocs.length > 0) {
            console.warn(`Skipping "${documentName}" - already exists`)
            errorCount++
            continue
          }

          // Generate unique filename
          const fileExt = file.name.split('.').pop()
          const fileName = `${projectId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

          // Upload file to Supabase Storage
          const { error: uploadError } = await supabase.storage
            .from('pdfs')
            .upload(fileName, file, {
              cacheControl: '3600',
              upsert: false
            })

          if (uploadError) throw uploadError

          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from('pdfs')
            .getPublicUrl(fileName)

          // Get PDF metadata
          const fileSize = file.size
          const pageCount = await extractPageCount(file)

          // Insert document record
          const { error: insertError } = await supabase
            .from('documents')
            .insert({
              project_id: projectId,
              name: documentName,
              file_name: file.name,
              pdf_url: publicUrl,
              file_size: fileSize,
              page_count: pageCount,
              version: version,
              created_by: user?.id || null
            })

          if (insertError) throw insertError

          successCount++
        } catch (err: any) {
          console.error(`Error uploading ${documentName}:`, err)
          errorCount++
        }
      }

      // Reset form
      setFiles([])
      setVersion('Draft')
      setUploadProgress('')

      if (successCount > 0) {
        onOpenChange(false)
        if (onUploadComplete) {
          onUploadComplete()
        }
      }

      if (errorCount > 0 && successCount > 0) {
        setError(`${successCount} file(s) uploaded successfully, ${errorCount} failed`)
      } else if (errorCount > 0) {
        setError(`Failed to upload ${errorCount} file(s)`)
      }
    } catch (err: any) {
      console.error('Upload error:', err)
      setError(err.message || 'Failed to upload documents')
    } finally {
      setUploading(false)
      setUploadProgress('')
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload documents</DialogTitle>
          <DialogDescription>
            Drag and drop PDF files or click to browse. Document names will be set automatically from file names.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Version Tabs */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Version</label>
            <Tabs value={version} onValueChange={(value: any) => setVersion(value)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="Draft">Draft</TabsTrigger>
                <TabsTrigger value="Revised Draft">Revised Draft</TabsTrigger>
                <TabsTrigger value="Final">Final</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* File Upload Area */}
          <div className="space-y-2">
            <label className="text-sm font-medium">PDF Files</label>
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive
                  ? 'border-primary bg-accent'
                  : 'border-border hover:border-primary/50'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              {files.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-center gap-3">
                    <FileText className="w-10 h-10 text-primary" />
                  </div>
                  <div className="text-left max-h-48 overflow-y-auto space-y-2">
                    {files.map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-muted/50 p-2 rounded">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{file.name.replace('.pdf', '')}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatFileSize(file.size)}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeFile(index)}
                          className="ml-2 h-8 w-8 flex-shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {files.length} file{files.length !== 1 ? 's' : ''} selected
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-center">
                    <Upload className="w-10 h-10 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">Drop PDF files here</p>
                    <p className="text-sm text-muted-foreground">
                      or,{' '}
                      <label className="text-primary hover:underline cursor-pointer">
                        click to browse
                        <input
                          type="file"
                          className="hidden"
                          accept="application/pdf"
                          multiple
                          onChange={handleFileChange}
                        />
                      </label>
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Upload Progress */}
          {uploading && uploadProgress && (
            <div className="bg-primary/10 text-primary text-sm p-3 rounded-md">
              {uploadProgress}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
              {error}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={uploading}>
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={uploading || files.length === 0}>
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              `Upload ${files.length > 0 ? `(${files.length})` : ''}`
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
