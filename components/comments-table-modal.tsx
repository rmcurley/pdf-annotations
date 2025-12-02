"use client"

import * as React from "react"
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  SortingState,
  getFilteredRowModel,
  getPaginationRowModel,
} from "@tanstack/react-table"
import {
  Pencil,
  Trash2,
  Table as TableIcon,
  MessageCircle,
  MoreVertical,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  Check,
  X,
  CircleCheck,
  CircleHelp,
  CircleX,
  Edit,
  UsersRound,
  Download,
  FileSpreadsheet,
  FileText,
  ChevronDown,
} from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { DataTableFilter, useDataTableFilters } from "@/components/data-table-filter"
import { SearchInput } from "@/components/search-input"
import {
  commentFilterColumnsConfig,
  filterCommentsByActiveFilters,
  normalizeCommentsForFiltering,
} from "@/lib/comment-filter-config"
import { getCommentUserDisplayName } from "@/lib/comment-utils"
import { exportToExcel, exportToWord, generateFileName } from "@/lib/export-utils"
import { toast } from "sonner"

export interface TableComment {
  id: string
  annotation_id?: string | null
  comment_type: string
  comment_status: string
  highlighted_text: string | null
  comment: string
  section_number?: string | null
  page_number?: number | null
  document_name?: string
  highlight_position?: any
  created_at?: string
  users?: {
    first_name: string | null
    last_name: string | null
    email: string
    avatar_url?: string | null
  }
  _filter_user?: string
}

interface CommentsTableModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  comments: TableComment[]
  onDelete?: (commentId: string) => void
  onUpdateAnnotation?: (commentId: string, updates: Partial<TableComment>) => void
  projectName?: string
  documentName?: string
}

type CommentsTableMeta = {
  editingCommentId: string | null
  editedComment: string
  editedType?: string
  editedStatus?: string
  setEditingCommentId: (id: string | null) => void
  setEditedComment: (value: string) => void
  setEditedType?: (value: string) => void
  setEditedStatus?: (value: string) => void
  saveEdit: () => void
  cancelEdit: () => void
  setDeleteCommentId?: (id: string | null) => void
  handleStatusChange?: (commentId: string, newStatus: string) => void
  showDocumentNameInRows?: boolean
}

// Separate component for editable cell
function EditableCommentCell({
  comment,
  isEditing,
  editedValue,
  onValueChange,
  onSave,
  onCancel,
}: {
  comment: TableComment
  isEditing: boolean
  editedValue: string
  onValueChange: (value: string) => void
  onSave: () => void
  onCancel: () => void
}) {
  if (isEditing) {
    return (
      <div className="flex items-start gap-2 py-2">
        <Textarea
          value={editedValue}
          onChange={(e) => onValueChange(e.target.value)}
          className="min-h-[120px] flex-1 resize-y"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter" && e.ctrlKey) {
              e.preventDefault()
              onSave()
            } else if (e.key === "Escape") {
              e.preventDefault()
              onCancel()
            }
          }}
        />
        <div className="flex flex-col gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="size-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                onClick={onSave}
              >
                <Check className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Save</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="size-8 text-muted-foreground hover:text-foreground"
                onClick={onCancel}
              >
                <X className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Cancel</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    )
  }

  return (
    <div className="whitespace-normal break-words">
      {comment.comment}
    </div>
  )
}

/**
 * Columns are defined ONCE and read live state via table.options.meta.
 * This keeps the <Textarea> from being recreated on every keystroke.
 */
