'use client'

import { useEffect } from 'react'

export default function DocumentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  useEffect(() => {
    // Configure PDF.js worker
    if (typeof window !== 'undefined') {
      const pdfjs = require('pdfjs-dist')
      pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`
    }
  }, [])

  return <>{children}</>
}
