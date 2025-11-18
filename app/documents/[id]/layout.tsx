'use client'

import { useEffect } from 'react'

export default function DocumentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('pdfjs-dist/legacy/build/pdf').then((pdfjs) => {
        pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`
      })
    }
  }, [])

  return <>{children}</>
}