const columns: ColumnDef<TableComment>[] = [
  {
    accessorKey: "annotation_id",
    header: () => <div className="whitespace-nowrap">ID</div>,
    cell: ({ row }) => {
      const annotationId = row.original.annotation_id
      return (
        <div className="text-sm font-medium whitespace-nowrap">
          {annotationId || (
            <span className="text-muted-foreground italic">
              {row.original.id.slice(0, 8)}...
            </span>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: "location",
    header: () => <div className="whitespace-nowrap">Location</div>,
    cell: ({ row, table }) => {
      const sectionNumber = row.original.section_number
      const pageNumber = row.original.page_number
      const documentName = row.original.document_name
      const meta = table.options.meta as CommentsTableMeta
      const showDocName = meta.showDocumentNameInRows && documentName

      return (
        <div className="text-sm whitespace-normal">
          {showDocName && sectionNumber && (
            <div className="font-medium break-words">
              {documentName} &gt; {sectionNumber}
            </div>
          )}
          {showDocName && !sectionNumber && (
            <div className="font-medium break-words">{documentName}</div>
          )}
          {!showDocName && sectionNumber && (
            <div className="font-medium break-words">{sectionNumber}</div>
          )}
          {pageNumber && (
            <div className="text-muted-foreground">Page {pageNumber}</div>
          )}
          {!sectionNumber && !pageNumber && !showDocName && (
            <span className="text-muted-foreground italic">-</span>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: "comment_type",
    header: () => <div className="text-center whitespace-nowrap">Type</div>,
    cell: ({ row, table }) => {
      const meta = table.options.meta as CommentsTableMeta
      const comment = row.original
      const isEditing = meta.editingCommentId === comment.id
      const type = meta.editedType || row.original.comment_type

      let TypeIcon = MessageCircle
      let typeLabel = "Comment"
      if (type === "edit") {
        TypeIcon = Pencil
        typeLabel = "Edit"
      } else if (type === "discussion") {
        TypeIcon = UsersRound
        typeLabel = "Discussion"
      }

      if (isEditing) {
        return (
          <div className="flex items-center justify-center">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <TypeIcon className="w-4 h-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-40 p-2" align="center">
                <div className="space-y-1">
                  <Button
                    variant={type === "comment" ? "secondary" : "ghost"}
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => meta.setEditedType?.("comment")}
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Comment
                  </Button>
                  <Button
                    variant={type === "edit" ? "secondary" : "ghost"}
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => meta.setEditedType?.("edit")}
                  >
                    <Pencil className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                  <Button
                    variant={type === "discussion" ? "secondary" : "ghost"}
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => meta.setEditedType?.("discussion")}
                  >
                    <UsersRound className="w-4 h-4 mr-2" />
                    Discussion
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        )
      }

      return (
        <div className="flex items-center justify-center">
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <TypeIcon className="w-4 h-4" />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{typeLabel}</p>
            </TooltipContent>
          </Tooltip>
        </div>
      )
    },
  },
  {
    accessorKey: "comment_status",
    header: () => <div className="text-center">Status</div>,
    cell: ({ row, table }) => {
      const meta = table.options.meta as CommentsTableMeta
      const comment = row.original
      const isEditing = meta.editingCommentId === comment.id
      const status = meta.editedStatus || row.original.comment_status

      let StatusIcon = CircleHelp
      let statusLabel = "Proposed"
      let statusColor = "text-yellow-700"

      if (status === 'accepted') {
        StatusIcon = CircleCheck
        statusLabel = "Accepted"
        statusColor = "text-emerald-700"
      } else if (status === 'rejected') {
        StatusIcon = CircleX
        statusLabel = "Rejected"
        statusColor = "text-red-700"
      }

      if (isEditing) {
        return (
          <div className="flex justify-center">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <StatusIcon className={`w-4 h-4 ${statusColor}`} />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-40 p-2" align="center">
                <div className="space-y-1">
                  <Button
                    variant={status === "proposed" ? "secondary" : "ghost"}
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => meta.setEditedStatus?.("proposed")}
                  >
                    <CircleHelp className="w-4 h-4 mr-2 text-yellow-700" />
                    Proposed
                  </Button>
                  <Button
                    variant={status === "accepted" ? "secondary" : "ghost"}
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => meta.setEditedStatus?.("accepted")}
                  >
                    <CircleCheck className="w-4 h-4 mr-2 text-emerald-700" />
                    Accepted
                  </Button>
                  <Button
                    variant={status === "rejected" ? "secondary" : "ghost"}
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => meta.setEditedStatus?.("rejected")}
                  >
                    <CircleX className="w-4 h-4 mr-2 text-red-700" />
                    Rejected
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        )
      }

      return (
        <div className="flex justify-center">
          <Tooltip>
            <TooltipTrigger asChild>
              <div><StatusIcon className={`w-4 h-4 ${statusColor}`} /></div>
            </TooltipTrigger>
            <TooltipContent><p>{statusLabel}</p></TooltipContent>
          </Tooltip>
        </div>
      )
    },
  },
  {
    id: "user",
    accessorFn: (row) => getCommentUserDisplayName(row),
    header: () => <div className="whitespace-nowrap">User</div>,
    cell: ({ row }) => {
      const user = row.original.users
      const firstName = user?.first_name || ""
      const lastName = user?.last_name || ""
      const email = user?.email || ""
      const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || email.charAt(0).toUpperCase()
      const fullName = firstName && lastName ? `${firstName} ${lastName}` : email.split("@")[0]

      // Format created_at date
      const createdAt = row.original.created_at
      const dateStr = createdAt ? new Date(createdAt).toLocaleString() : ""

      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center">
              <Avatar className="size-6">
                {user?.avatar_url && (
                  <AvatarImage src={user.avatar_url} alt={fullName} />
                )}
                <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
              </Avatar>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-center">
              <p className="font-medium">{fullName}</p>
              {dateStr && <p className="text-xs text-muted-foreground">{dateStr}</p>}
            </div>
          </TooltipContent>
        </Tooltip>
      )
    },
  },
  {
    accessorKey: "highlighted_text",
    header: "Selected Text",
    cell: ({ row }) => (
      <div className="text-sm whitespace-normal break-words">
        {row.original.highlighted_text ? (
          row.original.highlighted_text
        ) : (
          <span className="text-muted-foreground italic">No selection</span>
        )}
      </div>
    ),
  },
  {
    accessorKey: "comment",
    header: () => "Comment/Edit",
    cell: ({ row, table }) => {
      const meta = table.options.meta as CommentsTableMeta
      const comment = row.original
      const isEditing = meta.editingCommentId === comment.id

      return (
        <EditableCommentCell
          comment={comment}
          isEditing={isEditing}
          editedValue={meta.editedComment}
          onValueChange={meta.setEditedComment}
          onSave={meta.saveEdit}
          onCancel={meta.cancelEdit}
        />
      )
    },
  },
  {
    id: "actions",
    header: "",
    size: 50,
    cell: ({ row, table }) => {
      const comment = row.original
      const currentStatus = comment.comment_status
      const meta = table.options.meta as CommentsTableMeta
      const isEditing = meta.editingCommentId === comment.id

      const hasUpdate = typeof meta?.handleStatusChange === "function"

      // Hide kebab menu when editing
      if (isEditing) {
        return null
      }

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => {
                meta.setEditingCommentId(comment.id)
                meta.setEditedComment(comment.comment)
                meta.setEditedType?.(comment.comment_type)
                meta.setEditedStatus?.(comment.comment_status)
              }}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => meta?.setDeleteCommentId?.(comment.id)}
              className="hover:bg-destructive/10 focus:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>

            {hasUpdate && (
              <>
                <DropdownMenuSeparator />
                {currentStatus !== "accepted" && (
                  <DropdownMenuItem
                    onClick={() =>
                      meta.handleStatusChange?.(comment.id, "accepted")
                    }
                  >
                    <CircleCheck className="h-4 w-4 mr-2 text-emerald-700" />
                    <span className="text-emerald-700">Accepted</span>
                  </DropdownMenuItem>
                )}
                {currentStatus !== "proposed" && (
                  <DropdownMenuItem
                    onClick={() =>
                      meta.handleStatusChange?.(comment.id, "proposed")
                    }
                  >
                    <CircleHelp className="h-4 w-4 mr-2 text-yellow-700" />
                    <span className="text-yellow-700">Proposed</span>
                  </DropdownMenuItem>
                )}
                {currentStatus !== "rejected" && (
                  <DropdownMenuItem
                    onClick={() =>
                      meta.handleStatusChange?.(comment.id, "rejected")
                    }
                  >
                    <CircleX className="h-4 w-4 mr-2 text-red-700" />
                    <span className="text-red-700">Rejected</span>
                  </DropdownMenuItem>
                )}
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]

export function CommentsTableModal({
  open,
  onOpenChange,
  comments,
  onDelete,
  onUpdateAnnotation,
  projectName,
  documentName,
}: CommentsTableModalProps) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [deleteCommentId, setDeleteCommentId] = React.useState<string | null>(
    null,
  )
  const [editingCommentId, setEditingCommentId] =
    React.useState<string | null>(null)
  const [editedComment, setEditedComment] = React.useState<string>("")
  const [editedType, setEditedType] = React.useState<string>("")
  const [editedStatus, setEditedStatus] = React.useState<string>("")
  const [searchQuery, setSearchQuery] = React.useState("")

  const normalizedComments = React.useMemo(
    () => normalizeCommentsForFiltering(comments),
    [comments],
  )

  const searchFilteredComments = React.useMemo(() => {
    if (!searchQuery.trim()) return normalizedComments
    const lower = searchQuery.toLowerCase()
    return normalizedComments.filter((comment) => {
      const commentText = comment.comment?.toLowerCase() || ""
      const highlighted = comment.highlighted_text?.toLowerCase?.() || ""
      return (
        commentText.includes(lower) ||
        highlighted.includes(lower)
      )
    })
  }, [normalizedComments, searchQuery])

  const userOptions = React.useMemo(() => {
    const map = new Map<string, { label: string; value: string }>()
    normalizedComments.forEach((comment) => {
      const name = comment._filter_user
      if (!name) return
      if (!map.has(name)) {
        map.set(name, { label: name, value: name })
      }
    })
    return Array.from(map.values())
  }, [normalizedComments])

  const {
    columns: filterColumns,
    filters: activeFilters,
    actions: filterActions,
    strategy: filterStrategy,
  } = useDataTableFilters({
    strategy: "client",
    data: searchFilteredComments,
    columnsConfig: commentFilterColumnsConfig,
    options: {
      user: userOptions,
    },
  })

  const filteredByFilters = React.useMemo(
    () => filterCommentsByActiveFilters(searchFilteredComments, activeFilters),
    [activeFilters, searchFilteredComments],
  )

  const sortedComments = React.useMemo(() => {
    return [...filteredByFilters].sort((a, b) => {
      // 1. Sort by document name (alphabetically)
      const docA = (a.document_name || "").toLowerCase()
      const docB = (b.document_name || "").toLowerCase()
      if (docA !== docB) return docA < docB ? -1 : 1

      // 2. Sort by page number
      const pageA = Number.isFinite(a.page_number) ? (a.page_number as number) : Number.POSITIVE_INFINITY
      const pageB = Number.isFinite(b.page_number) ? (b.page_number as number) : Number.POSITIVE_INFINITY
      if (pageA !== pageB) return pageA - pageB

      // 3. Sort by vertical position (y1 - smaller = higher on page = top to bottom)
      const aY = a.highlight_position?.boundingRect?.y1 ?? 0
      const bY = b.highlight_position?.boundingRect?.y1 ?? 0
      const yDiff = aY - bY
      if (Math.abs(yDiff) > 5) { // Use 5px tolerance for different lines
        return yDiff
      }

      // 4. Sort by horizontal position (x1 - smaller = left side)
      const aX = a.highlight_position?.boundingRect?.x1 ?? 0
      const bX = b.highlight_position?.boundingRect?.x1 ?? 0
      return aX - bX
    })
  }, [filteredByFilters])

  const handleDeleteConfirm = React.useCallback(() => {
    if (deleteCommentId && onDelete) {
      onDelete(deleteCommentId)
      setDeleteCommentId(null)
    }
  }, [deleteCommentId, onDelete])

  const handleSaveEdit = React.useCallback(async () => {
    if (!editingCommentId || !onUpdateAnnotation) return

    const updates: Partial<TableComment> = {}

    if (editedComment.trim()) {
      updates.comment = editedComment.trim()
    }

    if (editedType) {
      updates.comment_type = editedType
    }

    if (editedStatus) {
      updates.comment_status = editedStatus
    }

    if (Object.keys(updates).length > 0) {
      await onUpdateAnnotation(editingCommentId, updates)
    }

    setEditingCommentId(null)
    setEditedComment("")
    setEditedType("")
    setEditedStatus("")
  }, [editingCommentId, editedComment, editedType, editedStatus, onUpdateAnnotation])

  const handleCancelEdit = React.useCallback(() => {
    setEditingCommentId(null)
    setEditedComment("")
    setEditedType("")
    setEditedStatus("")
  }, [])

  const handleStatusChange = React.useCallback(
    (commentId: string, newStatus: string) => {
      if (onUpdateAnnotation) {
        onUpdateAnnotation(commentId, { comment_status: newStatus })
      }
    },
    [onUpdateAnnotation],
  )

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: sortedComments,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
    getRowId: (row) => row.id,
    meta: {
      editingCommentId,
      editedComment,
      editedType,
      editedStatus,
      setEditingCommentId,
      setEditedComment,
      setEditedType,
      setEditedStatus,
      saveEdit: handleSaveEdit,
      cancelEdit: handleCancelEdit,
      // extra helpers used by actions cell
      setDeleteCommentId,
      handleStatusChange,
      // Only show document name in rows if not showing in breadcrumbs
      showDocumentNameInRows: !documentName,
    },
  })

  const pageSizes = [10, 20, 50, 100]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-[85vw] w-[85vw] !h-[85vh] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TableIcon className="h-5 w-5" />
            Table View
            {projectName && (
              <>
                <span className="text-muted-foreground">&gt;</span>
                {projectName}
              </>
            )}
            {documentName && (
              <>
                <span className="text-muted-foreground">&gt;</span>
                {documentName}
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="py-4 border-b flex flex-col gap-3">
          <div className="flex flex-wrap md:flex-nowrap items-center gap-3">
            <SearchInput
              value={searchQuery}
              onValueChange={setSearchQuery}
              placeholder="Search comments or selected text..."
              wrapperClassName="w-full md:w-[360px] lg:w-[420px]"
              className="h-9"
            />
            <div className="flex-1 min-w-[220px]">
              <DataTableFilter
                filters={activeFilters}
                columns={filterColumns}
                actions={filterActions}
                strategy={filterStrategy}
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-9">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={async () => {
                    try {
                      const contextName = projectName || documentName
                      const fileName = generateFileName('excel', contextName)
                      await exportToExcel(sortedComments, fileName, contextName)
                      toast.success('Excel file exported successfully')
                    } catch (error) {
                      console.error('Export error:', error)
                      toast.error('Failed to export Excel file')
                    }
                  }}
                >
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Export to Excel
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={async () => {
                    try {
                      const contextName = projectName || documentName
                      const fileName = generateFileName('word', contextName)
                      await exportToWord(sortedComments, fileName, contextName)
                      toast.success('Word document exported successfully')
                    } catch (error) {
                      console.error('Export error:', error)
                      toast.error('Failed to export Word document')
                    }
                  }}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Export to Word
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-md border flex-1 overflow-auto">
          <Table style={{ tableLayout: 'fixed', width: '100%' }}>
            {/* Column widths: ID, Location, Type, Status, User, Selected Text, Comment/Edit, Actions */}
            <colgroup>
              <col style={{ width: '60px' }} />
              <col style={{ width: '25%' }} />
              <col style={{ width: '50px' }} />
              <col style={{ width: '50px' }} />
              <col style={{ width: '50px' }} />
              <col />
              <col />
              <col style={{ width: '40px' }} />
            </colgroup>
            <TableHeader className="bg-muted/50">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} className="font-semibold">
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="overflow-hidden">
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    No annotations found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between gap-2 px-4 py-2">
          <div className="text-muted-foreground flex-1 text-sm">
            {table.getFilteredRowModel().rows.length} total annotation(s)
          </div>

          <div className="flex items-center gap-6 lg:gap-8">
            <div className="flex items-center gap-2">
              <p className="whitespace-nowrap text-sm font-medium">
                Rows per page
              </p>
              <Select
                value={`${table.getState().pagination.pageSize}`}
                onValueChange={(value) => table.setPageSize(Number(value))}
              >
                <SelectTrigger className="h-8 w-[70px] px-2 py-0">
                  <SelectValue
                    placeholder={table.getState().pagination.pageSize}
                  />
                </SelectTrigger>
                <SelectContent side="top">
                  {pageSizes.map((pageSize) => (
                    <SelectItem key={pageSize} value={`${pageSize}`}>
                      {pageSize}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-muted-foreground flex items-center justify-center text-sm font-medium">
                Page {table.getState().pagination.pageIndex + 1} of{" "}
                {table.getPageCount()}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  aria-label="Go to first page"
                  variant="outline"
                  className="hidden size-8 p-0 lg:flex"
                  onClick={() => table.setPageIndex(0)}
                  disabled={!table.getCanPreviousPage()}
                >
                  <ChevronsLeft className="size-4" aria-hidden="true" />
                </Button>
                <Button
                  aria-label="Go to previous page"
                  variant="outline"
                  size="icon"
                  className="size-8"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                >
                  <ChevronLeft className="size-4" aria-hidden="true" />
                </Button>
                <Button
                  aria-label="Go to next page"
                  variant="outline"
                  size="icon"
                  className="size-8"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                >
                  <ChevronRight className="size-4" aria-hidden="true" />
                </Button>
                <Button
                  aria-label="Go to last page"
                  variant="outline"
                  size="icon"
                  className="hidden size-8 lg:flex"
                  onClick={() =>
                    table.setPageIndex(table.getPageCount() - 1)
                  }
                  disabled={!table.getCanNextPage()}
                >
                  <ChevronsRight className="size-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Delete confirmation */}
        <AlertDialog
          open={!!deleteCommentId}
          onOpenChange={(open) => !open && setDeleteCommentId(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. Are you sure you want to delete this annotation?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                className={buttonVariants({ variant: "destructive" })}
                autoFocus
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  )
}
