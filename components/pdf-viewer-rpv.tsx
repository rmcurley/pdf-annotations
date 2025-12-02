"use client"

/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useCallback, useMemo, useState } from "react"

import { Worker, Viewer, type Plugin, SpecialZoomLevel } from "@react-pdf-viewer/core"
import { highlightPlugin, Trigger } from "@react-pdf-viewer/highlight"
import { searchPlugin } from "@react-pdf-viewer/search"
import { toolbarPlugin } from "@react-pdf-viewer/toolbar"
import { rotatePlugin } from "@react-pdf-viewer/rotate"
import { selectionModePlugin, SelectionMode } from "@react-pdf-viewer/selection-mode"
import { bookmarkPlugin } from "@react-pdf-viewer/bookmark"
import { thumbnailPlugin } from "@react-pdf-viewer/thumbnail"

import "@react-pdf-viewer/core/lib/styles/index.css"
import "@react-pdf-viewer/highlight/lib/styles/index.css"
import "@react-pdf-viewer/search/lib/styles/index.css"
import "@react-pdf-viewer/toolbar/lib/styles/index.css"
import "@react-pdf-viewer/selection-mode/lib/styles/index.css"
import "@react-pdf-viewer/bookmark/lib/styles/index.css"
import "@react-pdf-viewer/thumbnail/lib/styles/index.css"

import type { IHighlight, NewHighlight } from "@/lib/highlight-types"
import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  MessageCircle,
  Pencil,
  UsersRound,
  Ban,
  Loader2,
  CircleUserRound,
  CircleHelp,
  CircleCheck,
  CircleX,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  Plus,
  Minus,
  ChevronUp,
  ChevronDown,
  ChevronsUp,
  ChevronsDown,
  MoreVertical,
  Search as SearchIcon,
  X,
  Hand,
  MousePointer2,
  Check,
  Bookmark,
  LayoutGrid,
} from "lucide-react"
import { formatAnnotationId } from "@/lib/comment-utils"

type HighlightArea = {
  pageIndex: number
  left: number
  top: number
  width: number
  height: number
}

type RpvHighlight = {
  id: string
  areas: HighlightArea[]
  raw: IHighlight
}

type BookmarkEntry = {
  title: string
  pageNumber: number
  yNormalizedFromTop: number | null
  level: number
}

// Helper functions for highlight styling
const getTypeIcon = (type: string) => {
  switch (type?.toLowerCase()) {
    case "edit":
      return Pencil
    case "discussion":
      return UsersRound
    case "comment":
    default:
      return MessageCircle
  }
}

const getStatusColor = (status: string) => {
  switch (status?.toLowerCase()) {
    case "accepted":
      return {
        bg: "bg-emerald-100 dark:bg-emerald-900/30",
        icon: "text-emerald-600 dark:text-emerald-400",
        badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
      }
    case "rejected":
      return {
        bg: "bg-red-100 dark:bg-red-900/30",
        icon: "text-red-600 dark:text-red-400",
        badge: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
      }
    case "proposed":
    default:
      return {
        bg: "bg-amber-100 dark:bg-amber-900/30",
        icon: "text-amber-600 dark:text-amber-400",
        badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
      }
  }
}

const formatStatus = (status: string) => {
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()
}

function toAreasFromHighlight(highlight: IHighlight): HighlightArea[] {
  const position = highlight.position as any
  if (!position) {
    console.log('[PDF-VIEWER] toAreasFromHighlight: no position - VERSION 2024-12-02-v2')
    return []
  }

  // Extract page number - check multiple possible locations
  const pageNumber =
    position.pageNumber ??
    position.boundingRect?.pageNumber ??
    (Array.isArray(position.rects) && position.rects[0]?.pageNumber) ??
    1

  // Get rects array - check both new and old format
  const rects = Array.isArray(position.rects) && position.rects.length > 0
    ? position.rects
    : position.boundingRect
      ? [position.boundingRect]
      : []

  console.log('[PDF-VIEWER] toAreasFromHighlight: rects count:', rects.length, 'usePdfCoordinates:', position.usePdfCoordinates, '- VERSION 2024-12-02-v2')

  if (rects.length === 0) {
    return []
  }

  // Check if using PDF coordinates (false means percentage-based from old library)
  const usePdfCoordinates = position.usePdfCoordinates ?? false

  const areas = rects.map((rect: any, index: number) => {
    const pn = rect.pageNumber ?? pageNumber

    // Extract coordinates (in pixels from old library)
    const x1 = typeof rect.x1 === "number" ? rect.x1 : 0
    const y1 = typeof rect.y1 === "number" ? rect.y1 : 0
    const x2 = typeof rect.x2 === "number" ? rect.x2 : x1
    const y2 = typeof rect.y2 === "number" ? rect.y2 : y1

    // Get page dimensions from rect (old library stores them with each rect)
    const pageWidth = rect.width
    const pageHeight = rect.height

    let left, top, width, height

    if (pageWidth && pageHeight) {
      // Convert pixel coordinates to percentages using page dimensions
      left = (x1 / pageWidth) * 100
      top = (y1 / pageHeight) * 100
      width = ((x2 - x1) / pageWidth) * 100
      height = ((y2 - y1) / pageHeight) * 100

    } else {
      // Fallback: assume coordinates are already percentages
      left = x1
      top = y1
      width = x2 - x1
      height = y2 - y1
    }

    return {
      pageIndex: Math.max(0, (pn || 1) - 1),
      left,
      top,
      width,
      height,
    }
  })

  return areas
}

type SelectionArea = {
  left: number
  top: number
  width: number
  height: number
}

interface PdfViewerProps {
  pdfUrl: string
  highlights: IHighlight[]
  onAddHighlight: (
    highlight: NewHighlight,
    comment: string,
    type: string,
    status: string,
    sectionNumber: string
  ) => void
  scrollToHighlightId?: string | null
  selectedHighlightId?: string | null
  onHighlightClick?: (highlightId: string) => void
  onBookmarksLoad?: (bookmarks: BookmarkEntry[]) => void
}

