'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { format } from 'date-fns'

type CancelBookingModalProps = {
  isOpen: boolean
  onClose: () => void
  booking: any
}

export default function CancelBookingModal({ isOpen, onClose, booking }: CancelBookingModalProps) {
  const queryClient = useQueryClient()
  const [reason, setReason] = useState('')

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/bookings/${booking.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      })
      if (!res.ok) throw new Error('Failed to cancel')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] })
      onClose()
    }
  })

  if (!booking) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-white/10 text-slate-200 sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Cancel Booking</DialogTitle>
          <DialogDescription className="text-slate-400">
            Are you sure you want to cancel this booking?
          </DialogDescription>
        </DialogHeader>
        
        <div className="bg-red-500/10 p-3 rounded-md text-sm mb-4 border border-red-500/20 text-red-200">
          <p className="font-semibold">{booking.facility?.name}</p>
          <p>{format(new Date(booking.start_time), 'PPp')} - {format(new Date(booking.end_time), 'p')}</p>
        </div>

        <div className="grid gap-2">
          <Label>Reason for cancellation <span className="text-red-400">*</span></Label>
          <Textarea 
            value={reason}
            onChange={e => setReason(e.target.value)}
            className="bg-slate-800 border-white/10"
            placeholder="Please provide a reason..."
            required
          />
        </div>
        
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="ghost" onClick={onClose} className="hover:bg-white/5">Keep Booking</Button>
          <Button 
            variant="destructive"
            onClick={() => mutation.mutate()} 
            disabled={mutation.isPending || !reason.trim()}
          >
            {mutation.isPending ? 'Cancelling...' : 'Confirm Cancellation'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
