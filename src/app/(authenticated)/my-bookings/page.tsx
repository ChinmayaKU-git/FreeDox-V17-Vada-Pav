'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import CancelBookingModal from '@/components/CancelBookingModal'

export default function MyBookingsPage() {
  const [cancelModalOpen, setCancelModalOpen] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<any>(null)

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['my-bookings'],
    queryFn: async () => {
      const res = await fetch('/api/auth/me/bookings')
      if (!res.ok) return []
      return res.json()
    },
    refetchInterval: 10000
  })

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Approved': return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
      case 'Pending': return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
      case 'Cancelled': return 'bg-slate-500/10 text-slate-400 border-slate-500/20'
      default: return 'bg-white/10 text-white border-white/20'
    }
  }

  const now = new Date()
  const upcoming = bookings.filter((b: any) => new Date(b.end_time) >= now)
  const past = bookings.filter((b: any) => new Date(b.end_time) < now)

  const renderBookingCard = (booking: any, isUpcoming: boolean) => (
    <Card key={booking.id} className="bg-slate-900/50 border-white/10 hover:border-white/20 transition-all">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start gap-4">
          <div>
            <CardTitle className="text-lg text-slate-200">{booking.facility?.name}</CardTitle>
            <p className="text-sm text-slate-400 mt-1">{booking.purpose}</p>
          </div>
          <Badge variant="outline" className={getStatusColor(booking.status)}>
            {booking.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-slate-300 space-y-1">
          <p>
            <span className="text-slate-500">Date:</span>{' '}
            {format(new Date(booking.start_time), 'MMM d, yyyy')}
          </p>
          <p>
            <span className="text-slate-500">Time:</span>{' '}
            {format(new Date(booking.start_time), 'h:mm a')} - {format(new Date(booking.end_time), 'h:mm a')}
          </p>
          <p>
            <span className="text-slate-500">Attendees:</span> {booking.attendee_count}
          </p>
        </div>
        
        {isUpcoming && (booking.status === 'Approved' || booking.status === 'Pending') && (
          <div className="mt-4 pt-4 border-t border-white/5 flex justify-end">
            <Button 
              variant="outline" 
              size="sm" 
              className="border-red-500/20 text-red-400 hover:bg-red-500/10 hover:text-red-300"
              onClick={() => {
                setSelectedBooking(booking)
                setCancelModalOpen(true)
              }}
            >
              Cancel Booking
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold text-slate-200">My Bookings</h1>
        <p className="text-slate-400 mt-1">Manage your facility reservations</p>
      </div>

      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList className="bg-slate-900 border border-white/10">
          <TabsTrigger value="upcoming" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-slate-400">
            Upcoming ({upcoming.length})
          </TabsTrigger>
          <TabsTrigger value="past" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-slate-400">
            Past ({past.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="upcoming" className="mt-6">
          {isLoading ? (
            <div className="text-slate-500">Loading bookings...</div>
          ) : upcoming.length === 0 ? (
            <div className="text-slate-500 py-8 text-center border border-white/5 rounded-xl bg-slate-900/30">
              No upcoming bookings.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {upcoming.map((b: any) => renderBookingCard(b, true))}
            </div>
          )}
        </TabsContent>
        <TabsContent value="past" className="mt-6">
          {past.length === 0 ? (
            <div className="text-slate-500 py-8 text-center border border-white/5 rounded-xl bg-slate-900/30">
              No past bookings.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {past.map((b: any) => renderBookingCard(b, false))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {selectedBooking && (
        <CancelBookingModal 
          isOpen={cancelModalOpen} 
          onClose={() => {
            setCancelModalOpen(false)
            setSelectedBooking(null)
          }} 
          booking={selectedBooking} 
        />
      )}
    </div>
  )
}
