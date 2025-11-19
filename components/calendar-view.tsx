'use client'

import React, { useMemo, useState, useCallback } from 'react'
import { Calendar, dateFnsLocalizer, View } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay, startOfDay, endOfDay } from 'date-fns'
import { enUS } from 'date-fns/locale/en-US'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Flag, ExternalLink, Calendar as CalendarIcon } from 'lucide-react'

const locales = {
  'en-US': enUS,
}

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
})

interface TaskProjection {
  id: number
  task_id: string | null
  task_name: string | null
  task_url: string | null
  projected_due_date: string | null
  current_status: string | null
  projected_status: string | null
  schedule_type: string | null
  assignee_name: string | null
  space_name?: string | null
  folder_name?: string | null
  list_name?: string | null
}

interface CalendarViewProps {
  projections: TaskProjection[]
}

interface CalendarEvent {
  id: number
  title: string
  start: Date
  end: Date
  resource: TaskProjection
}

export function CalendarView({ projections }: CalendarViewProps) {
  const [currentView, setCurrentView] = useState<View>('month')
  const [selectedTask, setSelectedTask] = useState<TaskProjection | null>(null)

  const events: CalendarEvent[] = useMemo(() => {
    return projections
      .filter(p => p.projected_due_date)
      .map(projection => {
        const date = new Date(projection.projected_due_date!)
        // For all-day events, set start to beginning of day and end to end of day
        return {
          id: projection.id,
          title: projection.task_name || 'Untitled Task',
          start: startOfDay(date),
          end: endOfDay(date),
          resource: projection,
          allDay: true,
        }
      })
  }, [projections])

  const handleViewChange = useCallback((view: View) => {
    setCurrentView(view)
  }, [])

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase()
  }

  // Custom event component with avatar
  const CustomEvent = ({ event }: { event: CalendarEvent }) => {
    const assigneeName = event.resource.assignee_name
    return (
      <div className="flex items-center gap-1 overflow-hidden">
        {assigneeName ? (
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0"
            style={{ backgroundColor: 'white', color: '#1f2937' }}
          >
            {getInitials(assigneeName)}
          </div>
        ) : (
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0"
            style={{ backgroundColor: 'white', color: '#1f2937' }}
          >
            ?
          </div>
        )}
        <span className="truncate text-xs">{event.title}</span>
      </div>
    )
  }

  const eventStyleGetter = (event: CalendarEvent) => {
    const scheduleType = event.resource.schedule_type?.toLowerCase()
    let backgroundColor = '#64748b' // default gray

    switch (scheduleType) {
      case 'urgent':
        backgroundColor = '#ef4444' // red
        break
      case 'accel':
        backgroundColor = '#f97316' // orange
        break
      case 'standard':
        backgroundColor = '#64748b' // gray
        break
    }

    return {
      style: {
        backgroundColor,
        borderRadius: '4px',
        opacity: 0.9,
        color: 'white',
        border: 'none',
        display: 'block',
        fontSize: '0.875rem',
        padding: '2px 4px',
      }
    }
  }

  const handleSelectEvent = (event: CalendarEvent) => {
    setSelectedTask(event.resource)
  }

  const formatStatus = (status: string | null) => {
    if (!status) return 'N/A'
    // Remove 'qc-' prefix if it exists
    const cleanStatus = status.toLowerCase().replace(/^qc-/, '')
    // Split by underscore or hyphen, capitalize each word
    return cleanStatus
      .split(/[_-]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  const formatScheduleType = (scheduleType: string | null) => {
    if (!scheduleType) return 'N/A'
    const type = scheduleType.toLowerCase()
    switch (type) {
      case 'accel':
        return 'High'
      case 'urgent':
        return 'Urgent'
      case 'standard':
        return 'Standard'
      default:
        return scheduleType.charAt(0).toUpperCase() + scheduleType.slice(1).toLowerCase()
    }
  }

  const getFlagStyle = (scheduleType: string | null) => {
    if (!scheduleType) return { color: 'text-muted-foreground', fill: false }
    const type = scheduleType.toLowerCase()
    switch (type) {
      case 'accel':
        return { color: 'text-orange-500', fill: true }
      case 'urgent':
        return { color: 'text-red-500', fill: true }
      case 'standard':
      default:
        return { color: 'text-muted-foreground', fill: false }
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'No date set'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'
    })
  }

  return (
    <>
      <div className="h-[800px] bg-background rounded-lg border p-4">
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: '100%' }}
          eventPropGetter={eventStyleGetter}
          onSelectEvent={handleSelectEvent}
          views={['month', 'week', 'day', 'agenda']}
          view={currentView}
          onView={handleViewChange}
          popup
          showMultiDayTimes
          step={60}
          timeslots={1}
          components={{
            event: CustomEvent,
          }}
          tooltipAccessor={(event: CalendarEvent) => {
            return `${event.title}\nAssignee: ${event.resource.assignee_name || 'Unassigned'}\nStatus: ${event.resource.current_status || 'N/A'}`
          }}
          formats={{
            agendaDateFormat: 'MMM dd',
            agendaTimeFormat: 'h:mm a',
            agendaTimeRangeFormat: () => 'All Day',
          }}
        />
      </div>

      {/* Task Detail Dialog */}
      <Dialog open={!!selectedTask} onOpenChange={() => setSelectedTask(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {selectedTask?.task_name || 'Untitled Task'}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {[selectedTask?.space_name, selectedTask?.folder_name, selectedTask?.list_name]
                .filter(Boolean)
                .join(' / ') || 'N/A'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Status Row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Current Status</label>
                <div className="mt-1">
                  <Badge variant="outline" className="py-1.5">
                    {formatStatus(selectedTask?.current_status ?? null)}
                  </Badge>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Projected Status</label>
                <div className="mt-1">
                  <Badge variant="secondary" className="py-1.5">
                    {formatStatus(selectedTask?.projected_status ?? null)}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Priority and Due Date */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Priority</label>
                <div className="flex items-center gap-2 mt-1">
                  {(() => {
                    const flagStyle = getFlagStyle(selectedTask?.schedule_type ?? null)
                    return (
                      <Flag
                        className={`w-4 h-4 ${flagStyle.color}`}
                        fill={flagStyle.fill ? "currentColor" : "none"}
                      />
                    )
                  })()}
                  <span className="text-sm">
                    {formatScheduleType(selectedTask?.schedule_type ?? null)}
                  </span>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Projected Due Date</label>
                <div className="flex items-center gap-2 mt-1">
                  <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">
                    {formatDate(selectedTask?.projected_due_date ?? null)}
                  </span>
                </div>
              </div>
            </div>

            {/* Assignee */}
            <div>
              <label className="text-sm font-medium text-muted-foreground">Assignee</label>
              <div className="flex items-center gap-2 mt-1">
                {selectedTask?.assignee_name ? (
                  <>
                    <div className="w-8 h-8 bg-foreground text-background rounded-full flex items-center justify-center text-sm font-medium">
                      {getInitials(selectedTask.assignee_name)}
                    </div>
                    <span className="text-sm">{selectedTask.assignee_name}</span>
                  </>
                ) : (
                  <span className="text-sm text-muted-foreground">Unassigned</span>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setSelectedTask(null)}>
              Close
            </Button>
            {selectedTask?.task_url && (
              <Button
                onClick={() => {
                  window.open(selectedTask.task_url!, '_blank')
                  setSelectedTask(null)
                }}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Open in ClickUp
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
