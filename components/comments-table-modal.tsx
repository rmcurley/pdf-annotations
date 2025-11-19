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
import { DataTableFilter, useDataTableFilters } from "@/components/data-table-filter"
import { SearchInput } from "@/components/search-input"
import {
  commentFilterColumnsConfig,
  filterCommentsByActiveFilters,
  normalizeCommentsForFiltering,
} from "@/lib/comment-filter-config"
import { getCommentUserDisplayName } from "@/lib/comment-utils"

export interface TableComment {
  id: string
  annotation_id?: string | null
  comment_type: string
  comment_status: string
  highlighted_text: string | null
  comment: string
  section_number?: string | null
  page_number?: number | null
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
  setEditingCommentId: (id: string | null) => void
  setEditedComment: (value: string) => void
  saveEdit: () => void
  cancelEdit: () => void
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
      <div className="flex items-center gap-2 py-2">
        <Textarea
          value={editedValue}
          onChange={(e) => onValueChange(e.target.value)}
          className="min-h-[80px] max-w-md resize-none"
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
        <div className="flex gap-2">
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
    <div className="max-w-md truncate">
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
    header: "ID",
    cell: ({ row }) => {
      const annotationId = row.original.annotation_id
      return (
        <div className="text-sm font-medium">
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
    header: "Location",
    cell: ({ row }) => {
      const sectionNumber = row.original.section_number
      const pageNumber = row.original.page_number

      return (
        <div className="text-sm">
          {sectionNumber && (
            <div className="font-medium">{sectionNumber}</div>
          )}
          {pageNumber && (
            <div className="text-muted-foreground">Page {pageNumber}</div>
          )}
          {!sectionNumber && !pageNumber && (
            <span className="text-muted-foreground italic">-</span>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: "comment_type",
    header: () => <div className="text-center">Type</div>,
    cell: ({ row }) => {
      const type = row.original.comment_type
      const TypeIcon = type === "edit" ? Pencil : MessageCircle
      const typeLabel = type === "edit" ? "Edit" : "Comment"
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
    header: "Status",
    cell: ({ row }) => {
      const status = row.original.comment_status

      if (status === 'accepted') {
        return (
          <div className="flex items-center gap-2">
            <CircleCheck className="w-4 h-4 text-emerald-700" />
            <span className="text-emerald-700">Accepted</span>
          </div>
        )
      } else if (status === 'proposed') {
        return (
          <div className="flex items-center gap-2">
            <CircleHelp className="w-4 h-4 text-yellow-700" />
            <span className="text-yellow-700">Proposed</span>
          </div>
        )
      } else if (status === 'rejected') {
        return (
          <div className="flex items-center gap-2">
            <CircleX className="w-4 h-4 text-red-700" />
            <span className="text-red-700">Rejected</span>
          </div>
        )
      }
      return <span className="capitalize">{status}</span>
    },
  },
  {
    id: "user",
    accessorFn: (row) => getCommentUserDisplayName(row),
    header: "User",
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
              <Avatar className="size-8">
                {user?.avatar_url && (
                  <AvatarImage src={user.avatar_url} alt={fullName} />
                )}
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
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
      <div className="max-w-xs truncate text-sm">
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
      const anyMeta = table.options.meta as any
      const isEditing = meta.editingCommentId === comment.id

      const hasUpdate = typeof anyMeta?.handleStatusChange === "function"

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
              }}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => anyMeta?.setDeleteCommentId?.(comment.id)}
              className="text-destructive focus:text-destructive focus:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4 mr-2 text-destructive" />
              Delete
            </DropdownMenuItem>

            {hasUpdate && (
              <>
                <DropdownMenuSeparator />
                {currentStatus !== "accepted" && (
                  <DropdownMenuItem
                    onClick={() =>
                      anyMeta.handleStatusChange(comment.id, "accepted")
                    }
                  >
                    <CircleCheck className="h-4 w-4 mr-2 text-emerald-700" />
                    <span className="text-emerald-700">Accepted</span>
                  </DropdownMenuItem>
                )}
                {currentStatus !== "proposed" && (
                  <DropdownMenuItem
                    onClick={() =>
                      anyMeta.handleStatusChange(comment.id, "proposed")
                    }
                  >
                    <CircleHelp className="h-4 w-4 mr-2 text-yellow-700" />
                    <span className="text-yellow-700">Proposed</span>
                  </DropdownMenuItem>
                )}
                {currentStatus !== "rejected" && (
                  <DropdownMenuItem
                    onClick={() =>
                      anyMeta.handleStatusChange(comment.id, "rejected")
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

  const handleDeleteConfirm = React.useCallback(() => {
    if (deleteCommentId && onDelete) {
      onDelete(deleteCommentId)
      setDeleteCommentId(null)
    }
  }, [deleteCommentId, onDelete])

  const handleSaveEdit = React.useCallback(async () => {
    if (!editingCommentId || !onUpdateAnnotation) return

    if (editedComment.trim()) {
      await onUpdateAnnotation(editingCommentId, {
        comment: editedComment.trim(),
      })
    }

    setEditingCommentId(null)
    setEditedComment("")
  }, [editingCommentId, editedComment, onUpdateAnnotation])

  const handleCancelEdit = React.useCallback(() => {
    setEditingCommentId(null)
    setEditedComment("")
  }, [])

  const handleStatusChange = React.useCallback(
    (commentId: string, newStatus: string) => {
      if (onUpdateAnnotation) {
        onUpdateAnnotation(commentId, { comment_status: newStatus })
      }
    },
    [onUpdateAnnotation],
  )

  const table = useReactTable({
    data: filteredByFilters,
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
      setEditingCommentId,
      setEditedComment,
      saveEdit: handleSaveEdit,
      cancelEdit: handleCancelEdit,
      // extra helpers used by actions cell
      setDeleteCommentId,
      handleStatusChange,
    } as any,
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
          </div>
        </div>

        {/* Table */}
        <div className="rounded-md border flex-1 overflow-auto">
          <Table>
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
                      <TableCell key={cell.id}>
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
