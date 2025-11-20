"use client"

import * as React from "react"
import { IconMail, IconTrash, IconPencil, IconChevronLeft, IconChevronRight, IconChevronsLeft, IconChevronsRight, IconDots } from "@tabler/icons-react"
import { ChevronUp, ChevronDown } from "lucide-react"
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  SortingState,
  ColumnFiltersState,
  useReactTable,
} from "@tanstack/react-table"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { SearchInput } from "@/components/search-input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { EditUserModal } from "@/components/edit-user-modal"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface AdminModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface UserRow {
  id: string
  first_name: string
  last_name: string
  email: string
  role: string
  avatar_url?: string | null
  project_count: number
  project_ids: string[]
}

// Define columns factory function outside component to avoid recreating
function createColumns(
  handleStartEdit: (user: UserRow) => void,
  handleDeleteUser: (userId: string) => void
): ColumnDef<UserRow>[] {
  return [
    {
      accessorKey: "first_name",
      enableSorting: true,
      header: ({ column }) => (
        <div
          className="flex items-center gap-2 cursor-pointer select-none"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          <span>First Name</span>
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
        <div className="font-medium">{row.getValue("first_name") || '-'}</div>
      ),
    },
    {
      accessorKey: "last_name",
      enableSorting: true,
      header: ({ column }) => (
        <div
          className="flex items-center gap-2 cursor-pointer select-none"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          <span>Last Name</span>
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
        <div className="font-medium">{row.getValue("last_name") || '-'}</div>
      ),
    },
    {
      accessorKey: "email",
      enableSorting: true,
      header: ({ column }) => (
        <div
          className="flex items-center gap-2 cursor-pointer select-none"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          <span>Email</span>
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
      cell: ({ row }) => <div>{row.getValue("email")}</div>,
    },
    {
      accessorKey: "role",
      header: "Role",
      cell: ({ row }) => (
        <Badge variant={row.original.role === 'admin' ? 'default' : 'secondary'}>
          {row.original.role.charAt(0).toUpperCase() + row.original.role.slice(1)}
        </Badge>
      ),
    },
    {
      accessorKey: "project_count",
      header: "Projects",
      cell: ({ row }) => <div>{row.getValue("project_count")}</div>,
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <IconDots className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleStartEdit(row.original)}>
                <IconPencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleDeleteUser(row.original.id)}
                className="text-destructive focus:text-destructive focus:bg-destructive/10"
              >
                <IconTrash className="mr-2 h-4 w-4 text-destructive" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ]
}

export function AdminModal({ open, onOpenChange }: AdminModalProps) {
  const supabase = React.useMemo(() => createClient(), [])
  const [users, setUsers] = React.useState<UserRow[]>([])
  const [loading, setLoading] = React.useState(false)
  const [inviteEmail, setInviteEmail] = React.useState("")
  const [inviting, setInviting] = React.useState(false)
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = React.useState("")

  // Edit modal state
  const [editModalOpen, setEditModalOpen] = React.useState(false)
  const [selectedUser, setSelectedUser] = React.useState<UserRow | null>(null)

  // Load users and projects when modal opens
  const loadData = React.useCallback(async (options?: { showLoading?: boolean }) => {
    const showLoading = options?.showLoading ?? true
    if (showLoading) {
      setLoading(true)
    }
    try {
      // Fetch all users from users table
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })

      if (usersError) throw usersError

      // Fetch all project members
      const { data: membersData, error: membersError } = await supabase
        .from('project_members')
        .select('project_id, user_id')

      if (membersError) throw membersError

      // Transform users data to include project count
      const transformedUsers: UserRow[] = (usersData || []).map((user) => {
        const userProjects = (membersData || []).filter(m => m.user_id === user.id)
        return {
          id: user.id,
          first_name: user.first_name || '',
          last_name: user.last_name || '',
          email: user.email,
          role: user.role || 'member',
          avatar_url: user.avatar_url,
          project_count: userProjects.length,
          project_ids: userProjects.map(p => p.project_id),
        }
      })

      setUsers(transformedUsers)
    } catch (error) {
      console.error('Error loading admin data:', error)
      toast.error('Failed to load users and projects')
    } finally {
      if (showLoading) {
        setLoading(false)
      }
    }
  }, [supabase])

  React.useEffect(() => {
    if (open) {
      loadData()
    }
  }, [open, loadData])

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setInviting(true)

    try {
      const response = await fetch('/api/admin/invite-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: inviteEmail }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send invitation')
      }

      toast.success(`Invitation sent to ${inviteEmail}`)
      setInviteEmail("")

      // Refresh the user list to show the new invited user without locking the table UI
      await loadData({ showLoading: false })
    } catch (error) {
      console.error('Error inviting user:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to send invitation')
    } finally {
      setInviting(false)
    }
  }

  const handleStartEdit = React.useCallback((user: UserRow) => {
    setSelectedUser(user)
    setEditModalOpen(true)
  }, [])

  const handleUserUpdated = () => {
    loadData()
  }

  const handleDeleteUser = React.useCallback(async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return
    }

    try {
      // First remove all project memberships
      await supabase
        .from('project_members')
        .delete()
        .eq('user_id', userId)

      // Delete from users table
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId)

      if (error) throw error

      toast.success('User deleted successfully')
      loadData()
    } catch (error) {
      console.error('Error deleting user:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to delete user')
    }
  }, [loadData, supabase])

  const columns = React.useMemo(
    () => createColumns(
      handleStartEdit,
      handleDeleteUser
    ),
    [handleStartEdit, handleDeleteUser]
  )

  const table = useReactTable({
    data: users,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
  })

  return (
    <>
      <EditUserModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        user={selectedUser}
        onUserUpdated={handleUserUpdated}
      />

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="!max-w-[50vw] w-[50vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>User Management</DialogTitle>
          <DialogDescription>
            Manage users and their project access permissions.
          </DialogDescription>
        </DialogHeader>

        {/* Invite User Section */}
        <div className="border-b pb-4">
          <form onSubmit={handleInviteUser} className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="inviteEmail" className="sr-only">Email</Label>
              <Input
                id="inviteEmail"
                type="email"
                placeholder="Enter email to invite user..."
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
                disabled={inviting}
              />
            </div>
            <Button type="submit" disabled={inviting}>
              <IconMail className="mr-2 h-4 w-4" />
              {inviting ? 'Sending...' : 'Invite User'}
            </Button>
          </form>
        </div>

        {/* Search Users */}
        <div className="flex items-center gap-2">
          <SearchInput
            value={globalFilter ?? ""}
            onValueChange={(value) => setGlobalFilter(value)}
            placeholder="Search users..."
            wrapperClassName="max-w-sm w-full"
            className="h-9"
          />
        </div>

        {/* Users Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader className="bg-muted/40">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="hover:bg-transparent">
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : table.getRowModel().rows?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    No users found.
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between gap-2">
          <div className="text-muted-foreground flex-1 text-sm">
            {table.getFilteredRowModel().rows.length} user(s) total.
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
      </DialogContent>
    </Dialog>
    </>
  )
}
// Updated: Added search, sortable columns with always-visible chevrons (matching documents table), and kebab menu with red delete styling
