'use client'

import { saveAs } from 'file-saver'
import { format } from 'date-fns'
import * as XLSX from 'xlsx'

export interface ExportComment {
  id: string
  annotation_id?: string | null
  comment_type: string
  comment_status: string
  highlighted_text: string | null
  comment: string
  section_number?: string | null
  page_number?: number | null
  document_name?: string
  created_at?: string
  users?: {
    first_name: string | null
    last_name: string | null
    email: string
  }
}

// Format helpers
function formatType(type: string): string {
  switch (type.toLowerCase()) {
    case 'comment':
      return 'Comment'
    case 'edit':
      return 'Edit'
    case 'discussion':
      return 'Discussion'
    default:
      return type.charAt(0).toUpperCase() + type.slice(1)
  }
}

function formatStatus(status: string): string {
  switch (status.toLowerCase()) {
    case 'proposed':
      return 'Proposed'
    case 'accepted':
      return 'Accepted'
    case 'rejected':
      return 'Rejected'
    default:
      return status.charAt(0).toUpperCase() + status.slice(1)
  }
}

function formatUserName(user?: { first_name: string | null; last_name: string | null; email: string }): string {
  if (!user) return '-'

  const firstName = user.first_name?.trim()
  const lastName = user.last_name?.trim()

  if (firstName && lastName) {
    return `${firstName} ${lastName}`
  }
  if (firstName) return firstName
  if (lastName) return lastName
  return user.email
}

function formatDate(dateString?: string): string {
  if (!dateString) return '-'
  try {
    return format(new Date(dateString), 'MMM dd, yyyy h:mm a')
  } catch {
    return dateString
  }
}

function formatAnnotationId(comment: ExportComment): string {
  if (comment.annotation_id) return comment.annotation_id
  return comment.id.slice(0, 8) + '…'
}

export function generateFileName(formatType: 'excel' | 'word', contextName?: string): string {
  const date = format(new Date(), 'yyyy-MM-dd')
  const extension = formatType === 'excel' ? 'xlsx' : 'docx'
  const context = contextName ? `${contextName}_` : ''
  return `${context}Comments_${date}.${extension}`
}

export async function exportToExcel(
  comments: ExportComment[],
  fileName: string,
  contextName?: string
): Promise<void> {
  // Prepare data for Excel
  const data = comments.map((comment) => ({
    'ID': formatAnnotationId(comment),
    'Document': comment.document_name || '-',
    'Section': comment.section_number || '-',
    'Page': comment.page_number?.toString() || '-',
    'Type': formatType(comment.comment_type),
    'Status': formatStatus(comment.comment_status),
    'User': formatUserName(comment.users),
    'Selected Text': comment.highlighted_text || '-',
    'Comment/Edit': comment.comment || '-',
    'Date': formatDate(comment.created_at),
  }))

  // Create worksheet from data
  const worksheet = XLSX.utils.json_to_sheet(data)

  // Set column widths
  const columnWidths = [
    { wch: 15 }, // ID
    { wch: 25 }, // Document
    { wch: 30 }, // Section
    { wch: 8 },  // Page
    { wch: 12 }, // Type
    { wch: 12 }, // Status
    { wch: 20 }, // User
    { wch: 40 }, // Selected Text
    { wch: 50 }, // Comment/Edit
    { wch: 20 }, // Date
  ]
  worksheet['!cols'] = columnWidths

  // Create workbook and add worksheet
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Comments')

  // Generate Excel file as binary string and trigger download
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  saveAs(blob, fileName)
}

