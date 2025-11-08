'use client'

import React, { useState, useRef, useCallback } from 'react'

interface ResizablePanelProps {
  leftPanel: React.ReactNode
  rightPanel: React.ReactNode
  defaultLeftWidth?: number
  minLeftWidth?: number
  maxLeftWidth?: number
}

export function ResizablePanel({
  leftPanel,
  rightPanel,
  defaultLeftWidth = 40,
  minLeftWidth = 20,
  maxLeftWidth = 70
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
    <div ref={containerRef} className="flex h-full w-full overflow-hidden">
      {/* Left Panel */}
      <div
        className="overflow-auto"
        style={{ width: `${leftWidth}%` }}
      >
        {leftPanel}
      </div>

      {/* Resizer */}
      <div
        className="relative w-1 bg-border hover:bg-primary/50 cursor-col-resize transition-colors flex-shrink-0"
        onMouseDown={handleMouseDown}
      >
        <div className="absolute inset-y-0 -left-1 -right-1" />
      </div>

      {/* Right Panel */}
      <div
        className="overflow-auto flex-1"
        style={{ width: `${100 - leftWidth}%` }}
      >
        {rightPanel}
      </div>
    </div>
  )
}
