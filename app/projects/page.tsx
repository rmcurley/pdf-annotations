'use client'

import { useState, useEffect } from 'react'
import { AppSidebar } from "@/components/app-sidebar"
import { ChartAreaInteractive } from "@/components/chart-area-interactive"
import { ProjectsTable, ProjectRow } from "@/components/projects-table"
import { SectionCards } from "@/components/section-cards"
import { SiteHeader } from "@/components/site-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/auth-context'
import { toast } from 'sonner'

interface Project {
  id: string
  name: string
  description: string | null
  created_by: string
  created_at: string
}

interface Document {
  id: string
  project_id: string
  name: string
  created_at: string
}

interface Comment {
  id: string
  document_id: string
  comment_status: string
  created_at: string
}

interface ProjectMember {
  project_id: string
  user_id: string
  role: string
}

export default function ProjectsPage() {
  const { user } = useAuth()
  const supabase = createClient()

  const [projects, setProjects] = useState<Project[]>([])
  const [allDocuments, setAllDocuments] = useState<Document[]>([])
  const [allComments, setAllComments] = useState<Comment[]>([])
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([])
  const [loading, setLoading] = useState(true)

  const [createProjectOpen, setCreateProjectOpen] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectDescription, setNewProjectDescription] = useState('')

  useEffect(() => {
    if (user) {
      fetchData()
    }
  }, [user])

  const fetchData = async () => {
    try {
      setLoading(true)

      // First fetch project members to determine which projects user has access to
      const { data: membersData, error: membersError } = await supabase
        .from('project_members')
        .select('project_id, user_id, role')
        .eq('user_id', user?.id)

      if (membersError) throw membersError
      setProjectMembers(membersData || [])

      const userProjectIds = (membersData || []).map(m => m.project_id)

      // Fetch only projects the user has access to (unless admin)
      const isAdmin = user?.profile?.role === 'admin'
      let projectsQuery = supabase.from('projects').select('*').order('name')

      // If not admin, filter to only user's projects
      if (!isAdmin && userProjectIds.length > 0) {
        projectsQuery = projectsQuery.in('id', userProjectIds)
      } else if (!isAdmin && userProjectIds.length === 0) {
        // User has no project access and is not admin
        setProjects([])
        setAllDocuments([])
        setAllComments([])
        setLoading(false)
        return
      }

      const { data: projectsData, error: projectsError } = await projectsQuery

      if (projectsError) throw projectsError
      setProjects(projectsData || [])

      // Fetch documents only for accessible projects
      const accessibleProjectIds = projectsData?.map(p => p.id) || []
      let docsQuery = supabase
        .from('documents')
        .select('id, name, project_id, created_at')
        .order('name')

      if (accessibleProjectIds.length > 0) {
        docsQuery = docsQuery.in('project_id', accessibleProjectIds)
      } else {
        // No accessible projects
        setAllDocuments([])
        setAllComments([])
        setLoading(false)
        return
      }

      const { data: docsData, error: docsError } = await docsQuery

      if (docsError) throw docsError
      setAllDocuments(docsData || [])

      // Fetch comments only for accessible documents
      const documentIds = docsData?.map(d => d.id) || []
      if (documentIds.length > 0) {
        const { data: commentsData, error: commentsError } = await supabase
          .from('comments')
          .select('id, document_id, comment_status, created_at')
          .in('document_id', documentIds)

        if (commentsError) throw commentsError
        setAllComments(commentsData || [])
      } else {
        setAllComments([])
      }

    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load projects')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) {
      toast.error('Please enter a project name')
      return
    }

    if (!user?.id) {
      toast.error('User not authenticated')
      return
    }

    try {
      const { data, error } = await supabase
        .from('projects')
        .insert({
          name: newProjectName.trim(),
          description: newProjectDescription.trim() || null,
          created_by: user.id,
        })
        .select()
        .single()

      if (error) throw error

      toast.success('Project created successfully!')
      setCreateProjectOpen(false)
      setNewProjectName('')
      setNewProjectDescription('')
      fetchData()
    } catch (error: any) {
      console.error('Error creating project:', error)
      toast.error(error.message || 'Failed to create project')
    }
  }

  const handleUpdateProject = async (projectId: string, updates: { name?: string }) => {
    try {
      const { error } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', projectId)

      if (error) throw error

      toast.success('Project updated successfully!')
      fetchData()
    } catch (error: any) {
      console.error('Error updating project:', error)
      toast.error(error.message || 'Failed to update project')
    }
  }

  const handleDeleteProject = async (projectId: string) => {
    // Get document and comment counts
    const projectDocs = allDocuments.filter(doc => doc.project_id === projectId)
    const docIds = projectDocs.map(doc => doc.id)
    const projectComments = allComments.filter(comment => docIds.includes(comment.document_id))

    const message = projectDocs.length > 0 || projectComments.length > 0
      ? `This project has ${projectDocs.length} document(s) and ${projectComments.length} comment(s). If you delete this project, all associated data will be permanently deleted. Are you sure?`
      : 'Are you sure you want to delete this project?'

    if (confirm(message)) {
      try {
        const { error } = await supabase
          .from('projects')
          .delete()
          .eq('id', projectId)

        if (error) throw error

        toast.success('Project deleted successfully!')
        fetchData()
      } catch (error: any) {
        console.error('Error deleting project:', error)
        toast.error(error.message || 'Failed to delete project')
      }
    }
  }

  // Transform projects to include counts and ownership
  const projectsWithCounts: ProjectRow[] = projects.map(project => {
    const projectDocs = allDocuments.filter(doc => doc.project_id === project.id)
    const docIds = projectDocs.map(doc => doc.id)
    const projectComments = allComments.filter(comment => docIds.includes(comment.document_id))

    // Calculate annotation counts by status
    const proposedCount = projectComments.filter(c => c.comment_status?.toLowerCase() === 'proposed').length
    const approvedCount = projectComments.filter(c => c.comment_status?.toLowerCase() === 'accepted').length
    const rejectedCount = projectComments.filter(c => c.comment_status?.toLowerCase() === 'rejected').length

    // Check if current user is owner
    const membership = projectMembers.find(
      pm => pm.project_id === project.id && pm.user_id === user?.id
    )
    const isOwner = membership?.role === 'owner'

    return {
      id: project.id,
      name: project.name,
      document_count: projectDocs.length,
      proposed_count: proposedCount,
      approved_count: approvedCount,
      rejected_count: rejectedCount,
      is_owner: isOwner,
    }
  })

  // Aggregate comments by date for the chart
  const chartData = (() => {
    const dateMap = new Map<string, { total: number; approved: number }>()

    allComments.forEach(comment => {
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
        projects={projects}
        documents={allDocuments}
      />
      <SidebarInset>
        <SiteHeader projectName="All Projects" />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <SectionCards
                card1Value={projects.length}
                card2Value={allDocuments.length}
                totalPending={allComments.filter(c => c.comment_status === 'proposed').length}
                totalAccepted={allComments.filter(c => c.comment_status === 'accepted').length}
              />
              <div className="px-4 lg:px-6">
                <ChartAreaInteractive data={chartData} />
              </div>
              {loading ? (
                <div className="px-4 lg:px-6 text-center py-12 text-muted-foreground">
                  Loading projects...
                </div>
              ) : (
                <ProjectsTable
                  data={projectsWithCounts}
                  onAddProject={() => setCreateProjectOpen(true)}
                  onUpdateProject={handleUpdateProject}
                  onDeleteProject={handleDeleteProject}
                />
              )}
            </div>
          </div>
        </div>
      </SidebarInset>

      {/* Create Project Dialog */}
      <Dialog open={createProjectOpen} onOpenChange={setCreateProjectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>
              Add a new project to organize your documents
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="project-name">Project Name</Label>
              <Input
                id="project-name"
                placeholder="e.g., Q4 Financial Review"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateProject()
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-description">Description (optional)</Label>
              <Textarea
                id="project-description"
                placeholder="Brief description of the project..."
                value={newProjectDescription}
                onChange={(e) => setNewProjectDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateProjectOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateProject}>
              Create Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  )
}
