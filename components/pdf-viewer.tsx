"use client"

/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useCallback, useRef } from 'react'
import {
  PdfLoader,
  PdfHighlighter,
  TextHighlight,
  AreaHighlight,
  MonitoredHighlightContainer,
  useHighlightContainerContext,
} from 'react-pdf-highlighter-extended'
import type {
  Highlight,
  PdfSelection,
  PdfHighlighterUtils,
} from 'react-pdf-highlighter-extended'
import type { IHighlight, NewHighlight } from '@/lib/highlight-types'

// Migration function: converts old position format to new format
// Old: { boundingRect: {...}, rects: [...], pageNumber: 5 }
// New: { boundingRect: {..., pageNumber: 5}, rects: [{..., pageNumber: 5}, ...] }
function migrateHighlightPosition(highlight: IHighlight): IHighlight {
  const position = highlight.position as any
  if (!position) return highlight

  // Check if already in new format (pageNumber inside boundingRect)
  if (position.boundingRect?.pageNumber !== undefined) {
    return highlight
  }

  // Get pageNumber from position level (old format)
  const pageNumber = position.pageNumber ?? 1

  // Migrate boundingRect
  const boundingRect = position.boundingRect
    ? { ...position.boundingRect, pageNumber }
    : position.boundingRect

  // Migrate rects array
  const rects = Array.isArray(position.rects)
    ? position.rects.map((rect: any) => ({
        ...rect,
        pageNumber: rect.pageNumber ?? pageNumber,
      }))
    : position.rects

  return {
    ...highlight,
    position: {
      boundingRect,
      rects,
      usePdfCoordinates: position.usePdfCoordinates,
    },
  } as IHighlight
}

// Migrate array of highlights
function migrateHighlights(highlights: IHighlight[]): IHighlight[] {
  return highlights.map(migrateHighlightPosition)
}
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { Separator } from '@/components/ui/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { MessageSquare, MessageCircle, Pencil, CircleUserRound, CircleHelp, CircleCheck, CircleX, Minus, Plus, MoveVertical, MoveHorizontal, ChevronUp, ChevronDown, Search, Ban, Loader2, UsersRound, Save, Bookmark } from 'lucide-react'
import { CommentDrawer } from './comment-drawer'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { SearchInput } from '@/components/search-input'
import { formatAnnotationId } from '@/lib/comment-utils'

// Helper functions for highlight styling
const getTypeIcon = (type: string) => {
  switch (type?.toLowerCase()) {
    case 'edit':
      return Pencil
    case 'discussion':
      return UsersRound
    case 'comment':
    default:
      return MessageCircle
  }
}

const getStatusColor = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'accepted':
      return {
        bg: 'bg-emerald-100 dark:bg-emerald-900/30',
        icon: 'text-emerald-600 dark:text-emerald-400',
        badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
      }
    case 'rejected':
      return {
        bg: 'bg-red-100 dark:bg-red-900/30',
        icon: 'text-red-600 dark:text-red-400',
        badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      }
    case 'proposed':
    default:
      return {
        bg: 'bg-amber-100 dark:bg-amber-900/30',
        icon: 'text-amber-600 dark:text-amber-400',
        badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      }
  }
}

const formatStatus = (status: string) => {
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()
}

// Highlight container component that renders each highlight
interface HighlightContainerProps {
  selectedHighlightId?: string | null
  onHighlightClick?: (highlightId: string) => void
}

function HighlightContainer({ selectedHighlightId, onHighlightClick }: HighlightContainerProps) {
  const { highlight, isScrolledTo } = useHighlightContainerContext<IHighlight>()

  const isSelected = selectedHighlightId === highlight.id
  const commentType = (highlight.comment as any)?.type || 'comment'
  const commentStatus = (highlight.comment as any)?.status || 'proposed'
  const TypeIcon = getTypeIcon(commentType)
  const statusColors = getStatusColor(commentStatus)
  const formattedId =
    (highlight.comment as any)?.annotation_id ||
    formatAnnotationId({
      id: highlight.id || "",
      annotation_id: (highlight.comment as any)?.annotation_id,
    } as any)

  const handleClick = () => {
    if (onHighlightClick && highlight.id) {
      onHighlightClick(highlight.id)
    }
  }

  // Determine highlight type based on content
  const isAreaHighlight = highlight.type === 'area' || (!highlight.content?.text && highlight.content?.image)

  // Cast highlight to ViewportHighlight for the component props
  const viewportHighlight = highlight as any

  const highlightComponent = isAreaHighlight ? (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          handleClick()
        }
      }}
    >
      <AreaHighlight
        highlight={viewportHighlight}
        isScrolledTo={isSelected || isScrolledTo}
        onChange={() => {}}
      />
    </div>
  ) : (
    <TextHighlight
      highlight={viewportHighlight}
      isScrolledTo={isSelected || isScrolledTo}
      onClick={handleClick}
    />
  )

  // If no comment text, just show the highlight without popup
  if (!highlight.comment?.text?.trim()) {
    return (
      <div
        data-highlight-id={highlight.id}
        className={isSelected ? 'custom-highlight-selected' : ''}
      >
        {highlightComponent}
      </div>
    )
  }

  // Create tip content for the popup
  const tipContent = (
    <div
      className="bg-card border border-border rounded-lg p-3 shadow-xl text-sm max-w-sm cursor-pointer"
      onClick={handleClick}
    >
      {/* Top line - Type icon, ID, and Status badge */}
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          {/* Type Icon */}
          <div className={`w-6 h-6 rounded-full ${statusColors.bg} flex items-center justify-center flex-shrink-0`}>
            <TypeIcon className={`w-3.5 h-3.5 ${statusColors.icon}`} />
          </div>
          {/* Annotation ID */}
          <div className="font-semibold text-sm">
            {formattedId}
          </div>
        </div>
        {/* Status Badge */}
        <Badge variant="secondary" className={`${statusColors.badge} border-0 flex items-center gap-1 text-xs px-2 py-0.5 flex-shrink-0`}>
          {commentStatus.toLowerCase() === 'proposed' && (
            <CircleHelp className="w-3 h-3" />
          )}
          {commentStatus.toLowerCase() === 'accepted' && (
            <CircleCheck className="w-3 h-3" />
          )}
          {commentStatus.toLowerCase() === 'rejected' && (
            <CircleX className="w-3 h-3" />
          )}
          {formatStatus(commentStatus)}
        </Badge>
      </div>

      {/* Annotation text */}
      <div className="text-foreground leading-relaxed mb-2">
        {highlight.comment?.text}
      </div>

      {/* Separator */}
      <div className="border-t border-border my-2"></div>

      {/* User info - right aligned */}
      <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
        <CircleUserRound className="w-3.5 h-3.5" />
        <span>{(highlight.comment as any)?.user_name || 'Unknown User'}</span>
      </div>
    </div>
  )

  // Use MonitoredHighlightContainer for hover popup functionality
  return (
    <MonitoredHighlightContainer
      highlightTip={{
        position: highlight.position,
        content: tipContent,
      }}
      onMouseEnter={handleClick}
    >
      <div
        data-highlight-id={highlight.id}
        className={isSelected || isScrolledTo ? 'custom-highlight-selected' : ''}
      >
        {highlightComponent}
      </div>
    </MonitoredHighlightContainer>
  )
}

