'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import { Calendar, dateFnsLocalizer, View } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { enUS } from 'date-fns/locale'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import BookingModal from '@/components/BookingModal'
import AdjustmentRequestModal from '@/components/AdjustmentRequestModal'

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

export default function CalendarPage() {
  const { id } = useParams()
  const router = useRouter()
  const [view, setView] = useState<View>('week')
  const [date, setDate] = useState(new Date())
  
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false)
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<{start: Date, end: Date} | null>(null)
  const [selectedBooking, setSelectedBooking] = useState<any>(null)

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: async () => (await fetch('/api/auth/me')).json() })
  
  const { data: facility } = useQuery({
    queryKey: ['facility', id],
    queryFn: async () => {
      const res = await fetch(`/api/facilities/${id}`)
      if (!res.ok) throw new Error('Facility not found')
      return res.json()
    }
  })

  const { data: bookings = [] } = useQuery({
    queryKey: ['bookings', id],
    queryFn: async () => {
      const res = await fetch(`/api/facilities/${id}/bookings`)
      if (!res.ok) return []
      return res.json()
    },
    refetchInterval: 10000
  })

  const events = bookings.map((b: any) => ({
    id: b.id,
    title: `${b.purpose || 'Booking'} (${b.requester_name})`,
    start: new Date(b.start_time),
    end: new Date(b.end_time),
    status: b.status,
    userId: b.requester_id,
    raw: b
  }))

  const eventStyleGetter = (event: any) => {
    let backgroundColor = '#10b981' // default green for unknown
    
    if (event.status === 'approved') backgroundColor = '#3b82f6' // blue
    else if (event.status === 'pending') backgroundColor = '#f59e0b' // amber
    else if (event.status === 'cancelled') backgroundColor = '#6b7280' // gray

    return {
      style: {
        backgroundColor,
        borderRadius: '4px',
        opacity: 0.9,
        color: 'white',
        border: '0px',
        display: 'block'
      }
    }
  }

  const handleSelectSlot = (slotInfo: any) => {
    setSelectedSlot({ start: slotInfo.start, end: slotInfo.end })
    setIsBookingModalOpen(true)
  }

  const handleSelectEvent = (event: any) => {
    if (event.userId === user?.id) {
      // Own booking - maybe show details, but for now just console log
      console.log('Own booking clicked', event)
    } else {
      setSelectedBooking(event.raw)
      setIsAdjustmentModalOpen(true)
    }
  }

  if (!facility) return <div className="p-8 text-center">Loading...</div>

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/facilities')} className="text-slate-400 hover:text-slate-200">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-200 flex items-center gap-3">
            {facility.name}
            <Badge variant="outline" className="bg-white/5">{facility.category}</Badge>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {facility.location} • Capacity: {facility.capacity} • 
            {facility.requires_approval ? ' Requires Approval' : ' Auto-approved'}
          </p>
        </div>
      </div>

      <div className="bg-slate-900/80 backdrop-blur-md border border-white/10 rounded-xl p-6 shadow-xl h-[700px]">
        {/* We need some CSS overrides for dark mode react-big-calendar */}
        <style dangerouslySetInnerHTML={{__html: `
          .rbc-calendar { font-family: inherit; color: #cbd5e1; }
          .rbc-header { border-bottom: 1px solid rgba(255,255,255,0.1) !important; padding: 8px 0; font-weight: 500; }
          .rbc-month-view, .rbc-time-view, .rbc-agenda-view { border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; overflow: hidden; background: rgba(0,0,0,0.2); }
          .rbc-day-bg, .rbc-month-row, .rbc-time-header-content { border-color: rgba(255,255,255,0.1) !important; }
          .rbc-time-content { border-top: 1px solid rgba(255,255,255,0.1); }
          .rbc-timeslot-group { border-bottom: 1px solid rgba(255,255,255,0.05); }
          .rbc-time-slot { border-top: 1px solid rgba(255,255,255,0.02); }
          .rbc-off-range-bg { background: rgba(255,255,255,0.02); }
          .rbc-today { background: rgba(59,130,246,0.1); }
          .rbc-event { padding: 2px 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.2); transition: transform 0.1s; }
          .rbc-event:hover { transform: scale(1.02); z-index: 10; }
          .rbc-btn-group button { color: #94a3b8; border-color: rgba(255,255,255,0.2); }
          .rbc-btn-group button:hover, .rbc-btn-group button.rbc-active { background: rgba(255,255,255,0.1); color: #f8fafc; }
        `}} />
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: '100%' }}
          view={view}
          onView={setView}
          date={date}
          onNavigate={setDate}
          selectable
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
          eventPropGetter={eventStyleGetter}
        />
      </div>

      <BookingModal 
        isOpen={isBookingModalOpen} 
        onClose={() => setIsBookingModalOpen(false)} 
        facilityId={id as string}
        initialStart={selectedSlot?.start}
        initialEnd={selectedSlot?.end}
      />

      {selectedBooking && (
        <AdjustmentRequestModal
          isOpen={isAdjustmentModalOpen}
          onClose={() => setIsAdjustmentModalOpen(false)}
          targetBooking={selectedBooking}
        />
      )}
    </div>
  )
}
