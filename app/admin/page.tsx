'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/auth-context'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SearchInput } from '@/components/search-input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { MoreVertical, Edit, Trash2, Shield, Check, X, ChevronUp, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import { AppSidebar } from '@/components/app-sidebar'
import { SiteHeader } from '@/components/site-header'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'

interface User {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  role: string
  created_at: string
}

interface Project {
  id: string
  name: string
}

// Admin page with user management, search, and sorting
export default function AdminPage() {
  const router = useRouter()
  const { user } = useAuth()
  const supabase = createClient()

  const [users, setUsers] = useState<User[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [allProjects, setAllProjects] = useState<Project[]>([])
  const [allDocuments, setAllDocuments] = useState<{ id: string; name: string; project_id: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [userProjects, setUserProjects] = useState<string[]>([])
  const [projectComboOpen, setProjectComboOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortColumn, setSortColumn] = useState<'first_name' | 'last_name' | 'email' | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  // Edit form state
  const [editFirstName, setEditFirstName] = useState('')
  const [editLastName, setEditLastName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editRole, setEditRole] = useState('')

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setUsers(data || [])
    } catch (error) {
      console.error('Error fetching users:', error)
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  const fetchProjects = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .order('name')

      if (error) throw error
      setProjects(data || [])
    } catch (error) {
      console.error('Error fetching projects:', error)
    }
  }, [supabase])

  const fetchSidebarData = useCallback(async () => {
    try {
      const { data: projectsData } = await supabase
        .from('projects')
        .select('id, name')
        .order('name')

      const { data: docsData } = await supabase
        .from('documents')
        .select('id, name, project_id')
        .order('name')

      setAllProjects(projectsData || [])
      setAllDocuments(docsData || [])
    } catch (error) {
      console.error('Error fetching sidebar data:', error)
    }
  }, [supabase])

  useEffect(() => {
    // Check if user is admin
    if (user && user.profile?.role !== 'admin') {
      toast.error('Access denied. Admin role required.')
      router.push('/projects')
      return
    }

    if (user) {
      fetchUsers()
      fetchProjects()
      fetchSidebarData()
    }
  }, [user, fetchUsers, fetchProjects, fetchSidebarData, router])

  const fetchUserProjects = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('project_members')
        .select('project_id')
        .eq('user_id', userId)

      if (error) throw error
      return (data || []).map(pm => pm.project_id)
    } catch (error) {
      console.error('Error fetching user projects:', error)
      return []
    }
  }

  const handleEditClick = async (user: User) => {
    setSelectedUser(user)
    setEditFirstName(user.first_name || '')
    setEditLastName(user.last_name || '')
    setEditEmail(user.email)
    setEditRole(user.role)

    const projectIds = await fetchUserProjects(user.id)
    setUserProjects(projectIds)
    setEditDialogOpen(true)
  }

  const handleDeleteClick = (user: User) => {
    setSelectedUser(user)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!selectedUser) return

    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', selectedUser.id)

      if (error) throw error

      toast.success('User deleted successfully')
      setDeleteDialogOpen(false)
      setSelectedUser(null)
      fetchUsers()
    } catch (error) {
      console.error('Error deleting user:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to delete user')
    }
  }

  const handleSaveEdit = async () => {
    if (!selectedUser) return

    try {
      // Update user info
      const { error: userError } = await supabase
        .from('users')
        .update({
          first_name: editFirstName,
          last_name: editLastName,
          email: editEmail,
          role: editRole,
        })
        .eq('id', selectedUser.id)

      if (userError) throw userError

      // Update project memberships
      // First, remove all existing memberships
      await supabase
        .from('project_members')
        .delete()
        .eq('user_id', selectedUser.id)

      // Then add new memberships
      if (userProjects.length > 0) {
        const memberships = userProjects.map(projectId => ({
          project_id: projectId,
          user_id: selectedUser.id,
          role: 'member', // Default role for assigned projects
        }))

        const { error: memberError } = await supabase
          .from('project_members')
          .insert(memberships)

        if (memberError) throw memberError
      }

      toast.success('User updated successfully')
      setEditDialogOpen(false)
      setSelectedUser(null)
      fetchUsers()
    } catch (error) {
      console.error('Error updating user:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to update user')
    }
  }

  const toggleProject = (projectId: string) => {
    setUserProjects(prev =>
      prev.includes(projectId)
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId]
    )
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'destructive'
      case 'manager':
        return 'default'
      case 'user':
        return 'secondary'
      case 'viewer':
        return 'outline'
      default:
        return 'secondary'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const handleSort = (column: 'first_name' | 'last_name' | 'email') => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  // Filter and sort users
  const filteredAndSortedUsers = React.useMemo(() => {
    let filtered = users.filter(u => {
      if (!searchQuery) return true
      const query = searchQuery.toLowerCase()
      const firstName = (u.first_name || '').toLowerCase()
      const lastName = (u.last_name || '').toLowerCase()
      const email = u.email.toLowerCase()
      return firstName.includes(query) || lastName.includes(query) || email.includes(query)
    })

    if (sortColumn) {
      filtered = [...filtered].sort((a, b) => {
        let aVal = ''
        let bVal = ''

        if (sortColumn === 'first_name') {
          aVal = (a.first_name || '').toLowerCase()
          bVal = (b.first_name || '').toLowerCase()
        } else if (sortColumn === 'last_name') {
          aVal = (a.last_name || '').toLowerCase()
          bVal = (b.last_name || '').toLowerCase()
        } else if (sortColumn === 'email') {
          aVal = a.email.toLowerCase()
          bVal = b.email.toLowerCase()
        }

        if (sortDirection === 'asc') {
          return aVal.localeCompare(bVal)
        } else {
          return bVal.localeCompare(aVal)
        }
      })
    }

    return filtered
  }, [users, searchQuery, sortColumn, sortDirection])

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <SidebarProvider>
      <AppSidebar
        variant="inset"
        projects={allProjects}
        documents={allDocuments}
      />
      <SidebarInset className="flex flex-col">
        <SiteHeader />
        <div className="flex-1 p-8 overflow-auto">
          <div className="max-w-6xl mx-auto">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>User Management</CardTitle>
                    <CardDescription>Manage user accounts and permissions</CardDescription>
                  </div>
                  <Badge variant="destructive" className="gap-1">
                    <Shield className="w-3 h-3" />
                    Admin Only
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <SearchInput
                    value={searchQuery}
                    onValueChange={setSearchQuery}
                    placeholder="Search users..."
                    wrapperClassName="max-w-sm w-full"
                    className="h-9"
                  />
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <div
                          className="flex items-center gap-2 cursor-pointer select-none"
                          onClick={() => handleSort('first_name')}
                        >
                          <span>Name</span>
                          <div className="flex flex-col">
                            <ChevronUp
                              className={`h-3 w-3 -mb-1 ${
                                sortColumn === 'first_name' && sortDirection === 'asc' ? "text-foreground" : "text-muted-foreground"
                              }`}
                            />
                            <ChevronDown
                              className={`h-3 w-3 ${
                                sortColumn === 'first_name' && sortDirection === 'desc' ? "text-foreground" : "text-muted-foreground"
                              }`}
                            />
                          </div>
                        </div>
                      </TableHead>
                      <TableHead>
                        <div
                          className="flex items-center gap-2 cursor-pointer select-none"
                          onClick={() => handleSort('email')}
                        >
                          <span>Email</span>
                          <div className="flex flex-col">
                            <ChevronUp
                              className={`h-3 w-3 -mb-1 ${
                                sortColumn === 'email' && sortDirection === 'asc' ? "text-foreground" : "text-muted-foreground"
                              }`}
                            />
                            <ChevronDown
                              className={`h-3 w-3 ${
                                sortColumn === 'email' && sortDirection === 'desc' ? "text-foreground" : "text-muted-foreground"
                              }`}
                            />
                          </div>
                        </div>
                      </TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAndSortedUsers.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell>
                          {u.first_name && u.last_name
                            ? `${u.first_name} ${u.last_name}`
                            : u.email.split('@')[0]}
                        </TableCell>
                        <TableCell>{u.email}</TableCell>
                        <TableCell>
                          <Badge variant={getRoleBadgeVariant(u.role)}>
                            {u.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(u.created_at)}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Actions</p>
                              </TooltipContent>
                            </Tooltip>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditClick(u)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDeleteClick(u)}
                                className="text-destructive focus:text-destructive focus:bg-destructive/10"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </div>
      </SidebarInset>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the user account for{' '}
              <strong>
                {selectedUser?.first_name && selectedUser?.last_name
                  ? `${selectedUser.first_name} ${selectedUser.last_name}`
                  : selectedUser?.email}
              </strong>
              . This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information and project assignments
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-first-name">First Name</Label>
                <Input
                  id="edit-first-name"
                  value={editFirstName}
                  onChange={(e) => setEditFirstName(e.target.value)}
                  placeholder="John"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-last-name">Last Name</Label>
                <Input
                  id="edit-last-name"
                  value={editLastName}
                  onChange={(e) => setEditLastName(e.target.value)}
                  placeholder="Doe"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                placeholder="john@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-role">Role</Label>
              <Select value={editRole} onValueChange={setEditRole}>
                <SelectTrigger id="edit-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Project Access</Label>
              <Popover open={projectComboOpen} onOpenChange={setProjectComboOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    {userProjects.length > 0
                      ? `${userProjects.length} project${userProjects.length > 1 ? 's' : ''} selected`
                      : 'Select projects...'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search projects..." />
                    <CommandList>
                      <CommandEmpty>No projects found.</CommandEmpty>
                      <CommandGroup>
                        {projects.map((project) => (
                          <CommandItem
                            key={project.id}
                            onSelect={() => toggleProject(project.id)}
                          >
                            <div className="flex items-center gap-2 flex-1">
                              <div className={`w-4 h-4 border rounded flex items-center justify-center ${
                                userProjects.includes(project.id) ? 'bg-primary border-primary' : ''
                              }`}>
                                {userProjects.includes(project.id) && (
                                  <Check className="w-3 h-3 text-primary-foreground" />
                                )}
                              </div>
                              {project.name}
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {userProjects.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {userProjects.map((projectId) => {
                    const project = projects.find(p => p.id === projectId)
                    return (
                      <Badge
                        key={projectId}
                        variant="secondary"
                        className="text-xs gap-1 pr-1"
                      >
                        {project?.name}
                        <button
                          onClick={() => toggleProject(projectId)}
                          className="hover:bg-muted-foreground/20 rounded p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  )
}
