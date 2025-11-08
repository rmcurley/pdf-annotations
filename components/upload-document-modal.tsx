'use client'

import React, { useState, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Upload, FileText, X, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface UploadDocumentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projects: Array<{ id: string; name: string }>
  onUploadComplete?: () => void
}

export function UploadDocumentModal({
  open,
  onOpenChange,
  projects,
  onUploadComplete
}: UploadDocumentModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [documentName, setDocumentName] = useState('')
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0]
      if (droppedFile.type === 'application/pdf') {
        setFile(droppedFile)
        if (!documentName) {
          setDocumentName(droppedFile.name.replace('.pdf', ''))
        }
      } else {
        setError('Please upload a PDF file')
      }
    }
  }, [documentName])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null)
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      if (selectedFile.type === 'application/pdf') {
        setFile(selectedFile)
        if (!documentName) {
          setDocumentName(selectedFile.name.replace('.pdf', ''))
        }
      } else {
        setError('Please upload a PDF file')
      }
    }
  }

  const handleUpload = async () => {
    if (!file || !documentName || !selectedProjectId) {
      setError('Please fill in all fields and select a file')
      return
    }

    setUploading(true)
    setError(null)

    try {
      // Get current user (optional for now)
      const { data: { user } } = await supabase.auth.getUser()

      // Generate unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `${selectedProjectId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

      // Upload file to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
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

      // Get PDF metadata (you might want to use a library like pdf.js to get page count)
      const fileSize = file.size

      // Insert document record
      const { error: insertError } = await supabase
        .from('documents')
        .insert({
          project_id: selectedProjectId,
          name: documentName,
          pdf_url: publicUrl,
          file_size: fileSize,
          page_count: null, // TODO: Extract page count from PDF
          created_by: user?.id || null
        })

      if (insertError) throw insertError

      // Reset form
      setFile(null)
      setDocumentName('')
      setSelectedProjectId('')
      onOpenChange(false)

      if (onUploadComplete) {
        onUploadComplete()
      }
    } catch (err: any) {
      console.error('Upload error:', err)
      setError(err.message || 'Failed to upload document')
    } finally {
      setUploading(false)
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
          <DialogTitle>Upload a document</DialogTitle>
          <DialogDescription>
            Drag and drop a PDF file to upload to your project
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Project Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Project</label>
            <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Document Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Document name</label>
            <Input
              value={documentName}
              onChange={(e) => setDocumentName(e.target.value)}
              placeholder="Enter document name"
            />
          </div>

          {/* File Upload Area */}
          <div className="space-y-2">
            <label className="text-sm font-medium">PDF File</label>
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
              {file ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-center gap-3">
                    <FileText className="w-10 h-10 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFile(null)}
                    className="mt-2"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Remove
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-center">
                    <Upload className="w-10 h-10 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">Upload a PDF file</p>
                    <p className="text-sm text-muted-foreground">
                      or,{' '}
                      <label className="text-primary hover:underline cursor-pointer">
                        click to browse
                        <input
                          type="file"
                          className="hidden"
                          accept="application/pdf"
                          onChange={handleFileChange}
                        />
                      </label>
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

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
          <Button onClick={handleUpload} disabled={uploading || !file || !documentName || !selectedProjectId}>
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              'Upload'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
