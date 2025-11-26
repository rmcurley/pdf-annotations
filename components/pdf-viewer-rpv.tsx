"use client"

/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useCallback, useMemo, useState } from "react"

import { Worker, Viewer, type Plugin } from "@react-pdf-viewer/core"
import { highlightPlugin, Trigger } from "@react-pdf-viewer/highlight"
import { searchPlugin } from "@react-pdf-viewer/search"
import { toolbarPlugin } from "@react-pdf-viewer/toolbar"

import "@react-pdf-viewer/core/lib/styles/index.css"
import "@react-pdf-viewer/highlight/lib/styles/index.css"
import "@react-pdf-viewer/search/lib/styles/index.css"
import "@react-pdf-viewer/toolbar/lib/styles/index.css"

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
import {
  MessageCircle,
  Pencil,
  UsersRound,
  Ban,
  Loader2,
} from "lucide-react"

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

function toAreasFromHighlight(highlight: IHighlight): HighlightArea[] {
  const position = highlight.position as any
  if (!position) {
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

      // Log first rect to debug
      if (index === 0 && highlight.id) {
        console.log("[RPV] Converting pixel coords to percentages", {
          highlightId: highlight.id,
          pixels: { x1, y1, x2, y2 },
          pageDimensions: { pageWidth, pageHeight },
          percentages: { left, top, width, height },
        })
      }
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
    area: HighlightArea
  } | null>(null)
  const pdfBookmarksRef = React.useRef<BookmarkEntry[]>([])
  const [bookmarks, setBookmarks] = useState<BookmarkEntry[]>([])
  const popupRef = React.useRef<HTMLDivElement | null>(null)
  const cancelRef = React.useRef<(() => void) | null>(null)
  const overlayRafRef = React.useRef<number | null>(null)

  const resetInlineState = React.useCallback(() => {
    setInlineAnnotationText("")
    setInlineAnnotationType("comment")
    setSectionNumber("")
    setDraftOverlay(null)
    cancelRef.current = null
  }, [])

  const updateDraftOverlay = React.useCallback(
    (nextOverlay: { pageIndex: number; area: HighlightArea }) => {
      setDraftOverlay((previous) => {
        if (
          previous &&
          previous.pageIndex === nextOverlay.pageIndex &&
          Math.abs(previous.area.left - nextOverlay.area.left) < 0.0001 &&
          Math.abs(previous.area.top - nextOverlay.area.top) < 0.0001 &&
          Math.abs(previous.area.width - nextOverlay.area.width) < 0.0001 &&
          Math.abs(previous.area.height - nextOverlay.area.height) < 0.0001
        ) {
          return previous
        }

        return nextOverlay
      })
    },
    []
  )

  const scheduleDraftOverlayUpdate = React.useCallback(
    (nextOverlay: { pageIndex: number; area: HighlightArea }) => {
      if (typeof window === "undefined") {
        updateDraftOverlay(nextOverlay)
        return
      }

      if (overlayRafRef.current !== null) {
        cancelAnimationFrame(overlayRafRef.current)
      }

      overlayRafRef.current = window.requestAnimationFrame(() => {
        overlayRafRef.current = null
        updateDraftOverlay(nextOverlay)
      })
    },
    [updateDraftOverlay]
  )

  React.useEffect(() => {
    return () => {
      if (overlayRafRef.current !== null) {
        cancelAnimationFrame(overlayRafRef.current)
      }
    }
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
    () =>
      (highlights || [])
        .map((h) => ({
          id: h.id || "",
          areas: toAreasFromHighlight(h),
          raw: h,
        }))
        .filter((h) => h.id && h.areas.length > 0),
    [highlights]
  )

  // Store rpvHighlights in a ref so the plugin's renderHighlights can always read the latest value
  const rpvHighlightsRef = React.useRef<RpvHighlight[]>(rpvHighlights)

  React.useEffect(() => {
    rpvHighlightsRef.current = rpvHighlights
  }, [rpvHighlights])

  const toolbar = toolbarPlugin()
  const search = searchPlugin()

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

          const resolvedPageIndex =
            typeof pageIndex === "number"
              ? pageIndex
              : typeof selectionRegion?.pageIndex === "number"
                ? selectionRegion.pageIndex
                : typeof selectionRegion?.pageNumber === "number"
                  ? selectionRegion.pageNumber - 1
                  : 0
          const pageNumberForRect = resolvedPageIndex + 1

          // Get the page element to find actual dimensions
          const pageElement = document.querySelector(`[data-page-number="${pageNumberForRect}"]`) as HTMLElement
          let pageWidth = 816  // Default fallback
          let pageHeight = 1056 // Default fallback

          if (pageElement) {
            pageWidth = pageElement.offsetWidth
            pageHeight = pageElement.offsetHeight
          }

          // Convert percentages to pixels (same format as old library)
          const x1Pixels = (leftPercent / 100) * pageWidth
          const y1Pixels = (topPercent / 100) * pageHeight
          const x2Pixels = ((leftPercent + widthPercent) / 100) * pageWidth
          const y2Pixels = ((topPercent + heightPercent) / 100) * pageHeight

          const boundingRect = {
            x1: x1Pixels,
            y1: y1Pixels,
            x2: x2Pixels,
            y2: y2Pixels,
            width: pageWidth,
            height: pageHeight,
            pageNumber: pageNumberForRect,
          }

        const position: any = {
            boundingRect,
            rects: [boundingRect],
            pageNumber: boundingRect.pageNumber,
            usePdfCoordinates: false,
          }

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

        if (
          typeof selectionRegion.left === "number" &&
          typeof selectionRegion.top === "number" &&
          typeof selectionRegion.width === "number" &&
          typeof selectionRegion.height === "number"
        ) {
          const nextOverlay = {
            pageIndex: resolvedPageIndex,
            area: {
              pageIndex: resolvedPageIndex,
              left: selectionRegion.left,
              top: selectionRegion.top,
              width: selectionRegion.width,
              height: selectionRegion.height,
            },
          }

          scheduleDraftOverlayUpdate(nextOverlay)
        }


        return (
          <div
            style={{
              position: "absolute",
              left: `${selectionRegion.left + selectionRegion.width / 2}%`,
            top: `${selectionRegion.top}%`,
            transform: "translate(-50%, -110%)",
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
          ? [draftOverlay.area]
          : []

      // Only log first page with highlights
      if (props.pageIndex === 0 && pageHighlights.length > 0) {
        const firstArea = pageHighlights[0]
        const cssProps = props.getCssProperties(firstArea.area, props.rotation)
        console.log("[RPV] renderHighlights (page 0 only)", {
          area: firstArea.area,
          cssProps,
          highlightId: firstArea.h.id,
        })
      }

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

  const { Toolbar } = toolbar
  const { jumpToHighlightArea } = highlight

  const plugins: Plugin[] = [toolbar, search, highlight]

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
            <Toolbar />
          </div>
          <div className="flex-1 overflow-hidden">
            <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
              <Viewer fileUrl={pdfUrl} plugins={plugins} onDocumentLoad={handleDocumentLoad} />
            </Worker>
          </div>
        </div>
      </div>
    </div>
  )
}
