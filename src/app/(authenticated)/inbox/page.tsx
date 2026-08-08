'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export default function InboxPage() {
  const queryClient = useQueryClient()
  
  const { data: inbox = { incoming: [], outgoing: [] }, isLoading } = useQuery({
    queryKey: ['inbox'],
    queryFn: async () => {
      const res = await fetch('/api/adjustments')
      if (!res.ok) return { incoming: [], outgoing: [] }
      return res.json()
    },
    refetchInterval: 10000
  })

  const acceptMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/adjustments/${id}/accept`, { method: 'POST' })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbox'] })
    }
  })

  const declineMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/adjustments/${id}/decline`, { method: 'POST' })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbox'] })
    }
  })

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold text-slate-200">Inbox & Action Center</h1>
        <p className="text-slate-400 mt-1">Manage your adjustment requests</p>
      </div>

      <Tabs defaultValue="incoming" className="w-full">
        <TabsList className="bg-slate-900 border border-white/10">
          <TabsTrigger value="incoming" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-slate-400 relative">
            Incoming Requests
            {inbox.incoming.filter((r: any) => r.status === 'Pending').length > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-blue-500"></span>
            )}
          </TabsTrigger>
          <TabsTrigger value="outgoing" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-slate-400">
            Outgoing Requests
          </TabsTrigger>
        </TabsList>

        <TabsContent value="incoming" className="mt-6 space-y-4">
          {inbox.incoming.length === 0 ? (
            <div className="text-slate-500 py-8 text-center border border-white/5 rounded-xl bg-slate-900/30">
              No incoming requests.
            </div>
          ) : (
            inbox.incoming.map((req: any) => (
              <Card key={req.id} className="bg-slate-900/50 border-white/10">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg text-slate-200">
                        {req.requester.name} requested to {req.request_type}
                      </CardTitle>
                      <p className="text-sm text-slate-400 mt-1">For your booking at {req.target_booking?.facility?.name}</p>
                    </div>
                    <Badge variant="outline" className={req.status === 'Pending' ? 'bg-amber-500/10 text-amber-400' : 'bg-slate-500/10 text-slate-400'}>
                      {req.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="text-sm text-slate-300 space-y-3">
                  <div className="bg-white/5 p-3 rounded border border-white/5">
                    <span className="text-slate-500">Target Slot:</span><br/>
                    {req.target_booking && format(new Date(req.target_booking.start_time), 'PPp')} - {req.target_booking && format(new Date(req.target_booking.end_time), 'p')}
                  </div>
                  {req.request_type === 'Swap' && (
                    <div className="bg-blue-500/5 p-3 rounded border border-blue-500/10">
                      <span className="text-blue-400">Proposed Slot:</span><br/>
                      {format(new Date(req.proposed_start_time), 'PPp')} - {format(new Date(req.proposed_end_time), 'p')}
                    </div>
                  )}
                  {req.message && (
                    <div>
                      <span className="text-slate-500">Message:</span>
                      <p className="italic text-slate-400 mt-1">"{req.message}"</p>
                    </div>
                  )}
                </CardContent>
                {req.status === 'Pending' && (
                  <CardFooter className="flex justify-end gap-3 pt-2 border-t border-white/5 mt-2">
                    <Button 
                      variant="outline" 
                      onClick={() => declineMutation.mutate(req.id)}
                      disabled={declineMutation.isPending || acceptMutation.isPending}
                      className="border-red-500/20 text-red-400 hover:bg-red-500/10"
                    >
                      Decline
                    </Button>
                    <Button 
                      onClick={() => acceptMutation.mutate(req.id)}
                      disabled={declineMutation.isPending || acceptMutation.isPending}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      Accept
                    </Button>
                  </CardFooter>
                )}
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="outgoing" className="mt-6 space-y-4">
          {inbox.outgoing.length === 0 ? (
            <div className="text-slate-500 py-8 text-center border border-white/5 rounded-xl bg-slate-900/30">
              No outgoing requests.
            </div>
          ) : (
            inbox.outgoing.map((req: any) => (
              <Card key={req.id} className="bg-slate-900/50 border-white/10 opacity-75">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg text-slate-200">
                        You requested to {req.request_type}
                      </CardTitle>
                      <p className="text-sm text-slate-400 mt-1">To {req.target_booking?.user?.name}</p>
                    </div>
                    <Badge variant="outline" className={
                      req.status === 'Accepted' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                      req.status === 'Declined' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                      'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    }>
                      {req.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="text-sm text-slate-300">
                  <div className="bg-white/5 p-3 rounded border border-white/5 mb-3">
                    <span className="text-slate-500">Target Facility:</span> {req.target_booking?.facility?.name}<br/>
                    <span className="text-slate-500">Target Slot:</span> {req.target_booking && format(new Date(req.target_booking.start_time), 'PPp')}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
