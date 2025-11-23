import type { Highlight, GhostHighlight, ScaledPosition, Content } from 'react-pdf-highlighter-extended'

// Compatibility types matching old library structure
export type IHighlight = Highlight & {
  content?: Content
  comment?: {
    text: string
    emoji?: string
    type?: string
    status?: string
    user_name?: string
    annotation_id?: string | null
  }
}

export type NewHighlight = GhostHighlight & {
  comment?: {
    text: string
    emoji?: string
  }
}

export type HighlightPosition = ScaledPosition

export type ExtendedHighlightComment = IHighlight['comment'] & {
  type: string
  status: string
  user_name: string
  annotation_id?: string | null
}

// Re-export commonly used types from the library
export type { Highlight, GhostHighlight, ScaledPosition, Content } from 'react-pdf-highlighter-extended'
