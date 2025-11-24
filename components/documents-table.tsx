"use client"

/* eslint-disable @typescript-eslint/no-explicit-any */

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import { restrictToVerticalAxis } from "@dnd-kit/modifiers"
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  VisibilityState,
  type Row,
} from "@tanstack/react-table"
import {
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
  IconDotsVertical,
  IconGripVertical,
  IconLayoutColumns,
  IconPlus,
} from "@tabler/icons-react"
import { CircleCheck, CircleHelp, CircleX, ChevronUp, ChevronDown, Plus, Check, X, Pencil, Trash2, Table as TableIcon, Download } from "lucide-react"
import { z } from "zod"

import { useAuth } from "@/contexts/auth-context"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { SearchInput } from "@/components/search-input"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import { createClient } from "@/lib/supabase/client"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export const documentSchema = z.object({
  id: z.string(),
  name: z.string(),
  pdf_url: z.string().optional(),
  page_count: z.number().nullable(),
  file_size: z.number().nullable(),
  version: z.enum(['Draft', 'Revised Draft', 'Final']).default('Draft'),
  proposed_count: z.number().default(0),
  approved_count: z.number().default(0),
  rejected_count: z.number().default(0),
  reviewers: z.array(z.string()).default([]),
})

export type DocumentRow = z.infer<typeof documentSchema>

type DocumentsTableMeta = {
  editingRowId: string | null
  editedName: string
  editedPageCount: string
  editedVersion: 'Draft' | 'Revised Draft' | 'Final'
  saving: boolean
  setEditingRowId: (id: string | null) => void
  setEditedName: (value: string) => void
  setEditedPageCount: (value: string) => void
  setEditedVersion: (value: 'Draft' | 'Revised Draft' | 'Final') => void
  handleStartEdit: (row: DocumentRow) => void
  handleSaveEdit: () => void
  handleCancelEdit: () => void
  projectId: string
  router: ReturnType<typeof useRouter>
  onReviewersChange: (documentId: string, newReviewers: string[]) => void
  onDelete: (documentId: string) => void
}

const formatFileSize = (bytes: number | null) => {
  if (!bytes) return 'N/A'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

// Drag handle component
function DragHandle({ id }: { id: string }) {
  const { attributes, listeners } = useSortable({
    id,
  })

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          {...attributes}
          {...listeners}
          variant="ghost"
          size="icon"
          className="text-muted-foreground size-7 hover:bg-transparent"
        >
          <IconGripVertical className="text-muted-foreground size-3" />
          <span className="sr-only">Drag to reorder</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Drag to reorder</p>
      </TooltipContent>
    </Tooltip>
  )
}

// Reviewer cell component with dropdown
interface ReviewerCellProps {
  documentId: string
  projectId: string
  reviewers: string[]
  onReviewersChange: (documentId: string, newReviewers: string[]) => void
}

type ReviewerUser = {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
}

const getUserDisplayName = (user: ReviewerUser) => {
  if (user.first_name || user.last_name) {
    return [user.first_name, user.last_name].filter(Boolean).join(" ").trim()
  }
  return user.email
}

const getUserInitials = (user: ReviewerUser) => {
  if (user.first_name || user.last_name) {
    return [user.first_name?.[0], user.last_name?.[0]].filter(Boolean).join("").toUpperCase() || user.email[0]?.toUpperCase() || "?"
  }
  return user.email.slice(0, 2).toUpperCase()
}

