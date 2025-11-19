"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

interface EditUserModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: {
    id: string
    email: string
    first_name: string | null
    last_name: string | null
    role: string
    avatar_url?: string | null
    project_ids?: string[]
  } | null
  onUserUpdated?: () => void
}

interface Project {
  id: string
  name: string
}

const ROLES = ['admin', 'member'] as const

export function EditUserModal({ open, onOpenChange, user, onUserUpdated }: EditUserModalProps) {
  const supabase = React.useMemo(() => createClient(), [])
  const [firstName, setFirstName] = React.useState("")
  const [lastName, setLastName] = React.useState("")
  const [role, setRole] = React.useState<string>("member")
  const [selectedProjectIds, setSelectedProjectIds] = React.useState<string[]>([])
  const [projects, setProjects] = React.useState<Project[]>([])
  const [loading, setLoading] = React.useState(false)
  const [saving, setSaving] = React.useState(false)

  // Load user data and projects when modal opens
  const loadProjects = React.useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .order('name')

      if (error) throw error
      setProjects(data || [])
    } catch (error) {
      console.error('Error loading projects:', error)
      toast.error('Failed to load projects')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  React.useEffect(() => {
    if (open && user) {
      setFirstName(user.first_name || "")
      setLastName(user.last_name || "")
      setRole(user.role || "member")
      setSelectedProjectIds(user.project_ids || [])
      loadProjects()
    }
  }, [open, user, loadProjects])

  const handleProjectToggle = (projectId: string) => {
    setSelectedProjectIds(prev =>
      prev.includes(projectId)
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId]
    )
  }

  const handleSave = async () => {
    if (!user?.id) return

    try {
      setSaving(true)

      // Update users table
      const { error: updateError } = await supabase
        .from('users')
        .update({
          first_name: firstName,
          last_name: lastName,
          role: role,
        })
        .eq('id', user.id)

      if (updateError) throw updateError

      // Update project memberships
      // First, remove all existing memberships for this user
      await supabase
        .from('project_members')
        .delete()
        .eq('user_id', user.id)

      // Then add new memberships
      if (selectedProjectIds.length > 0) {
        const newMemberships = selectedProjectIds.map(projectId => ({
          user_id: user.id,
          project_id: projectId,
          role: 'member'
        }))

        const { error: insertError } = await supabase
          .from('project_members')
          .insert(newMemberships)

        if (insertError) throw insertError
      }

      toast.success('User updated successfully')
      onOpenChange(false)

      // Notify parent to refresh data
      if (onUserUpdated) {
        onUserUpdated()
      }
    } catch (error) {
      console.error('Error updating user:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to update user')
    } finally {
      setSaving(false)
    }
  }

  const getInitials = () => {
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase()
    }
    if (user?.email) {
      return user.email[0].toUpperCase()
    }
    return 'U'
  }

  if (!user) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>
            Update user information, role, and project assignments.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          {/* Avatar Section (Read-only) */}
          <div className="flex flex-col items-center gap-2">
            <Avatar className="h-20 w-20 rounded-full">
              <AvatarImage src={user.avatar_url || undefined} />
              <AvatarFallback className="text-2xl">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            <div className="text-sm text-muted-foreground">{user.email}</div>
          </div>

          {/* Name Fields */}
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Enter first name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Enter last name"
              />
            </div>
          </div>

          {/* Role Selector */}
          <div className="grid gap-2">
            <Label htmlFor="role">Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger id="role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((roleOption) => (
                  <SelectItem key={roleOption} value={roleOption}>
                    {roleOption.charAt(0).toUpperCase() + roleOption.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Project Assignment */}
          <div className="grid gap-2">
            <Label>Project Access</Label>
            <div className="border rounded-md p-4 max-h-[200px] overflow-y-auto space-y-3">
              {loading ? (
                <div className="text-sm text-muted-foreground text-center py-2">
                  Loading projects...
                </div>
              ) : projects.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-2">
                  No projects found
                </div>
              ) : (
                projects.map((project) => (
                  <div key={project.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`project-${project.id}`}
                      checked={selectedProjectIds.includes(project.id)}
                      onCheckedChange={() => handleProjectToggle(project.id)}
                    />
                    <label
                      htmlFor={`project-${project.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {project.name}
                    </label>
                  </div>
                ))
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              {selectedProjectIds.length} project{selectedProjectIds.length !== 1 ? 's' : ''} selected
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
