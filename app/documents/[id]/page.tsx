'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ResizablePanel } from '@/components/resizable-panel'
import { CommentsPanel } from '@/components/comments-panel'
import { PdfViewerWrapper } from '@/components/pdf-viewer-wrapper'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ButtonGroup } from '@/components/ui/button-group'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { ArrowLeft, FileText, Calendar, Search, Filter, Check, X } from 'lucide-react'
import type { IHighlight, NewHighlight } from 'react-pdf-highlighter'

interface Document {
  id: string
  project_id: string
  name: string
  pdf_url: string
  file_size: number | null
  page_count: number | null
  created_at: string
}

interface Project {
  id: string
  name: string
}

interface Comment {
  id: string
  document_id: string
  document_name: string
  section_number: string | null
  page_number: number
  paragraph_number: string | null
  comment: string
  comment_type: string
  comment_status: string
  highlighted_text: string | null
  highlight_position: any
  created_at: string
  updated_at: string
}

export default function DocumentPage() {
  const params = useParams()
  const router = useRouter()
  const documentId = params.id as string

  const [document, setDocument] = useState<Document | null>(null)
  const [project, setProject] = useState<Project | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [highlights, setHighlights] = useState<IHighlight[]>([])
  const [filteredCommentIds, setFilteredCommentIds] = useState<string[]>([])
  const [selectedCommentId, setSelectedCommentId] = useState<string | null>(null)
  const [scrollToPdfId, setScrollToPdfId] = useState<string | null>(null)
  const [scrollToCommentId, setScrollToCommentId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Filter state (lifted from CommentsPanel)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [userFilter, setUserFilter] = useState<string[]>([])
  const [userComboOpen, setUserComboOpen] = useState(false)

  useEffect(() => {
    fetchDocument()
    fetchComments()
  }, [documentId])

  useEffect(() => {
    // Convert comments to highlights format, filtering by filteredCommentIds if set
    const commentsToShow = filteredCommentIds.length > 0
      ? comments.filter(c => filteredCommentIds.includes(c.id))
      : comments

    const newHighlights: IHighlight[] = commentsToShow.map((comment) => ({
      id: comment.id,
      content: {
        text: comment.highlighted_text || '',
      },
      position: comment.highlight_position || {},
      comment: {
        text: comment.comment,
        emoji: '',
        type: comment.comment_type,
        status: comment.comment_status,
      } as any,
    }))
    setHighlights(newHighlights)
  }, [comments, filteredCommentIds])

  const fetchDocument = async () => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('id', documentId)
        .single()

      if (error) throw error
      setDocument(data)

      // Fetch the project for this document
      if (data?.project_id) {
        const { data: projectData, error: projectError } = await supabase
          .from('projects')
          .select('id, name')
          .eq('id', data.project_id)
          .single()

        if (!projectError && projectData) {
          setProject(projectData)
        }
      }
    } catch (error) {
      console.error('Error fetching document:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('document_id', documentId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setComments(data || [])
    } catch (error) {
      console.error('Error fetching comments:', error)
    }
  }

  const handleAddHighlight = async (
    highlight: NewHighlight,
    comment: string,
    type: string,
    status: string,
    sectionNumber: string
  ) => {
    if (!document) return

    try {
      // Extract page number from position
      const pageNumber = highlight.position.pageNumber || 1

      console.log('Inserting comment:', {
        document_id: documentId,
        document_name: document.name,
        section_number: sectionNumber || null,
        page_number: pageNumber,
        comment: comment,
        comment_type: type,
        comment_status: status,
        highlighted_text: highlight.content.text || null,
        highlight_position: highlight.position,
      })

      const { data, error } = await supabase
        .from('comments')
        .insert({
          document_id: documentId,
          document_name: document.name,
          section_number: sectionNumber || null,
          page_number: pageNumber,
          comment: comment,
          comment_type: type,
          comment_status: status,
          highlighted_text: highlight.content.text || null,
          highlight_position: highlight.position,
          user_id: null, // Will be set when auth is added
        })
        .select()
        .single()

      if (error) {
        console.error('Supabase error:', error)
        throw error
      }

      console.log('Comment saved successfully:', data)

      // Refresh comments
      fetchComments()
    } catch (error) {
      console.error('Error adding highlight:', error)
    }
  }

  const handleCommentClick = (comment: Comment) => {
    // When clicking from comment list, only scroll the PDF (not the comment list itself)
    setSelectedCommentId(comment.id)
    setScrollToPdfId(comment.id)
    setScrollToCommentId(null) // Don't scroll comment list when clicking on a comment
  }

  const handleHighlightClick = (highlightId: string) => {
    // When clicking from PDF, only scroll the comment list (not the PDF)
    if (highlightId === '') {
      // Empty string means clear selection (clicked on empty space)
      setSelectedCommentId(null)
      setScrollToPdfId(null)
      setScrollToCommentId(null)
    } else {
      setSelectedCommentId(highlightId)
      setScrollToPdfId(null) // Don't scroll PDF when clicking on a highlight
      setScrollToCommentId(highlightId) // Scroll comment list to this comment
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'N/A'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg">Loading document...</div>
        </div>
      </div>
    )
  }

  if (!document) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg mb-4">Document not found</div>
          <Button onClick={() => router.push('/projects')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Projects
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between gap-6">
            {/* Left: Breadcrumb */}
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/" className="cursor-pointer">
                    Home
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink
                    href={project ? `/projects/${project.id}` : '/projects'}
                    className="cursor-pointer"
                  >
                    {project?.name || 'Project'}
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{document.name}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>

            {/* Center: Search and Filter */}
            <div className="flex-1 max-w-md mx-auto flex gap-2 items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search comments..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Filter className="w-4 h-4" />
                    Filter
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80" align="end">
                  <div className="space-y-4">
                    {/* Type Filter */}
                    <div>
                      <label className="text-sm font-medium mb-2 block">Type</label>
                      <ButtonGroup>
                        <Button
                          variant={typeFilter === 'all' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setTypeFilter('all')}
                        >
                          All
                        </Button>
                        <Button
                          variant={typeFilter === 'comment' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setTypeFilter('comment')}
                        >
                          Comment
                        </Button>
                        <Button
                          variant={typeFilter === 'edit' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setTypeFilter('edit')}
                        >
                          Edit
                        </Button>
                      </ButtonGroup>
                    </div>

                    {/* Status Filter */}
                    <div>
                      <label className="text-sm font-medium mb-2 block">Status</label>
                      <ButtonGroup>
                        <Button
                          variant={statusFilter === 'all' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setStatusFilter('all')}
                        >
                          All
                        </Button>
                        <Button
                          variant={statusFilter === 'proposed' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setStatusFilter('proposed')}
                        >
                          Proposed
                        </Button>
                        <Button
                          variant={statusFilter === 'accepted' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setStatusFilter('accepted')}
                        >
                          Accepted
                        </Button>
                        <Button
                          variant={statusFilter === 'rejected' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setStatusFilter('rejected')}
                        >
                          Rejected
                        </Button>
                      </ButtonGroup>
                    </div>

                    {/* User Filter */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium">User</label>
                        {userFilter.length > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto p-0 text-xs"
                            onClick={() => setUserFilter([])}
                          >
                            Clear
                          </Button>
                        )}
                      </div>

                      <Popover open={userComboOpen} onOpenChange={setUserComboOpen}>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-between">
                            {userFilter.length > 0
                              ? `${userFilter.length} selected`
                              : 'Select users...'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Search users..." />
                            <CommandList>
                              <CommandEmpty>No users found.</CommandEmpty>
                              <CommandGroup>
                                {['Robert Curley', 'Sarah Johnson', 'Mike Chen', 'Emily Rodriguez', 'James Wilson', 'Lisa Anderson'].map((user) => (
                                  <CommandItem
                                    key={user}
                                    onSelect={() => {
                                      setUserFilter((current) =>
                                        current.includes(user)
                                          ? current.filter((u) => u !== user)
                                          : [...current, user]
                                      )
                                    }}
                                  >
                                    <div className="flex items-center gap-2 flex-1">
                                      <div className={`w-4 h-4 border rounded flex items-center justify-center ${
                                        userFilter.includes(user) ? 'bg-primary border-primary' : ''
                                      }`}>
                                        {userFilter.includes(user) && (
                                          <Check className="w-3 h-3 text-primary-foreground" />
                                        )}
                                      </div>
                                      {user}
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>

                      {/* Selected user badges */}
                      {userFilter.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {userFilter.map((user) => (
                            <Badge
                              key={user}
                              variant="secondary"
                              className="text-xs gap-1 pr-1"
                            >
                              {user}
                              <button
                                onClick={() => setUserFilter((current) => current.filter((u) => u !== user))}
                                className="hover:bg-muted-foreground/20 rounded p-0.5"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Right: Comment count badge */}
            <Badge variant="secondary" className="text-sm flex-shrink-0">
              {comments.length} {comments.length === 1 ? 'Comment' : 'Comments'}
            </Badge>
          </div>
        </div>
      </div>

      {/* Main Content - Resizable Panels */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanel
          leftPanel={
            <PdfViewerWrapper
              pdfUrl={document.pdf_url}
              highlights={highlights}
              onAddHighlight={handleAddHighlight}
              scrollToHighlightId={scrollToPdfId}
              selectedHighlightId={selectedCommentId}
              onHighlightClick={handleHighlightClick}
            />
          }
          rightPanel={
            <CommentsPanel
              comments={comments}
              onCommentClick={handleCommentClick}
              selectedCommentId={selectedCommentId}
              scrollToCommentId={scrollToCommentId}
              onFilterChange={setFilteredCommentIds}
              searchQuery={searchQuery}
              statusFilter={statusFilter}
              typeFilter={typeFilter}
              userFilter={userFilter}
            />
          }
          defaultLeftWidth={70}
          minLeftWidth={40}
          maxLeftWidth={80}
        />
      </div>
    </div>
  )
}
