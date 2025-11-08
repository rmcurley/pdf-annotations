'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Plus, FolderOpen, FileText, Upload, Search } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { UploadDocumentModal } from '@/components/upload-document-modal'

interface Project {
  id: string
  name: string
  description: string | null
  created_at: string
  document_count?: number
}

interface Document {
  id: string
  project_id: string
  name: string
  pdf_url: string
  file_size: number | null
  page_count: number | null
  created_at: string
}

export default function ProjectsPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchProjects()
  }, [])

  useEffect(() => {
    if (selectedProjectId) {
      fetchDocuments(selectedProjectId)
    }
  }, [selectedProjectId])

  const fetchProjects = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('projects')
        .select('*, documents(count)')
        .order('created_at', { ascending: false })

      if (error) throw error

      const projectsWithCount = data?.map(project => ({
        ...project,
        document_count: project.documents?.[0]?.count || 0
      })) || []

      setProjects(projectsWithCount)

      // Auto-select first project if none selected
      if (!selectedProjectId && projectsWithCount.length > 0) {
        setSelectedProjectId(projectsWithCount[0].id)
      }
    } catch (error) {
      console.error('Error fetching projects:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchDocuments = async (projectId: string) => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setDocuments(data || [])
    } catch (error) {
      console.error('Error fetching documents:', error)
    }
  }

  const handleUploadComplete = () => {
    if (selectedProjectId) {
      fetchDocuments(selectedProjectId)
    }
    fetchProjects()
  }

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'N/A'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const filteredDocuments = documents.filter(doc =>
    doc.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const selectedProject = projects.find(p => p.id === selectedProjectId)

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Projects & Documents</h1>
          <p className="text-muted-foreground">Manage your PDF documents and annotations</p>
        </div>
        <Button onClick={() => setUploadModalOpen(true)} disabled={!selectedProjectId}>
          <Upload className="w-4 h-4 mr-2" />
          Upload Document
        </Button>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Projects Sidebar */}
        <div className="col-span-3">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Projects</CardTitle>
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-4 text-center text-muted-foreground">Loading...</div>
              ) : projects.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">No projects yet</div>
              ) : (
                <div className="space-y-1 p-2">
                  {projects.map((project) => (
                    <button
                      key={project.id}
                      onClick={() => setSelectedProjectId(project.id)}
                      className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                        selectedProjectId === project.id
                          ? 'bg-accent text-accent-foreground'
                          : 'hover:bg-accent/50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <FolderOpen className="w-4 h-4 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{project.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {project.document_count || 0} documents
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Documents List */}
        <div className="col-span-9">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>
                    {selectedProject ? selectedProject.name : 'Select a project'}
                  </CardTitle>
                  {selectedProject?.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedProject.description}
                    </p>
                  )}
                </div>
                {selectedProjectId && (
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search documents..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!selectedProjectId ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FolderOpen className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>Select a project to view documents</p>
                </div>
              ) : filteredDocuments.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="mb-4">
                    {searchQuery ? 'No documents found' : 'No documents in this project yet'}
                  </p>
                  {!searchQuery && (
                    <Button onClick={() => setUploadModalOpen(true)}>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload First Document
                    </Button>
                  )}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Document Name</TableHead>
                      <TableHead>Pages</TableHead>
                      <TableHead>File Size</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDocuments.map((doc) => (
                      <TableRow
                        key={doc.id}
                        className="cursor-pointer hover:bg-accent/50"
                        onClick={() => router.push(`/documents/${doc.id}`)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">{doc.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {doc.page_count ? (
                            <Badge variant="secondary">{doc.page_count} pages</Badge>
                          ) : (
                            <span className="text-muted-foreground">N/A</span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatFileSize(doc.file_size)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(doc.created_at)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/documents/${doc.id}`)
                          }}>
                            Open
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Upload Modal */}
      <UploadDocumentModal
        open={uploadModalOpen}
        onOpenChange={setUploadModalOpen}
        projects={projects}
        onUploadComplete={handleUploadComplete}
      />
    </div>
  )
}
