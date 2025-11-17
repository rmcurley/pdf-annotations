"use client"

import * as React from "react"
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  SortingState,
  ColumnFiltersState,
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
  ChevronDown,
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
import { ButtonGroup } from "@/components/ui/button-group"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"

interface Comment {
  id: string
  comment_type: string
  comment_status: string
  highlighted_text: string | null
  comment: string
  users?: {
    first_name: string | null
    last_name: string | null
    email: string
  }
}

interface CommentsTableModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  comments: Comment[]
  onDelete?: (commentId: string) => void
  onUpdateAnnotation?: (commentId: string, updates: Partial<Comment>) => void
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
  comment: Comment
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
          <Button
            size="icon"
            variant="ghost"
            className="size-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
            onClick={onSave}
          >
            <Check className="size-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="size-8 text-muted-foreground hover:text-foreground"
            onClick={onCancel}
          >
            <X className="size-4" />
          </Button>
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
const columns: ColumnDef<Comment>[] = [
  {
    accessorKey: "id",
    header: "ID",
    cell: ({ row }) => (
      <div className="font-mono text-xs text-muted-foreground">
        {row.original.id.slice(0, 8)}...
      </div>
    ),
  },
  {
    accessorKey: "comment_type",
    header: "Type",
    cell: ({ row }) => {
      const type = row.original.comment_type.toLowerCase()
      const TypeIcon = type === "edit" ? Pencil : MessageCircle
      return (
        <div className="flex items-center gap-2">
          <TypeIcon className="w-4 h-4" />
          <span className="capitalize">{type}</span>
        </div>
      )
    },
  },
  {
    accessorKey: "comment_status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.original.comment_status.toLowerCase()

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
    header: "Comment",
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
    header: "Actions",
    cell: ({ row, table }) => {
      const comment = row.original
      const currentStatus = comment.comment_status.toLowerCase()
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
}: CommentsTableModalProps) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  )
  const [typeFilter, setTypeFilter] = React.useState<string>("all")
  const [statusFilter, setStatusFilter] = React.useState<string>("all")
  const [userFilter, setUserFilter] = React.useState<string[]>([])
  const [deleteCommentId, setDeleteCommentId] = React.useState<string | null>(
    null,
  )
  const [editingCommentId, setEditingCommentId] =
    React.useState<string | null>(null)
  const [editedComment, setEditedComment] = React.useState<string>("")

  // Filter comments by type/status/user
  const filteredComments = React.useMemo(() => {
    return comments.filter((comment) => {
      const matchesType =
        typeFilter === "all" ||
        comment.comment_type.toLowerCase() === typeFilter.toLowerCase()
      const matchesStatus =
        statusFilter === "all" ||
        comment.comment_status.toLowerCase() === statusFilter.toLowerCase()

      const userName =
        comment.users?.first_name && comment.users?.last_name
          ? `${comment.users.first_name} ${comment.users.last_name}`
          : comment.users?.email?.split("@")[0] || "Unknown User"
      const matchesUser =
        userFilter.length === 0 || userFilter.includes(userName)

      return matchesType && matchesStatus && matchesUser
    })
  }, [comments, typeFilter, statusFilter, userFilter])

  // Unique users for filter
  const uniqueUsers = React.useMemo(() => {
    const userSet = new Set<string>()
    comments.forEach((comment) => {
      const userName =
        comment.users?.first_name && comment.users?.last_name
          ? `${comment.users.first_name} ${comment.users.last_name}`
          : comment.users?.email?.split("@")[0] || "Unknown User"
      userSet.add(userName)
    })
    return Array.from(userSet).sort()
  }, [comments])

  const handleDeleteClick = React.useCallback((commentId: string) => {
    setDeleteCommentId(commentId)
  }, [])

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
    data: filteredComments,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    state: {
      sorting,
      columnFilters,
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
            Comments Table View
          </DialogTitle>
        </DialogHeader>

        {/* Filters + search */}
        <div className="flex items-center justify-between gap-4 py-4">
          <Input
            placeholder="Search comments..."
            value={(table.getColumn("comment")?.getFilterValue() as string) ?? ""}
            onChange={(event) =>
              table.getColumn("comment")?.setFilterValue(event.target.value)
            }
            className="max-w-sm"
          />

          <div className="flex items-center gap-4">
            {/* Type Filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Type:</span>
              <ButtonGroup>
                <Button
                  variant={typeFilter === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTypeFilter("all")}
                >
                  All
                </Button>
                <Button
                  variant={typeFilter === "comment" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTypeFilter("comment")}
                >
                  Comment
                </Button>
                <Button
                  variant={typeFilter === "edit" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTypeFilter("edit")}
                >
                  Edit
                </Button>
              </ButtonGroup>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Status:</span>
              <ButtonGroup>
                <Button
                  variant={statusFilter === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("all")}
                >
                  All
                </Button>
                <Button
                  variant={statusFilter === "proposed" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("proposed")}
                >
                  Proposed
                </Button>
                <Button
                  variant={statusFilter === "accepted" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("accepted")}
                >
                  Accepted
                </Button>
                <Button
                  variant={statusFilter === "rejected" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("rejected")}
                >
                  Rejected
                </Button>
              </ButtonGroup>
            </div>

            {/* User Filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">User:</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="min-w-[120px] justify-between"
                  >
                    {userFilter.length > 0
                      ? `${userFilter.length} selected`
                      : "All users"}
                    <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-0" align="end">
                  <Command>
                    <CommandInput placeholder="Search users..." />
                    <CommandList>
                      <CommandEmpty>No users found.</CommandEmpty>
                      <CommandGroup>
                        {uniqueUsers.map((user) => (
                          <CommandItem
                            key={user}
                            onSelect={() => {
                              setUserFilter((current) =>
                                current.includes(user)
                                  ? current.filter((u) => u !== user)
                                  : [...current, user],
                              )
                            }}
                          >
                            <div className="flex items-center gap-2 flex-1">
                              <div
                                className={`w-4 h-4 border rounded flex items-center justify-center ${
                                  userFilter.includes(user)
                                    ? "bg-primary border-primary"
                                    : ""
                                }`}
                              >
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
              {userFilter.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2"
                  onClick={() => setUserFilter([])}
                >
                  Clear
                </Button>
              )}
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
                    No comments found.
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
