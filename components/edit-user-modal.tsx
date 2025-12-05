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
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { MultiSelectCombobox } from "@/components/multi-select-combobox"
import { RoleRadioGroup } from "@/components/role-radio-group"
import { useAuth } from "@/contexts/auth-context"

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

export function EditUserModal({ open, onOpenChange, user, onUserUpdated }: EditUserModalProps) {
  const supabase = React.useMemo(() => createClient(), [])
  const { user: currentUser, refreshProfile } = useAuth()
  const [firstName, setFirstName] = React.useState("")
  const [lastName, setLastName] = React.useState("")
  const [role, setRole] = React.useState<string>("user")
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
      setRole(user.role || "user")
      setSelectedProjectIds(user.project_ids || [])
      loadProjects()
    }
  }, [open, user, loadProjects])

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

      // If we're editing the current user's profile, refresh the auth context
      if (currentUser?.id === user.id) {
        await refreshProfile()
      }

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
          <RoleRadioGroup
            label="Role"
            value={role as "admin" | "member"}
            onValueChange={setRole}
            disabled={loading || saving}
          />

          {/* Project Assignment */}
          <MultiSelectCombobox
            label="Project Access"
            placeholder="Select projects..."
            searchPlaceholder="Search projects..."
            emptyText="No projects found."
            options={projects.map(p => ({ value: p.id, label: p.name }))}
            selectedValues={selectedProjectIds}
            onSelectionChange={setSelectedProjectIds}
            disabled={loading || saving}
          />
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
