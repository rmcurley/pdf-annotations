'use client'

import { saveAs } from 'file-saver'
import { format } from 'date-fns'

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
  // Dynamically import ExcelJS only on client side
  const ExcelJS = (await import('exceljs')).default

  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('Comments')

  // Define columns
  worksheet.columns = [
    { header: 'ID', key: 'id', width: 15 },
    { header: 'Document', key: 'document', width: 25 },
    { header: 'Section', key: 'section', width: 30 },
    { header: 'Page', key: 'page', width: 8 },
    { header: 'Type', key: 'type', width: 12 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'User', key: 'user', width: 20 },
    { header: 'Selected Text', key: 'selectedText', width: 40 },
    { header: 'Comment/Edit', key: 'comment', width: 50 },
    { header: 'Date', key: 'date', width: 20 },
  ]

  // Style header row
  const headerRow = worksheet.getRow(1)
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' }
  }
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' }
  headerRow.height = 20

  // Add data rows
  comments.forEach((comment) => {
    const row = worksheet.addRow({
      id: formatAnnotationId(comment),
      document: comment.document_name || '-',
      section: comment.section_number || '-',
      page: comment.page_number?.toString() || '-',
      type: formatType(comment.comment_type),
      status: formatStatus(comment.comment_status),
      user: formatUserName(comment.users),
      selectedText: comment.highlighted_text || '-',
      comment: comment.comment || '-',
      date: formatDate(comment.created_at),
    })

    // Enable text wrapping for long content
    row.getCell('selectedText').alignment = { wrapText: true, vertical: 'top' }
    row.getCell('comment').alignment = { wrapText: true, vertical: 'top' }
    row.alignment = { vertical: 'top' }
  })

  // Add borders to all cells
  worksheet.eachRow((row, rowNumber) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      }
    })
  })

  // Enable auto-filter
  worksheet.autoFilter = {
    from: 'A1',
    to: `J1`,
  }

  // Freeze header row
  worksheet.views = [
    { state: 'frozen', xSplit: 0, ySplit: 1 }
  ]

  // Generate and download file
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  saveAs(blob, fileName)
}

export async function exportToWord(
  comments: ExportComment[],
  fileName: string,
  contextName?: string
): Promise<void> {
  // Dynamically import docx only on client side
  const { Document, Packer, Paragraph, Table, TableCell, TableRow, WidthType, HeadingLevel, TextRun } = await import('docx')

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
            margin: {
              top: 720,
              right: 720,
              bottom: 720,
              left: 720,
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
