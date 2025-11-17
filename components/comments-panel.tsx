'use client'

import React, { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
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
  CircleX,
  Search,
  Filter,
  Check,
  X,
  User,
  MoreVertical,
  Edit,
  Trash2,
  Copy
} from 'lucide-react'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
  highlight_position: any
  created_at: string
  updated_at: string
  user_id: string | null
  users?: {
    first_name: string | null
    last_name: string | null
    email: string
  }
}

interface CommentsPanelProps {
  comments: Comment[]
  onCommentClick?: (comment: Comment) => void
  onEditClick?: (comment: Comment) => void
  onDeleteClick?: (comment: Comment) => void
  onUpdateAnnotation?: (commentId: string, updates: Partial<Comment>) => Promise<void>
  selectedCommentId?: string | null
  scrollToCommentId?: string | null
  onFilterChange?: (filteredIds: string[]) => void
  searchQuery: string
  statusFilter: string
  typeFilter: string
  userFilter: string[]
  meMode: boolean
  currentUser: string
  onSearchChange?: (query: string) => void
  onStatusFilterChange?: (status: string) => void
  onTypeFilterChange?: (type: string) => void
  onUserFilterChange?: (users: string[]) => void
  onMeModeChange?: (enabled: boolean) => void
}

// Separate component for each comment card to use hooks properly
function CommentCard({
  comment,
  selectedCommentId,
  scrollToCommentId,
  onCommentClick,
  onEditClick,
  onDeleteClick,
  onUpdateAnnotation,
  getTypeIcon,
  getStatusColor,
  formatStatus,
  formatDate
}: {
  comment: Comment
  selectedCommentId?: string | null
  scrollToCommentId?: string | null
  onCommentClick?: (comment: Comment) => void
  onEditClick?: (comment: Comment) => void
  onDeleteClick?: (comment: Comment) => void
  onUpdateAnnotation?: (commentId: string, updates: Partial<Comment>) => Promise<void>
  getTypeIcon: (type: string) => any
  getStatusColor: (status: string) => any
  formatStatus: (status: string) => string
  formatDate: (dateString: string) => string
}) {
  const cardRef = React.useRef<HTMLDivElement>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editedText, setEditedText] = useState(comment.comment)
  const [editedType, setEditedType] = useState(comment.comment_type)
  const [editedStatus, setEditedStatus] = useState(comment.comment_status)
  const [editedSection, setEditedSection] = useState(comment.section_number || '')
  const [editedPage, setEditedPage] = useState(comment.page_number.toString())
  const [showCopyButton, setShowCopyButton] = useState(false)

  const TypeIcon = getTypeIcon(isEditing ? editedType : comment.comment_type)
  const shortId = comment.id.substring(0, 5).toUpperCase()
  const statusColors = getStatusColor(isEditing ? editedStatus : comment.comment_status)

  // Auto-scroll to comment only when explicitly requested via scrollToCommentId
  React.useEffect(() => {
    if (scrollToCommentId === comment.id && cardRef.current) {
      cardRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      })
    }
  }, [scrollToCommentId, comment.id])

  const handleSaveEdit = async () => {
    if (onUpdateAnnotation && editedText.trim()) {
      await onUpdateAnnotation(comment.id, {
        comment: editedText.trim(),
        comment_type: editedType,
        comment_status: editedStatus,
        section_number: editedSection || null,
        page_number: parseInt(editedPage)
      })
      setIsEditing(false)
    }
  }

  const handleCancelEdit = () => {
    setEditedText(comment.comment)
    setEditedType(comment.comment_type)
    setEditedStatus(comment.comment_status)
    setEditedSection(comment.section_number || '')
    setEditedPage(comment.page_number.toString())
    setIsEditing(false)
  }

  const handleCopyText = () => {
    if (comment.highlighted_text) {
      navigator.clipboard.writeText(comment.highlighted_text)
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    if (onUpdateAnnotation) {
      await onUpdateAnnotation(comment.id, {
        comment_status: newStatus
      })
    }
  }

  return (
    <Card
      key={comment.id}
      ref={cardRef}
      className={`group cursor-pointer transition-all hover:shadow-md py-4 ${
        selectedCommentId === comment.id ? 'ring-2 ring-yellow-500' : ''
      }`}
      onClick={() => onCommentClick?.(comment)}
    >
      <CardContent className="px-4 py-0">
        {/* Header Row */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            {/* Type Icon */}
            <div className={`w-6 h-6 rounded-full ${statusColors.bg} flex items-center justify-center flex-shrink-0`}>
              <TypeIcon className={`w-3.5 h-3.5 ${statusColors.icon}`} />
            </div>
            {/* Comment ID */}
            <div className="font-semibold text-base">
              {shortId}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isEditing ? (
              /* Edit Mode - Status Badges (Accepted, Proposed, Rejected order) */
              <>
                {/* Accepted Badge */}
                {editedStatus.toLowerCase() === 'accepted' ? (
                  <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-700 border border-emerald-700 flex items-center gap-1.5 text-sm px-3 py-1">
                    <CircleCheck className="w-4 h-4" />
                    Accepted
                  </Badge>
                ) : (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setEditedStatus('accepted')
                          }}
                          className="h-[30px] w-[30px] rounded-full bg-emerald-500/10 flex items-center justify-center hover:bg-emerald-500/20 transition-colors"
                        >
                          <CircleCheck className="w-4 h-4 text-emerald-700" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Mark as Accepted</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}

                {/* Proposed Badge */}
                {editedStatus.toLowerCase() === 'proposed' ? (
                  <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-700 border border-yellow-700 flex items-center gap-1.5 text-sm px-3 py-1">
                    <CircleHelp className="w-4 h-4" />
                    Proposed
                  </Badge>
                ) : (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setEditedStatus('proposed')
                          }}
                          className="h-[30px] w-[30px] rounded-full bg-yellow-500/10 flex items-center justify-center hover:bg-yellow-500/20 transition-colors"
                        >
                          <CircleHelp className="w-4 h-4 text-yellow-700" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Mark as Proposed</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}

                {/* Rejected Badge */}
                {editedStatus.toLowerCase() === 'rejected' ? (
                  <Badge variant="secondary" className="bg-red-500/10 text-red-700 border border-red-700 flex items-center gap-1.5 text-sm px-3 py-1">
                    <CircleX className="w-4 h-4" />
                    Rejected
                  </Badge>
                ) : (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setEditedStatus('rejected')
                          }}
                          className="h-[30px] w-[30px] rounded-full bg-red-500/10 flex items-center justify-center hover:bg-red-500/20 transition-colors"
                        >
                          <CircleX className="w-4 h-4 text-red-700" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Mark as Rejected</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </>
            ) : (
              /* Normal Mode - Single Status Badge */
              <>
                <Badge variant="secondary" className={`${statusColors.badge} border-0 flex items-center gap-1.5 text-sm px-3 py-1`}>
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

                {/* Three-dot menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation()
                      setIsEditing(true)
                    }}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation()
                        setShowDeleteDialog(true)
                      }}
                      className="text-destructive focus:text-destructive focus:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4 mr-2 text-destructive" />
                      Delete
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    {/* Status Options - show the two statuses that are NOT current */}
                    {comment.comment_status.toLowerCase() !== 'accepted' && (
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation()
                          handleStatusChange('accepted')
                        }}
                      >
                        <CircleCheck className="h-4 w-4 mr-2 text-emerald-700" />
                        <span className="text-emerald-700">Accepted</span>
                      </DropdownMenuItem>
                    )}
                    {comment.comment_status.toLowerCase() !== 'proposed' && (
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation()
                          handleStatusChange('proposed')
                        }}
                      >
                        <CircleHelp className="h-4 w-4 mr-2 text-yellow-700" />
                        <span className="text-yellow-700">Proposed</span>
                      </DropdownMenuItem>
                    )}
                    {comment.comment_status.toLowerCase() !== 'rejected' && (
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation()
                          handleStatusChange('rejected')
                        }}
                      >
                        <CircleX className="h-4 w-4 mr-2 text-red-700" />
                        <span className="text-red-700">Rejected</span>
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </div>
        </div>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent onClick={(e) => e.stopPropagation()}>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. Are you sure you want to delete this annotation?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.stopPropagation()
                  onDeleteClick?.(comment)
                  setShowDeleteDialog(false)
                }}
                className={buttonVariants({ variant: "destructive" })}
                autoFocus
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {isEditing ? (
          /* Edit Mode - Inline Form */
          <TooltipProvider>
            <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
              {/* Row 1: Type Toggle and Section/Page */}
              <div className="flex gap-2">
                {/* Type Selection Button Group - Icons Only */}
                <div className="flex-shrink-0">
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Type</label>
                  <ButtonGroup>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant={editedType.toLowerCase() === 'comment' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setEditedType('comment')}
                          className="px-3 h-9"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Comment</p>
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant={editedType.toLowerCase() === 'edit' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setEditedType('edit')}
                          className="px-3 h-9"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Edit</p>
                      </TooltipContent>
                    </Tooltip>
                  </ButtonGroup>
                </div>

                {/* Page Field - Same width as button group */}
                <div className="flex-shrink-0">
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Page</label>
                  <Input
                    value={editedPage}
                    onChange={(e) => setEditedPage(e.target.value)}
                    type="number"
                    placeholder="Page"
                    className="w-20 h-9 focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>

                {/* Section Field - Takes remaining space */}
                <div className="flex-1">
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Section</label>
                  <Input
                    value={editedSection}
                    onChange={(e) => setEditedSection(e.target.value)}
                    placeholder="e.g. 3.2.1"
                    className="h-9 focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>
              </div>

              {/* Selected Text */}
              {comment.highlighted_text && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Selected Text</label>
                  <div
                    className="relative group bg-yellow-500/10 border-l-2 border-yellow-500 pl-3 py-2 text-sm italic"
                    onMouseEnter={() => setShowCopyButton(true)}
                    onMouseLeave={() => setShowCopyButton(false)}
                  >
                    "{comment.highlighted_text}"
                    {showCopyButton && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-1 right-1 h-6 w-6"
                            onClick={handleCopyText}
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Copy</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </div>
              )}

              {/* Annotation Text */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  {editedType.toLowerCase() === 'edit' ? 'Suggested Edit' : 'Comment'}
                </label>
                <Textarea
                  value={editedText}
                  onChange={(e) => setEditedText(e.target.value)}
                  className="min-h-[100px] focus-visible:ring-0 focus-visible:ring-offset-0"
                  autoFocus
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={handleCancelEdit}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveEdit}
                  disabled={!editedText.trim()}
                  className="flex-1"
                >
                  Save
                </Button>
              </div>
            </div>
          </TooltipProvider>
        ) : (
          /* Normal Mode - Collapsed View */
          <>
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
                  <span>
                    {comment.users?.first_name && comment.users?.last_name
                      ? `${comment.users.first_name} ${comment.users.last_name}`
                      : comment.users?.email?.split('@')[0] || 'Unknown User'}
                  </span>
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

                  {/* Annotation Text */}
                  <div>
                    <div className="text-xs font-medium text-muted-foreground mb-1">
                      {comment.comment_type.toLowerCase() === 'edit' ? 'Suggested Edit' : 'Comment'}
                    </div>
                    <p className="text-sm text-foreground leading-relaxed">
                      {comment.comment}
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </>
        )}
      </CardContent>
    </Card>
  )
}

