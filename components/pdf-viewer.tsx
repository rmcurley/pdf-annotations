'use client'

import React, { useState } from 'react'
import {
  PdfLoader,
  PdfHighlighter,
  Highlight,
  Popup,
  AreaHighlight,
} from 'react-pdf-highlighter'
import type {
  IHighlight,
  NewHighlight,
  ScaledPosition,
} from 'react-pdf-highlighter'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { MessageSquarePlus, MessageSquare, MessageCircle, Pencil, CircleUserRound, CircleHelp, CircleCheck, CircleX, Minus, Plus, MoveVertical, MoveHorizontal, ChevronUp, ChevronDown, Search, Ban, UnfoldVertical, Save } from 'lucide-react'
import { CommentDrawer } from './comment-drawer'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

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
  const [selectedText, setSelectedText] = useState('')
  const [pageNumber, setPageNumber] = useState(1)
  const [documentPageNumber, setDocumentPageNumber] = useState('')
  const [sectionNumber, setSectionNumber] = useState('')
  const [showAddButton, setShowAddButton] = useState(false)
  const [buttonPosition, setButtonPosition] = useState<{ x: number; y: number } | null>(null)
  const [inlineAnnotationType, setInlineAnnotationType] = useState<'comment' | 'edit'>('comment')
  const [showInlineDetails, setShowInlineDetails] = useState(false)
  const [inlineAnnotationText, setInlineAnnotationText] = useState('')
  const [scale, setScale] = useState(100) // Zoom percentage (50% to 200%)
  const [scaleMode, setScaleMode] = useState<'custom' | 'page-fit' | 'page-width'>('custom')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchMatches, setSearchMatches] = useState<Element[]>([])
  const [currentMatch, setCurrentMatch] = useState<number>(0)
  const scrollToHighlightRef = React.useRef<((highlight: IHighlight) => void) | null>(null)
  const pdfBookmarksRef = React.useRef<any[]>([])
  const pdfDocumentRef = React.useRef<any>(null)
  const totalPagesSetRef = React.useRef<boolean>(false)

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
  const flattenBookmarks = async (bookmarks: any[], pdfDoc: any, result: any[] = []): Promise<any[]> => {
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
            result.push({
              title: bookmark.title,
              pageNumber: pageIndex + 1 // Convert 0-indexed to 1-indexed
            })
          }
        } catch (e) {
          console.warn('Error processing bookmark:', e)
        }
      }
      // Recursively process child bookmarks
      if (bookmark.items && bookmark.items.length > 0) {
        await flattenBookmarks(bookmark.items, pdfDoc, result)
      }
    }
    return result
  }

  // Helper function to find nearest bookmark for a given page
  const findNearestBookmark = (pageNum: number): string => {
    if (pdfBookmarksRef.current.length === 0) return ''

    // Find the last bookmark that is <= the current page
    let nearestBookmark = pdfBookmarksRef.current[0]
    for (const bookmark of pdfBookmarksRef.current) {
      if (bookmark.pageNumber <= pageNum) {
        nearestBookmark = bookmark
      } else {
        break // Bookmarks are sorted, so we can stop here
      }
    }

    return nearestBookmark.title || ''
  }


  const resetHash = () => {
    // Don't reset hash anymore - we want highlights to persist
    // window.location.hash = ''
  }

  // Track current page from scroll position
  const updateCurrentPage = React.useCallback(() => {
    // Find which page is currently in view
    let pages = document.querySelectorAll('[data-page-number]')
    console.log('Looking for pages with [data-page-number]:', pages.length)

    if (pages.length === 0) {
      pages = document.querySelectorAll('.react-pdf__Page')
      console.log('Looking for pages with .react-pdf__Page:', pages.length)
    }
    if (pages.length === 0) {
      pages = document.querySelectorAll('.page')
      console.log('Looking for pages with .page:', pages.length)
    }
    if (pages.length === 0) {
      console.log('No pages found!')
      return
    }

    const container = document.querySelector('.PdfHighlighter')
    if (!container) {
      console.log('No container found!')
      return
    }

    const containerRect = container.getBoundingClientRect()
    const containerMidpoint = containerRect.top + containerRect.height / 2

    // Find the page closest to the center of the viewport
    let closestPage = 1
    let closestDistance = Infinity

    pages.forEach((page, index) => {
      const pageRect = page.getBoundingClientRect()
      const pageMidpoint = pageRect.top + pageRect.height / 2
      const distance = Math.abs(pageMidpoint - containerMidpoint)

      if (distance < closestDistance) {
        closestDistance = distance
        const pageNumber = page.getAttribute('data-page-number')
        if (pageNumber) {
          closestPage = parseInt(pageNumber, 10)
        } else {
          // Fallback to index + 1 if no data attribute
          closestPage = index + 1
        }
      }
    })

    console.log('Setting current page to:', closestPage)
    setCurrentPage(closestPage)
  }, [])

  // Set up IntersectionObserver to track current page
  React.useEffect(() => {
    console.log('Setting up page tracking with IntersectionObserver...')

    const setupPageTracking = () => {
      const pages = document.querySelectorAll('[data-page-number]')
      console.log('Found pages for tracking:', pages.length)

      if (pages.length === 0) {
        return false
      }

      const observerOptions = {
        root: document.querySelector('.PdfHighlighter'),
        rootMargin: '-50% 0px -50% 0px',
        threshold: 0
      }

      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const pageNum = entry.target.getAttribute('data-page-number')
            if (pageNum) {
              const num = parseInt(pageNum, 10)
              console.log('Page in view:', num)
              setCurrentPage(num)
            }
          }
        })
      }, observerOptions)

      pages.forEach(page => observer.observe(page))
      console.log('IntersectionObserver setup complete')

      return () => {
        console.log('Cleaning up IntersectionObserver')
        observer.disconnect()
      }
    }

    // Try multiple times with increasing delays
    const timers: NodeJS.Timeout[] = []
    let cleanup: (() => void) | undefined

    const attempts = [500, 1000, 2000, 3000]
    attempts.forEach(delay => {
      const timer = setTimeout(() => {
        if (!cleanup) {
          console.log(`Attempting to setup page tracking (delay: ${delay}ms)`)
          cleanup = setupPageTracking() || undefined
        }
      }, delay)
      timers.push(timer)
    })

    return () => {
      timers.forEach(timer => clearTimeout(timer))
      if (cleanup) cleanup()
    }
  }, [totalPages])

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

  // Zoom control functions
  const handleZoomIn = () => {
    setScaleMode('custom')
    setScale(prev => {
      const rounded = Math.round(prev / 10) * 10
      return Math.min(200, rounded + 10)
    })
  }

  const handleZoomOut = () => {
    setScaleMode('custom')
    setScale(prev => {
      const rounded = Math.round(prev / 10) * 10
      return Math.max(50, rounded - 10)
    })
  }

  const handleSliderChange = (value: number[]) => {
    setScaleMode('custom')
    setScale(value[0])
  }

  const handlePageFit = () => {
    setScaleMode('page-fit')
  }

  const handlePageWidth = () => {
    setScaleMode('page-width')
  }

  // Get the scale value to pass to PdfHighlighter
  const getScaleValue = () => {
    const value = scaleMode === 'page-fit' ? 'page-fit'
                : scaleMode === 'page-width' ? 'page-width'
                : (scale / 100).toString()
    console.log('Scale value:', value, 'Mode:', scaleMode, 'Scale:', scale)
    return value
  }

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

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value
    setSearchQuery(query)

    // Remove previous highlights
    document.querySelectorAll('.pdf-search-highlight-element').forEach(el => {
      el.classList.remove('pdf-search-highlight-element')
    })
    document.querySelectorAll('.pdf-search-highlight-current-element').forEach(el => {
      el.classList.remove('pdf-search-highlight-current-element')
    })

    if (query.trim()) {
      // Find and highlight matches in the text content
      // Only look at visible text layers (filter out hidden duplicates)
      const textLayers = document.querySelectorAll('.textLayer')
      const matches: Element[] = []
      const seenPositions = new Set<string>()

      textLayers.forEach(layer => {
        // Skip if the layer is hidden or has no dimensions
        const layerRect = layer.getBoundingClientRect()
        if (layerRect.width === 0 || layerRect.height === 0) return

        const textElements = layer.querySelectorAll('span')

        textElements.forEach(el => {
          const text = el.textContent || ''
          if (!text) return

          const lowerText = text.toLowerCase()
          const lowerQuery = query.toLowerCase()

          if (lowerText.includes(lowerQuery)) {
            // Create a unique key based on position and text to avoid duplicates
            const rect = el.getBoundingClientRect()

            // Skip elements with no dimensions (hidden)
            if (rect.width === 0 || rect.height === 0) return

            const positionKey = `${Math.round(rect.top)}-${Math.round(rect.left)}-${text}`

            // Only add if we haven't seen this position before
            if (!seenPositions.has(positionKey)) {
              seenPositions.add(positionKey)
              el.classList.add('pdf-search-highlight-element')
              matches.push(el)
            }
          }
        })
      })

      setSearchMatches(matches)
      if (matches.length > 0) {
        setCurrentMatch(1)
        // Highlight first match differently with thicker underline
        matches[0].classList.add('pdf-search-highlight-current-element')
      } else {
        setCurrentMatch(0)
      }
    } else {
      setSearchMatches([])
      setCurrentMatch(0)
    }
  }

  const handleNextMatch = () => {
    if (currentMatch < searchMatches.length && searchMatches.length > 0) {
      // Remove current highlight (thicker underline)
      searchMatches[currentMatch - 1].classList.remove('pdf-search-highlight-current-element')

      const nextIndex = currentMatch
      setCurrentMatch(nextIndex + 1)

      // Add current highlight to next match (thicker underline)
      searchMatches[nextIndex].classList.add('pdf-search-highlight-current-element')

      // Scroll to match
      searchMatches[nextIndex].scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  const handlePreviousMatch = () => {
    if (currentMatch > 1 && searchMatches.length > 0) {
      // Remove current highlight (thicker underline)
      searchMatches[currentMatch - 1].classList.remove('pdf-search-highlight-current-element')

      const prevIndex = currentMatch - 2
      setCurrentMatch(prevIndex + 1)

      // Add current highlight to previous match (thicker underline)
      searchMatches[prevIndex].classList.add('pdf-search-highlight-current-element')

      // Scroll to match
      searchMatches[prevIndex].scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
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

  const handleAddCommentClick = () => {
    if (selectedHighlight) {
      setDrawerOpen(true)
      setShowAddButton(false)
    }
  }

  const handleInlineSave = () => {
    if (selectedHighlight && inlineAnnotationText.trim()) {
      // Save the annotation directly
      onAddHighlight(
        selectedHighlight,
        inlineAnnotationText.trim(),
        inlineAnnotationType,
        'proposed', // Default status
        sectionNumber,
      )

      // Clear state
      setShowAddButton(false)
      setSelectedHighlight(null)
      setInlineAnnotationText('')
      setShowInlineDetails(false)
      setInlineAnnotationType('comment')
    }
  }

  const handleSelectionComplete = (highlight: NewHighlight) => {
    setSelectedHighlight(highlight)
    setSelectedText(highlight.content.text || '')

    const pdfPageNumber = highlight.position.pageNumber || 1
    setPageNumber(pdfPageNumber)

    // Find nearest bookmark for this page
    const nearestBookmark = findNearestBookmark(pdfPageNumber)
    setSectionNumber(nearestBookmark)
    console.log('Nearest bookmark for page', pdfPageNumber, ':', nearestBookmark)

    // Calculate button position based on selection
    const selection = window.getSelection()
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0)
      const rect = range.getBoundingClientRect()

      // Position button above the selection, centered
      setButtonPosition({
        x: rect.left + rect.width / 2,
        y: rect.top - 10 // 10px above the selection
      })
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
  }

  // Helper functions for popup styling
  const getTypeIcon = (type: string) => {
    return type?.toLowerCase() === 'edit' ? Pencil : MessageSquare
  }

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'proposed':
        return {
          badge: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20',
          icon: 'text-yellow-700',
          bg: 'bg-yellow-500/10'
        }
      case 'accepted':
        return {
          badge: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20',
          icon: 'text-emerald-700',
          bg: 'bg-emerald-500/10'
        }
      case 'rejected':
        return {
          badge: 'bg-red-500/10 text-red-700 border-red-500/20',
          icon: 'text-red-700',
          bg: 'bg-red-500/10'
        }
      default:
        return {
          badge: 'bg-muted text-muted-foreground',
          icon: 'text-muted-foreground',
          bg: 'bg-muted'
        }
    }
  }

  const formatStatus = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()
  }

  const highlightTransform = (
    highlight: IHighlight,
    index: number,
    setTip: (highlight: IHighlight, callback: (highlight: IHighlight) => JSX.Element) => void,
    hideTip: () => void,
    viewportToScaled: (rect: { x: number; y: number }) => { x: number; y: number },
    screenshot: (position: ScaledPosition) => string,
    isScrolledTo: boolean
  ) => {
    // Override isScrolledTo based on our selectedHighlightId
    const isSelected = selectedHighlightId === highlight.id

    // Get comment metadata
    const commentType = (highlight.comment as any)?.type || 'comment'
    const commentStatus = (highlight.comment as any)?.status || 'proposed'
    const TypeIcon = getTypeIcon(commentType)
    const statusColors = getStatusColor(commentStatus)
    const shortId = highlight.id?.substring(0, 5).toUpperCase() || ''

    const component = highlight.comment?.text ? (
      <Highlight
        isScrolledTo={isSelected || isScrolledTo}
        position={highlight.position}
        comment={highlight.comment}
        onClick={() => {
          if (onHighlightClick && highlight.id) {
            onHighlightClick(highlight.id)
          }
        }}
      />
    ) : (
      <AreaHighlight
        isScrolledTo={isSelected || isScrolledTo}
        highlight={highlight}
        onChange={() => {}}
        onClick={() => {
          if (onHighlightClick && highlight.id) {
            onHighlightClick(highlight.id)
          }
        }}
      />
    )

    return (
      <Popup
        popupContent={
          <div
            className="bg-card border border-border rounded-lg p-3 shadow-xl text-sm max-w-sm cursor-pointer"
            onClick={() => {
              if (onHighlightClick && highlight.id) {
                onHighlightClick(highlight.id)
              }
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
                  {shortId}
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
        }
        onMouseOver={(popupContent) => setTip(highlight, () => popupContent)}
        onMouseOut={hideTip}
        key={index}
      >
        <div
          data-highlight-id={highlight.id}
          className={isSelected ? 'custom-highlight-selected' : ''}
        >
          {component}
        </div>
      </Popup>
    )
  }

  return (
    <>
      <div className="h-full w-full flex flex-col bg-zinc-300 overflow-hidden" onClick={handlePdfClick}>
        {/* PDF Viewer - takes remaining space */}
        <div className="flex-1 relative overflow-hidden min-h-0">
          <PdfLoader
            url={pdfUrl}
            beforeLoad={<div className="p-8 text-center">Loading PDF...</div>}
            errorMessage={
              <div className="p-8 text-center text-destructive">
                Failed to load PDF. Please check the URL.
              </div>
            }
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

                // Extract bookmarks asynchronously (doesn't trigger re-render)
                pdfDocument.getOutline().then(async (outline: any) => {
                  if (outline) {
                    const flattened = await flattenBookmarks(outline, pdfDocument)
                    flattened.sort((a, b) => a.pageNumber - b.pageNumber)
                    pdfBookmarksRef.current = flattened
                    console.log('Extracted bookmarks:', flattened)
                  }
                }).catch((error: any) => {
                  console.warn('Error extracting bookmarks:', error)
                })
              }

              return (
                <div className="absolute inset-0">
                  <PdfHighlighter
                  key={`${scaleMode}-${scale}`}
                  pdfDocument={pdfDocument}
                  pdfScaleValue={getScaleValue()}
                  enableAreaSelection={(event) => event.altKey}
                  onScrollChange={resetHash}
                  scrollRef={(scrollTo) => {
                    scrollToHighlightRef.current = scrollTo
                  }}
                onSelectionFinished={(
                  position,
                  content,
                  hideTipAndSelection,
                  transformSelection
                ) => {
                  console.log('Selection finished:', { position, content })

                  const newHighlight: NewHighlight = {
                    content,
                    position,
                    comment: { text: '', emoji: '' },
                  }

                  handleSelectionComplete(newHighlight)
                  hideTipAndSelection()

                  return <div />
                }}
                highlightTransform={highlightTransform}
                highlights={highlights}
              />
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
              transform: 'translate(-50%, calc(-100% - 8px))' // Center horizontally and position above
            }}
          >
            <div className="bg-card border border-border rounded-lg shadow-2xl p-3 w-[320px]">
              {/* Type Selection Icons */}
              <div className="flex gap-2 mb-2">
                <Button
                  size="sm"
                  variant={inlineAnnotationType === 'comment' ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => setInlineAnnotationType('comment')}
                >
                  <MessageCircle className="w-4 h-4 mr-1" />
                  Comment
                </Button>
                <Button
                  size="sm"
                  variant={inlineAnnotationType === 'edit' ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => setInlineAnnotationType('edit')}
                >
                  <Pencil className="w-4 h-4 mr-1" />
                  Edit
                </Button>
              </div>

              {/* Quick Annotation Textarea */}
              <Textarea
                className="inline-annotation-textarea text-sm mb-2 min-h-[80px] focus-visible:ring-0 focus-visible:ring-offset-0"
                placeholder="Write your annotation..."
                value={inlineAnnotationText}
                onChange={(e) => setInlineAnnotationText(e.target.value)}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setShowAddButton(false)
                    setSelectedHighlight(null)
                    setInlineAnnotationText('')
                    setShowInlineDetails(false)
                  } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    // Quick save directly
                    e.preventDefault()
                    handleInlineSave()
                  }
                }}
              />

              {/* Details Section (expandable) */}
              {showInlineDetails && (
                <div className="mb-2 pb-2 border-b space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-muted-foreground">Section</label>
                      <Input
                        className="h-7 text-xs"
                        placeholder="e.g., 3.2.1"
                        value={sectionNumber}
                        onChange={(e) => setSectionNumber(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Page</label>
                      <Input
                        className="h-7 text-xs"
                        placeholder="Page"
                        value={documentPageNumber}
                        onChange={(e) => setDocumentPageNumber(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="flex-1 text-xs"
                  onClick={() => {
                    setShowAddButton(false)
                    setSelectedHighlight(null)
                    setInlineAnnotationText('')
                    setShowInlineDetails(false)
                  }}
                >
                  <Ban className="w-3 h-3 mr-1" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 text-xs"
                  onClick={() => setShowInlineDetails(!showInlineDetails)}
                >
                  <UnfoldVertical className="w-3 h-3 mr-1" />
                  Details
                </Button>
                <Button
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={handleInlineSave}
                  disabled={!inlineAnnotationText.trim()}
                >
                  <Save className="w-3 h-3 mr-1" />
                  Save
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
            <Input
              type="text"
              placeholder="Search in PDF..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="h-7 w-64 text-sm"
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
                    disabled={currentMatch >= searchMatches}
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
        <div className="flex-shrink-0 bg-card border-t border-border px-6 py-2 rounded-b-lg">
          <TooltipProvider delayDuration={300}>
            <div className="flex items-center justify-center gap-3">
              {/* Search Button */}
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

              {/* Divider */}
              <div className="h-6 w-px bg-border"></div>

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

                <span className="text-xs text-muted-foreground min-w-[60px] text-center">
                  {currentPage} / {totalPages}
                </span>

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
              <div className="h-6 w-px bg-border"></div>

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
              <div className="h-6 w-px bg-border"></div>

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
