'use client'

import dynamic from 'next/dynamic'
import type { IHighlight, NewHighlight } from '@/lib/highlight-types'

export type BookmarkEntry = {
  title: string
  pageNumber: number
  yNormalizedFromTop: number | null
  level: number
}

interface PdfViewerProps {
  pdfUrl: string
  highlights: IHighlight[]
  onAddHighlight: (highlight: NewHighlight, comment: string, type: string, status: string, sectionNumber: string) => void
  scrollToHighlightId?: string | null
  selectedHighlightId?: string | null
  onHighlightClick?: (highlightId: string) => void
  onBookmarksLoad?: (bookmarks: BookmarkEntry[]) => void
}

// Dynamically import PdfViewer with no SSR
const PdfViewer = dynamic(
  () => import('./pdf-viewer-rpv').then((mod) => ({ default: mod.PdfViewer })),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full flex items-center justify-center bg-muted/20">
        <div className="text-center">
          <div className="text-lg mb-2">Loading PDF Viewer...</div>
          <div className="text-sm text-muted-foreground">Please wait</div>
        </div>
      </div>
    )
  }
)

export function PdfViewerWrapper(props: PdfViewerProps) {
  return <PdfViewer {...props} />
}