export async function exportToWord(
  comments: ExportComment[],
  fileName: string,
  contextName?: string
): Promise<void> {
  // Dynamically import docx only on client side
  const { Document, Packer, Paragraph, Table, TableCell, TableRow, WidthType, HeadingLevel, TextRun, PageOrientation } = await import('docx')

  // Create document header
  const titleParagraph = new Paragraph({
    text: contextName ? `${contextName} - Comments Export` : 'Comments Export',
    heading: HeadingLevel.HEADING_1,
    spacing: { after: 200 },
  })

  const dateParagraph = new Paragraph({
    text: `Export Date: ${format(new Date(), 'MMMM dd, yyyy h:mm a')}`,
    spacing: { after: 400 },
  })

  const countParagraph = new Paragraph({
    text: `Total Comments: ${comments.length}`,
    spacing: { after: 400 },
  })

  // Create table
  const tableRows = [
    // Header row
    new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: 'ID', bold: true, color: 'FFFFFF' })] })],
          shading: { fill: '4472C4' },
          width: { size: 10, type: WidthType.PERCENTAGE },
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: 'Document', bold: true, color: 'FFFFFF' })] })],
          shading: { fill: '4472C4' },
          width: { size: 15, type: WidthType.PERCENTAGE },
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: 'Section', bold: true, color: 'FFFFFF' })] })],
          shading: { fill: '4472C4' },
          width: { size: 15, type: WidthType.PERCENTAGE },
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: 'Page', bold: true, color: 'FFFFFF' })] })],
          shading: { fill: '4472C4' },
          width: { size: 5, type: WidthType.PERCENTAGE },
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: 'Type', bold: true, color: 'FFFFFF' })] })],
          shading: { fill: '4472C4' },
          width: { size: 8, type: WidthType.PERCENTAGE },
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: 'Status', bold: true, color: 'FFFFFF' })] })],
          shading: { fill: '4472C4' },
          width: { size: 8, type: WidthType.PERCENTAGE },
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: 'User', bold: true, color: 'FFFFFF' })] })],
          shading: { fill: '4472C4' },
          width: { size: 12, type: WidthType.PERCENTAGE },
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: 'Selected Text', bold: true, color: 'FFFFFF' })] })],
          shading: { fill: '4472C4' },
          width: { size: 12, type: WidthType.PERCENTAGE },
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: 'Comment/Edit', bold: true, color: 'FFFFFF' })] })],
          shading: { fill: '4472C4' },
          width: { size: 12, type: WidthType.PERCENTAGE },
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: 'Date', bold: true, color: 'FFFFFF' })] })],
          shading: { fill: '4472C4' },
          width: { size: 13, type: WidthType.PERCENTAGE },
        }),
      ],
      tableHeader: true,
    }),
    // Data rows
    ...comments.map(
      (comment) =>
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ text: formatAnnotationId(comment) })],
            }),
            new TableCell({
              children: [new Paragraph({ text: comment.document_name || '-' })],
            }),
            new TableCell({
              children: [new Paragraph({ text: comment.section_number || '-' })],
            }),
            new TableCell({
              children: [new Paragraph({ text: comment.page_number?.toString() || '-' })],
            }),
            new TableCell({
              children: [new Paragraph({ text: formatType(comment.comment_type) })],
            }),
            new TableCell({
              children: [new Paragraph({ text: formatStatus(comment.comment_status) })],
            }),
            new TableCell({
              children: [new Paragraph({ text: formatUserName(comment.users) })],
            }),
            new TableCell({
              children: [new Paragraph({ text: comment.highlighted_text || '-' })],
            }),
            new TableCell({
              children: [new Paragraph({ text: comment.comment || '-' })],
            }),
            new TableCell({
              children: [new Paragraph({ text: formatDate(comment.created_at) })],
            }),
          ],
        })
    ),
  ]

  const table = new Table({
    rows: tableRows,
    width: {
      size: 100,
      type: WidthType.PERCENTAGE,
    },
  })

  // Create document
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            // Tabloid size in landscape: 17" wide x 11" tall
            // TWIPS = 1/1440 inch
            width: 24480,  // 17 inches * 1440 = 24480 TWIPS
            height: 15840, // 11 inches * 1440 = 15840 TWIPS
            orientation: PageOrientation.LANDSCAPE,
            margin: {
              top: 720,    // 0.5 inch
              right: 720,  // 0.5 inch
              bottom: 720, // 0.5 inch
              left: 720,   // 0.5 inch
            },
          },
        },
        children: [titleParagraph, dateParagraph, countParagraph, table],
      },
    ],
  })

  // Generate and download file
  const blob = await Packer.toBlob(doc)
  saveAs(blob, fileName)
}
