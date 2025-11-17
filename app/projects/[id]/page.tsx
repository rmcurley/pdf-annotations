'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { AppSidebar } from "@/components/app-sidebar"
import { ChartAreaInteractive } from "@/components/chart-area-interactive"
import { DocumentsTable, DocumentRow } from "@/components/documents-table"
import { SectionCards } from "@/components/section-cards"
import { SiteHeader } from "@/components/site-header"
import { UploadDocumentModal } from "@/components/upload-document-modal"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
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
  document_id: string
  comment_status: string
  created_at: string
}

export default function Page() {
  const params = useParams()
  const projectId = params.id as string

  const [currentProject, setCurrentProject] = useState<Project | null>(null)
  const [allProjects, setAllProjects] = useState<Project[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [allDocuments, setAllDocuments] = useState<Document[]>([])
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadModalOpen, setUploadModalOpen] = useState(false)

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
    // The DocumentsTable component handles both the database update and local state update
    // No need to refetch data here - the table uses optimistic updates
  }

  const handleDeleteDocument = async (documentId: string) => {
    // Get annotation count for this document
    const docComments = comments.filter(c => c.document_id === documentId)
    const annotationCount = docComments.length

    const message = annotationCount > 0
      ? `If you delete this file, you will permanently delete ${annotationCount} annotation${annotationCount !== 1 ? 's' : ''}.`
      : 'Are you sure you want to delete this document?'

    if (confirm(message)) {
      try {
        const { error } = await supabase
          .from('documents')
          .delete()
          .eq('id', documentId)

        if (error) throw error

        // Refresh data
        fetchData()
      } catch (error) {
        console.error('Error deleting document:', error)
        alert('Failed to delete document')
      }
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
    </SidebarProvider>
  )
}
