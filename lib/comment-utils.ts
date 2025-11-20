export interface CommentUserInfo {
  first_name: string | null
  last_name: string | null
  email: string
  avatar_url?: string | null
}

export interface HasCommentUser {
  users?: CommentUserInfo | null
}

export function getCommentUserDisplayName<T extends HasCommentUser>(comment: T) {
  const firstName = comment.users?.first_name?.trim() || ""
  const lastName = comment.users?.last_name?.trim() || ""

  if (firstName && lastName) {
    return `${firstName} ${lastName}`
  }

  const email = comment.users?.email
  if (email) {
    return email.split("@")[0]
  }

  return "Unknown User"
}

export function getCommentUserInitials<T extends HasCommentUser>(comment: T) {
  const firstName = comment.users?.first_name?.trim()
  const lastName = comment.users?.last_name?.trim()

  if (firstName && lastName) {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
  }

  const email = comment.users?.email
  if (email) {
    return email.charAt(0).toUpperCase()
  }

  return "?"
}

export function formatAnnotationId(comment: { annotation_id?: string | null; id: string }) {
  if (comment.annotation_id) {
    return comment.annotation_id
  }

  return comment.id.slice(0, 4).toUpperCase()
}
