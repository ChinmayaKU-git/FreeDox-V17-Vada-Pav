'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { BarChart3, Check, X } from 'lucide-react'

export default function AdminDashboardPage() {
  const router = useRouter()
  const queryClient = useQueryClient()

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const res = await fetch('/api/auth/me')
      return res.json()
    }
  })

  const { data: pendingBookings = [], isLoading: bookingsLoading } = useQuery({
    queryKey: ['admin-pending-bookings'],
    queryFn: async () => {
      const res = await fetch('/api/admin/bookings')
      if (!res.ok) return []
      const data = await res.json()
      // Filter only pending if API returns all, assuming API returns all for admin
      return data.filter((b: any) => b.status === 'Pending')
    },
    enabled: user?.role === 'Admin',
    refetchInterval: 10000
  })

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/admin/bookings/${id}/approve`, { method: 'POST' })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-pending-bookings'] })
  })

  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/admin/bookings/${id}/reject`, { method: 'POST' })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-pending-bookings'] })
  })

  if (userLoading) return <div className="p-8">Loading...</div>
  
  if (user?.role !== 'Admin') {
    if (typeof window !== 'undefined') router.push('/facilities')
    return null
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-200">Admin Dashboard</h1>
          <p className="text-slate-400 mt-1">Manage system approvals and view analytics</p>
        </div>
        <Link href="/admin/analytics">
          <Button className="bg-purple-600 hover:bg-purple-700 text-white gap-2">
            <BarChart3 className="w-4 h-4" />
            View Analytics
          </Button>
        </Link>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-slate-200 border-b border-white/10 pb-2">
          Pending Approvals
        </h2>
        
        {bookingsLoading ? (
          <div className="text-slate-500">Loading queue...</div>
        ) : pendingBookings.length === 0 ? (
          <div className="py-12 text-center bg-slate-900/30 border border-white/5 rounded-xl text-slate-500">
            No pending approvals at this time.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {pendingBookings.map((booking: any) => (
              <Card key={booking.id} className="bg-slate-900/60 border-white/10 hover:border-white/20 transition-all">
                <CardHeader className="pb-2">
                  <div className="flex justify-between">
                    <div>
                      <CardTitle className="text-lg text-slate-200">{booking.facility?.name}</CardTitle>
                      <p className="text-sm text-slate-400 mt-1">Requested by <span className="text-slate-300 font-medium">{booking.user?.name}</span></p>
                    </div>
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/20">Pending</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm text-slate-300 grid grid-cols-2 gap-2 bg-white/5 p-3 rounded-md border border-white/5">
                    <div>
                      <span className="text-slate-500 block text-xs mb-1">Date & Time</span>
                      {format(new Date(booking.start_time), 'MMM d, h:mm a')} - {format(new Date(booking.end_time), 'h:mm a')}
                    </div>
                    <div>
                      <span className="text-slate-500 block text-xs mb-1">Purpose</span>
                      <span className="truncate block" title={booking.purpose}>{booking.purpose}</span>
                    </div>
                  </div>
                  
                  <div className="flex gap-3 justify-end pt-2">
                    <Button 
                      variant="outline" 
                      onClick={() => rejectMutation.mutate(booking.id)}
                      disabled={rejectMutation.isPending || approveMutation.isPending}
                      className="border-red-500/20 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Reject
                    </Button>
                    <Button 
                      onClick={() => approveMutation.mutate(booking.id)}
                      disabled={rejectMutation.isPending || approveMutation.isPending}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Approve
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
