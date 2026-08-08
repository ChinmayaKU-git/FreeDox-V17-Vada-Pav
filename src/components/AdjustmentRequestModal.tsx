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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { format } from 'date-fns'

type AdjustmentRequestModalProps = {
  isOpen: boolean
  onClose: () => void
  targetBooking: any
}

export default function AdjustmentRequestModal({ isOpen, onClose, targetBooking }: AdjustmentRequestModalProps) {
  const queryClient = useQueryClient()
  const [requestType, setRequestType] = useState('Relinquish')
  const [message, setMessage] = useState('')
  const [proposedStart, setProposedStart] = useState('')
  const [proposedEnd, setProposedEnd] = useState('')

  const mutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        target_booking_id: targetBooking.id,
        request_type: requestType,
        message,
      }
      if (requestType === 'Swap') {
        payload.proposed_start_time = new Date(proposedStart).toISOString()
        payload.proposed_end_time = new Date(proposedEnd).toISOString()
      }

      const res = await fetch('/api/adjustments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Request failed')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings', targetBooking?.facility_id] })
      onClose()
    }
  })

  if (!targetBooking) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-white/10 text-slate-200 sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Request Adjustment</DialogTitle>
          <DialogDescription className="text-slate-400">
            Send a request to the owner of this booking.
          </DialogDescription>
        </DialogHeader>
        <div className="bg-white/5 p-3 rounded-md text-sm mb-2 border border-white/10">
          <p><span className="text-slate-400">Owner:</span> {targetBooking.user?.name}</p>
          <p><span className="text-slate-400">Purpose:</span> {targetBooking.purpose}</p>
          <p><span className="text-slate-400">Time:</span> {format(new Date(targetBooking.start_time), 'PPp')} - {format(new Date(targetBooking.end_time), 'p')}</p>
        </div>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label>Request Type</Label>
            <Select value={requestType} onValueChange={setRequestType}>
              <SelectTrigger className="bg-slate-800 border-white/10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-white/10 text-slate-200">
                <SelectItem value="Relinquish">Request to Relinquish</SelectItem>
                <SelectItem value="Swap">Propose a Swap</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {requestType === 'Swap' && (
            <>
              <div className="grid gap-2">
                <Label>Proposed Start Time</Label>
                <Input 
                  type="datetime-local" 
                  value={proposedStart}
                  onChange={e => setProposedStart(e.target.value)}
                  className="bg-slate-800 border-white/10"
                />
              </div>
              <div className="grid gap-2">
                <Label>Proposed End Time</Label>
                <Input 
                  type="datetime-local" 
                  value={proposedEnd}
                  onChange={e => setProposedEnd(e.target.value)}
                  className="bg-slate-800 border-white/10"
                />
              </div>
            </>
          )}

          <div className="grid gap-2">
            <Label>Message</Label>
            <Textarea 
              value={message}
              onChange={e => setMessage(e.target.value)}
              className="bg-slate-800 border-white/10"
              placeholder="Why do you need this slot?"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="ghost" onClick={onClose} className="hover:bg-white/5">Cancel</Button>
          <Button 
            onClick={() => mutation.mutate()} 
            disabled={mutation.isPending || !message || (requestType === 'Swap' && (!proposedStart || !proposedEnd))}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            {mutation.isPending ? 'Sending...' : 'Send Request'}
          </Button>
        </div>
        {mutation.isError && <p className="text-red-400 text-sm mt-2">Error sending request.</p>}
      </DialogContent>
    </Dialog>
  )
}
