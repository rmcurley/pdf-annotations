/**
 * Application Constants
 * Centralized location for all hardcoded values used throughout the app
 */

// Comment/Annotation Types
export const COMMENT_TYPES = {
  COMMENT: 'comment',
  EDIT: 'edit',
} as const

export type CommentType = typeof COMMENT_TYPES[keyof typeof COMMENT_TYPES]

// Comment/Annotation Status
export const COMMENT_STATUS = {
  PROPOSED: 'proposed',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
} as const

export type CommentStatus = typeof COMMENT_STATUS[keyof typeof COMMENT_STATUS]

// Document Versions
export const DOCUMENT_VERSIONS = {
  DRAFT: 'Draft',
  REVISED_DRAFT: 'Revised Draft',
  FINAL: 'Final',
} as const

export type DocumentVersion = typeof DOCUMENT_VERSIONS[keyof typeof DOCUMENT_VERSIONS]

// User Roles
export const USER_ROLES = {
  ADMIN: 'admin',
  MEMBER: 'member',
  OWNER: 'owner',
} as const

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES]

// Storage Buckets
export const STORAGE_BUCKETS = {
  PDFS: 'pdfs',
  DOCUMENTS: 'documents',
} as const

// Database Tables
export const DB_TABLES = {
  USERS: 'users',
  PROJECTS: 'projects',
  DOCUMENTS: 'documents',
  COMMENTS: 'comments',
  PROJECT_MEMBERS: 'project_members',
  DOCUMENT_ASSIGNEES: 'document_assignees',
} as const

// UI Constants
export const UI_CONSTANTS = {
  DEFAULT_PAGE_SIZE: 10,
  MAX_FILE_SIZE_MB: 100,
  PDF_WORKER_URL: '//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
} as const

// Filters
export const FILTER_ALL = 'all'

// Status Colors (for badges and icons)
export const STATUS_COLORS = {
  [COMMENT_STATUS.PROPOSED]: {
    badge: 'yellow',
    text: 'text-yellow-700',
    icon: 'CircleHelp',
  },
  [COMMENT_STATUS.ACCEPTED]: {
    badge: 'green',
    text: 'text-emerald-700',
    icon: 'CircleCheck',
  },
  [COMMENT_STATUS.REJECTED]: {
    badge: 'red',
    text: 'text-red-700',
    icon: 'CircleX',
  },
} as const

// Validation
export const VALIDATION = {
  DOCUMENT_PREFIX: {
    PATTERN: /^[A-Z0-9]+$/,
    MAX_LENGTH: 10,
    MIN_LENGTH: 1,
  },
  COMMENT: {
    MAX_LENGTH: 5000,
    MIN_LENGTH: 1,
  },
} as const

// Export arrays for dropdowns/selects
export const COMMENT_TYPE_OPTIONS = Object.values(COMMENT_TYPES)
export const COMMENT_STATUS_OPTIONS = Object.values(COMMENT_STATUS)
export const DOCUMENT_VERSION_OPTIONS = Object.values(DOCUMENT_VERSIONS)
export const USER_ROLE_OPTIONS = Object.values(USER_ROLES)
