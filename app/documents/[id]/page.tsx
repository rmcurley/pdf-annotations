'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/auth-context'
import { AppSidebar } from '@/components/app-sidebar'
import { SiteHeader } from '@/components/site-header'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { ResizablePanel } from '@/components/resizable-panel'
import { CommentsPanel } from '@/components/comments-panel'
import { CommentsTableModal } from '@/components/comments-table-modal'
import { PdfViewerWrapper } from '@/components/pdf-viewer-wrapper'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import type { IHighlight, NewHighlight } from 'react-pdf-highlighter'

type HighlightPosition = IHighlight['position']
type ExtendedHighlightComment = IHighlight['comment'] & {
  type: string
  status: string
  user_name: string
  annotation_id?: string | null
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

interface Project {
  id: string
  name: string
}

interface Comment {
  id: string
  annotation_id?: string | null
  document_id: string
  document_name: string
  section_number: string | null
  page_number: number | null
  paragraph_number: string | null
  comment: string
  comment_type: string
  comment_status: string
  highlighted_text: string | null
  highlight_position: HighlightPosition | null
  created_at: string
  updated_at: string
  user_id: string | null
  users?: {
    first_name: string | null
    last_name: string | null
    email: string
    avatar_url?: string | null
  }
}

export default function DocumentPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  // Memoize supabase client so effects don't re-run every render
  const supabase = useMemo(() => createClient(), [])
  const documentId = params.id as string

  const [document, setDocument] = useState<Document | null>(null)
  const [project, setProject] = useState<Project | null>(null)
  const [allProjects, setAllProjects] = useState<Project[]>([])
  const [allDocuments, setAllDocuments] = useState<{ id: string; name: string; project_id: string }[]>([])
  const [comments, setComments] = useState<Comment[]>([])
  const [highlights, setHighlights] = useState<IHighlight[]>([])
  const [filteredCommentIds, setFilteredCommentIds] = useState<string[]>([])
  const [selectedCommentId, setSelectedCommentId] = useState<string | null>(null)
  const [scrollToPdfId, setScrollToPdfId] = useState<string | null>(null)
  const [scrollToCommentId, setScrollToCommentId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [annotationsVisible, setAnnotationsVisible] = useState(true)

  const [tableViewOpen, setTableViewOpen] = useState(false)

  // Separate effect for body overflow to ensure DOM is ready
  useEffect(() => {
    // Wait for next tick to ensure body is available
    const timer = setTimeout(() => {
      if (typeof window !== 'undefined' && window.document?.body) {
        window.document.body.style.overflow = 'hidden'
      }
    }, 0)

    return () => {
      clearTimeout(timer)
      // Restore body scrolling when leaving page
      if (typeof window !== 'undefined' && window.document?.body) {
        window.document.body.style.overflow = ''
      }
    }
  }, [])

  useEffect(() => {
    // Convert comments to highlights format, filtering by filteredCommentIds if set
    const commentsToShow = filteredCommentIds.length > 0
      ? comments.filter(c => filteredCommentIds.includes(c.id))
      : comments

    const newHighlights: IHighlight[] = commentsToShow.map((comment) => {
      const commentMeta: ExtendedHighlightComment = {
        text: comment.comment,
        emoji: '',
        type: comment.comment_type,
        status: comment.comment_status,
        user_name: comment.users?.first_name && comment.users?.last_name
          ? `${comment.users.first_name} ${comment.users.last_name}`
          : comment.users?.email?.split('@')[0] || 'Unknown User',
        annotation_id: comment.annotation_id,
      }

      return {
        id: comment.id,
        content: {
          text: comment.highlighted_text || '',
        },
        position: comment.highlight_position ?? ({} as HighlightPosition),
        comment: commentMeta,
      }
    })
    setHighlights(newHighlights)
  }, [comments, filteredCommentIds])

  const fetchDocument = useCallback(async () => {
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

      // Fetch all projects for sidebar
      const { data: allProjectsData, error: allProjectsError } = await supabase
        .from('projects')
        .select('id, name')
        .order('name')

      if (!allProjectsError && allProjectsData) {
        setAllProjects(allProjectsData)
      }

      // Fetch all documents for sidebar
      const { data: allDocsData, error: allDocsError } = await supabase
        .from('documents')
        .select('id, name, project_id')
        .order('name')

      if (!allDocsError && allDocsData) {
        setAllDocuments(allDocsData)
      }
    } catch (error) {
      console.error('Error fetching document:', error)
    } finally {
      setLoading(false)
    }
  }, [documentId, supabase])

  const fetchComments = useCallback(async () => {
    try {
      const { data: commentsData, error } = await supabase
        .from('comments')
        .select('*')
        .eq('document_id', documentId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Supabase error fetching comments:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        throw error
      }

      // Fetch user data for comments that have a user_id
      const userIds = [...new Set(commentsData?.map(c => c.user_id).filter(Boolean) || [])]
      const usersMap = new Map<string, {
        first_name: string | null
        last_name: string | null
        email: string
        avatar_url?: string | null
      }>()

      if (userIds.length > 0) {
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('id, first_name, last_name, email, avatar_url')
          .in('id', userIds)

        if (!usersError && usersData) {
          usersData.forEach(user => {
            usersMap.set(user.id, user)
          })
        }
      }

      // Join user data with comments
      const commentsWithUsers = commentsData?.map(comment => ({
        ...comment,
        users: comment.user_id ? usersMap.get(comment.user_id) : undefined
      })) || []

      setComments(commentsWithUsers)
    } catch (error) {
      console.error('Error fetching comments:', error)
      // Set empty comments array to prevent UI issues
      setComments([])
    }
  }, [documentId, supabase])

  useEffect(() => {
    fetchDocument()
    fetchComments()
  }, [documentId, fetchDocument, fetchComments])

  const handleDeleteComment = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId)

      if (error) throw error

      // Refresh comments list
      await fetchComments()
    } catch (error) {
      console.error('Error deleting comment:', error)
    }
  }

  const handleUpdateAnnotation = async (commentId: string, updates: Partial<Comment>) => {
    try {
      const { error } = await supabase
        .from('comments')
        .update(updates)
        .eq('id', commentId)

      if (error) throw error

      // Refresh comments list
      await fetchComments()
    } catch (error) {
      console.error('Error updating annotation:', error)
      throw error
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
          user_id: user?.id || null,
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
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
      className="h-screen overflow-hidden"
    >
      <AppSidebar
        variant="inset"
        projects={allProjects}
        documents={allDocuments}
        currentProjectId={document?.project_id}
      />
      <SidebarInset className="flex flex-col overflow-hidden">
        <SiteHeader
          projectName={project?.name}
          projectId={project?.id}
          documentName={document?.name}
          showAnnotationsToggle={true}
          annotationsVisible={annotationsVisible}
          onToggleAnnotations={() => setAnnotationsVisible(!annotationsVisible)}
          showTableView={true}
          onTableViewClick={() => setTableViewOpen(true)}
        />
        <div className="flex flex-1 flex-col overflow-hidden min-h-0">
          <ResizablePanel
            hideRightPanel={!annotationsVisible}
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
                  onEditClick={(comment) => {
                    // TODO: Implement edit functionality
                    console.log('Edit comment:', comment)
                  }}
                  onDeleteClick={(comment) => {
                    handleDeleteComment(comment.id)
                  }}
                  onUpdateAnnotation={handleUpdateAnnotation}
                  selectedCommentId={selectedCommentId}
                  scrollToCommentId={scrollToCommentId}
                  onFilterChange={setFilteredCommentIds}
                />
              }
              defaultLeftWidth={70}
              minLeftWidth={40}
              maxLeftWidth={80}
            />
        </div>
      </SidebarInset>

      <CommentsTableModal
        open={tableViewOpen}
        onOpenChange={setTableViewOpen}
        comments={comments}
        onDelete={handleDeleteComment}
        onUpdateAnnotation={handleUpdateAnnotation}
        projectName={project?.name}
        documentName={document?.name}
      />
    </SidebarProvider>
  )
}
