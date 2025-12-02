'use client'

import React, { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { SearchInput } from '@/components/search-input'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { getCommentUserDisplayName } from '@/lib/comment-utils'
import {
  MessageSquare,
  MessageCircle,
  Pencil,
  CircleUserRound,
  FileText,
  CalendarCheck,
  TableOfContents,
  CircleHelp,
  CircleCheck,
  CircleX,
  MoreVertical,
  Edit,
  Trash2,
  Copy,
  Filter,
  MessagesSquare,
  Circle,
  ChevronDown,
  UsersRound,
  Ban,
  Save,
  Loader2,
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
import { Checkbox } from '@/components/ui/checkbox'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import type { ScaledPosition } from 'react-pdf-highlighter-extended'

type BookmarkEntry = {
  title: string
  pageNumber: number
  yNormalizedFromTop: number | null
  level: number
}

interface Comment {
  id: string
  annotation_id?: string | null
  document_id: string
  document_name: string
  section_number: string | null
  page_number: number | null
  paragraph_number: string | null
  comment: string
  comment_type: string
  comment_status: string
  highlighted_text: string | null
  highlight_position: ScaledPosition | null
  created_at: string
  updated_at: string
  user_id: string | null
  users?: {
    first_name: string | null
    last_name: string | null
    email: string
    avatar_url?: string | null
  }
  _filter_user?: string
}

type StatusColor = {
  badge: string
  icon: string
  bg: string
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
  bookmarks?: BookmarkEntry[]
}

function formatAnnotationId(comment: Comment) {
  return comment.annotation_id || `${comment.id.slice(0, 8)}…`
}

function getTypeLabelText(type: string) {
  switch (type?.toLowerCase?.() ?? "") {
    case "edit":
      return "Suggested Edit"
    case "discussion":
      return "Discussion"
    default:
      return "Comment"
  }
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
  formatDate,
  bookmarks = [],
  editingCommentId,
  onEditingChange
}: {
  comment: Comment
  selectedCommentId?: string | null
  scrollToCommentId?: string | null
  onCommentClick?: (comment: Comment) => void
  onEditClick?: (comment: Comment) => void
  onDeleteClick?: (comment: Comment) => void
  onUpdateAnnotation?: (commentId: string, updates: Partial<Comment>) => Promise<void>
  getTypeIcon: (type: string) => React.ComponentType<React.SVGProps<SVGSVGElement>>
  getStatusColor: (status: string) => StatusColor
  formatStatus: (status: string) => string
  formatDate: (dateString: string) => string
  bookmarks?: BookmarkEntry[]
  editingCommentId?: string | null
  onEditingChange?: (commentId: string | null) => void
}) {
  const cardRef = React.useRef<HTMLDivElement>(null)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editedText, setEditedText] = useState(comment.comment)
  const [editedType, setEditedType] = useState(comment.comment_type)
  const [editedStatus, setEditedStatus] = useState(comment.comment_status)
  const [editedSection, setEditedSection] = useState(comment.section_number || '')
  const [editedPage, setEditedPage] = useState(comment.page_number?.toString() || '')
  const [showCopyButton, setShowCopyButton] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const annotationId = formatAnnotationId(comment)
  const TypeIconComponent = getTypeIcon(isEditing ? editedType : comment.comment_type)
  const shortId = annotationId
  const statusColors = getStatusColor(isEditing ? editedStatus : comment.comment_status)

  // Get bookmark options for the current page
  const getBookmarkOptions = (pageNum: number | null) => {
    if (!pageNum || !bookmarks.length) return []

    const currentPageBookmarks = bookmarks.filter((b) => b.pageNumber === pageNum)
    const previousBookmarks = bookmarks.filter((b) => b.pageNumber < pageNum)
    const lastPreviousBookmark = previousBookmarks.length > 0
      ? previousBookmarks[previousBookmarks.length - 1]
      : null

    const options: Array<BookmarkEntry & { isPrevious?: boolean }> = []
    if (lastPreviousBookmark) {
      options.push({ ...lastPreviousBookmark, isPrevious: true })
    }
    options.push(...currentPageBookmarks.map((b) => ({ ...b, isPrevious: false })))
    return options
  }

  const bookmarkOptions = getBookmarkOptions(comment.page_number)

  // Auto-scroll to comment only when explicitly requested via scrollToCommentId
  React.useEffect(() => {
    if (scrollToCommentId === comment.id && cardRef.current) {
      cardRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      })
    }
  }, [scrollToCommentId, comment.id])

  // Focus textarea when entering edit mode
  React.useEffect(() => {
    if (isEditing && textareaRef.current) {
      // Use setTimeout to ensure the textarea is rendered
      setTimeout(() => {
        textareaRef.current?.focus()
      }, 0)
    }
  }, [isEditing])

  const handleSaveEdit = async () => {
    if (!onUpdateAnnotation || !editedText.trim()) return

    setIsSaving(true)
    try {
      const pageNumber =
        editedPage.trim() === '' ? null : parseInt(editedPage, 10)
      await onUpdateAnnotation(comment.id, {
        comment: editedText.trim(),
        comment_type: editedType,
        comment_status: editedStatus,
        section_number: editedSection || null,
        page_number: pageNumber ?? undefined,
      })
      setIsEditing(false)
      onEditingChange?.(null)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancelEdit = () => {
    setEditedText(comment.comment)
    setEditedType(comment.comment_type)
    setEditedStatus(comment.comment_status)
    setEditedSection(comment.section_number || '')
    setEditedPage(comment.page_number?.toString() || '')
    setIsEditing(false)
    onEditingChange?.(null)
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
              {React.createElement(TypeIconComponent, {
                className: `w-3.5 h-3.5 ${statusColors.icon}`,
              })}
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
                  <Tooltip>
                    <TooltipTrigger asChild>
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
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Actions</p>
                    </TooltipContent>
                  </Tooltip>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation()
                        setIsEditing(true)
                        onEditingChange?.(comment.id)
                        onEditClick?.(comment)
                      }}
                      disabled={editingCommentId !== null && editingCommentId !== comment.id}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation()
                        setShowDeleteDialog(true)
                      }}
                      className="hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
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
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant={editedType.toLowerCase() === 'discussion' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setEditedType('discussion')}
                          className="px-3 h-9"
                        >
                          <UsersRound className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Discussion</p>
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

                {/* Section Field - Takes remaining space with editable badge */}
                <div className="flex-1">
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Section</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="w-full h-9 justify-start font-normal focus-visible:ring-0 focus-visible:ring-offset-0 px-3"
                      >
                        <span className="truncate text-left">
                          {editedSection || "Section (optional)"}
                        </span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72 p-0" align="start">
                      <Command shouldFilter={false}>
                        <CommandInput
                          placeholder="Type or select section..."
                          value={editedSection}
                          onValueChange={setEditedSection}
                        />
                        <CommandList>
                          {bookmarkOptions.length === 0 ? (
                            <CommandEmpty>No bookmarks found for this page</CommandEmpty>
                          ) : (
                            <CommandGroup>
                              {bookmarkOptions.map((bookmark, idx) => (
                                <CommandItem
                                  key={idx}
                                  value={bookmark.title}
                                  onSelect={() => {
                                    setEditedSection(bookmark.title)
                                  }}
                                  className="flex items-center gap-2"
                                >
                                  <TableOfContents className="w-3.5 h-3.5 text-muted-foreground" />
                                  <span className="flex-1 truncate">{bookmark.title}</span>
                                  {bookmark.isPrevious && (
                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                      Previous
                                    </Badge>
                                  )}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          )}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
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
                    &quot;{comment.highlighted_text}&quot;
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
                    {getTypeLabelText(editedType)}
                </label>
                <Textarea
                  ref={textareaRef}
                  value={editedText}
                  onChange={(e) => setEditedText(e.target.value)}
                  className="min-h-[100px] focus-visible:ring-0 focus-visible:ring-offset-0"
                  autoFocus
                  onKeyDown={(e) => {
                    if (isSaving) {
                      e.preventDefault()
                      return
                    }
                    if (e.key === "Escape") {
                      handleCancelEdit()
                    } else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault()
                      handleSaveEdit()
                    }
                  }}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="secondary"
                  onClick={handleCancelEdit}
                  className="flex-1"
                  disabled={isSaving}
                >
                  <Ban className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveEdit}
                  disabled={!editedText.trim() || isSaving}
                  className="flex-1 flex items-center justify-center"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save
                    </>
                  )}
                </Button>
              </div>

              {/* Keyboard Shortcuts Hint */}
              <div className="text-[10px] text-muted-foreground mt-1 text-center">
                <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">Esc</kbd> to cancel • <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">Cmd/Ctrl+Enter</kbd> to save
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
                  <CircleUserRound className="w-4 h-4 flex-shrink-0" />
                  <span className="max-w-[160px] truncate">{getCommentUserDisplayName(comment)}</span>
                </div>
              </div>
              {/* Page and Date Row */}
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 flex-shrink-0" />
                  <span>Page {comment.page_number ?? 'N/A'}</span>
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
                        &quot;{comment.highlighted_text}&quot;
                      </div>
                    </div>
                  )}

                  {/* Annotation Text */}
                  <div>
                    <div className="text-xs font-medium text-muted-foreground mb-1">
                      {getTypeLabelText(comment.comment_type)}
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
  bookmarks = [],
}: CommentsPanelProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilters, setTypeFilters] = useState<string[]>([])
  const [statusFilters, setStatusFilters] = useState<string[]>([])
  const [userFilters, setUserFilters] = useState<string[]>([])
  const [userPopoverOpen, setUserPopoverOpen] = useState(false)
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)

  const toggleTypeFilter = (value: string) => {
    setTypeFilters((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    )
  }

  const toggleStatusFilter = (value: string) => {
    setStatusFilters((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    )
  }

  const toggleUserFilter = (value: string) => {
    setUserFilters((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    )
  }

  const clearFilters = () => {
    setTypeFilters([])
    setStatusFilters([])
    setUserFilters([])
  }

  const uniqueUsers = React.useMemo(() => {
    const set = new Set<string>()
    comments.forEach((comment) => {
      const name = getCommentUserDisplayName(comment)
      if (name) {
        set.add(name)
      }
    })
    return Array.from(set).sort()
  }, [comments])

  const filteredComments = React.useMemo(() => {
    const lowerSearch = searchQuery.trim().toLowerCase()

    const filtered = comments.filter((comment) => {
      const commentType = comment.comment_type?.toLowerCase?.() || ''
      const commentStatus = comment.comment_status?.toLowerCase?.() || ''
      const commentUser = getCommentUserDisplayName(comment)
      const commentText = comment.comment?.toLowerCase() || ''
      const highlighted = comment.highlighted_text?.toLowerCase?.() || ''

      const matchesSearch =
        lowerSearch === '' ||
        commentText.includes(lowerSearch) ||
        highlighted.includes(lowerSearch)

      const matchesType =
        typeFilters.length === 0 || typeFilters.includes(commentType)

      const matchesStatus =
        statusFilters.length === 0 || statusFilters.includes(commentStatus)

      const matchesUser =
        userFilters.length === 0 || userFilters.includes(commentUser)

      return matchesSearch && matchesType && matchesStatus && matchesUser
    })

    return [...filtered].sort((a, b) => {
      // 1. Sort by page number
      const aPage = a.page_number ?? Number.MAX_SAFE_INTEGER
      const bPage = b.page_number ?? Number.MAX_SAFE_INTEGER
      if (aPage !== bPage) {
        return aPage - bPage
      }

      // 2. Sort by vertical position (y1 - smaller = higher on page = top to bottom)
      const aY = a.highlight_position?.boundingRect?.y1 || 0
      const bY = b.highlight_position?.boundingRect?.y1 || 0
      const yDiff = aY - bY
      if (Math.abs(yDiff) > 5) { // Use 5px tolerance for different lines
        return yDiff
      }

      // 3. Sort by horizontal position (x1 - smaller = left side)
      const aX = a.highlight_position?.boundingRect?.x1 || 0
      const bX = b.highlight_position?.boundingRect?.x1 || 0
      return aX - bX
    })
  }, [comments, searchQuery, statusFilters, typeFilters, userFilters])

  React.useEffect(() => {
    if (!onFilterChange) return
    onFilterChange(filteredComments.map((comment) => comment.id))
  }, [filteredComments, onFilterChange])

const getTypeIcon = (type: string): React.ComponentType<React.SVGProps<SVGSVGElement>> => {
    switch (type.toLowerCase()) {
      case 'comment':
        return MessageCircle
      case 'edit':
        return Pencil
      case 'discussion':
        return UsersRound
      default:
        return MessageCircle
    }
  }

const getStatusColor = (status: string): StatusColor => {
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
      <div className="flex-shrink-0 border-b bg-background/80">
        <div className="flex items-center gap-2 px-3 py-2">
          <SearchInput
            value={searchQuery}
            onValueChange={setSearchQuery}
            placeholder="Search annotations..."
            wrapperClassName="flex-1 min-w-[220px]"
            className="h-8"
          />
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="relative h-8 w-8"
              >
                <Filter className="h-4 w-4" />
                {(typeFilters.length + statusFilters.length + userFilters.length) > 0 && (
                  <span className="absolute -top-1 -right-1 rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                    {typeFilters.length + statusFilters.length + userFilters.length}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 space-y-4 p-4" align="end">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Filters</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={clearFilters}
                  disabled={
                    typeFilters.length === 0 &&
                    statusFilters.length === 0 &&
                    userFilters.length === 0
                  }
                >
                  Clear
                </Button>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
                      <MessagesSquare className="h-3.5 w-3.5" />
                      <span>Type</span>
                    </div>
                    <div className="space-y-1.5">
                      {["comment", "edit", "discussion"].map((value) => (
                        <label
                          key={value}
                          className="flex items-center gap-2 text-sm"
                          htmlFor={`type-${value}`}
                        >
                          <Checkbox
                            id={`type-${value}`}
                            checked={typeFilters.includes(value)}
                            onCheckedChange={() => toggleTypeFilter(value)}
                          />
                          <span className="capitalize">{value}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
                      <Circle className="h-3.5 w-3.5" />
                      <span>Status</span>
                    </div>
                    <div className="space-y-1.5">
                      {["proposed", "accepted", "rejected"].map((value) => (
                        <label
                          key={value}
                          className="flex items-center gap-2 text-sm"
                          htmlFor={`status-${value}`}
                        >
                          <Checkbox
                            id={`status-${value}`}
                            checked={statusFilters.includes(value)}
                            onCheckedChange={() => toggleStatusFilter(value)}
                          />
                          <span className="capitalize">{value}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase text-muted-foreground">
                      Users
                    </span>
                    {userFilters.length > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {userFilters.length} selected
                      </span>
                    )}
                  </div>
                  <Popover open={userPopoverOpen} onOpenChange={setUserPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-between"
                      >
                        {userFilters.length > 0 ? `${userFilters.length} selected` : "Select users"}
                        <ChevronDown className="h-4 w-4 opacity-60" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search users..." />
                        <CommandList>
                          <CommandEmpty>No users found.</CommandEmpty>
                          <CommandGroup>
                            {uniqueUsers.map((user) => (
                              <CommandItem
                                key={user}
                                value={user}
                                className="flex items-center gap-2"
                                onSelect={() => toggleUserFilter(user)}
                              >
                                <Checkbox
                                  checked={userFilters.includes(user)}
                                  className="pointer-events-none"
                                />
                                <span className="truncate">{user}</span>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
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
            {comments.length === 0 ? (
              <>
                <p>No annotations yet</p>
                <p className="text-sm">Click and drag on the PDF to add an annotation</p>
              </>
            ) : searchQuery.trim() !== '' ? (
              <p>No annotations match your search</p>
            ) : (typeFilters.length > 0 || statusFilters.length > 0 || userFilters.length > 0) ? (
              <p>No annotations match your filters</p>
            ) : (
              <>
                <p>No annotations yet</p>
                <p className="text-sm">Click and drag on the PDF to add an annotation</p>
              </>
            )}
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
              bookmarks={bookmarks}
              editingCommentId={editingCommentId}
              onEditingChange={setEditingCommentId}
            />
          ))
        )}
      </div>
    </div>
  )
}
