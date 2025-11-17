'use client'

import React, { useState, useRef, useCallback } from 'react'

interface ResizablePanelProps {
  leftPanel: React.ReactNode
  rightPanel: React.ReactNode
  defaultLeftWidth?: number
  minLeftWidth?: number
  maxLeftWidth?: number
  hideRightPanel?: boolean
}

export function ResizablePanel({
  leftPanel,
  rightPanel,
  defaultLeftWidth = 40,
  minLeftWidth = 20,
  maxLeftWidth = 70,
  hideRightPanel = false
}: ResizablePanelProps) {
  const [leftWidth, setLeftWidth] = useState(defaultLeftWidth)
  const [isDragging, setIsDragging] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return

    const container = containerRef.current
    const containerRect = container.getBoundingClientRect()
    const newLeftWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100

    if (newLeftWidth >= minLeftWidth && newLeftWidth <= maxLeftWidth) {
      setLeftWidth(newLeftWidth)
    }
  }, [isDragging, minLeftWidth, maxLeftWidth])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    } else {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  return (
    <div ref={containerRef} className="flex h-full w-full overflow-hidden transition-all duration-300 ease-in-out">
      {/* Left Panel */}
      <div
        className="overflow-auto transition-all duration-300 ease-in-out"
        style={{ width: hideRightPanel ? '100%' : `${leftWidth}%` }}
      >
        {leftPanel}
      </div>

      {/* Resizer - only show when right panel is visible */}
      {!hideRightPanel && (
        <div
          className="relative w-1 cursor-col-resize flex-shrink-0 group"
          onMouseDown={handleMouseDown}
        >
          {/* Invisible hit area for easier grabbing */}
          <div className="absolute inset-y-0 -left-2 -right-2" />

          {/* Visible handle */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-1 h-12 bg-border rounded-full group-hover:bg-primary/70 transition-colors flex items-center justify-center">
              <div className="flex flex-col gap-0.5">
                <div className="w-0.5 h-0.5 bg-background rounded-full" />
                <div className="w-0.5 h-0.5 bg-background rounded-full" />
                <div className="w-0.5 h-0.5 bg-background rounded-full" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Right Panel - only show when not hidden */}
      {!hideRightPanel && (
        <div
          className="overflow-auto flex-1 transition-all duration-300 ease-in-out"
          style={{ width: `${100 - leftWidth}%` }}
        >
          {rightPanel}
        </div>
      )}
    </div>
  )
}
