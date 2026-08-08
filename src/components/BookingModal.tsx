'use client'

import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

type BookingModalProps = {
  isOpen: boolean
  onClose: () => void
  facilityId: string
  initialStart?: Date
  initialEnd?: Date
}

// Helper to format date for datetime-local input
const formatDateForInput = (date?: Date) => {
  if (!date) return ''
  // local time string for input
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export default function BookingModal({ isOpen, onClose, facilityId, initialStart, initialEnd }: BookingModalProps) {
  const queryClient = useQueryClient()
  const [purpose, setPurpose] = useState('')
  const [attendees, setAttendees] = useState('1')
  const [startStr, setStartStr] = useState('')
  const [endStr, setEndStr] = useState('')

  useEffect(() => {
    if (isOpen) {
      setStartStr(formatDateForInput(initialStart))
      setEndStr(formatDateForInput(initialEnd))
      setPurpose('')
      setAttendees('1')
    }
  }, [isOpen, initialStart, initialEnd])

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          facility_id: facilityId,
          start_time: new Date(startStr).toISOString(),
          end_time: new Date(endStr).toISOString(),
          purpose,
          attendee_count: parseInt(attendees),
        }),
      })
      if (!res.ok) throw new Error('Booking failed')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings', facilityId] })
      onClose()
    }
  })

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-white/10 text-slate-200 sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Book Facility</DialogTitle>
          <DialogDescription className="text-slate-400">
            Fill in the details to request a booking for this slot.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="start">Start Time</Label>
            <Input 
              id="start" 
              type="datetime-local" 
              value={startStr}
              onChange={e => setStartStr(e.target.value)}
              className="bg-slate-800 border-white/10"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="end">End Time</Label>
            <Input 
              id="end" 
              type="datetime-local" 
              value={endStr}
              onChange={e => setEndStr(e.target.value)}
              className="bg-slate-800 border-white/10"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="purpose">Purpose</Label>
            <Textarea 
              id="purpose" 
              value={purpose}
              onChange={e => setPurpose(e.target.value)}
              className="bg-slate-800 border-white/10"
              placeholder="E.g., Project Meeting"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="attendees">Attendee Count</Label>
            <Input 
              id="attendees" 
              type="number" 
              min="1"
              value={attendees}
              onChange={e => setAttendees(e.target.value)}
              className="bg-slate-800 border-white/10"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} className="hover:bg-white/5">Cancel</Button>
          <Button 
            onClick={() => mutation.mutate()} 
            disabled={mutation.isPending || !purpose || !startStr || !endStr}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {mutation.isPending ? 'Submitting...' : 'Submit Booking'}
          </Button>
        </div>
        {mutation.isError && <p className="text-red-400 text-sm mt-2">Error creating booking. Please try again.</p>}
      </DialogContent>
    </Dialog>
  )
}