export function PdfViewer({
  pdfUrl,
  highlights,
  onAddHighlight,
  scrollToHighlightId,
  selectedHighlightId,
  onHighlightClick,
  onBookmarksLoad,
}: PdfViewerProps) {
  const [inlineAnnotationType, setInlineAnnotationType] = useState<
    "comment" | "edit" | "discussion"
  >("comment")
  const [inlineAnnotationText, setInlineAnnotationText] = useState("")
  const [inlineSaving, setInlineSaving] = useState(false)
  const [sectionNumber, setSectionNumber] = useState("")
  const [draftOverlay, setDraftOverlay] = useState<{
    pageIndex: number
    areas: HighlightArea[]
  } | null>(null)
  const [hoveredHighlight, setHoveredHighlight] = useState<{
    id: string
    position: { x: number; y: number }
  } | null>(null)
  const hoverTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)
  const pdfBookmarksRef = React.useRef<BookmarkEntry[]>([])
  const [bookmarks, setBookmarks] = useState<BookmarkEntry[]>([])
  const popupRef = React.useRef<HTMLDivElement | null>(null)
  const cancelRef = React.useRef<(() => void) | null>(null)
  // Store captured selection rects to preserve them after selection is cleared
  const capturedRectsRef = React.useRef<Array<{
    x1: number
    y1: number
    x2: number
    y2: number
    width: number
    height: number
    pageNumber: number
  }> | null>(null)

  const resetInlineState = React.useCallback(() => {
    setInlineAnnotationText("")
    setInlineAnnotationType("comment")
    setSectionNumber("")
    setDraftOverlay(null)
    cancelRef.current = null
    capturedRectsRef.current = null
  }, [])

  const getInlinePlaceholder = () => {
    switch (inlineAnnotationType) {
      case "edit":
        return "Suggest an edit or alternative text..."
      case "discussion":
        return "Start a discussion about this text..."
      default:
        return "Add a comment about this text..."
    }
  }

  const rpvHighlights: RpvHighlight[] = useMemo(
    () => {
      const converted = (highlights || [])
        .map((h) => ({
          id: h.id || "",
          areas: toAreasFromHighlight(h),
          raw: h,
        }))
        .filter((h) => h.id && h.areas.length > 0)
      return converted
    },
    [highlights]
  )

  // Store rpvHighlights in a ref so the plugin's renderHighlights can always read the latest value
  const rpvHighlightsRef = React.useRef<RpvHighlight[]>(rpvHighlights)

  React.useEffect(() => {
    rpvHighlightsRef.current = rpvHighlights
  }, [rpvHighlights])

  const toolbar = toolbarPlugin()
  const search = searchPlugin()
  const rotate = rotatePlugin()
  const selectionMode = selectionModePlugin()
  const bookmark = bookmarkPlugin()

  const [sidebarView, setSidebarView] = React.useState<'bookmarks' | 'thumbnails' | null>(null)

  const thumbnail = thumbnailPlugin()

  const { SwitchSelectionMode } = selectionMode
  const { Bookmarks } = bookmark
  const { Thumbnails } = thumbnail

  const flattenBookmarks = async (
    bookmarks: any[],
    pdfDoc: any,
    result: BookmarkEntry[] = [],
    level = 0
  ): Promise<BookmarkEntry[]> => {
    for (const bookmark of bookmarks) {
      if (bookmark.dest) {
        try {
          let dest = bookmark.dest
          if (typeof dest === "string") {
            dest = await pdfDoc.getDestination(dest)
          }

          if (dest && dest[0]) {
            const pageRef = dest[0]
            const pageIndex = await pdfDoc.getPageIndex(pageRef)
            let yNormalizedFromTop: number | null = null

            if (Array.isArray(dest) && dest.length >= 2) {
              const destType = dest[1]?.name || dest[1]
              let topFromBottom: number | null = null

              if (destType === "XYZ" && typeof dest[3] === "number") {
                topFromBottom = dest[3]
              } else if (
                (destType === "FitH" || destType === "FitBH") &&
                typeof dest[2] === "number"
              ) {
                topFromBottom = dest[2]
              } else if (destType === "FitR" && typeof dest[5] === "number") {
                topFromBottom = dest[5]
              }

              if (topFromBottom !== null) {
                try {
                  const page = await pdfDoc.getPage(pageIndex + 1)
                  const viewport = page.getViewport({ scale: 1 })
                  yNormalizedFromTop =
                    1 -
                    Math.min(
                      Math.max(
                        topFromBottom / Math.max(viewport.height || 1, 1),
                        0
                      ),
                      1
                    )
                } catch {
                  yNormalizedFromTop = null
                }
              }
            }

            result.push({
              title: bookmark.title,
              pageNumber: pageIndex + 1,
              yNormalizedFromTop,
              level,
            })
          }
        } catch {
          // ignore individual bookmark failures
        }
      }
      if (bookmark.items && bookmark.items.length > 0) {
        await flattenBookmarks(bookmark.items, pdfDoc, result, level + 1)
      }
    }
    return result
  }

  const getBookmarksForPage = (pageNum: number): BookmarkEntry[] => {
    const pageBookmarks = pdfBookmarksRef.current.filter(
      (b) => b.pageNumber === pageNum
    )
    return pageBookmarks
  }

  const getBookmarkOptions = (pageNum: number) => {
    const current = getBookmarksForPage(pageNum)
    const previous = pdfBookmarksRef.current.filter(
      (b) => b.pageNumber < pageNum
    )
    const lastPrevious =
      previous.length > 0 ? previous[previous.length - 1] : null
    const options: Array<BookmarkEntry & { isPrevious?: boolean }> = []
    if (lastPrevious) {
      options.push({ ...lastPrevious, isPrevious: true })
    }
    options.push(...current.map((b) => ({ ...b, isPrevious: false })))
    return options
  }

  const guessNearestBookmark = (
    pageNum: number,
    selectionYNormalized?: number
  ): string => {
    if (pdfBookmarksRef.current.length === 0) {
      return ""
    }

    const currentPageBookmarks = getBookmarksForPage(pageNum)
    const previousBookmarks = pdfBookmarksRef.current.filter(
      (b) => b.pageNumber < pageNum
    )
    const lastPreviousBookmark =
      previousBookmarks.length > 0
        ? previousBookmarks[previousBookmarks.length - 1]
        : null

    const numBookmarks = currentPageBookmarks.length

    if (numBookmarks === 0) {
      return lastPreviousBookmark?.title || ""
    }

    if (typeof selectionYNormalized !== "number") {
      return currentPageBookmarks[0]?.title || ""
    }

    const sectionIndex = Math.min(
      Math.floor(selectionYNormalized * numBookmarks),
      numBookmarks - 1
    )

    return currentPageBookmarks[sectionIndex]?.title || ""
  }

  const handleDocumentLoad = useCallback(
    async (e: any) => {
      try {
        const pdfDoc = e.doc
        const outline = await pdfDoc.getOutline()
        if (!outline) {
          pdfBookmarksRef.current = []
          setBookmarks([])
          onBookmarksLoad?.([])
          return
        }
        const flattened = await flattenBookmarks(outline, pdfDoc)
        flattened.sort((a, b) => a.pageNumber - b.pageNumber)
        pdfBookmarksRef.current = flattened
        setBookmarks(flattened)
        onBookmarksLoad?.(flattened)
      } catch {
        pdfBookmarksRef.current = []
        setBookmarks([])
        onBookmarksLoad?.([])
      }
    },
    [flattenBookmarks, onBookmarksLoad]
  )

  const highlight = highlightPlugin({
    trigger: Trigger.TextSelection,

      renderHighlightTarget: (props) => {
        const {
          selectionRegion,
          pageIndex,
          selectedText,
          cancel,
        } = props as any

        const cancelSelection = () => {
          resetInlineState()
          if (typeof cancel === "function") {
            cancel()
          }
        }

        cancelRef.current = cancelSelection

        // Helper function to merge overlapping rectangles on the same line
        const mergeOverlappingRects = (rects: Array<{
          x1: number; y1: number; x2: number; y2: number;
          width: number; height: number; pageNumber: number
        }>) => {
          console.log('[PDF-VIEWER] mergeOverlappingRects called with', rects.length, 'rects - VERSION 2024-12-02-v2')
          if (rects.length === 0) return rects

          // Sort by vertical position (y1) then horizontal position (x1)
          const sorted = [...rects].sort((a, b) => {
            const yDiff = a.y1 - b.y1
            if (Math.abs(yDiff) > 5) return yDiff // Different lines (5px threshold)
            return a.x1 - b.x1 // Same line, sort left to right
          })

          const merged: typeof rects = []
          let current = sorted[0]

          for (let i = 1; i < sorted.length; i++) {
            const next = sorted[i]

            // Check if on the same line (similar y coordinates)
            const onSameLine = Math.abs(current.y1 - next.y1) < 5 && Math.abs(current.y2 - next.y2) < 5

            // Check if overlapping or adjacent on same line
            const overlapping = onSameLine && next.x1 <= current.x2 + 2 // 2px tolerance for adjacent

            if (overlapping) {
              // Merge: extend current rect to include next
              // Keep current.x1 (don't use Math.min) to preserve reading-order start position
              current = {
                x1: current.x1, // Keep the leftmost x1 from reading order (already sorted)
                y1: Math.min(current.y1, next.y1),
                x2: Math.max(current.x2, next.x2),
                y2: Math.max(current.y2, next.y2),
                width: current.width,
                height: current.height,
                pageNumber: current.pageNumber,
              }
            } else {
              // Start a new rect
              merged.push(current)
              current = next
            }
          }

          merged.push(current)
          return merged
        }

        // Capture the selection rects IMMEDIATELY while selection still exists
        // (before any click handlers or state changes clear the selection)
        console.log('[PDF-VIEWER] renderHighlightTarget - pageIndex:', pageIndex, 'selectionRegion:', selectionRegion, '- VERSION 2024-12-02-v2')
        const resolvedPageIndexEarly =
          typeof pageIndex === "number"
            ? pageIndex
            : typeof selectionRegion?.pageIndex === "number"
              ? selectionRegion.pageIndex
              : typeof selectionRegion?.pageNumber === "number"
                ? selectionRegion.pageNumber - 1
                : 0
        const pageNumberForRectEarly = resolvedPageIndexEarly + 1
        console.log('[PDF-VIEWER] Resolved page - pageIndex:', resolvedPageIndexEarly, 'pageNumber:', pageNumberForRectEarly, '- VERSION 2024-12-02-v2')

        let pageElementEarly = document.querySelector(`[data-page-number="${pageNumberForRectEarly}"]`) as HTMLElement
        if (!pageElementEarly) {
          pageElementEarly = document.querySelector(`[data-page-index="${resolvedPageIndexEarly}"]`) as HTMLElement
        }
        if (!pageElementEarly) {
          const allPages = document.querySelectorAll('.rpv-core__page-layer')
          pageElementEarly = allPages[resolvedPageIndexEarly] as HTMLElement
        }

        if (pageElementEarly) {
          const selection = window.getSelection()
          if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0)
            const clientRects = range.getClientRects()
            console.log('[PDF-VIEWER] Captured selection - clientRects count:', clientRects.length, '- VERSION 2024-12-02-v2')

            if (clientRects.length > 0) {
              const pageRect = pageElementEarly.getBoundingClientRect()
              const pageWidth = pageElementEarly.offsetWidth
              const pageHeight = pageElementEarly.offsetHeight

              const rects = Array.from(clientRects)
                .map(rect => ({
                  x1: rect.left - pageRect.left,
                  y1: rect.top - pageRect.top,
                  x2: rect.right - pageRect.left,
                  y2: rect.bottom - pageRect.top,
                  width: pageWidth,
                  height: pageHeight,
                  pageNumber: pageNumberForRectEarly,
                }))
                .filter(rect => {
                  // Filter out invalid rects with zero or negative width/height
                  const rectWidth = rect.x2 - rect.x1
                  const rectHeight = rect.y2 - rect.y1
                  return rectWidth > 1 && rectHeight > 1
                })

              // Merge overlapping rects on the same line to avoid double-highlighting
              const mergedRects = mergeOverlappingRects(rects)

              capturedRectsRef.current = mergedRects

              // Update draft overlay with all areas (use setTimeout to avoid setState during render)
              const draftAreas: HighlightArea[] = mergedRects.map(rect => ({
                pageIndex: resolvedPageIndexEarly,
                left: (rect.x1 / pageWidth) * 100,
                top: (rect.y1 / pageHeight) * 100,
                width: ((rect.x2 - rect.x1) / pageWidth) * 100,
                height: ((rect.y2 - rect.y1) / pageHeight) * 100,
              }))

              setTimeout(() => {
                setDraftOverlay({
                  pageIndex: resolvedPageIndexEarly,
                  areas: draftAreas,
                })
              }, 0)
            }
          }
        }

      const handleInlineSave = async () => {
        if (!inlineAnnotationText.trim() || inlineSaving) return

        // Safety check for extremely large selections
        const textLength = selectedText?.length || 0
        if (textLength > 50000) {
          alert("Selection is too large. Please select a smaller area (max 50,000 characters).")
          return
        }

        // Get selection coordinates as percentages (0-100)
        const leftPercent = selectionRegion.left
        const topPercent = selectionRegion.top
        const widthPercent = selectionRegion.width
        const heightPercent = selectionRegion.height

        console.log('[PDF-VIEWER] handleInlineSave - pageIndex:', pageIndex, 'selectionRegion:', selectionRegion, '- VERSION 2024-12-02-v2')
          const resolvedPageIndex =
            typeof pageIndex === "number"
              ? pageIndex
              : typeof selectionRegion?.pageIndex === "number"
                ? selectionRegion.pageIndex
                : typeof selectionRegion?.pageNumber === "number"
                  ? selectionRegion.pageNumber - 1
                  : 0
          const pageNumberForRect = resolvedPageIndex + 1
          console.log('[PDF-VIEWER] handleInlineSave resolved - pageIndex:', resolvedPageIndex, 'pageNumber:', pageNumberForRect, '- VERSION 2024-12-02-v3')

          // Get the page element to find actual dimensions
          // Try multiple selectors since RPV might use different attributes
          let pageElement = document.querySelector(`[data-page-number="${pageNumberForRect}"]`) as HTMLElement
          if (!pageElement) {
            pageElement = document.querySelector(`[data-page-index="${resolvedPageIndex}"]`) as HTMLElement
          }
          if (!pageElement) {
            // Try finding by the page layer class
            const allPages = document.querySelectorAll('.rpv-core__page-layer')
            pageElement = allPages[resolvedPageIndex] as HTMLElement
          }


          let pageWidth = 816  // Default fallback
          let pageHeight = 1056 // Default fallback

          if (pageElement) {
            pageWidth = pageElement.offsetWidth
            pageHeight = pageElement.offsetHeight
          }

          // Extract individual line rectangles from DOM selection for multi-line support
          const getMultiLineRects = (): Array<{
            x1: number
            y1: number
            x2: number
            y2: number
            width: number
            height: number
            pageNumber: number
          }> => {
            // First, check if we have cached rects from the initial selection capture
            if (capturedRectsRef.current && capturedRectsRef.current.length > 0) {
              console.log('[PDF-VIEWER] Using cached rects:', capturedRectsRef.current.length, '- VERSION 2024-12-02-v2')
              return capturedRectsRef.current
            }

            const selection = window.getSelection()
            if (!selection || selection.rangeCount === 0 || !pageElement) {
              // Fallback to single bounding rect from selectionRegion
              const x1Pixels = (leftPercent / 100) * pageWidth
              const y1Pixels = (topPercent / 100) * pageHeight
              const x2Pixels = ((leftPercent + widthPercent) / 100) * pageWidth
              const y2Pixels = ((topPercent + heightPercent) / 100) * pageHeight

              return [{
                x1: x1Pixels,
                y1: y1Pixels,
                x2: x2Pixels,
                y2: y2Pixels,
                width: pageWidth,
                height: pageHeight,
                pageNumber: pageNumberForRect,
              }]
            }

            const range = selection.getRangeAt(0)
            const clientRects = range.getClientRects()

            if (clientRects.length === 0) {
              // Fallback to single bounding rect
              const x1Pixels = (leftPercent / 100) * pageWidth
              const y1Pixels = (topPercent / 100) * pageHeight
              const x2Pixels = ((leftPercent + widthPercent) / 100) * pageWidth
              const y2Pixels = ((topPercent + heightPercent) / 100) * pageHeight

              return [{
                x1: x1Pixels,
                y1: y1Pixels,
                x2: x2Pixels,
                y2: y2Pixels,
                width: pageWidth,
                height: pageHeight,
                pageNumber: pageNumberForRect,
              }]
            }

            const pageRect = pageElement.getBoundingClientRect()

            // Convert each client rect to our coordinate system (pixels relative to page)
            return Array.from(clientRects)
              .map(rect => {
                const x1 = rect.left - pageRect.left
                const y1 = rect.top - pageRect.top
                const x2 = rect.right - pageRect.left
                const y2 = rect.bottom - pageRect.top

                return {
                  x1,
                  y1,
                  x2,
                  y2,
                  width: pageWidth,
                  height: pageHeight,
                  pageNumber: pageNumberForRect,
                }
              })
              .filter(rect => {
                // Filter out invalid rects with zero or negative width/height
                const rectWidth = rect.x2 - rect.x1
                const rectHeight = rect.y2 - rect.y1
                return rectWidth > 1 && rectHeight > 1
              })
          }

          const multiLineRects = getMultiLineRects()
          console.log('[PDF-VIEWER] getMultiLineRects returned:', multiLineRects.length, 'rects - VERSION 2024-12-02-v2')

          // Find the top-left rect for reading order (important for sorting)
          // Sort by vertical position first, then horizontal position
          const sortedForReading = [...multiLineRects].sort((a, b) => {
            const yDiff = a.y1 - b.y1
            if (Math.abs(yDiff) > 5) return yDiff // Different lines
            return a.x1 - b.x1 // Same line, sort left to right
          })

          const boundingRect = sortedForReading[0] // Use top-left rect as primary bounding rect

        const position: any = {
            boundingRect,
            rects: multiLineRects, // All rects for multi-line highlighting
            pageNumber: boundingRect.pageNumber,
            usePdfCoordinates: false,
          }

        console.log('[PDF-VIEWER] Saving highlight with position:', JSON.stringify({
          rectCount: multiLineRects.length,
          boundingRect,
          firstRect: multiLineRects[0],
          lastRect: multiLineRects[multiLineRects.length - 1]
        }, null, 2), '- VERSION 2024-12-02-v2')

        const newHighlight: NewHighlight = {
          content: { text: selectedText || inlineAnnotationText },
          position,
          type: "text",
          comment: { text: inlineAnnotationText.trim(), emoji: "" },
        }

        const sectionToSave = sectionNumber || guessedSection || ""

        const withTimeout = async <T,>(promise: Promise<T>, ms = 45000) =>
          Promise.race<T>([
            promise,
            new Promise((_, reject) =>
              setTimeout(
                () => reject(new Error("Save request timed out")),
                ms
              )
            ) as Promise<T>,
          ])

          try {
            setInlineSaving(true)
            await withTimeout(
              Promise.resolve(
                onAddHighlight(
                  newHighlight,
                  inlineAnnotationText.trim(),
                  inlineAnnotationType,
                  "proposed",
                  sectionToSave
                )
              )
            )

            cancelSelection()
        } catch (error) {
          console.error("Error saving inline annotation:", error)
          alert("Saving the annotation took too long. Please try again.")
        } finally {
          setInlineSaving(false)
        }
      }

        const resolvedPageIndex =
          typeof pageIndex === "number"
            ? pageIndex
            : typeof selectionRegion?.pageIndex === "number"
              ? selectionRegion.pageIndex
              : typeof selectionRegion?.pageNumber === "number"
                ? selectionRegion.pageNumber - 1
                : 0
        const pageNumber = resolvedPageIndex + 1

        const selectionMidY =
          typeof selectionRegion.top === "number" &&
          typeof selectionRegion.height === "number"
            ? (selectionRegion.top + selectionRegion.height / 2) / 100
            : undefined
        const guessedSection =
          pdfBookmarksRef.current.length > 0
            ? guessNearestBookmark(pageNumber, selectionMidY)
            : ""
        const effectiveSectionLabel =
          sectionNumber || guessedSection || "Section (optional)"
        const bookmarkOptions = getBookmarkOptions(pageNumber)

        // Draft overlay is now set earlier with captured multi-line rects


        // Determine if popup should appear below (when selection is near top)
        const shouldShowBelow = selectionRegion.top < 25 // If selection is in top 25% of viewport

        return (
          <div
            style={{
              position: "absolute",
              left: `${selectionRegion.left + selectionRegion.width / 2}%`,
              top: shouldShowBelow
                ? `${selectionRegion.top + selectionRegion.height}%`
                : `${selectionRegion.top}%`,
              transform: shouldShowBelow
                ? "translate(-50%, 10%)"
                : "translate(-50%, -110%)",
              zIndex: 10,
            }}
          >
            <div
              ref={popupRef}
              className="bg-card border border-border rounded-lg shadow-2xl p-3 w-[368px]"
            >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 w-full">
                <Badge
                  variant="outline"
                  className="text-xs cursor-default"
                >
                  Page {pageNumber}
                </Badge>
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
                        {effectiveSectionLabel}
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
                    placeholder={
                      guessedSection || "Type section label..."
                    }
                    value={sectionNumber}
                    onChange={(e) => setSectionNumber(e.target.value)}
                    className="h-8 text-sm"
                    autoFocus
                  />
                    </div>
                    <div className="max-h-48 overflow-y-auto py-1">
                      {bookmarkOptions.length === 0 ? (
                        <p className="px-3 py-2 text-sm text-muted-foreground">
                          No bookmarks available
                        </p>
                      ) : (
                        bookmarkOptions.map((bookmark, index) => (
                          <button
                            key={`${bookmark.title}-${index}`}
                            type="button"
                            className={`w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors ${
                              bookmark.title === sectionNumber
                                ? "bg-accent font-medium"
                                : ""
                            } ${bookmark.isPrevious ? "border-b border-border" : ""}`}
                            onClick={() => setSectionNumber(bookmark.title)}
                          >
                            <span className="truncate block">
                              {bookmark.title}
                            </span>
                            {bookmark.isPrevious && (
                              <span className="text-xs text-muted-foreground block">
                                p. {bookmark.pageNumber} (previous page)
                              </span>
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <ButtonGroup className="w-full mb-2">
              <Button
                size="sm"
                variant={inlineAnnotationType === "comment" ? "default" : "outline"}
                className="flex-1 text-xs"
                onClick={() => setInlineAnnotationType("comment")}
              >
                <MessageCircle className="w-3 h-3 mr-1" />
                Comment
              </Button>
              <Button
                size="sm"
                variant={inlineAnnotationType === "edit" ? "default" : "outline"}
                className="flex-1 text-xs"
                onClick={() => setInlineAnnotationType("edit")}
              >
                <Pencil className="w-3 h-3 mr-1" />
                Edit
              </Button>
              <Button
                size="sm"
                variant={
                  inlineAnnotationType === "discussion" ? "default" : "outline"
                }
                className="flex-1 text-xs"
                onClick={() => setInlineAnnotationType("discussion")}
              >
                <UsersRound className="w-3 h-3 mr-1" />
                Discussion
              </Button>
            </ButtonGroup>

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
                if (e.key === "Escape") {
                  cancelSelection()
                } else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault()
                  handleInlineSave()
                }
              }}
            />

            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                className="flex-1 text-xs"
                onClick={cancelSelection}
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
                  "Save"
                )}
              </Button>
            </div>

            <div className="text-[10px] text-muted-foreground mt-1 text-center">
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">Esc</kbd> to cancel • <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">Cmd/Ctrl+Enter</kbd> to save
            </div>
          </div>
        </div>
      )
    },

    renderHighlights: (props) => {
      // Read from ref to get the latest highlights (plugin closure doesn't update)
      const pageHighlights = rpvHighlightsRef.current
        .flatMap((h) =>
          h.areas
            .filter((a) => a.pageIndex === props.pageIndex)
            .map((area, index) => ({ area, h, index }))
        )

      const draftAreas =
        draftOverlay && draftOverlay.pageIndex === props.pageIndex
          ? draftOverlay.areas
          : []

      return (
        <div>
          {pageHighlights.map(({ area, h, index }) => {
            const cssProps = props.getCssProperties(area, props.rotation)
            const isSelected = h.id === selectedHighlightId

            return (
              <div
                key={`${h.id}_${index}`}
                className="pointer-events-auto cursor-pointer"
                style={{
                  ...cssProps,
                  backgroundColor: isSelected
                    ? "rgba(251, 191, 36, 0.7)"
                    : "rgba(250, 204, 21, 0.45)",
                  boxShadow: isSelected
                    ? "0 0 0 1px rgba(251, 146, 60, 1) inset"
                    : "0 0 0 1px rgba(250, 204, 21, 0.6) inset",
                  zIndex: isSelected ? 3 : 1,
                }}
                data-highlight-id={h.id}
                onClick={() => {
                  if (onHighlightClick) {
                    onHighlightClick(h.id)
                  }
                }}
                onMouseEnter={(e) => {
                  // Clear any existing timeout
                  if (hoverTimeoutRef.current) {
                    clearTimeout(hoverTimeoutRef.current)
                  }
                  // Capture the element reference before the timeout
                  const element = e.currentTarget
                  // Show popup after short delay
                  hoverTimeoutRef.current = setTimeout(() => {
                    if (element && element.isConnected) {
                      const rect = element.getBoundingClientRect()
                      setHoveredHighlight({
                        id: h.id,
                        position: { x: rect.left + rect.width / 2, y: rect.top }
                      })
                    }
                  }, 300)
                }}
                onMouseLeave={() => {
                  // Clear timeout if mouse leaves before delay
                  if (hoverTimeoutRef.current) {
                    clearTimeout(hoverTimeoutRef.current)
                    hoverTimeoutRef.current = null
                  }
                  setHoveredHighlight(null)
                }}
              />
            )
          })}
          {draftAreas.map((area, index) => (
            <div
              key={`draft-${index}`}
              className="pointer-events-none"
              style={{
                ...props.getCssProperties(area, props.rotation),
                backgroundColor: "rgba(250, 204, 21, 0.45)",
                boxShadow: "0 0 0 1px rgba(250, 204, 21, 0.8) inset",
                zIndex: 2,
              }}
            />
          ))}
        </div>
      )
    },
  })

  const { jumpToHighlightArea } = highlight

  const { Search } = search

  const plugins: Plugin[] = [toolbar, search, highlight, rotate, selectionMode, bookmark, thumbnail]

  // Custom toolbar render function
  const renderToolbar = (Toolbar: (props: any) => React.ReactElement) => (
    <Toolbar>
      {(props: any) => {
        const {
          CurrentPageInput,
          GoToFirstPage,
          GoToLastPage,
          GoToNextPage,
          GoToPreviousPage,
          NumberOfPages,
          ZoomIn,
          ZoomOut,
          Zoom,
        } = props

        return (
          <div className="flex items-center w-full px-3 py-2 bg-card border-b border-border">
            {/* Left section - Sidebar toggles */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setSidebarView(sidebarView === 'bookmarks' ? null : 'bookmarks')}
              >
                <Bookmark className="h-4 w-4" />
                <span className="sr-only">Toggle Bookmarks</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setSidebarView(sidebarView === 'thumbnails' ? null : 'thumbnails')}
              >
                <LayoutGrid className="h-4 w-4" />
                <span className="sr-only">Toggle Thumbnails</span>
              </Button>
            </div>

            {/* Center section - Page navigation and Zoom controls */}
            <div className="flex items-center gap-1 flex-1 justify-center">
              <GoToPreviousPage>
                {(props: any) => (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={props.onClick}
                    disabled={props.isDisabled}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronUp className="h-4 w-4" />
                    <span className="sr-only">Previous page</span>
                  </Button>
                )}
              </GoToPreviousPage>
              <div className="flex items-center gap-2 px-2">
                <div className="w-16">
                  <CurrentPageInput>
                    {(props: any) => (
                      <Input
                        type="text"
                        value={props.currentPage}
                        onChange={(e) => {
                          const pageNumber = parseInt(e.target.value, 10)
                          if (!isNaN(pageNumber)) {
                            props.onChange(pageNumber)
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const pageNumber = parseInt(e.currentTarget.value, 10)
                            if (!isNaN(pageNumber)) {
                              props.onChange(pageNumber)
                            }
                          }
                        }}
                        className="text-center h-8 text-sm"
                      />
                    )}
                  </CurrentPageInput>
                </div>
                <span className="text-sm text-muted-foreground">/</span>
                <span className="text-sm font-medium">
                  <NumberOfPages />
                </span>
              </div>
              <GoToNextPage>
                {(props: any) => (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={props.onClick}
                    disabled={props.isDisabled}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronDown className="h-4 w-4" />
                    <span className="sr-only">Next page</span>
                  </Button>
                )}
              </GoToNextPage>

              <Separator orientation="vertical" className="h-6 mx-2 bg-border" />

              <ZoomOut>
                {(props: any) => (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={props.onClick}
                    className="h-8 w-8 p-0"
                  >
                    <Minus className="h-4 w-4" />
                    <span className="sr-only">Zoom out</span>
                  </Button>
                )}
              </ZoomOut>
              <Zoom>
                {(props: any) => {
                  const [open, setOpen] = React.useState(false)

                  const handleZoom = (level: number | SpecialZoomLevel) => {
                    props.onZoom(level)
                    setOpen(false)
                  }

                  return (
                    <Popover open={open} onOpenChange={setOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 min-w-16 px-2 font-normal"
                        >
                          <span className="text-sm">{Math.round(props.scale * 100)}%</span>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-40 p-2" align="center">
                        <div className="space-y-1">
                          {/* Special zoom levels */}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start h-8 px-2 text-sm font-normal"
                            onClick={() => handleZoom(SpecialZoomLevel.ActualSize)}
                          >
                            Actual size
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start h-8 px-2 text-sm font-normal"
                            onClick={() => handleZoom(SpecialZoomLevel.PageFit)}
                          >
                            Page fit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start h-8 px-2 text-sm font-normal"
                            onClick={() => handleZoom(SpecialZoomLevel.PageWidth)}
                          >
                            Page width
                          </Button>

                          {/* Separator */}
                          <div className="h-px bg-border my-1" />

                          {/* Percentage zoom levels */}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start h-8 px-2 text-sm font-normal"
                            onClick={() => handleZoom(0.5)}
                          >
                            50%
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start h-8 px-2 text-sm font-normal"
                            onClick={() => handleZoom(0.75)}
                          >
                            75%
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start h-8 px-2 text-sm font-normal"
                            onClick={() => handleZoom(1)}
                          >
                            100%
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start h-8 px-2 text-sm font-normal"
                            onClick={() => handleZoom(1.25)}
                          >
                            125%
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start h-8 px-2 text-sm font-normal"
                            onClick={() => handleZoom(1.5)}
                          >
                            150%
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start h-8 px-2 text-sm font-normal"
                            onClick={() => handleZoom(2)}
                          >
                            200%
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  )
                }}
              </Zoom>
              <ZoomIn>
                {(props: any) => (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={props.onClick}
                    className="h-8 w-8 p-0"
                  >
                    <Plus className="h-4 w-4" />
                    <span className="sr-only">Zoom in</span>
                  </Button>
                )}
              </ZoomIn>
            </div>

            {/* Right section - Search and Kebab menu */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <Search>
                {(renderSearchProps: any) => {
                  const [open, setOpen] = React.useState(false)

                  const handleInputChange = (value: string) => {
                    renderSearchProps.setKeyword(value)
                  }

                  const handleSearch = () => {
                    if (renderSearchProps.keyword.trim()) {
                      renderSearchProps.search()
                    }
                  }

                  const handleClear = () => {
                    renderSearchProps.clearKeyword()
                  }

                  const hasMatches = renderSearchProps.numberOfMatches > 0

                  return (
                    <Popover open={open} onOpenChange={setOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                        >
                          <SearchIcon className="h-4 w-4" />
                          <span className="sr-only">Search</span>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-40 p-3" align="start">
                        <div className="space-y-2">
                          {/* Search input */}
                          <div className="relative">
                            <Input
                              type="text"
                              placeholder="Search..."
                              value={renderSearchProps.keyword}
                              onChange={(e) => handleInputChange(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleSearch()
                                } else if (e.key === 'Escape') {
                                  setOpen(false)
                                }
                              }}
                              className="pr-8"
                              autoFocus
                            />
                            {renderSearchProps.keyword && (
                              <button
                                type="button"
                                onClick={handleClear}
                                className="absolute right-2 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted/70"
                              >
                                <span className="sr-only">Clear search</span>
                                <CircleX className="h-4 w-4" />
                              </button>
                            )}
                          </div>

                          {/* Checkboxes - stacked */}
                          <div className="flex flex-col gap-1.5 text-sm">
                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={renderSearchProps.matchCase}
                                onChange={renderSearchProps.changeMatchCase}
                                className="rounded border-input"
                              />
                              <span>Match case</span>
                            </label>
                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={renderSearchProps.wholeWords}
                                onChange={renderSearchProps.changeWholeWords}
                                className="rounded border-input"
                              />
                              <span>Whole words</span>
                            </label>
                          </div>

                          {/* Match counter and navigation */}
                          {hasMatches && (
                            <div className="flex items-center justify-between text-sm pt-1">
                              <span className="text-muted-foreground">
                                {renderSearchProps.currentMatch}/{renderSearchProps.numberOfMatches}
                              </span>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={renderSearchProps.jumpToPreviousMatch}
                                  className="h-7 w-7 p-0"
                                >
                                  <ChevronUp className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={renderSearchProps.jumpToNextMatch}
                                  className="h-7 w-7 p-0"
                                >
                                  <ChevronDown className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </PopoverContent>
                    </Popover>
                  )
                }}
              </Search>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                  >
                    <MoreVertical className="h-4 w-4" />
                    <span className="sr-only">More options</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <GoToFirstPage>
                    {(props: any) => (
                      <DropdownMenuItem
                        onClick={props.onClick}
                        disabled={props.isDisabled}
                      >
                        <ChevronsUp className="h-4 w-4 mr-2" />
                        First Page
                      </DropdownMenuItem>
                    )}
                  </GoToFirstPage>
                  <GoToLastPage>
                    {(props: any) => (
                      <DropdownMenuItem
                        onClick={props.onClick}
                        disabled={props.isDisabled}
                      >
                        <ChevronsDown className="h-4 w-4 mr-2" />
                        Last Page
                      </DropdownMenuItem>
                    )}
                  </GoToLastPage>

                  <DropdownMenuSeparator />

                  <SwitchSelectionMode mode={SelectionMode.Hand}>
                    {(props: any) => (
                      <DropdownMenuItem onClick={props.onClick}>
                        <Hand className="h-4 w-4 mr-2" />
                        <span className="flex-1">Hand Tool</span>
                        {props.isSelected && <Check className="h-4 w-4 ml-2" />}
                      </DropdownMenuItem>
                    )}
                  </SwitchSelectionMode>
                  <SwitchSelectionMode mode={SelectionMode.Text}>
                    {(props: any) => (
                      <DropdownMenuItem onClick={props.onClick}>
                        <MousePointer2 className="h-4 w-4 mr-2" />
                        <span className="flex-1">Text Selection Tool</span>
                        {props.isSelected && <Check className="h-4 w-4 ml-2" />}
                      </DropdownMenuItem>
                    )}
                  </SwitchSelectionMode>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    onClick={() => setSidebarView(sidebarView === 'bookmarks' ? null : 'bookmarks')}
                  >
                    <Bookmark className="h-4 w-4 mr-2" />
                    <span className="flex-1">Show Bookmarks</span>
                    {sidebarView === 'bookmarks' && <Check className="h-4 w-4 ml-2" />}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setSidebarView(sidebarView === 'thumbnails' ? null : 'thumbnails')}
                  >
                    <LayoutGrid className="h-4 w-4 mr-2" />
                    <span className="flex-1">Show Thumbnails</span>
                    {sidebarView === 'thumbnails' && <Check className="h-4 w-4 ml-2" />}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        )
      }}
    </Toolbar>
  )

  const lastScrolledIdRef = React.useRef<string | null>(null)

  React.useEffect(() => {
    if (!scrollToHighlightId) {
      lastScrolledIdRef.current = null
      return
    }
    if (scrollToHighlightId === lastScrolledIdRef.current) return

    const target = rpvHighlights.find((h) => h.id === scrollToHighlightId)
    if (!target || !target.areas.length) {
      return
    }

    // Reusable function to attempt DOM-based scroll (like old implementation)
    const attemptDomScroll = (): boolean => {
      const highlightElement = document.querySelector(`[data-highlight-id="${scrollToHighlightId}"]`)
      const pdfContainer = document.querySelector('.rpv-core__inner-pages')

      if (highlightElement && pdfContainer) {
        // Element found! Calculate scroll position with 150px context
        const rect = highlightElement.getBoundingClientRect()
        const containerRect = pdfContainer.getBoundingClientRect()
        const relativeTop = rect.top - containerRect.top

        // Scroll to element with 150px context above it
        const targetScroll = pdfContainer.scrollTop + relativeTop - 150

        pdfContainer.scrollTo({
          top: Math.max(0, targetScroll),
          behavior: 'smooth'
        })

        lastScrolledIdRef.current = scrollToHighlightId
        return true // Success
      }

      return false // Element not found
    }

    // Strategy 1: Try DOM-first (works instantly if page already rendered)
    if (attemptDomScroll()) {
      return
    }

    // Strategy 2: Use library function + fast consistent polling (for unrendered pages)
    if (jumpToHighlightArea) {
      try {
        // Jump to the area (triggers page rendering)
        jumpToHighlightArea(target.areas[0])

        // Poll for DOM element with consistent fast interval
        let attempts = 0
        const maxAttempts = 20 // 20 × 50ms = 1 second total
        const pollInterval = 50 // Consistent 50ms intervals

        const checkAndScroll = () => {
          attempts++

          // Try DOM scroll
          if (attemptDomScroll()) {
            return // Success!
          }

          // Keep trying if not found yet
          if (attempts < maxAttempts) {
            setTimeout(checkAndScroll, pollInterval)
          }
        }

        // Start polling immediately (no initial delay)
        checkAndScroll()
      } catch (error) {
        console.error("[RPV] Error jumping to highlight:", error)
      }
    }
  }, [scrollToHighlightId, rpvHighlights, jumpToHighlightArea])

  return (
    <div className="h-full w-full flex flex-col bg-zinc-300 overflow-hidden">
      <div className="flex-1 relative overflow-hidden min-h-0">
        <div className="flex flex-col h-full">
          <div className="flex-shrink-0">
            {renderToolbar(toolbar.Toolbar)}
          </div>
          <div className="flex-1 overflow-hidden flex">
            {/* Sidebar */}
            {sidebarView && (
              <div className="w-64 border-r bg-background overflow-auto flex-shrink-0">
                {sidebarView === 'bookmarks' && (
                  <div className="text-xs leading-tight p-2">
                    <Bookmarks />
                  </div>
                )}
                {sidebarView === 'thumbnails' && (
                  <div className="p-4">
                    <Thumbnails />
                  </div>
                )}
              </div>
            )}
            {/* PDF Viewer */}
            <div className="flex-1 overflow-hidden">
              <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
                <Viewer fileUrl={pdfUrl} plugins={plugins} onDocumentLoad={handleDocumentLoad} />
              </Worker>
            </div>
          </div>
        </div>

        {/* Hover Popup */}
        {hoveredHighlight && (() => {
          const highlight = rpvHighlights.find(h => h.id === hoveredHighlight.id)
          if (!highlight || !highlight.raw.comment?.text?.trim()) return null

          const commentType = (highlight.raw.comment as any)?.comment_type || "comment"
          const commentStatus = (highlight.raw.comment as any)?.comment_status || "proposed"
          const TypeIcon = getTypeIcon(commentType)
          const statusColors = getStatusColor(commentStatus)
          const formattedId = (highlight.raw.comment as any)?.annotation_id ||
            formatAnnotationId({
              id: highlight.id || "",
              annotation_id: (highlight.raw.comment as any)?.annotation_id,
            } as any)

          return (
            <div
              className="fixed z-[9999] pointer-events-none"
              style={{
                left: hoveredHighlight.position.x,
                top: hoveredHighlight.position.y - 10,
                transform: 'translate(-50%, -100%)',
              }}
            >
              <div
                className="bg-card border border-border rounded-lg p-3 shadow-xl text-sm max-w-sm pointer-events-auto cursor-pointer"
                onClick={() => onHighlightClick?.(highlight.id)}
                onMouseEnter={() => {
                  // Keep popup open when hovering over it
                  if (hoverTimeoutRef.current) {
                    clearTimeout(hoverTimeoutRef.current)
                    hoverTimeoutRef.current = null
                  }
                }}
                onMouseLeave={() => {
                  setHoveredHighlight(null)
                }}
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
                  {highlight.raw.comment?.text}
                </div>

                {/* Separator */}
                <div className="border-t border-border my-2"></div>

                {/* User info - right aligned */}
                <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
                  <CircleUserRound className="w-3.5 h-3.5" />
                  <span>{(highlight.raw.comment as any)?.user_name || 'Unknown User'}</span>
                </div>
              </div>
            </div>
          )
        })()}
      </div>

      {/* Custom styles for search highlights */}
      <style jsx global>{`
        .rpv-search__highlight {
          background-color: rgba(134, 239, 172, 0.4) !important;
          /* Light green - green-300 with opacity */
        }

        .rpv-search__highlight--current {
          background-color: rgba(34, 197, 94, 0.6) !important;
          /* Darker green - green-500 with opacity */
        }
      `}</style>
    </div>
  )
}
