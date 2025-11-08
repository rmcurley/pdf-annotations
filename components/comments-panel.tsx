'use client'

import React, { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  MessageSquare,
  MessageCircle,
  Pencil,
  FileText,
  CircleUserRound,
  CalendarCheck,
  TableOfContents,
  CircleHelp,
  CircleCheck,
  CircleX
} from 'lucide-react'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'

interface Comment {
  id: string
  document_id: string
  document_name: string
  section_number: string | null
  page_number: number
  paragraph_number: string | null
  comment: string
  comment_type: string
  comment_status: string
  highlighted_text: string | null
  created_at: string
  updated_at: string
}

interface CommentsPanelProps {
  comments: Comment[]
  onCommentClick?: (comment: Comment) => void
  selectedCommentId?: string | null
  scrollToCommentId?: string | null
  onFilterChange?: (filteredIds: string[]) => void
  searchQuery: string
  statusFilter: string
  typeFilter: string
  userFilter: string[]
}

// Separate component for each comment card to use hooks properly
function CommentCard({
  comment,
  selectedCommentId,
  scrollToCommentId,
  onCommentClick,
  getTypeIcon,
  getStatusColor,
  formatStatus,
  formatDate
}: {
  comment: Comment
  selectedCommentId?: string | null
  scrollToCommentId?: string | null
  onCommentClick?: (comment: Comment) => void
  getTypeIcon: (type: string) => any
  getStatusColor: (status: string) => any
  formatStatus: (status: string) => string
  formatDate: (dateString: string) => string
}) {
  const cardRef = React.useRef<HTMLDivElement>(null)
  const TypeIcon = getTypeIcon(comment.comment_type)
  const shortId = comment.id.substring(0, 5).toUpperCase()
  const statusColors = getStatusColor(comment.comment_status)

  // Auto-scroll to comment only when explicitly requested via scrollToCommentId
  React.useEffect(() => {
    if (scrollToCommentId === comment.id && cardRef.current) {
      cardRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      })
    }
  }, [scrollToCommentId, comment.id])

  return (
    <Card
      key={comment.id}
      ref={cardRef}
      className={`cursor-pointer transition-all hover:shadow-md py-4 ${
        selectedCommentId === comment.id ? 'ring-2 ring-yellow-500' : ''
      }`}
      onClick={() => onCommentClick?.(comment)}
    >
      <CardContent className="px-4 py-0">
        {/* Header Row */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            {/* Type Icon */}
            <div className={`w-10 h-10 rounded-full ${statusColors.bg} flex items-center justify-center flex-shrink-0`}>
              <TypeIcon className={`w-5 h-5 ${statusColors.icon}`} />
            </div>
            {/* Comment ID */}
            <div className="font-semibold text-base">
              {shortId}
            </div>
          </div>
          {/* Status Badge */}
          <Badge className={`${statusColors.badge} flex items-center gap-1.5 text-sm px-3 py-1`}>
            {comment.comment_status.toLowerCase() === 'proposed' && (
              <CircleHelp className="w-4 h-4" />
            )}
            {comment.comment_status.toLowerCase() === 'accepted' && (
              <CircleCheck className="w-4 h-4" />
            )}
            {comment.comment_status.toLowerCase() === 'rejected' && (
              <CircleX className="w-4 h-4" />
            )}
            {formatStatus(comment.comment_status)}
          </Badge>
        </div>

        {/* Info Rows - Section/User on first line, Page/Date on second line */}
        <div className="space-y-1 mb-2 pb-2 border-b">
          {/* Section and User Row */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-2 min-w-0">
              {comment.section_number && (
                <>
                  <TableOfContents className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{comment.section_number}</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <CircleUserRound className="w-4 h-4" />
              <span>Robert Curley</span>
            </div>
          </div>
          {/* Page and Date Row */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 flex-shrink-0" />
              <span>Page {comment.page_number}</span>
            </div>
            <div className="flex items-center gap-2">
              <CalendarCheck className="w-4 h-4 flex-shrink-0" />
              <span>{formatDate(comment.created_at)}</span>
            </div>
          </div>
        </div>

        {/* Accordion for Details */}
        <Accordion type="single" collapsible>
          <AccordionItem value="details" className="border-none">
            <AccordionTrigger className="py-0 text-sm font-normal hover:no-underline">
              Expand Details
            </AccordionTrigger>
            <AccordionContent className="pt-3 space-y-3">
              {/* Highlighted Text */}
              {comment.highlighted_text && (
                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-1">
                    Selected Text
                  </div>
                  <div className="bg-yellow-500/10 border-l-2 border-yellow-500 pl-3 py-2 text-sm italic">
                    "{comment.highlighted_text}"
                  </div>
                </div>
              )}

              {/* Comment Text */}
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-1">
                  Comment
                </div>
                <p className="text-sm text-foreground leading-relaxed">
                  {comment.comment}
                </p>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  )
}

export function CommentsPanel({
  comments,
  onCommentClick,
  selectedCommentId,
  scrollToCommentId,
  onFilterChange,
  searchQuery,
  statusFilter,
  typeFilter,
  userFilter
}: CommentsPanelProps) {

  const filteredComments = comments
    .filter(comment => {
      const matchesSearch = searchQuery === '' ||
        comment.comment.toLowerCase().includes(searchQuery.toLowerCase()) ||
        comment.highlighted_text?.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesStatus = statusFilter === 'all' || comment.comment_status === statusFilter
      const matchesType = typeFilter === 'all' || comment.comment_type.toLowerCase() === typeFilter.toLowerCase()
      const matchesUser = userFilter.length === 0 || userFilter.includes('Robert Curley') // For now, all comments are by Robert Curley

      return matchesSearch && matchesStatus && matchesType && matchesUser
    })
    .sort((a, b) => {
      // Sort by page number first
      if (a.page_number !== b.page_number) {
        return a.page_number - b.page_number
      }
      // Then by position on the page (using highlight_position.boundingRect.y1 if available)
      const aY = a.highlight_position?.boundingRect?.y1 || 0
      const bY = b.highlight_position?.boundingRect?.y1 || 0
      return aY - bY
    })

  // Notify parent when filtered comments change
  React.useEffect(() => {
    if (onFilterChange) {
      onFilterChange(filteredComments.map(c => c.id))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, statusFilter, typeFilter, userFilter, comments])

  const getTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'comment':
        return MessageCircle
      case 'edit':
        return Pencil
      default:
        return MessageCircle
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'proposed':
        return {
          badge: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20',
          icon: 'text-yellow-700',
          bg: 'bg-yellow-500/10'
        }
      case 'accepted':
        return {
          badge: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20',
          icon: 'text-emerald-700',
          bg: 'bg-emerald-500/10'
        }
      case 'rejected':
        return {
          badge: 'bg-red-500/10 text-red-700 border-red-500/20',
          icon: 'text-red-700',
          bg: 'bg-red-500/10'
        }
      default:
        return {
          badge: 'bg-muted text-muted-foreground',
          icon: 'text-muted-foreground',
          bg: 'bg-muted'
        }
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatStatus = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          Comments ({filteredComments.length})
        </h2>
      </div>

      {/* Comments List */}
      <div className="flex-1 overflow-auto p-4 space-y-3">
        {filteredComments.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No comments yet</p>
            <p className="text-sm">Click and drag on the PDF to add a comment</p>
          </div>
        ) : (
          filteredComments.map((comment) => (
            <CommentCard
              key={comment.id}
              comment={comment}
              selectedCommentId={selectedCommentId}
              scrollToCommentId={scrollToCommentId}
              onCommentClick={onCommentClick}
              getTypeIcon={getTypeIcon}
              getStatusColor={getStatusColor}
              formatStatus={formatStatus}
              formatDate={formatDate}
            />
          ))
        )}
      </div>
    </div>
  )
}