function ReviewerCell({ documentId, projectId, reviewers, onReviewersChange }: ReviewerCellProps) {
  const [allUsers, setAllUsers] = React.useState<ReviewerUser[]>([])
  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
    const fetchProjectUsers = async () => {
      setLoading(true)
      try {
        const supabase = createClient()

        // First get all project members
        const { data: members, error: membersError } = await supabase
          .from('project_members')
          .select('user_id')
          .eq('project_id', projectId)

        if (membersError) throw membersError

        const userIds = (members || []).map((m: { user_id: string }) => m.user_id)

        if (userIds.length === 0) {
          setAllUsers([])
          return
        }

        // Then fetch user details for those members
        const { data: users, error: usersError } = await supabase
          .from('users')
          .select('id, email, first_name, last_name, avatar_url')
          .in('id', userIds)
          .order('first_name')

        if (usersError) throw usersError
        setAllUsers(users || [])
      } catch (err) {
        console.error('Error fetching project users:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchProjectUsers()
  }, [projectId])

  const handleToggleReviewer = (userId: string) => {
    const isCurrentlyAssigned = reviewers.includes(userId)
    const newReviewers = isCurrentlyAssigned
      ? reviewers.filter(id => id !== userId)
      : [...reviewers, userId]

    onReviewersChange(documentId, newReviewers)
  }

  const displayUsers = React.useMemo(() => allUsers.filter(user => reviewers.includes(user.id)), [allUsers, reviewers])

  return (
  <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="flex items-center gap-2 cursor-pointer" onClick={(e) => e.stopPropagation()}>
          {reviewers.length > 0 && displayUsers.length > 0 ? (
            <div className="flex -space-x-2">
              {displayUsers.slice(0, 2).map((user) => (
                <Avatar key={user.id} className="size-6 border-2 border-background">
                  <AvatarImage src={user.avatar_url || undefined} alt={getUserInitials(user)} />
                  <AvatarFallback className="text-[10px]">
                    {getUserInitials(user)}
                  </AvatarFallback>
                </Avatar>
              ))}
              {displayUsers.length > 2 && (
                <Avatar className="size-6 border-2 border-background">
                  <AvatarFallback className="text-[10px]">
                    +{displayUsers.length - 2}
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          ) : (
            <Avatar className="size-6 border-2 border-dashed border-primary/50 bg-primary/5 hover:bg-primary/10 transition-colors">
              <AvatarFallback className="text-primary">
                <Plus className="size-3" />
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>Assign Reviewers</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {loading ? (
          <DropdownMenuItem disabled>Loading users...</DropdownMenuItem>
        ) : allUsers.length === 0 ? (
          <DropdownMenuItem disabled>No project members found</DropdownMenuItem>
        ) : (
          allUsers.map((user) => (
            <DropdownMenuCheckboxItem
              key={user.id}
              checked={reviewers.includes(user.id)}
              onCheckedChange={() => handleToggleReviewer(user.id)}
            >
              {getUserDisplayName(user)}
            </DropdownMenuCheckboxItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

const columns: ColumnDef<DocumentRow>[] = [
  {
    id: "drag",
    header: () => null,
    cell: ({ row }) => <DragHandle id={row.original.id} />,
    size: 24,
    maxSize: 24,
    enableHiding: false,
  },
  {
    id: "select",
    header: ({ table }) => (
      <div className="flex items-center justify-center">
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      </div>
    ),
    cell: ({ row }) => (
      <div className="flex items-center justify-center">
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
    size: 40,
    maxSize: 40,
  },
  {
    accessorKey: "name",
    header: ({ column }) => (
      <div
        className="flex items-center gap-2 cursor-pointer select-none"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        <span>Name</span>
        <div className="flex flex-col">
          <ChevronUp
            className={`h-3 w-3 -mb-1 ${
              column.getIsSorted() === "asc" ? "text-foreground" : "text-muted-foreground"
            }`}
          />
          <ChevronDown
            className={`h-3 w-3 ${
              column.getIsSorted() === "desc" ? "text-foreground" : "text-muted-foreground"
            }`}
          />
        </div>
      </div>
    ),
    cell: ({ row }) => (
      <div className="font-medium">{row.original.name}</div>
    ),
    enableHiding: false,
    enableSorting: true,
  },
  {
    accessorKey: "page_count",
    header: () => <div className="text-right">Page Count</div>,
    cell: ({ row }) => (
      <div className="text-right">
        {row.original.page_count !== null ? (
          <Badge variant="secondary">{row.original.page_count}</Badge>
        ) : (
          <span className="text-muted-foreground">N/A</span>
        )}
      </div>
    ),
  },
  {
    accessorKey: "file_size",
    header: () => <div className="text-right">File Size</div>,
    cell: ({ row }) => (
      <div className="text-muted-foreground text-right">
        {formatFileSize(row.original.file_size)}
      </div>
    ),
  },
  {
    id: "annotations",
    header: "Annotations",
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <CircleCheck className="w-4 h-4 text-emerald-700" />
          <span className="text-sm text-emerald-700">{row.original.approved_count}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <CircleHelp className="w-4 h-4 text-yellow-700" />
          <span className="text-sm text-yellow-700">{row.original.proposed_count}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <CircleX className="w-4 h-4 text-red-700" />
          <span className="text-sm text-red-700">{row.original.rejected_count}</span>
        </div>
      </div>
    ),
  },
]

// Static column definitions that read from table.options.meta
const createColumns = (): ColumnDef<DocumentRow>[] => {
  const nameColumn: ColumnDef<DocumentRow> = {
    accessorKey: "name",
    header: ({ column }) => (
      <div
        className="flex items-center gap-2 cursor-pointer select-none"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        <span>Name</span>
        <div className="flex flex-col">
          <ChevronUp
            className={`h-3 w-3 -mb-1 ${
              column.getIsSorted() === "asc" ? "text-foreground" : "text-muted-foreground"
            }`}
          />
          <ChevronDown
            className={`h-3 w-3 ${
              column.getIsSorted() === "desc" ? "text-foreground" : "text-muted-foreground"
            }`}
          />
        </div>
      </div>
    ),
    cell: ({ row, table }) => {
      const meta = table.options.meta as DocumentsTableMeta
      const isEditing = meta.editingRowId === row.original.id

      return isEditing ? (
        <Input
          value={meta.editedName}
          onChange={(e) => meta.setEditedName(e.target.value)}
          className="h-8"
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <Button
          variant="link"
          className="p-0 font-medium text-left whitespace-normal h-auto"
          onClick={() => meta.router.push(`/documents/${row.original.id}`)}
        >
          {row.original.name}
        </Button>
      )
    },
    enableHiding: false,
    enableSorting: true,
  }

  const pageCountColumn: ColumnDef<DocumentRow> = {
    accessorKey: "page_count",
    header: () => <div className="text-right">Page Count</div>,
    cell: ({ row, table }) => {
      const meta = table.options.meta as DocumentsTableMeta
      const isEditing = meta.editingRowId === row.original.id

      return isEditing ? (
        <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
          <Input
            type="number"
            value={meta.editedPageCount}
            onChange={(e) => meta.setEditedPageCount(e.target.value)}
            className="h-8 w-24 text-right"
          />
        </div>
      ) : (
        <div className="text-right">
          {row.original.page_count !== null ? (
            <Badge variant="secondary">{row.original.page_count}</Badge>
          ) : (
            <span className="text-muted-foreground">N/A</span>
          )}
        </div>
      )
    },
  }

  const versionColumn: ColumnDef<DocumentRow> = {
    accessorKey: "version",
    header: "Version",
    cell: ({ row, table }) => {
      const meta = table.options.meta as DocumentsTableMeta
      const isEditing = meta.editingRowId === row.original.id

      return isEditing ? (
        <div onClick={(e) => e.stopPropagation()}>
          <Tabs
            value={meta.editedVersion}
            onValueChange={(value) =>
              meta.setEditedVersion(value as DocumentsTableMeta["editedVersion"])
            }
          >
            <TabsList className="h-8">
              <TabsTrigger value="Draft" className="text-xs px-2">Draft</TabsTrigger>
              <TabsTrigger value="Revised Draft" className="text-xs px-2">Revised</TabsTrigger>
              <TabsTrigger value="Final" className="text-xs px-2">Final</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      ) : (
        <Badge variant="outline">{row.original.version}</Badge>
      )
    },
  }

  return [
    columns[0], // drag
    columns[1], // select
    nameColumn,
    pageCountColumn,
    versionColumn,
    columns[4], // file_size
    columns[5], // annotations
    {
      accessorKey: "reviewers",
      header: "Reviewers",
      cell: ({ row, table }) => {
        const meta = table.options.meta as DocumentsTableMeta
        return (
          <ReviewerCell
            documentId={row.original.id}
            projectId={meta.projectId}
            reviewers={row.original.reviewers}
            onReviewersChange={meta.onReviewersChange}
          />
        )
      },
    },
    {
      id: "actions",
      size: 50,
      maxSize: 50,
      cell: ({ row, table }) => {
        const meta = table.options.meta as DocumentsTableMeta
        const isEditing = meta.editingRowId === row.original.id

        return isEditing ? (
          <div className="flex justify-end items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                  onClick={meta.handleSaveEdit}
                  disabled={meta.saving}
                >
                  <Check className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Save</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={meta.handleCancelEdit}
                  disabled={meta.saving}
                >
                  <X className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Cancel</p>
              </TooltipContent>
            </Tooltip>
          </div>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => e.stopPropagation()}
              >
                <IconDotsVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {row.original.pdf_url && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation()
                    const link = document.createElement('a')
                    link.href = row.original.pdf_url!
                    link.download = `${row.original.name}.pdf`
                    link.target = '_blank'
                    document.body.appendChild(link)
                    link.click()
                    document.body.removeChild(link)
                  }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  meta.handleStartEdit(row.original)
                }}
              >
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  meta.onDelete(row.original.id)
                }}
                className="text-destructive focus:text-destructive focus:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4 mr-2 text-destructive" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]
}

interface DocumentsTableProps {
  data: DocumentRow[]
  projectId: string
  onAddDocument?: () => void
  onTableView?: () => void
  onReviewersChange?: (documentId: string, newReviewers: string[]) => void
  onUpdateDocument?: (documentId: string, updates: { name?: string; page_count?: number | null }) => void
  onDeleteDocument?: (documentId: string) => void
}

// Draggable row component
function DraggableRow({ row }: { row: Row<DocumentRow> }) {
  const { setNodeRef, transform, transition, isDragging } = useSortable({
    id: row.original.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      data-state={row.getIsSelected() && "selected"}
    >
      {row.getVisibleCells().map((cell) => (
        <TableCell
          key={cell.id}
          style={{
            width: cell.column.getSize() !== 150 ? cell.column.getSize() : undefined,
            minWidth: cell.column.getSize() !== 150 ? cell.column.getSize() : undefined,
            maxWidth: cell.column.getSize() !== 150 ? cell.column.getSize() : undefined,
          }}
        >
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </TableCell>
      ))}
    </TableRow>
  )
}

export function DocumentsTable({ data, projectId, onAddDocument, onTableView, onReviewersChange, onUpdateDocument, onDeleteDocument }: DocumentsTableProps) {
  const router = useRouter()
  const { user } = useAuth()
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState({})
  const [items, setItems] = React.useState<DocumentRow[]>(data)
  const [editingRowId, setEditingRowId] = React.useState<string | null>(null)
  const [editedName, setEditedName] = React.useState('')
  const [editedPageCount, setEditedPageCount] = React.useState('')
  const [editedVersion, setEditedVersion] = React.useState<'Draft' | 'Revised Draft' | 'Final'>('Draft')
  const [globalFilter, setGlobalFilter] = React.useState('')
  const [saving, setSaving] = React.useState(false)
  const [showMyAssignments, setShowMyAssignments] = React.useState(false)

  const userDisplayName = React.useMemo(() => {
    if (user?.profile?.first_name && user.profile?.last_name) {
      return `${user.profile.first_name} ${user.profile.last_name}`
    }
    return user?.email || "User"
  }, [user])

  const userInitials = React.useMemo(() => {
    if (user?.profile?.first_name && user.profile?.last_name) {
      return `${user.profile.first_name[0]}${user.profile.last_name[0]}`.toUpperCase()
    }
    return (user?.email?.[0] || "U").toUpperCase()
  }, [user])

  React.useEffect(() => {
    setItems(data)
  }, [data])

  const handleReviewersChange = React.useCallback(async (documentId: string, newReviewers: string[]) => {
    // Update local state immediately for optimistic UI
    setItems(prevItems =>
      prevItems.map(item =>
        item.id === documentId ? { ...item, reviewers: newReviewers } : item
      )
    )

    // Update in database using document_assignees junction table
    try {
      const supabase = createClient()

      // First, get current user for assigned_by tracking
      const { data: { user } } = await supabase.auth.getUser()

      // Delete all existing assignments for this document
      const { error: deleteError } = await supabase
        .from('document_assignees')
        .delete()
        .eq('document_id', documentId)

      if (deleteError) {
        console.error('Error deleting existing assignments:', deleteError)
        throw deleteError
      }

      // Insert new assignments
      if (newReviewers.length > 0) {
        const assignments = newReviewers.map(userId => ({
          document_id: documentId,
          user_id: userId,
          assigned_by: user?.id || null
        }))

        const { error: insertError } = await supabase
          .from('document_assignees')
          .insert(assignments)

        if (insertError) {
          console.error('Error inserting assignments:', insertError)
          throw insertError
        }
      }

      // Call parent handler if provided
      if (onReviewersChange) {
        onReviewersChange(documentId, newReviewers)
      }
    } catch (err) {
      console.error('Error updating reviewers:', err)
      // Revert on error
      setItems(data)
    }
  }, [data, onReviewersChange])

  const handleStartEdit = React.useCallback((row: DocumentRow) => {
    setEditingRowId(row.id)
    setEditedName(row.name)
    setEditedPageCount(row.page_count?.toString() || '')
    setEditedVersion(row.version)
  }, [])

  const handleSaveEdit = React.useCallback(async () => {
    if (!editingRowId) return

    const pageCount = editedPageCount === '' ? null : parseInt(editedPageCount)

    // Update local state immediately
    setItems(prevItems =>
      prevItems.map(item =>
        item.id === editingRowId
          ? {
              ...item,
              name: editedName,
              page_count: pageCount,
              version: editedVersion,
            }
          : item,
      ),
    )

    // Update in database
    try {
      setSaving(true)
      const supabase = createClient()
      const { error } = await supabase
        .from('documents')
        .update({
          name: editedName,
          page_count: pageCount,
          version: editedVersion,
        })
        .eq('id', editingRowId)

      if (error) throw error

      // Call parent handler if provided
      if (onUpdateDocument) {
        onUpdateDocument(editingRowId, {
          name: editedName,
          page_count: pageCount,
        })
      }
    } catch (err) {
      console.error('Error updating document:', err)
      // Revert on error
      setItems(data)
    } finally {
      setSaving(false)
    }

    setEditingRowId(null)
    setEditedName('')
    setEditedPageCount('')
    setEditedVersion('Draft')
  }, [editingRowId, editedName, editedPageCount, editedVersion, data, onUpdateDocument])

  const handleCancelEdit = React.useCallback(() => {
    setEditingRowId(null)
    setEditedName('')
    setEditedPageCount('')
    setEditedVersion('Draft')
  }, [])

  const handleDelete = React.useCallback((documentId: string) => {
    if (onDeleteDocument) {
      onDeleteDocument(documentId)
    }
  }, [onDeleteDocument])

  const tableColumns = React.useMemo(() => createColumns(), [])

  const sensors = useSensors(
    useSensor(MouseSensor, {}),
    useSensor(TouchSensor, {}),
    useSensor(KeyboardSensor, {})
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id)
        const newIndex = items.findIndex((item) => item.id === over.id)
        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }

  React.useEffect(() => {
    if (!user?.id) {
      setShowMyAssignments(false)
    }
  }, [user?.id])

  const displayedItems = React.useMemo(() => {
    if (showMyAssignments && user?.id) {
      return items.filter((item) => item.reviewers?.includes(user.id))
    }
    return items
  }, [items, showMyAssignments, user?.id])

  const table = useReactTable({
    data: displayedItems,
    columns: tableColumns,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getRowId: (row) => row.id,
    meta: {
      editingRowId,
      editedName,
      editedPageCount,
      editedVersion,
      saving,
      setEditingRowId,
      setEditedName,
      setEditedPageCount,
      setEditedVersion,
      handleStartEdit,
      handleSaveEdit,
      handleCancelEdit,
      projectId,
      router,
      onReviewersChange: handleReviewersChange,
      onDelete: handleDelete,
    } as DocumentsTableMeta,
  })

  return (
    <div className="px-4 lg:px-6">
      <div className="@container/table">
        <div className="flex items-center justify-between gap-4 py-4 md:py-6">
          <div className="flex items-center gap-3">
            <SearchInput
              value={globalFilter ?? ""}
              onValueChange={setGlobalFilter}
              placeholder="Search documents..."
              wrapperClassName="w-[420px] max-w-xl"
              className="h-9"
            />
            {user && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-pressed={showMyAssignments}
                    onClick={() => user?.id && setShowMyAssignments((prev) => !prev)}
                    className={cn(
                      "flex items-center justify-center rounded-full border-2 transition-all disabled:opacity-50 disabled:pointer-events-none outline-none focus-visible:outline-none",
                      showMyAssignments
                        ? "border-primary/70"
                        : "border-transparent hover:border-muted-foreground/40"
                    )}
                    disabled={!user?.id}
                  >
                    <Avatar className="size-8 border-2 border-background">
                      {user.profile?.avatar_url && (
                        <AvatarImage src={user.profile.avatar_url} alt={userDisplayName} />
                      )}
                      <AvatarFallback className="text-xs">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{showMyAssignments ? "Showing your assignments" : "Show only documents I'm reviewing"}</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="h-8 gap-2 data-[state=open]:bg-accent"
                  size="sm"
                >
                  <IconLayoutColumns className="size-3.5" />
                  Customize Columns
                  <IconChevronDown className="size-3.5 shrink-0 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                {table
                  .getAllColumns()
                  .filter((column) => column.getCanHide())
                  .map((column) => {
                    return (
                      <DropdownMenuCheckboxItem
                        key={column.id}
                        className="capitalize"
                        checked={column.getIsVisible()}
                        onCheckedChange={(value) =>
                          column.toggleVisibility(!!value)
                        }
                      >
                        {column.id}
                      </DropdownMenuCheckboxItem>
                    )
                  })}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              className="h-8 gap-2"
              size="sm"
              variant="outline"
              onClick={onTableView}
            >
              <TableIcon className="size-3.5" />
              Table View
            </Button>
            <Button
              className="h-8 gap-2"
              size="sm"
              onClick={onAddDocument}
            >
              <IconPlus className="size-3.5" />
              Add Document
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-md border">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
              modifiers={[restrictToVerticalAxis]}
            >
              <Table style={{ tableLayout: 'fixed', width: '100%' }}>
                {/* Column widths: Drag(30) | Checkbox(40) | Name(auto) | PageCount(90) | Version(100) | FileSize(80) | Annotations(140) | Reviewers(90) | Actions(50) */}
                <colgroup><col style={{ width: '30px' }} /><col style={{ width: '40px' }} /><col /><col style={{ width: '90px' }} /><col style={{ width: '100px' }} /><col style={{ width: '80px' }} /><col style={{ width: '140px' }} /><col style={{ width: '90px' }} /><col style={{ width: '50px' }} /></colgroup>
                <TableHeader className="bg-muted/40">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id} className="hover:bg-transparent">
                      {headerGroup.headers.map((header) => {
                        return (
                          <TableHead
                            key={header.id}
                            style={{
                              width: header.getSize() !== 150 ? header.getSize() : undefined,
                              minWidth: header.getSize() !== 150 ? header.getSize() : undefined,
                              maxWidth: header.getSize() !== 150 ? header.getSize() : undefined,
                            }}
                          >
                            {header.isPlaceholder
                              ? null
                              : flexRender(
                                  header.column.columnDef.header,
                                  header.getContext()
                                )}
                          </TableHead>
                        )
                      })}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  <SortableContext
                    items={table.getRowModel().rows.map((row) => row.original.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {table.getRowModel().rows?.length ? (
                      table.getRowModel().rows.map((row) => (
                        <DraggableRow key={row.id} row={row} />
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={columns.length}
                          className="h-24 text-center"
                        >
                          No documents found.
                        </TableCell>
                      </TableRow>
                    )}
                  </SortableContext>
                </TableBody>
              </Table>
            </DndContext>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between gap-2 px-4">
            <div className="text-muted-foreground flex-1 text-sm">
              {table.getFilteredSelectedRowModel().rows.length} of{" "}
              {table.getFilteredRowModel().rows.length} row(s) selected.
            </div>
            <div className="flex items-center gap-6 lg:gap-8">
              <div className="flex items-center gap-2">
                <p className="whitespace-nowrap text-sm font-medium">
                  Rows per page
                </p>
                <Select
                  value={`${table.getState().pagination.pageSize}`}
                  onValueChange={(value) => {
                    table.setPageSize(Number(value))
                  }}
                >
                  <SelectTrigger className="h-8 w-[70px] px-2 py-0">
                    <SelectValue
                      placeholder={table.getState().pagination.pageSize}
                    />
                  </SelectTrigger>
                  <SelectContent side="top">
                    {[10, 20, 30, 40, 50].map((pageSize) => (
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
                    <IconChevronsLeft className="size-4" aria-hidden="true" />
                  </Button>
                  <Button
                    aria-label="Go to previous page"
                    variant="outline"
                    size="icon"
                    className="size-8"
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                  >
                    <IconChevronLeft className="size-4" aria-hidden="true" />
                  </Button>
                  <Button
                    aria-label="Go to next page"
                    variant="outline"
                    size="icon"
                    className="size-8"
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                  >
                    <IconChevronRight className="size-4" aria-hidden="true" />
                  </Button>
                  <Button
                    aria-label="Go to last page"
                    variant="outline"
                    size="icon"
                    className="hidden size-8 lg:flex"
                    onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                    disabled={!table.getCanNextPage()}
                  >
                    <IconChevronsRight className="size-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
