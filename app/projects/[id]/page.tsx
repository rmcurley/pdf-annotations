'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { AppSidebar } from "@/components/app-sidebar"
import { ChartAreaInteractive } from "@/components/chart-area-interactive"
import { DocumentsTable, DocumentRow } from "@/components/documents-table"
import { SectionCards } from "@/components/section-cards"
import { SiteHeader } from "@/components/site-header"
import { UploadDocumentModal } from "@/components/upload-document-modal"
import { CommentsTableModal } from "@/components/comments-table-modal"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { buttonVariants } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"

interface Project {
  id: string
  name: string
}

interface Document {
  id: string
  project_id: string
  name: string
  pdf_url: string
  file_size: number | null
  page_count: number | null
  version?: 'Draft' | 'Revised Draft' | 'Final'
  created_at: string
}

interface Comment {
  id: string
  annotation_id?: string | null
  document_id: string
  document_name?: string
  section_number?: string | null
  page_number?: number | null
  comment: string
  comment_type: string
  comment_status: string
  highlighted_text?: string | null
  created_at: string
  users?: {
    first_name: string | null
    last_name: string | null
    email: string
  }
}

export default function Page() {
  const params = useParams()
  const projectId = params.id as string

  const [currentProject, setCurrentProject] = useState<Project | null>(null)
  const [allProjects, setAllProjects] = useState<Project[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [allDocuments, setAllDocuments] = useState<Document[]>([])
  const [comments, setComments] = useState<Comment[]>([])
  const [allCommentsForTable, setAllCommentsForTable] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [tableViewOpen, setTableViewOpen] = useState(false)
  const [deleteDocumentId, setDeleteDocumentId] = useState<string | null>(null)
  const [deleteDocumentAnnotationCount, setDeleteDocumentAnnotationCount] = useState(0)

  useEffect(() => {
    fetchData()
  }, [projectId])

  const fetchData = async () => {
    try {
      setLoading(true)

      // Fetch current project
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('id, name')
        .eq('id', projectId)
        .single()

      if (projectError) throw projectError
      setCurrentProject(projectData)

      // Fetch all projects for sidebar
      const { data: allProjectsData, error: allProjectsError } = await supabase
        .from('projects')
        .select('id, name')
        .order('name')

      if (allProjectsError) throw allProjectsError
      setAllProjects(allProjectsData || [])

      // Fetch all documents for sidebar
      const { data: allDocsData, error: allDocsError } = await supabase
        .from('documents')
        .select('*')
        .order('name')

      if (allDocsError) throw allDocsError
      setAllDocuments(allDocsData || [])

      // Fetch documents for this project
      const { data: docsData, error: docsError } = await supabase
        .from('documents')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })

      if (docsError) throw docsError

      const documentIds = docsData?.map(doc => doc.id) || []

      // Fetch reviewers from junction table
      let documentsWithReviewers = docsData || []
      if (documentIds.length > 0) {
        const { data: assigneesData, error: assigneesError } = await supabase
          .from('document_assignees')
          .select('document_id, user_id')
          .in('document_id', documentIds)

        if (assigneesError) {
          console.error('Error fetching assignees:', assigneesError)
        }

        if (!assigneesError && assigneesData) {
          // Group reviewers by document_id
          const reviewersByDoc = assigneesData.reduce((acc, assignee) => {
            if (!acc[assignee.document_id]) {
              acc[assignee.document_id] = []
            }
            acc[assignee.document_id].push(assignee.user_id)
            return acc
          }, {} as Record<string, string[]>)

          // Add reviewers array to each document
          documentsWithReviewers = docsData.map(doc => ({
            ...doc,
            reviewers: reviewersByDoc[doc.id] || []
          }))
        }

        // Fetch all comments for documents in this project
        const { data: commentsData, error: commentsError } = await supabase
          .from('comments')
          .select('id, document_id, comment_status, created_at')
          .in('document_id', documentIds)

        if (commentsError) throw commentsError
        setComments(commentsData || [])

        // Fetch full comment details for table view
        const { data: fullCommentsData, error: fullCommentsError } = await supabase
          .from('comments')
          .select('*')
          .in('document_id', documentIds)
          .order('created_at', { ascending: false })

        if (fullCommentsError) {
          console.error('Error fetching full comments:', fullCommentsError)
          setAllCommentsForTable([])
        } else {
          // Fetch user data separately for each comment
          const commentsWithUsers = await Promise.all(
            (fullCommentsData || []).map(async (comment) => {
              if (comment.user_id) {
                const { data: userData } = await supabase
                  .from('users')
                  .select('first_name, last_name, email, avatar_url')
                  .eq('id', comment.user_id)
                  .single()

                return {
                  ...comment,
                  users: userData
                }
              }
              return comment
            })
          )
          setAllCommentsForTable(commentsWithUsers)
        }
      }

      setDocuments(documentsWithReviewers)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUploadComplete = () => {
    fetchData()
  }

  // Transform documents to include annotation counts
  const documentsWithAnnotations: DocumentRow[] = documents.map(doc => {
    const docComments = comments.filter(c => c.document_id === doc.id)
    const proposedCount = docComments.filter(c => c.comment_status?.toLowerCase() === 'proposed').length
    const approvedCount = docComments.filter(c => c.comment_status?.toLowerCase() === 'accepted').length
    const rejectedCount = docComments.filter(c => c.comment_status?.toLowerCase() === 'rejected').length

    return {
      id: doc.id,
      name: doc.name,
      pdf_url: doc.pdf_url,
      page_count: doc.page_count,
      file_size: doc.file_size,
      version: doc.version || 'Draft',
      proposed_count: proposedCount,
      approved_count: approvedCount,
      rejected_count: rejectedCount,
      reviewers: doc.reviewers || [],
    }
  })

  // Aggregate comments by date for the chart
  const chartData = (() => {
    // Group comments by date
    const dateMap = new Map<string, { total: number; approved: number }>()

    comments.forEach(comment => {
      const date = new Date(comment.created_at).toISOString().split('T')[0]
      const current = dateMap.get(date) || { total: 0, approved: 0 }

      current.total += 1
      if (comment.comment_status?.toLowerCase() === 'accepted') {
        current.approved += 1
      }

      dateMap.set(date, current)
    })

    // Convert to array and sort by date
    const dataPoints = Array.from(dateMap.entries())
      .map(([date, counts]) => ({
        date,
        total: counts.total,
        approved: counts.approved,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // Calculate cumulative totals
    let cumulativeTotal = 0
    let cumulativeApproved = 0

    return dataPoints.map(point => {
      cumulativeTotal += point.total
      cumulativeApproved += point.approved
      return {
        date: point.date,
        total: cumulativeTotal,
        approved: cumulativeApproved,
      }
    })
  })()

  const handleUpdateDocument = (documentId: string, updates: { name?: string; page_count?: number | null }) => {
    setDocuments((prev) =>
      prev.map((doc) =>
        doc.id === documentId ? { ...doc, ...updates } : doc
      )
    )
  }

  const handleDeleteDocument = (documentId: string) => {
    // Get annotation count for this document
    const docComments = comments.filter(c => c.document_id === documentId)
    const annotationCount = docComments.length

    setDeleteDocumentId(documentId)
    setDeleteDocumentAnnotationCount(annotationCount)
  }

  const handleDeleteDocumentConfirm = async () => {
    if (!deleteDocumentId) return

    try {
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', deleteDocumentId)

      if (error) throw error

      // Refresh data
      fetchData()
      setDeleteDocumentId(null)
      setDeleteDocumentAnnotationCount(0)
    } catch (error) {
      console.error('Error deleting document:', error)
      alert('Failed to delete document')
    }
  }

  const handleUpdateAnnotation = async (commentId: string, updates: Partial<Comment>) => {
    try {
      const { error } = await supabase
        .from('comments')
        .update(updates)
        .eq('id', commentId)

      if (error) throw error

      // Refresh data
      fetchData()
    } catch (error) {
      console.error('Error updating annotation:', error)
      alert('Failed to update annotation')
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId)

      if (error) throw error

      // Refresh data
      fetchData()
    } catch (error) {
      console.error('Error deleting annotation:', error)
      alert('Failed to delete annotation')
    }
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar
        variant="inset"
        projects={allProjects}
        documents={allDocuments}
        currentProjectId={projectId}
      />
      <SidebarInset>
        <SiteHeader projectName={currentProject?.name} projectId={projectId} />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <SectionCards
                card1Label="Total Documents"
                card1Value={documents.length}
                card2Label="Total Pages"
                card2Value={documents.reduce((sum, doc) => sum + (doc.page_count || 0), 0)}
                totalPending={comments.filter(c => c.comment_status === 'proposed').length}
                totalAccepted={comments.filter(c => c.comment_status === 'accepted').length}
              />
              <div className="px-4 lg:px-6">
                <ChartAreaInteractive data={chartData} />
              </div>
              {loading ? (
                <div className="px-4 lg:px-6 text-center py-12 text-muted-foreground">
                  Loading documents...
                </div>
              ) : (
                <DocumentsTable
                  data={documentsWithAnnotations}
                  projectId={projectId}
                  onAddDocument={() => setUploadModalOpen(true)}
                  onUpdateDocument={handleUpdateDocument}
                  onDeleteDocument={handleDeleteDocument}
                  onTableView={() => setTableViewOpen(true)}
                />
              )}
            </div>
          </div>
        </div>
      </SidebarInset>

      {/* Upload Modal */}
      <UploadDocumentModal
        open={uploadModalOpen}
        onOpenChange={setUploadModalOpen}
        projectId={projectId}
        onUploadComplete={handleUploadComplete}
      />

      {/* Comments Table View Modal */}
      <CommentsTableModal
        open={tableViewOpen}
        onOpenChange={setTableViewOpen}
        comments={allCommentsForTable}
        onDelete={handleDeleteComment}
        onUpdateAnnotation={handleUpdateAnnotation}
        projectName={currentProject?.name}
      />

      {/* Delete Document Confirmation Dialog */}
      <AlertDialog
        open={!!deleteDocumentId}
        onOpenChange={(open) => !open && setDeleteDocumentId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteDocumentAnnotationCount > 0
                ? `If you delete this file, you will permanently delete ${deleteDocumentAnnotationCount} annotation${deleteDocumentAnnotationCount !== 1 ? 's' : ''}.`
                : 'This action cannot be undone. Are you sure you want to delete this document?'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDocumentConfirm}
              className={buttonVariants({ variant: "destructive" })}
              autoFocus
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  )
}
