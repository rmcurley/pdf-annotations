import type React from "react"
import { Circle, CircleCheck, CircleHelp, CircleX, MessageCircle, MessagesSquare, Pencil, UserCircle } from "lucide-react"

import { createColumnConfigHelper } from "@/components/data-table-filter/core/filters"
import type { FiltersState } from "@/components/data-table-filter/core/types"
import { getCommentUserDisplayName, type HasCommentUser } from "./comment-utils"

export interface FilterableComment extends HasCommentUser {
  comment_type?: string | null
  comment_status?: string | null
  _filter_user?: string | null
}

const dtf = createColumnConfigHelper<FilterableComment>()

export const COMMENT_TYPE_OPTIONS = [
  { label: "Comment", value: "comment" },
  { label: "Edit", value: "edit" },
] as const

export const COMMENT_STATUS_OPTIONS = [
  { label: "Proposed", value: "proposed" },
  { label: "Accepted", value: "accepted" },
  { label: "Rejected", value: "rejected" },
] as const

export const TYPE_OPTION_ICONS: Record<string, React.ReactNode> = {
  comment: <MessageCircle className="size-4 text-muted-foreground" />,
  edit: <Pencil className="size-4 text-muted-foreground" />,
}

export const STATUS_OPTION_ICONS: Record<string, React.ReactNode> = {
  proposed: <CircleHelp className="size-4 text-yellow-600" />,
  accepted: <CircleCheck className="size-4 text-emerald-600" />,
  rejected: <CircleX className="size-4 text-red-600" />,
}

export const commentFilterColumnsConfig = [
  dtf
    .option()
    .id("comment_type")
    .accessor((row) => row.comment_type || "")
    .displayName("Type")
    .icon(MessagesSquare)
    .options(
      COMMENT_TYPE_OPTIONS.map((option) => ({
        label: option.label,
        value: option.value,
        icon: TYPE_OPTION_ICONS[option.value],
      })),
    )
    .build(),
  dtf
    .option()
    .id("comment_status")
    .accessor((row) => row.comment_status || "")
    .displayName("Status")
    .icon(Circle)
    .options(
      COMMENT_STATUS_OPTIONS.map((option) => ({
        label: option.label,
        value: option.value,
        icon: STATUS_OPTION_ICONS[option.value],
      })),
    )
    .build(),
  dtf
    .option()
    .id("user")
    .accessor((row) => row._filter_user || "")
    .displayName("User")
    .icon(UserCircle)
    .build(),
] as const

export function normalizeCommentsForFiltering<T extends FilterableComment>(
  comments: T[],
) {
  return comments.map((comment) => {
    const normalizedType = comment.comment_type?.toLowerCase?.() ?? ""
    const normalizedStatus = comment.comment_status?.toLowerCase?.() ?? ""

    return {
      ...comment,
      comment_type: normalizedType,
      comment_status: normalizedStatus,
      _filter_user: getCommentUserDisplayName(comment),
    }
  }) as Array<T & FilterableComment>
}

export function filterCommentsByActiveFilters<T extends FilterableComment>(
  comments: T[],
  filters: FiltersState,
) {
  if (filters.length === 0) {
    return comments
  }

  return comments.filter((comment) =>
    filters.every((filter) => {
      if (!filter?.values?.length) return true
      if (filter.type !== "option") return true

      const values = filter.values.map((value) =>
        typeof value === "string" ? value.toLowerCase() : value,
      )

      const valueForColumn = (() => {
        switch (filter.columnId) {
          case "comment_type":
            return comment.comment_type
          case "comment_status":
            return comment.comment_status
          case "user":
            return comment._filter_user
          default:
            return ""
        }
      })()

      const candidate = (valueForColumn ?? "").toString().toLowerCase()
      const found = values.includes(candidate)

      switch (filter.operator) {
        case "is":
        case "is any of":
          return found
        case "is not":
        case "is none of":
          return !found
        default:
          return found
      }
    }),
  )
}