export function CommentsPanel({
  comments,
  onCommentClick,
  onEditClick,
  onDeleteClick,
  onUpdateAnnotation,
  selectedCommentId,
  scrollToCommentId,
  onFilterChange,
  searchQuery,
  statusFilter,
  typeFilter,
  userFilter,
  meMode,
  currentUser,
  onSearchChange,
  onStatusFilterChange,
  onTypeFilterChange,
  onUserFilterChange,
  onMeModeChange
}: CommentsPanelProps) {
  const [userComboOpen, setUserComboOpen] = useState(false)

  const filteredComments = comments
    .filter(comment => {
      const matchesSearch = searchQuery === '' ||
        comment.comment.toLowerCase().includes(searchQuery.toLowerCase()) ||
        comment.highlighted_text?.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesStatus = statusFilter === 'all' || comment.comment_status === statusFilter
      const matchesType = typeFilter === 'all' || comment.comment_type.toLowerCase() === typeFilter.toLowerCase()

      // Get user name from comment
      const commentUserName = comment.users?.first_name && comment.users?.last_name
        ? `${comment.users.first_name} ${comment.users.last_name}`
        : comment.users?.email?.split('@')[0] || 'Unknown User'

      const matchesUser = userFilter.length === 0 || userFilter.includes(commentUserName)
      const matchesMeMode = !meMode || commentUserName === currentUser

      return matchesSearch && matchesStatus && matchesType && matchesUser && matchesMeMode
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

  // Get unique users from comments
  const uniqueUsers = React.useMemo(() => {
    const userSet = new Set<string>()
    comments.forEach((comment) => {
      const userName = comment.users?.first_name && comment.users?.last_name
        ? `${comment.users.first_name} ${comment.users.last_name}`
        : comment.users?.email?.split('@')[0] || 'Unknown User'
      userSet.add(userName)
    })
    return Array.from(userSet).sort()
  }, [comments])

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
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Search and Filter */}
      <div className="flex-shrink-0 p-4 border-b space-y-3">
        <div className="flex gap-2 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search annotations..."
              value={searchQuery}
              onChange={(e) => onSearchChange?.(e.target.value)}
              className="pl-9"
            />
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon">
                <Filter className="w-4 h-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-4">
                {/* Type Filter */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Type</label>
                  <ButtonGroup>
                    <Button
                      variant={typeFilter === 'all' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => onTypeFilterChange?.('all')}
                    >
                      All
                    </Button>
                    <Button
                      variant={typeFilter === 'comment' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => onTypeFilterChange?.('comment')}
                    >
                      Comment
                    </Button>
                    <Button
                      variant={typeFilter === 'edit' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => onTypeFilterChange?.('edit')}
                    >
                      Edit
                    </Button>
                  </ButtonGroup>
                </div>

                {/* Status Filter */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Status</label>
                  <ButtonGroup>
                    <Button
                      variant={statusFilter === 'all' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => onStatusFilterChange?.('all')}
                    >
                      All
                    </Button>
                    <Button
                      variant={statusFilter === 'proposed' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => onStatusFilterChange?.('proposed')}
                    >
                      Proposed
                    </Button>
                    <Button
                      variant={statusFilter === 'accepted' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => onStatusFilterChange?.('accepted')}
                    >
                      Accepted
                    </Button>
                    <Button
                      variant={statusFilter === 'rejected' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => onStatusFilterChange?.('rejected')}
                    >
                      Rejected
                    </Button>
                  </ButtonGroup>
                </div>

                {/* User Filter */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium">User</label>
                    {userFilter.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 text-xs"
                        onClick={() => onUserFilterChange?.([])}
                      >
                        Clear
                      </Button>
                    )}
                  </div>

                  <Popover open={userComboOpen} onOpenChange={setUserComboOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-between">
                        {userFilter.length > 0
                          ? `${userFilter.length} selected`
                          : 'Select users...'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search users..." />
                        <CommandList>
                          <CommandEmpty>No users found.</CommandEmpty>
                          <CommandGroup>
                            {uniqueUsers.map((user) => (
                              <CommandItem
                                key={user}
                                onSelect={() => {
                                  onUserFilterChange?.(
                                    userFilter.includes(user)
                                      ? userFilter.filter((u) => u !== user)
                                      : [...userFilter, user]
                                  )
                                }}
                              >
                                <div className="flex items-center gap-2 flex-1">
                                  <div className={`w-4 h-4 border rounded flex items-center justify-center ${
                                    userFilter.includes(user) ? 'bg-primary border-primary' : ''
                                  }`}>
                                    {userFilter.includes(user) && (
                                      <Check className="w-3 h-3 text-primary-foreground" />
                                    )}
                                  </div>
                                  {user}
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>

                  {/* Selected user badges */}
                  {userFilter.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {userFilter.map((user) => (
                        <Badge
                          key={user}
                          variant="secondary"
                          className="text-xs gap-1 pr-1"
                        >
                          {user}
                          <button
                            onClick={() => onUserFilterChange?.(userFilter.filter((u) => u !== user))}
                            className="hover:bg-muted-foreground/20 rounded p-0.5"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Comments List */}
      <div className="flex-1 overflow-auto p-4 space-y-3">
        {filteredComments.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No annotations yet</p>
            <p className="text-sm">Click and drag on the PDF to add an annotation</p>
          </div>
        ) : (
          filteredComments.map((comment) => (
            <CommentCard
              key={comment.id}
              comment={comment}
              selectedCommentId={selectedCommentId}
              scrollToCommentId={scrollToCommentId}
              onCommentClick={onCommentClick}
              onEditClick={onEditClick}
              onDeleteClick={onDeleteClick}
              onUpdateAnnotation={onUpdateAnnotation}
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
