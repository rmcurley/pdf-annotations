'use client'

import * as React from 'react'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

interface RoleRadioGroupProps {
  label?: string
  value: 'admin' | 'user'
  onValueChange: (value: 'admin' | 'user') => void
  disabled?: boolean
}

export function RoleRadioGroup({
  label,
  value,
  onValueChange,
  disabled = false
}: RoleRadioGroupProps) {
  const id = React.useId()

  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}
      <RadioGroup value={value} onValueChange={onValueChange} disabled={disabled} className="gap-2">
        <div className="border-input has-data-[state=checked]:border-black relative flex w-full items-center gap-2 rounded-md border p-4 shadow-xs outline-none">
          <RadioGroupItem
            value="admin"
            id={`${id}-admin`}
            aria-describedby={`${id}-admin-description`}
            className="size-5 after:absolute after:inset-0 [&_svg]:size-3"
          />
          <div className="grid grow gap-2">
            <Label htmlFor={`${id}-admin`}>Admin</Label>
            <p id={`${id}-admin-description`} className="text-muted-foreground text-xs">
              Has the ability to add users, add projects, archive projects, and delete documents
            </p>
          </div>
        </div>

        <div className="border-input has-data-[state=checked]:border-black relative flex w-full items-center gap-2 rounded-md border p-4 shadow-xs outline-none">
          <RadioGroupItem
            value="user"
            id={`${id}-user`}
            aria-describedby={`${id}-user-description`}
            className="size-5 after:absolute after:inset-0 [&_svg]:size-3"
          />
          <div className="grid grow gap-2">
            <Label htmlFor={`${id}-user`}>User</Label>
            <p id={`${id}-user-description`} className="text-muted-foreground text-xs">
              Has the ability to upload new documents and add/edit annotations
            </p>
          </div>
        </div>
      </RadioGroup>
    </div>
  )
}
