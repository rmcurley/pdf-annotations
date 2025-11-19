"use client"

import React, { useState } from 'react'
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

interface CommentFormProps {
  selectedText: string
  pageNumber: number
  documentPageNumber?: string
  sectionNumber?: string
  onSubmit: CommentDrawerProps["onSubmit"]
  onClose: () => void
}

function CommentForm({
  selectedText,
  pageNumber,
  documentPageNumber = "",
  sectionNumber: initialSectionNumber = "",
  onSubmit,
  onClose,
}: CommentFormProps) {
  const [sectionNumber, setSectionNumber] = useState(() => initialSectionNumber || "")
  const [editablePageNumber, setEditablePageNumber] = useState(
    () => documentPageNumber || pageNumber.toString(),
  )
  const [comment, setComment] = useState("")
  const [commentType, setCommentType] = useState("comment")
  const [commentStatus, setCommentStatus] = useState("proposed")

  const handleSubmit = () => {
    if (!comment.trim()) return

    onSubmit({
      sectionNumber: sectionNumber.trim(),
      pageNumber: parseInt(editablePageNumber, 10) || pageNumber,
      comment: comment.trim(),
      commentType,
      commentStatus,
      highlightedText: selectedText,
    })

    onClose()
  }

  return (
    <>
      <SheetHeader>
        <SheetTitle>Add Comment</SheetTitle>
        <SheetDescription>Add your comment to the selected text</SheetDescription>
      </SheetHeader>

      <div className="py-6 space-y-4">
        {selectedText && (
          <div className="bg-yellow-500/10 border-l-4 border-yellow-500 p-3 rounded-r">
            <div className="text-xs font-medium text-muted-foreground mb-1">Selected Text</div>
            <div className="text-sm italic">&quot;{selectedText}&quot;</div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Section Number</label>
            <Input
              placeholder="e.g., 3.2.1"
              value={sectionNumber}
              onChange={(e) => setSectionNumber(e.target.value)}
            />
          </div>

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
          <div className="space-y-2">
            <label className="text-sm font-medium">Comment Type</label>
            <Select value={commentType} onValueChange={setCommentType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="comment">Comment</SelectItem>
                <SelectItem value="edit">Edit</SelectItem>
                <SelectItem value="discussion">Discussion</SelectItem>
              </SelectContent>
            </Select>
          </div>

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
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </SheetClose>
        <Button onClick={handleSubmit} disabled={!comment.trim()}>
          Save Comment
        </Button>
      </SheetFooter>
    </>
  )
}

export function CommentDrawer({
  open,
  onOpenChange,
  selectedText,
  pageNumber,
  documentPageNumber = "",
  sectionNumber: propSectionNumber = "",
  onSubmit,
}: CommentDrawerProps) {
  const formResetKey = open
    ? `${documentPageNumber}-${pageNumber}-${propSectionNumber}-${selectedText}`
    : "closed"

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[500px] sm:w-[600px] overflow-y-auto">
        {open && (
          <CommentForm
            key={formResetKey}
            selectedText={selectedText}
            pageNumber={pageNumber}
            documentPageNumber={documentPageNumber}
            sectionNumber={propSectionNumber}
            onSubmit={onSubmit}
            onClose={() => onOpenChange(false)}
          />
        )}
      </SheetContent>
    </Sheet>
  )
}