interface PdfViewerProps {
  pdfUrl: string
  highlights: IHighlight[]
  onAddHighlight: (highlight: NewHighlight, comment: string, type: string, status: string, sectionNumber: string) => void
  scrollToHighlightId?: string | null
  selectedHighlightId?: string | null
  onHighlightClick?: (highlightId: string) => void
}

export function PdfViewer({ pdfUrl, highlights, onAddHighlight, scrollToHighlightId, selectedHighlightId, onHighlightClick }: PdfViewerProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedHighlight, setSelectedHighlight] = useState<NewHighlight | null>(null)
  const [draftHighlight, setDraftHighlight] = useState<IHighlight | null>(null)
  const [selectedText, setSelectedText] = useState('')
  const [pageNumber, setPageNumber] = useState(1)
  const [documentPageNumber, setDocumentPageNumber] = useState('')
  const [sectionNumber, setSectionNumber] = useState('')
  const [showAddButton, setShowAddButton] = useState(false)
  const [buttonPosition, setButtonPosition] = useState<{ x: number; y: number } | null>(null)
  const [inlineAnnotationType, setInlineAnnotationType] = useState<'comment' | 'edit' | 'discussion'>('comment')
  const [inlineAnnotationText, setInlineAnnotationText] = useState('')
  const [inlineSaving, setInlineSaving] = useState(false)
  const [inlinePlacement, setInlinePlacement] = useState<'above' | 'below'>('above')
  const [scale, setScale] = useState(100) // Zoom percentage (50% to 200%)
  const [scaleMode, setScaleMode] = useState<'custom' | 'page-fit' | 'page-width'>('custom')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchMatches, setSearchMatches] = useState<Element[]>([])
  const [currentMatch, setCurrentMatch] = useState<number>(0)
  const [pageJumpOpen, setPageJumpOpen] = useState(false)
  const [pageJumpValue, setPageJumpValue] = useState('')
  const [bookmarksOpen, setBookmarksOpen] = useState(false)
  const [bookmarks, setBookmarks] = useState<any[]>([])
  const scrollToHighlightRef = React.useRef<((highlight: IHighlight) => void) | null>(null)
  const pdfBookmarksRef = React.useRef<any[]>([])
  const pdfDocumentRef = React.useRef<any>(null)
  const totalPagesSetRef = React.useRef<boolean>(false)
  const preservedScrollRef = React.useRef<{ pageNumber: number; offsetRatio: number } | null>(null)
  const scrollRafRef = React.useRef<number | null>(null)
  const pageJumpInputRef = React.useRef<HTMLInputElement | null>(null)
  const searchDebounceRef = React.useRef<NodeJS.Timeout | null>(null)

  const getInlinePlaceholder = () => {
    switch (inlineAnnotationType) {
      case 'edit':
        return 'Suggest an edit or alternative text...'
      case 'discussion':
        return 'Start a discussion about this text...'
      default:
        return 'Add a comment about this text...'
    }
  }

  // Scroll to highlight when scrollToHighlightId changes
  React.useEffect(() => {
    if (scrollToHighlightId) {
      const highlight = highlights.find(h => h.id === scrollToHighlightId)
      if (highlight) {
        // Use a small delay to ensure DOM is ready
        setTimeout(() => {
          // Find the highlight element in the DOM
          const highlightElement = document.querySelector(`[data-highlight-id="${scrollToHighlightId}"]`)
          if (highlightElement) {
            // Get the highlight's position
            const rect = highlightElement.getBoundingClientRect()
            const pdfContainer = document.querySelector('.PdfHighlighter')

            if (pdfContainer) {
              // Calculate the current scroll position
              const containerRect = pdfContainer.getBoundingClientRect()
              const relativeTop = rect.top - containerRect.top

              // Scroll to the element with 150px of context above it
              const targetScroll = pdfContainer.scrollTop + relativeTop - 150

              pdfContainer.scrollTo({
                top: Math.max(0, targetScroll),
                behavior: 'smooth'
              })
            }
          } else if (scrollToHighlightRef.current) {
            // Fallback: use the library's scroll function if element not found
            scrollToHighlightRef.current(highlight)

            // Then adjust after a brief delay
            setTimeout(() => {
              const pdfContainer = document.querySelector('.PdfHighlighter')
              if (pdfContainer) {
                pdfContainer.scrollBy({ top: -150, behavior: 'smooth' })
              }
            }, 100)
          }
        }, 50)
      }
    }
  }, [scrollToHighlightId, highlights])

  React.useEffect(() => {
    if (pageJumpOpen) {
      setPageJumpValue(currentPage.toString())
      const timer = window.setTimeout(() => {
        pageJumpInputRef.current?.focus()
        pageJumpInputRef.current?.select()
      }, 10)
      return () => window.clearTimeout(timer)
    }
  }, [pageJumpOpen, currentPage])

  // Update DOM classes when selectedHighlightId changes (without remounting component)
  React.useEffect(() => {
    // Remove custom-highlight-selected class from all highlights
    document.querySelectorAll('[data-highlight-id]').forEach(el => {
      el.classList.remove('custom-highlight-selected')
    })

    // Add custom-highlight-selected class to the selected highlight
    if (selectedHighlightId) {
      const selectedElements = document.querySelectorAll(`[data-highlight-id="${selectedHighlightId}"]`)
      selectedElements.forEach(el => {
        el.classList.add('custom-highlight-selected')
      })
    }
  }, [selectedHighlightId])

  // Helper function to flatten bookmark tree and get page numbers
  const flattenBookmarks = async (bookmarks: any[], pdfDoc: any, result: any[] = [], level: number = 0): Promise<any[]> => {
    for (const bookmark of bookmarks) {
      if (bookmark.dest) {
        try {
          // Get the destination page
          let dest = bookmark.dest
          if (typeof dest === 'string') {
            dest = await pdfDoc.getDestination(dest)
          }

          if (dest && dest[0]) {
            const pageRef = dest[0]
            const pageIndex = await pdfDoc.getPageIndex(pageRef)
            let yNormalizedFromTop: number | null = null

            // dest array format varies by type:
            // [pageRef, 'XYZ', left, top, zoom] - top is dest[3]
            // [pageRef, 'FitH', top] - top is dest[2]
            // [pageRef, 'FitBH', top] - top is dest[2]
            // [pageRef, 'FitR', left, bottom, right, top] - top is dest[5]
            // [pageRef, 'Fit'] - no position, just fits the page
            // [pageRef, 'FitV', left] - no top position
            // [pageRef, 'FitB'] - no position
            if (Array.isArray(dest) && dest.length >= 2) {
              const destType = dest[1]?.name || dest[1]
              let topFromBottom: number | null = null

              if (destType === 'XYZ' && typeof dest[3] === 'number') {
                topFromBottom = dest[3]
              } else if ((destType === 'FitH' || destType === 'FitBH') && typeof dest[2] === 'number') {
                topFromBottom = dest[2]
              } else if (destType === 'FitR' && typeof dest[5] === 'number') {
                topFromBottom = dest[5]
              }

              if (topFromBottom !== null) {
                try {
                  const page = await pdfDoc.getPage(pageIndex + 1)
                  const viewport = page.getViewport({ scale: 1 })
                  // PDF coords origin is bottom-left; convert to top-origin normalized 0-1
                  yNormalizedFromTop = 1 - Math.min(Math.max(topFromBottom / Math.max(viewport.height, 1), 0), 1)
                } catch (e) {
                  console.warn('Error normalizing bookmark position:', e)
                }
              }
              // For Fit destinations, yNormalizedFromTop stays null - we'll find it from text layer
            }

            result.push({
              title: bookmark.title,
              pageNumber: pageIndex + 1, // Convert 0-indexed to 1-indexed
              yNormalizedFromTop,
              level, // Track nesting depth for hierarchy display
            })
          }
        } catch (e) {
          console.warn('Error processing bookmark:', e)
        }
      }
      // Recursively process child bookmarks with incremented level
      if (bookmark.items && bookmark.items.length > 0) {
        await flattenBookmarks(bookmark.items, pdfDoc, result, level + 1)
      }
    }
    return result
  }

  // Get bookmarks for a specific page (in document order)
  const getBookmarksForPage = (pageNum: number): any[] => {
    return pdfBookmarksRef.current.filter(b => b.pageNumber === pageNum)
  }

  // Get bookmark options for the dropdown: all bookmarks on current page + last bookmark from previous page
  const getBookmarkOptions = (pageNum: number): any[] => {
    const currentPageBookmarks = getBookmarksForPage(pageNum)

    // Find the last bookmark from previous pages (furthest down on the most recent page)
    // Bookmarks are stored in document order, so the last one before current page is what we want
    const previousPageBookmarks = pdfBookmarksRef.current
      .filter(b => b.pageNumber < pageNum)

    const lastPreviousBookmark = previousPageBookmarks.length > 0 ? previousPageBookmarks[previousPageBookmarks.length - 1] : null

    const options: any[] = []
    if (lastPreviousBookmark) {
      options.push({ ...lastPreviousBookmark, isPrevious: true })
    }
    options.push(...currentPageBookmarks.map(b => ({ ...b, isPrevious: false })))

    return options
  }

  // Guess the nearest bookmark ABOVE the selection based on Y position
  // Since bookmarks don't have Y coordinates, we use a simple heuristic:
  // Divide the page into equal sections based on number of bookmarks
  // Y from top: 0 = top of page, 1 = bottom of page
  const guessNearestBookmark = (pageNum: number, selectionYNormalized?: number): string => {
    console.log('=== BOOKMARK GUESSING DEBUG ===')
    console.log('Total bookmarks in document:', pdfBookmarksRef.current.length)

    if (pdfBookmarksRef.current.length === 0) {
      console.log('No bookmarks in document, returning empty')
      return ''
    }

    const currentPageBookmarks = getBookmarksForPage(pageNum)

    // Get the last bookmark from previous pages as a fallback
    // We want the bookmark furthest down on the most recent previous page
    const previousBookmarks = pdfBookmarksRef.current
      .filter(b => b.pageNumber < pageNum)
    // The bookmarks are in document order, so the last one in the filtered array
    // is the one furthest down on the highest page number before current
    const lastPreviousBookmark = previousBookmarks.length > 0 ? previousBookmarks[previousBookmarks.length - 1] : null

    // 1. All bookmarks on current page, listed in order
    console.log(`1. Bookmarks on page ${pageNum} (in order):`)
    currentPageBookmarks.forEach((b, i) => console.log(`   ${i + 1}. "${b.title}"`))

    // 2. Number of bookmarks
    const numBookmarks = currentPageBookmarks.length
    console.log(`2. Number of bookmarks on page: ${numBookmarks}`)

    // 3. Fraction of page for each bookmark
    console.log('3. Page fractions for each bookmark:')
    if (numBookmarks > 0) {
      currentPageBookmarks.forEach((b, i) => {
        const startFraction = i / numBookmarks
        const endFraction = (i + 1) / numBookmarks
        console.log(`   "${b.title}": ${startFraction.toFixed(2)} - ${endFraction.toFixed(2)}`)
      })
    }

    // 4. Position of current selection
    console.log(`4. Selection position (0=top, 1=bottom): ${selectionYNormalized?.toFixed(4) ?? 'undefined'}`)

    // 5. Last bookmark from previous page
    console.log(`5. Last bookmark from previous page: ${lastPreviousBookmark ? `"${lastPreviousBookmark.title}" (page ${lastPreviousBookmark.pageNumber})` : 'none'}`)

    // If no bookmarks on current page, use the last bookmark from a previous page
    if (numBookmarks === 0) {
      const result = lastPreviousBookmark?.title || ''
      console.log(`6. GUESS: "${result}" - No bookmarks on current page, using last from previous page`)
      return result
    }

    // If we don't have Y position, return the first bookmark on the page
    if (typeof selectionYNormalized !== 'number') {
      const result = currentPageBookmarks[0]?.title || ''
      console.log(`6. GUESS: "${result}" - No Y position available, using first bookmark on page`)
      return result
    }

    // Simple approach: divide page into equal sections
    // If 4 bookmarks: section 0 = 0-0.25, section 1 = 0.25-0.5, section 2 = 0.5-0.75, section 3 = 0.75-1.0
    const sectionIndex = Math.min(
      Math.floor(selectionYNormalized * numBookmarks),
      numBookmarks - 1
    )

    const result = currentPageBookmarks[sectionIndex]?.title || ''
    const startFraction = sectionIndex / numBookmarks
    const endFraction = (sectionIndex + 1) / numBookmarks
    console.log(`6. GUESS: "${result}" - Selection Y=${selectionYNormalized.toFixed(4)} falls in section ${sectionIndex} (range ${startFraction.toFixed(2)}-${endFraction.toFixed(2)})`)
    console.log('=== END DEBUG ===')

    return result
  }

  const resetHash = () => {
    // Don't reset hash anymore - we want highlights to persist
    // window.location.hash = ''
  }

  // Track current page based on scroll position
  const updateCurrentPage = React.useCallback(() => {
    const container = document.querySelector('.PdfHighlighter') as HTMLElement | null
    if (!container) {
      return
    }

    const pages = container.querySelectorAll('[data-page-number]')
    if (!pages.length) {
      return
    }

    const containerRect = container.getBoundingClientRect()
    const viewportMidpoint = container.scrollTop + container.clientHeight / 2

    let detectedPage: number | null = null
    let closestDistance = Number.POSITIVE_INFINITY

    for (const page of Array.from(pages)) {
      const pageEl = page as HTMLElement
      const pageAttr = pageEl.getAttribute('data-page-number')
      if (!pageAttr) continue
      const pageNumber = parseInt(pageAttr, 10)
      if (Number.isNaN(pageNumber)) continue

      const rect = pageEl.getBoundingClientRect()
      const pageTop = container.scrollTop + (rect.top - containerRect.top)
      const pageHeight = rect.height || pageEl.offsetHeight || pageEl.clientHeight || 0
      const pageBottom = pageTop + pageHeight
      const pageCenter = pageTop + pageHeight / 2

      if (viewportMidpoint >= pageTop && viewportMidpoint <= pageBottom) {
        detectedPage = pageNumber
        break
      }

      const distance = Math.abs(pageCenter - viewportMidpoint)
      if (distance < closestDistance) {
        closestDistance = distance
        detectedPage = pageNumber
      }
    }

    if (detectedPage) {
      setCurrentPage(prev => (detectedPage !== prev ? detectedPage : prev))
    }
  }, [])

  React.useEffect(() => {
    const container = document.querySelector('.PdfHighlighter') as HTMLElement | null
    if (!container) {
      return
    }

    const handleScroll = () => {
      if (scrollRafRef.current) {
        cancelAnimationFrame(scrollRafRef.current)
      }
      scrollRafRef.current = window.requestAnimationFrame(() => {
        updateCurrentPage()
        scrollRafRef.current = null
      })
    }

    container.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()

    return () => {
      container.removeEventListener('scroll', handleScroll)
      if (scrollRafRef.current) {
        cancelAnimationFrame(scrollRafRef.current)
        scrollRafRef.current = null
      }
    }
  }, [pdfUrl, totalPages, scale, scaleMode, updateCurrentPage])

  // Extract total pages when PDF is rendered
  React.useEffect(() => {
    if (totalPagesSetRef.current) return

    const checkForPages = () => {
      // Try multiple selectors since the library might use different class names
      let pages = document.querySelectorAll('.react-pdf__Page')
      if (pages.length === 0) {
        pages = document.querySelectorAll('[data-page-number]')
      }
      if (pages.length === 0) {
        pages = document.querySelectorAll('.page')
      }

      console.log('Found pages:', pages.length)

      if (pages.length > 0 && !totalPagesSetRef.current) {
        setTotalPages(pages.length)
        totalPagesSetRef.current = true
        console.log('Set total pages to:', pages.length)
      }
    }

    // Try immediately
    checkForPages()

    // Also check after delays in case pages aren't loaded yet
    const timer1 = setTimeout(checkForPages, 500)
    const timer2 = setTimeout(checkForPages, 1000)
    const timer3 = setTimeout(checkForPages, 2000)

    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
      clearTimeout(timer3)
    }
  }, [pdfUrl])

  const handlePdfClick = (event: React.MouseEvent) => {
    // Check if click was on empty space (not on a highlight)
    const target = event.target as HTMLElement
    const clickedOnHighlight = target.closest('.Highlight__part') ||
                               target.closest('.PdfHighlighter__tip-container') ||
                               target.closest('[data-highlight-id]')

    if (!clickedOnHighlight) {
      // Clicked on empty space - clear selection
      if (onHighlightClick) {
        onHighlightClick('') // Pass empty string to clear selection
      }
    }
  }

  const captureScrollPosition = React.useCallback(() => {
    const container = document.querySelector('.PdfHighlighter') as HTMLElement | null
    const pageElement = document.querySelector(`[data-page-number="${currentPage}"]`) as HTMLElement | null
    if (!container || !pageElement) return

    const offsetWithinPage = container.scrollTop - pageElement.offsetTop
    const ratio = pageElement.clientHeight > 0 ? offsetWithinPage / pageElement.clientHeight : 0

    preservedScrollRef.current = {
      pageNumber: currentPage,
      offsetRatio: Math.min(Math.max(ratio, 0), 1),
    }
  }, [currentPage])

  // Zoom control functions
  const handleZoomIn = () => {
    const rounded = Math.round(scale / 10) * 10
    const nextScale = Math.min(200, rounded + 10)
    if (scaleMode === 'custom' && nextScale === scale) {
      return
    }
    captureScrollPosition()
    setScaleMode('custom')
    setScale(nextScale)
  }

  const handleZoomOut = () => {
    const rounded = Math.round(scale / 10) * 10
    const nextScale = Math.max(50, rounded - 10)
    if (scaleMode === 'custom' && nextScale === scale) {
      return
    }
    captureScrollPosition()
    setScaleMode('custom')
    setScale(nextScale)
  }

  const handleSliderChange = (value: number[]) => {
    const nextScale = value[0]
    if (scaleMode === 'custom' && nextScale === scale) {
      return
    }
    captureScrollPosition()
    setScaleMode('custom')
    setScale(nextScale)
  }

  const handlePageFit = () => {
    if (scaleMode === 'page-fit') {
      return
    }
    captureScrollPosition()
    setScaleMode('page-fit')
  }

  const handlePageWidth = () => {
    if (scaleMode === 'page-width') {
      return
    }
    captureScrollPosition()
    setScaleMode('page-width')
  }

  // Get the scale value to pass to PdfHighlighter
  const getScaleValue = (): "page-fit" | "page-width" | number => {
    if (scaleMode === 'page-fit') return 'page-fit'
    if (scaleMode === 'page-width') return 'page-width'
    return scale / 100  // Return as number, not string
  }

  React.useEffect(() => {
    if (!preservedScrollRef.current) return

    const state = preservedScrollRef.current
    const timer = window.setTimeout(() => {
      const container = document.querySelector('.PdfHighlighter') as HTMLElement | null
      const pageElement = document.querySelector(`[data-page-number="${state.pageNumber}"]`) as HTMLElement | null

      if (container && pageElement) {
        const targetTop = pageElement.offsetTop + state.offsetRatio * Math.max(pageElement.clientHeight, 1)
        container.scrollTo({ top: targetTop })
      }

      preservedScrollRef.current = null
    }, 50)

    return () => window.clearTimeout(timer)
  }, [scale, scaleMode])

  // Page navigation functions
  const handleNextPage = () => {
    if (currentPage < totalPages) {
      const nextPage = currentPage + 1
      scrollToPage(nextPage)
    }
  }

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      const prevPage = currentPage - 1
      scrollToPage(prevPage)
    }
  }

  // Search functions
  const handleSearchToggle = () => {
    setSearchOpen(!searchOpen)
    if (searchOpen) {
      // Clear search when closing
      setSearchQuery('')
      setSearchMatches([])
      setCurrentMatch(0)

      // Remove highlights
      document.querySelectorAll('.pdf-search-highlight-element').forEach(el => {
        el.classList.remove('pdf-search-highlight-element')
      })
      document.querySelectorAll('.pdf-search-highlight-current-element').forEach(el => {
        el.classList.remove('pdf-search-highlight-current-element')
      })
    }
  }

  // Perform the actual search (called after debounce)
  const performSearch = useCallback((query: string) => {
    // Remove previous highlights
    document.querySelectorAll('.pdf-search-highlight-element').forEach(el => {
      el.classList.remove('pdf-search-highlight-element')
    })
    document.querySelectorAll('.pdf-search-highlight-current-element').forEach(el => {
      el.classList.remove('pdf-search-highlight-current-element')
    })

    if (query.trim()) {
      const textLayers = document.querySelectorAll('.textLayer')
      const matches: Element[] = []
      const seenPositions = new Set<string>()
      const lowerQuery = query.toLowerCase()

      textLayers.forEach(layer => {
        const layerRect = layer.getBoundingClientRect()
        if (layerRect.width === 0 || layerRect.height === 0) return

        const textElements = Array.from(layer.querySelectorAll('span'))

        // Build a continuous text string and map positions to elements
        let fullText = ''
        const charToElementMap: { element: Element; charIndex: number }[] = []

        textElements.forEach(el => {
          const text = el.textContent || ''
          const startIndex = fullText.length
          fullText += text

          // Map each character to its source element
          for (let i = 0; i < text.length; i++) {
            charToElementMap.push({ element: el, charIndex: startIndex + i })
          }
        })

        // Search for query in the continuous text
        const lowerFullText = fullText.toLowerCase()
        let searchIndex = 0

        while (searchIndex < lowerFullText.length) {
          const matchIndex = lowerFullText.indexOf(lowerQuery, searchIndex)
          if (matchIndex === -1) break

          // Find all elements that contribute to this match
          const matchEndIndex = matchIndex + lowerQuery.length - 1
          const elementsInMatch = new Set<Element>()

          for (let i = matchIndex; i <= matchEndIndex && i < charToElementMap.length; i++) {
            elementsInMatch.add(charToElementMap[i].element)
          }

          // Add all contributing elements to matches
          elementsInMatch.forEach(el => {
            const rect = el.getBoundingClientRect()
            if (rect.width === 0 || rect.height === 0) return

            const positionKey = `${Math.round(rect.top)}-${Math.round(rect.left)}-${el.textContent}`

            if (!seenPositions.has(positionKey)) {
              seenPositions.add(positionKey)
              el.classList.add('pdf-search-highlight-element')
              matches.push(el)
            }
          })

          searchIndex = matchIndex + 1
        }
      })

      setSearchMatches(matches)
      if (matches.length > 0) {
        setCurrentMatch(1)
        matches[0].classList.add('pdf-search-highlight-current-element')
        matches[0].scrollIntoView({ behavior: 'smooth', block: 'center' })
      } else {
        setCurrentMatch(0)
      }
    } else {
      setSearchMatches([])
      setCurrentMatch(0)
    }
  }, [])

  const handleSearchChange = (query: string) => {
    // Update input immediately for responsive typing
    setSearchQuery(query)

    // Clear any pending search
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current)
    }

    // Debounce the actual search by 200ms
    searchDebounceRef.current = setTimeout(() => {
      performSearch(query)
    }, 200)
  }

  const handleNextMatch = () => {
    if (currentMatch < searchMatches.length && searchMatches.length > 0) {
      // Remove current highlight
      searchMatches[currentMatch - 1].classList.remove('pdf-search-highlight-current-element')

      const nextIndex = currentMatch
      setCurrentMatch(nextIndex + 1)

      // Add current highlight to next match
      searchMatches[nextIndex].classList.add('pdf-search-highlight-current-element')

      // Scroll to match
      searchMatches[nextIndex].scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  const handlePreviousMatch = () => {
    if (currentMatch > 1 && searchMatches.length > 0) {
      // Remove current highlight
      searchMatches[currentMatch - 1].classList.remove('pdf-search-highlight-current-element')

      const prevIndex = currentMatch - 2
      setCurrentMatch(prevIndex + 1)

      // Add current highlight to previous match
      searchMatches[prevIndex].classList.add('pdf-search-highlight-current-element')

      // Scroll to match
      searchMatches[prevIndex].scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  const handlePageJumpOpenChange = (open: boolean) => {
    if (!totalPages) {
      setPageJumpOpen(false)
      return
    }
    setPageJumpOpen(open)
    if (!open) {
      setPageJumpValue('')
    }
  }

  const handlePageJumpSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const parsed = Number(pageJumpValue)
    if (Number.isNaN(parsed)) return
    const maxPages = totalPages || 1
    const normalized = Math.min(Math.max(1, Math.floor(parsed)), maxPages)
    scrollToPage(normalized)
    setPageJumpOpen(false)
  }

  const scrollToPage = (pageNumber: number) => {
    console.log('Attempting to scroll to page:', pageNumber)
    const page = document.querySelector(`[data-page-number="${pageNumber}"]`)
    console.log('Page element found:', !!page)

    if (page) {
      const container = document.querySelector('.PdfHighlighter')
      console.log('Container found:', !!container)

      if (container) {
        const pageRect = page.getBoundingClientRect()
        const containerRect = container.getBoundingClientRect()
        const relativeTop = pageRect.top - containerRect.top
        const targetScroll = container.scrollTop + relativeTop

        console.log('Scrolling to:', targetScroll)
        container.scrollTo({
          top: targetScroll,
          behavior: 'smooth'
        })

        // Update current page immediately after scrolling
        setTimeout(() => {
          setCurrentPage(pageNumber)
          console.log('Updated current page to:', pageNumber)
        }, 500)
      }
    } else {
      console.log('Page element not found, checking what selectors work...')
      console.log('Pages with [data-page-number]:', document.querySelectorAll('[data-page-number]').length)
      console.log('All data-page-number values:', Array.from(document.querySelectorAll('[data-page-number]')).map(el => el.getAttribute('data-page-number')))
    }
  }

  const handleInlineSave = async () => {
    if (!selectedHighlight || !inlineAnnotationText.trim() || inlineSaving) {
      return
    }

    const withTimeout = async <T,>(promise: Promise<T>, ms = 45000) =>
      Promise.race<T>([
        promise,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Save request timed out')), ms)
        ) as Promise<T>,
      ])

    try {
      setInlineSaving(true)
      await withTimeout(
        Promise.resolve(
          onAddHighlight(
            selectedHighlight,
            inlineAnnotationText.trim(),
            inlineAnnotationType,
            'proposed', // Default status
            sectionNumber,
          )
        )
      )

      // Clear state including draft highlight
      setShowAddButton(false)
      setSelectedHighlight(null)
      setDraftHighlight(null)
      setInlineAnnotationText('')
      setInlineAnnotationType('comment')
      setButtonPosition(null)
      setSectionNumber('')
      setDocumentPageNumber('')
      setInlinePlacement('above')
    } catch (error) {
      console.error('Error saving inline annotation:', error)
      alert('Saving the annotation took too long. Please try again.')
    } finally {
      setInlineSaving(false)
    }
  }

  const handleSelectionComplete = (highlight: NewHighlight) => {
    setSelectedHighlight(highlight)
    setSelectedText(highlight.content.text || '')

    // Create a temporary draft highlight so it stays visible while the user types
    const tempId = `draft-${Date.now()}`
    setDraftHighlight({
      ...highlight,
      id: tempId,
    } as IHighlight)

    const pdfPageNumber = (highlight.position as any).pageNumber || highlight.position.boundingRect?.pageNumber || 1
    setPageNumber(pdfPageNumber)

    // Find nearest bookmark for this page using selection Y position
    // The boundingRect.y1 is in PDF coordinate units (not normalized)
    // We need to get the page height to normalize it
    let selectionYNormalized: number | undefined = undefined
    const boundingRect = highlight.position.boundingRect

    if (boundingRect && typeof boundingRect.y1 === 'number') {
      // Get the page element to find its height
      const pageElement = document.querySelector(`[data-page-number="${pdfPageNumber}"]`) as HTMLElement | null

      if (pageElement) {
        const pageHeight = pageElement.clientHeight || pageElement.offsetHeight

        // boundingRect.y1 appears to be negative (PDF coords from bottom)
        // Convert to 0-1 where 0 = top, 1 = bottom
        // If y1 is negative (e.g., -250), and page height is ~1017
        // Then position from top = pageHeight + y1 = 1017 + (-250) = 767 from top
        // Normalized = 767 / 1017 = 0.75 (75% down the page)

        // Actually, let's check what the raw values are first
        console.log('Raw boundingRect:', boundingRect)
        console.log('Page element height:', pageHeight)

        // The y1 value seems to be in a different coordinate system
        // Let's try to figure out the actual position from the DOM selection
        const selection = window.getSelection()
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0)
          const selectionRect = range.getBoundingClientRect()
          const pageRect = pageElement.getBoundingClientRect()

          // Calculate Y position relative to page (0 = top, 1 = bottom)
          const relativeY = selectionRect.top - pageRect.top
          selectionYNormalized = relativeY / pageRect.height

          console.log('Selection rect top:', selectionRect.top)
          console.log('Page rect top:', pageRect.top)
          console.log('Page rect height:', pageRect.height)
          console.log('Relative Y:', relativeY)
          console.log('Normalized Y (0=top, 1=bottom):', selectionYNormalized)
        }
      }
    }

    // Guess the nearest bookmark based on Y position and heading distribution on the page
    const guessedBookmark = guessNearestBookmark(pdfPageNumber, selectionYNormalized)
    setSectionNumber(guessedBookmark)

    // Calculate button position based on selection from DOM or highlight position
    const selection = window.getSelection()
    let selectionRect: DOMRect | null = null
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0)
      selectionRect = range.getBoundingClientRect()
    }

    // Calculate button position based on selection or highlight position
    if (selectionRect) {
      const rect = selectionRect
      const container = document.querySelector('.PdfHighlighter') as HTMLElement | null
      const containerRect = container?.getBoundingClientRect()
      const availableSpaceAbove = containerRect ? rect.top - containerRect.top : rect.top
      const estimatedPopoverHeight = 180 // rough height of the inline toolbar
      const placement: 'above' | 'below' =
        availableSpaceAbove >= estimatedPopoverHeight ? 'above' : 'below'

      setInlinePlacement(placement)

      // Position button above the selection, centered
      setButtonPosition({
        x: rect.left + rect.width / 2,
        y: placement === 'above' ? rect.top - 8 : rect.bottom + 8
      })
    } else if (boundingRect) {
      // Fallback: compute position from highlight's normalized coordinates
      const pageElement = document.querySelector(`[data-page-number="${pdfPageNumber}"]`) as HTMLElement | null
      if (pageElement) {
        const pageRect = pageElement.getBoundingClientRect()
        // Convert normalized coordinates to viewport coordinates
        const x = pageRect.left + (boundingRect.x1 + boundingRect.x2) / 2 * pageRect.width
        const y = pageRect.top + boundingRect.y1 * pageRect.height

        const container = document.querySelector('.PdfHighlighter') as HTMLElement | null
        const containerRect = container?.getBoundingClientRect()
        const availableSpaceAbove = containerRect ? y - containerRect.top : y
        const estimatedPopoverHeight = 180
        const placement: 'above' | 'below' =
          availableSpaceAbove >= estimatedPopoverHeight ? 'above' : 'below'

        setInlinePlacement(placement)
        setButtonPosition({
          x,
          y: placement === 'above' ? y - 8 : y + 8
        })
      } else {
        setButtonPosition(null)
      }
    } else {
      setButtonPosition(null)
    }

    // Extract document-specific page number from the text layer
    // Look for the last text element on the page (usually the page number)
    // Default to PDF page number as fallback
    setDocumentPageNumber(pdfPageNumber.toString())

    setTimeout(() => {
      const pageElement = document.querySelector(`[data-page-number="${pdfPageNumber}"]`)
      if (pageElement) {
        const textLayer = pageElement.querySelector('.textLayer')
        if (textLayer) {
          const textElements = Array.from(textLayer.querySelectorAll('span'))
          if (textElements.length > 0) {
            // Get the last text element (usually the page number at the bottom)
            const lastElement = textElements[textElements.length - 1]
            const lastText = lastElement.textContent?.trim()

            // Check if it's a number (likely the document page number)
            if (lastText && /^\d+$/.test(lastText)) {
              console.log('Extracted document page number:', lastText)
              setDocumentPageNumber(lastText)
            }
          }
        }
      }
    }, 100)

    setShowAddButton(true)
  }

  const handleDrawerSubmit = (data: {
    sectionNumber: string
    pageNumber: number
    comment: string
    commentType: string
    commentStatus: string
    highlightedText: string
  }) => {
    if (selectedHighlight) {
      onAddHighlight(
        selectedHighlight,
        data.comment,
        data.commentType,
        data.commentStatus,
        data.sectionNumber
      )
    }
    setSelectedHighlight(null)
    setSelectedText('')
    setDraftHighlight(null)
    setShowAddButton(false)
    setInlineAnnotationText('')
    setButtonPosition(null)
    setSectionNumber('')
    setDocumentPageNumber(data.pageNumber.toString())
    setDrawerOpen(false)
  }

  // Store PDF highlighter utils ref for scrolling
  const pdfHighlighterUtilsRef = React.useRef<PdfHighlighterUtils | null>(null)

  return (
    <>
      <div className="h-full w-full flex flex-col bg-zinc-300 overflow-hidden" onClick={handlePdfClick}>
        {/* PDF Viewer - takes remaining space */}
        <div className="flex-1 relative overflow-hidden min-h-0">
          <PdfLoader
            document={pdfUrl}
            workerSrc="//unpkg.com/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs"
            beforeLoad={() => <div className="p-8 text-center">Loading PDF...</div>}
            errorMessage={() => (
              <div className="p-8 text-center text-destructive">
                Failed to load PDF. Please check the URL.
              </div>
            )}
          >
            {(pdfDocument) => {
              // Store PDF document reference for bookmark extraction
              if (pdfDocumentRef.current !== pdfDocument) {
                pdfDocumentRef.current = pdfDocument

                // Set total pages using setTimeout to avoid state update during render
                if (!totalPagesSetRef.current) {
                  setTimeout(() => {
                    setTotalPages(pdfDocument.numPages)
                    totalPagesSetRef.current = true
                    console.log('Set total pages from pdfDocument:', pdfDocument.numPages)
                  }, 0)
                }

                // Extract bookmarks asynchronously
                pdfDocument.getOutline().then(async (outline: any) => {
                  if (outline) {
                    const flattened = await flattenBookmarks(outline, pdfDocument)
                    flattened.sort((a, b) => a.pageNumber - b.pageNumber)
                    pdfBookmarksRef.current = flattened
                    setBookmarks(flattened)
                  }
                }).catch(() => {
                  // Silently handle bookmark extraction errors
                })
              }

              // Migrate highlights to new format and combine with draft
              const migratedHighlights = migrateHighlights(
                draftHighlight ? [...highlights, draftHighlight] : highlights
              )

              return (
                <div className="absolute inset-0">
                  <PdfHighlighter
                    key={`${scaleMode}-${scale}`}
                    pdfDocument={pdfDocument}
                    pdfScaleValue={getScaleValue()}
                    enableAreaSelection={(event) => event.altKey}
                    onSelection={(selection: PdfSelection) => {
                      console.log('Selection finished:', selection)

                      const newHighlight: NewHighlight = {
                        content: selection.content,
                        position: selection.position,
                        type: selection.type,
                        comment: { text: '', emoji: '' },
                      }

                      handleSelectionComplete(newHighlight)
                    }}
                    utilsRef={(utils) => {
                      pdfHighlighterUtilsRef.current = utils
                      // Create a wrapper that matches the old scrollRef signature
                      scrollToHighlightRef.current = (highlight: IHighlight) => {
                        utils.scrollToHighlight(highlight)
                      }
                    }}
                    highlights={migratedHighlights as Highlight[]}
                  >
                    <HighlightContainer
                      selectedHighlightId={selectedHighlightId}
                      onHighlightClick={onHighlightClick}
                    />
                  </PdfHighlighter>
                </div>
              )
            }}
          </PdfLoader>
        </div>

        {/* Inline Annotation Popover */}
        {showAddButton && !drawerOpen && buttonPosition && selectedHighlight && (
          <div
            className="fixed z-[9999] animate-in fade-in-0 zoom-in-95"
            style={{
              left: `${buttonPosition.x}px`,
              top: `${buttonPosition.y}px`,
              transform:
                inlinePlacement === 'above'
                  ? 'translate(-50%, calc(-100% - 8px))' // Center horizontally and position above
                  : 'translate(-50%, 8px)', // Position below when near the top to avoid clipping
            }}
          >
            <div className="bg-card border border-border rounded-lg shadow-2xl p-3 w-[368px]">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 w-full">
                  <Popover>
                    <PopoverTrigger asChild>
                      <button type="button">
                        <Badge variant="outline" className="text-xs cursor-pointer hover:bg-accent">
                          Page {documentPageNumber || pageNumber}
                        </Badge>
                      </button>
                    </PopoverTrigger>
                    <PopoverContent
                      side="bottom"
                      align="start"
                      className="w-36 p-2 z-[10000]"
                      sideOffset={5}
                    >
                      <label className="text-xs text-muted-foreground block mb-1">Page number</label>
                      <Input
                        type="text"
                        placeholder="Page"
                        value={documentPageNumber}
                        onChange={(e) => setDocumentPageNumber(e.target.value)}
                        className="h-8 text-sm"
                        autoFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="flex-1 max-w-full"
                      >
                        <Badge
                          variant="secondary"
                          className="text-xs w-full truncate text-left justify-start cursor-pointer hover:bg-secondary/80"
                        >
                          {sectionNumber || 'Select section...'}
                        </Badge>
                      </button>
                    </PopoverTrigger>
                    <PopoverContent
                      side="bottom"
                      align="start"
                      className="w-72 p-0 z-[10000]"
                      sideOffset={5}
                    >
                      <div className="p-2 border-b">
                        <Input
                          placeholder="Type or select section..."
                          value={sectionNumber}
                          onChange={(e) => setSectionNumber(e.target.value)}
                          className="h-8 text-sm"
                          autoFocus
                        />
                      </div>
                      <div className="max-h-48 overflow-y-auto py-1">
                        {getBookmarkOptions(pageNumber).length === 0 ? (
                          <p className="px-3 py-2 text-sm text-muted-foreground">No bookmarks available</p>
                        ) : (
                          getBookmarkOptions(pageNumber).map((bookmark, index) => (
                            <button
                              key={index}
                              type="button"
                              className={`w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors ${
                                bookmark.title === sectionNumber ? 'bg-accent font-medium' : ''
                              } ${bookmark.isPrevious ? 'border-b border-border' : ''}`}
                              onClick={() => setSectionNumber(bookmark.title)}
                            >
                              <span className="truncate block">{bookmark.title}</span>
                              {bookmark.isPrevious && (
                                <span className="text-xs text-muted-foreground block">p. {bookmark.pageNumber} (previous page)</span>
                              )}
                            </button>
                          ))
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Type Selection */}
              <ButtonGroup className="w-full mb-2">
                <Button
                  size="sm"
                  variant={inlineAnnotationType === 'comment' ? 'default' : 'outline'}
                  className="flex-1 text-xs"
                  onClick={() => setInlineAnnotationType('comment')}
                >
                  <MessageCircle className="w-3 h-3 mr-1" />
                  Comment
                </Button>
                <Button
                  size="sm"
                  variant={inlineAnnotationType === 'edit' ? 'default' : 'outline'}
                  className="flex-1 text-xs"
                  onClick={() => setInlineAnnotationType('edit')}
                >
                  <Pencil className="w-3 h-3 mr-1" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant={inlineAnnotationType === 'discussion' ? 'default' : 'outline'}
                  className="flex-1 text-xs"
                  onClick={() => setInlineAnnotationType('discussion')}
                >
                  <UsersRound className="w-3 h-3 mr-1" />
                  Discussion
                </Button>
              </ButtonGroup>

              {/* Quick Annotation Textarea */}
              <Textarea
                className="inline-annotation-textarea text-sm mb-2 min-h-[80px] focus-visible:ring-0 focus-visible:ring-offset-0"
                placeholder={getInlinePlaceholder()}
                value={inlineAnnotationText}
                onChange={(e) => setInlineAnnotationText(e.target.value)}
                autoFocus
                onKeyDown={(e) => {
                  if (inlineSaving) {
                    e.preventDefault()
                    return
                  }
                  if (e.key === 'Escape') {
                    setShowAddButton(false)
                    setSelectedHighlight(null)
                    setDraftHighlight(null)
                    setInlineAnnotationText('')
                    setButtonPosition(null)
                    setSectionNumber('')
                    setDocumentPageNumber('')
                    setInlinePlacement('above')
                  } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    // Quick save directly
                    e.preventDefault()
                    handleInlineSave()
                  }
                }}
              />

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="flex-1 text-xs"
                  onClick={() => {
                    setShowAddButton(false)
                    setSelectedHighlight(null)
                    setDraftHighlight(null)
                    setInlineAnnotationText('')
                    setButtonPosition(null)
                    setSectionNumber('')
                    setDocumentPageNumber('')
                    setInlinePlacement('above')
                  }}
                  disabled={inlineSaving}
                >
                  <Ban className="w-3 h-3 mr-1" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={handleInlineSave}
                  disabled={inlineSaving || !inlineAnnotationText.trim()}
                >
                  {inlineSaving ? (
                    <>
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-3 h-3 mr-1" />
                      Save
                    </>
                  )}
                </Button>
              </div>

              <div className="text-[10px] text-muted-foreground mt-1 text-center">
                Cmd/Ctrl+Enter to save • Esc to cancel
              </div>
            </div>
          </div>
        )}

        {/* Search Bar (appears above navigation) */}
        {searchOpen && (
          <div className="absolute bottom-16 left-6 bg-card border border-border rounded-md shadow-lg p-2 z-[9999] flex items-center gap-2">
            <SearchInput
              value={searchQuery}
              onValueChange={handleSearchChange}
              placeholder="Search in PDF..."
              wrapperClassName="w-64"
              className="h-7 text-sm"
              autoFocus
            />
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handlePreviousMatch}
                    disabled={currentMatch <= 1}
                    className="h-6 w-6"
                  >
                    <ChevronUp className="w-3 h-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>Previous Match</p>
                </TooltipContent>
              </Tooltip>

              <span className="text-xs text-muted-foreground min-w-[50px] text-center">
                {searchMatches.length > 0 ? `${currentMatch} / ${searchMatches.length}` : '0 / 0'}
              </span>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleNextMatch}
                    disabled={currentMatch >= searchMatches.length}
                    className="h-6 w-6"
                  >
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>Next Match</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        )}

        {/* Navigation Bar at Bottom */}
        <div className="flex-shrink-0 bg-card border-t border-border px-6 py-2 rounded-bl-lg">
          <TooltipProvider delayDuration={300}>
            <div className="flex items-center justify-between">
              {/* Search Button - Far Left */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleSearchToggle}
                    className={`h-6 w-6 ${searchOpen ? 'bg-accent' : ''}`}
                  >
                    <Search className="w-3 h-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>Search PDF</p>
                </TooltipContent>
              </Tooltip>

              {/* Center Controls */}
              <div className="flex items-center gap-3">
                {/* Page Navigation */}
              <div className="flex items-center gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handlePreviousPage}
                      disabled={currentPage <= 1}
                      className="h-6 w-6"
                    >
                      <ChevronUp className="w-3 h-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>Previous Page</p>
                  </TooltipContent>
                </Tooltip>

                {totalPages > 0 ? (
                  <Popover open={pageJumpOpen} onOpenChange={handlePageJumpOpenChange}>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="text-xs text-muted-foreground min-w-[70px] text-center rounded px-2 py-1 hover:bg-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        {currentPage} / {totalPages}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-44 p-3" side="top" align="center">
                      <form onSubmit={handlePageJumpSubmit} className="space-y-2">
                        <p className="text-xs font-medium text-foreground text-center">Go to page</p>
                        <Input
                          ref={pageJumpInputRef}
                          type="number"
                          min={1}
                          max={totalPages}
                          value={pageJumpValue}
                          onChange={(e) => setPageJumpValue(e.target.value)}
                          className="h-8 text-sm"
                        />
                        <p className="text-[11px] text-muted-foreground text-center">Press Enter to jump</p>
                      </form>
                    </PopoverContent>
                  </Popover>
                ) : (
                  <span className="text-xs text-muted-foreground min-w-[60px] text-center">-- / --</span>
                )}

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleNextPage}
                      disabled={currentPage >= totalPages}
                      className="h-6 w-6"
                    >
                      <ChevronDown className="w-3 h-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>Next Page</p>
                  </TooltipContent>
                </Tooltip>
              </div>

              {/* Divider */}
              <div className="h-6 bg-border flex-none" style={{ width: '1px' }}></div>

              {/* Zoom Controls */}
              <div className="flex items-center gap-2">
                {/* Zoom Out Button */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleZoomOut}
                      disabled={scale <= 50 && scaleMode === 'custom'}
                      className="h-6 w-6"
                    >
                      <Minus className="w-3 h-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>Zoom Out</p>
                  </TooltipContent>
                </Tooltip>

                {/* Zoom Slider */}
                <div className="flex items-center gap-2 w-32">
                  <Slider
                    value={[scaleMode === 'custom' ? scale : 100]}
                    onValueChange={handleSliderChange}
                    min={50}
                    max={200}
                    step={1}
                    className="flex-1 pdf-zoom-slider"
                  />
                </div>

                {/* Zoom In Button */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleZoomIn}
                      disabled={scale >= 200 && scaleMode === 'custom'}
                      className="h-6 w-6"
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>Zoom In</p>
                  </TooltipContent>
                </Tooltip>

                {/* Zoom Percentage Display */}
                <span className="text-xs text-muted-foreground min-w-[45px] text-center">
                  {scaleMode === 'custom' ? `${scale}%` : scaleMode === 'page-fit' ? 'Fit' : 'Width'}
                </span>
              </div>

              {/* Divider */}
              <div className="h-6 bg-border flex-none" style={{ width: '1px' }}></div>

              {/* Page Fit and Width Buttons */}
              <div className="flex items-center gap-1">
                {/* Page Fit Button */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handlePageFit}
                      className={`h-6 w-6 ${scaleMode === 'page-fit' ? 'bg-accent' : ''}`}
                    >
                      <MoveVertical className="w-3 h-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>Fit Page</p>
                  </TooltipContent>
                </Tooltip>

                {/* Page Width Button */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handlePageWidth}
                      className={`h-6 w-6 ${scaleMode === 'page-width' ? 'bg-accent' : ''}`}
                    >
                      <MoveHorizontal className="w-3 h-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>Fit Width</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              </div>

              {/* Bookmarks Button - Far Right */}
              <Popover open={bookmarksOpen} onOpenChange={setBookmarksOpen}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`h-6 w-6 ${bookmarksOpen ? 'bg-accent' : ''}`}
                          disabled={bookmarks.length === 0}
                        >
                          <Bookmark className="w-3 h-3" />
                        </Button>
                      </PopoverTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p>Bookmarks</p>
                    </TooltipContent>
                  </Tooltip>
                  <PopoverContent
                    side="top"
                    align="end"
                    className="w-90 max-h-80 overflow-y-auto p-0"
                  >
                    <div className="p-2 border-b">
                      <h4 className="font-medium text-sm">Bookmarks</h4>
                    </div>
                    <div className="py-1">
                      {bookmarks.length === 0 ? (
                        <p className="px-3 py-2 text-sm text-muted-foreground">No bookmarks found</p>
                      ) : (
                        bookmarks.map((bookmark, index) => (
                          <button
                            key={index}
                            className="w-full py-2 pr-3 text-left text-sm hover:bg-accent transition-colors flex items-center justify-between gap-2"
                            style={{ paddingLeft: `${12 + (bookmark.level || 0) * 12}px` }}
                            onClick={() => {
                              scrollToPage(bookmark.pageNumber)
                              setBookmarksOpen(false)
                            }}
                          >
                            <span className="truncate">{bookmark.title}</span>
                            <span className="text-xs text-muted-foreground shrink-0">p. {bookmark.pageNumber}</span>
                          </button>
                        ))
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
            </div>
          </TooltipProvider>
        </div>
      </div>

      <CommentDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        selectedText={selectedText}
        pageNumber={pageNumber}
        documentPageNumber={documentPageNumber}
        sectionNumber={sectionNumber}
        onSubmit={handleDrawerSubmit}
      />
    </>
  )
}

