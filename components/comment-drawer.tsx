'use client'

import React, { useState, useEffect } from 'react'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { X } from 'lucide-react'

interface CommentDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedText: string
  pageNumber: number
  documentPageNumber?: string
  sectionNumber?: string
  onSubmit: (data: {
    sectionNumber: string
    pageNumber: number
    comment: string
    commentType: string
    commentStatus: string
    highlightedText: string
  }) => void
}

export function CommentDrawer({
  open,
  onOpenChange,
  selectedText,
  pageNumber,
  documentPageNumber = '',
  sectionNumber: propSectionNumber = '',
  onSubmit
}: CommentDrawerProps) {
  const [sectionNumber, setSectionNumber] = useState('')
  const [editablePageNumber, setEditablePageNumber] = useState('')
  const [comment, setComment] = useState('')
  const [commentType, setCommentType] = useState('comment')
  const [commentStatus, setCommentStatus] = useState('proposed')

  // Reset form when drawer opens and pre-fill with document page number and section if available
  useEffect(() => {
    if (open) {
      setSectionNumber(propSectionNumber || '')
      setEditablePageNumber(documentPageNumber || pageNumber.toString())
      setComment('')
      setCommentType('comment')
      setCommentStatus('proposed')
    }
  }, [open, documentPageNumber, pageNumber, propSectionNumber])

  const handleSubmit = () => {
    if (!comment.trim()) return

    onSubmit({
      sectionNumber: sectionNumber.trim(),
      pageNumber: parseInt(editablePageNumber) || pageNumber,
      comment: comment.trim(),
      commentType,
      commentStatus,
      highlightedText: selectedText
    })

    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[500px] sm:w-[600px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Add Comment</SheetTitle>
          <SheetDescription>
            Add your comment to the selected text
          </SheetDescription>
        </SheetHeader>

        <div className="py-6 space-y-4">
          {/* Selected Text Display */}
          {selectedText && (
            <div className="bg-yellow-500/10 border-l-4 border-yellow-500 p-3 rounded-r">
              <div className="text-xs font-medium text-muted-foreground mb-1">
                Selected Text
              </div>
              <div className="text-sm italic">"{selectedText}"</div>
            </div>
          )}

          {/* Form Fields */}
          <div className="grid grid-cols-2 gap-4">
            {/* Section Number */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Section Number</label>
              <Input
                placeholder="e.g., 3.2.1"
                value={sectionNumber}
                onChange={(e) => setSectionNumber(e.target.value)}
              />
            </div>

            {/* Page Number (editable) */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Page Number</label>
              <Input
                type="text"
                placeholder="Page number"
                value={editablePageNumber}
                onChange={(e) => setEditablePageNumber(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Comment Type */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Comment Type</label>
              <Select value={commentType} onValueChange={setCommentType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="comment">Comment</SelectItem>
                  <SelectItem value="edit">Edit</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Comment Status */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={commentStatus} onValueChange={setCommentStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="proposed">Proposed</SelectItem>
                  <SelectItem value="accepted">Accepted</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Comment Text */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Comment *</label>
            <Textarea
              placeholder="Enter your comment..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="min-h-[150px]"
            />
          </div>
        </div>

        <SheetFooter className="gap-2">
          <SheetClose asChild>
            <Button variant="outline">Cancel</Button>
          </SheetClose>
          <Button onClick={handleSubmit} disabled={!comment.trim()}>
            Save Comment
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
