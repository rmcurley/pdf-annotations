"use client"

import * as React from "react"
import { IconMoon, IconSun, IconUpload } from "@tabler/icons-react"
import { useTheme } from "next-themes"

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
import { useAuth } from "@/contexts/auth-context"
import { createClient } from "@/lib/supabase/client"

interface AccountModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AccountModal({ open, onOpenChange }: AccountModalProps) {
  const { user, refreshProfile } = useAuth()
  const { theme, setTheme } = useTheme()
  const supabase = React.useMemo(() => createClient(), [])
  const [firstName, setFirstName] = React.useState("")
  const [lastName, setLastName] = React.useState("")
  const [avatarUrl, setAvatarUrl] = React.useState("")
  const [uploading, setUploading] = React.useState(false)
  const [saving, setSaving] = React.useState(false)

  // Load current user data when modal opens
  React.useEffect(() => {
    if (open && user) {
      setFirstName(user.profile?.first_name || "")
      setLastName(user.profile?.last_name || "")
      setAvatarUrl(user.profile?.avatar_url || "")
    }
  }, [open, user])

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true)

      if (!event.target.files || event.target.files.length === 0) {
        return
      }

      const file = event.target.files[0]

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024
      if (file.size > maxSize) {
        alert('Avatar must be smaller than 5MB')
        setUploading(false)
        return
      }

      // Validate file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
      if (!validTypes.includes(file.type)) {
        alert('Please upload a valid image file (JPEG, PNG, GIF, or WebP)')
        setUploading(false)
        return
      }

      const fileExt = file.name.split('.').pop()
      const fileName = `${user?.id}-${Date.now()}.${fileExt}`

      console.log('Uploading avatar:', fileName)

      const { error: uploadError, data } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        })

      if (uploadError) {
        console.error('Upload error:', uploadError)
        throw uploadError
      }

      console.log('Upload successful:', data)

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName)

      console.log('Public URL:', publicUrl)
      setAvatarUrl(publicUrl)
    } catch (error) {
      console.error('Error uploading avatar:', error)
      const message = error instanceof Error ? error.message : 'Unknown error'
      alert(`Error uploading avatar: ${message}. Please check the browser console for details.`)
    } finally {
      setUploading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)

      // Update users table (single source of truth)
      if (user?.id) {
        const { error } = await supabase
          .from('users')
          .update({
            first_name: firstName,
            last_name: lastName,
            avatar_url: avatarUrl,
          })
          .eq('id', user.id)

        if (error) throw error

        // Refresh the user profile in auth context
        await refreshProfile()
      }

      onOpenChange(false)
    } catch (error) {
      console.error('Error updating profile:', error)
      const message = error instanceof Error ? error.message : 'Unknown error'
      alert(`Error updating profile: ${message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Account Settings</DialogTitle>
          <DialogDescription>
            Update your account information and preferences.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          {/* Avatar Section */}
          <div className="flex flex-col items-center gap-4">
            <Avatar className="h-24 w-24 rounded-full">
              <AvatarImage src={avatarUrl} />
              <AvatarFallback className="text-3xl">
                {firstName?.[0]}{lastName?.[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex items-center gap-2">
              <Input
                id="avatar"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
                disabled={uploading}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => document.getElementById('avatar')?.click()}
                disabled={uploading}
              >
                <IconUpload className="mr-2 h-4 w-4" />
                {uploading ? 'Uploading...' : 'Upload Avatar'}
              </Button>
            </div>
          </div>

          {/* Name Fields */}
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Enter your first name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Enter your last name"
              />
            </div>
          </div>

          {/* Theme Toggle */}
          <div className="grid gap-2">
            <Label>Theme</Label>
            <div className="flex gap-2">
              <Button
                variant={theme === 'light' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTheme('light')}
                className="flex-1"
              >
                <IconSun className="mr-2 h-4 w-4" />
                Light
              </Button>
              <Button
                variant={theme === 'dark' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTheme('dark')}
                className="flex-1"
              >
                <IconMoon className="mr-2 h-4 w-4" />
                Dark
              </Button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
