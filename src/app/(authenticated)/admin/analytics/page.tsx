'use client'

import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'

export default function AnalyticsDashboardPage() {
  const router = useRouter()

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const res = await fetch('/api/auth/me')
      return res.json()
    }
  })

  const { data: analytics, isLoading } = useQuery({
    queryKey: ['admin-analytics'],
    queryFn: async () => {
      const res = await fetch('/api/admin/analytics')
      if (!res.ok) throw new Error('Failed to fetch analytics')
      return res.json()
    },
    enabled: user?.role === 'Admin',
  })

  if (userLoading) return <div className="p-8">Loading...</div>
  
  if (user?.role !== 'Admin') {
    if (typeof window !== 'undefined') router.push('/facilities')
    return null
  }

  const chartColors = {
    primary: '#3b82f6', // blue-500
    secondary: '#8b5cf6', // purple-500
    tertiary: '#10b981', // emerald-500
    destructive: '#ef4444', // red-500
    grid: 'rgba(255,255,255,0.1)',
    text: '#94a3b8' // slate-400
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <Link href="/admin">
          <Button variant="ghost" size="icon" className="text-slate-400 hover:text-slate-200">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-slate-200">Analytics Overview</h1>
          <p className="text-slate-400 mt-1">System usage and facility metrics</p>
        </div>
      </div>

      {isLoading || !analytics ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1,2,3,4].map(i => (
            <Card key={i} className="bg-slate-900/50 border-white/10 h-[350px] animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-slate-900/60 border-white/10 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="text-lg text-slate-200 font-medium">Booked Hours per Facility</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.bookedHoursData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
                  <XAxis dataKey="name" stroke={chartColors.text} fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke={chartColors.text} fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: 'rgba(255,255,255,0.1)', color: '#f1f5f9' }}
                    itemStyle={{ color: chartColors.primary }}
                  />
                  <Bar dataKey="hours" name="Hours Booked" fill={chartColors.primary} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/60 border-white/10 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="text-lg text-slate-200 font-medium">Cancellation Rate (%)</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.cancellationData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
                  <XAxis dataKey="name" stroke={chartColors.text} fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke={chartColors.text} fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: 'rgba(255,255,255,0.1)', color: '#f1f5f9' }}
                    itemStyle={{ color: chartColors.destructive }}
                  />
                  <Bar dataKey="rate" name="Cancellation Rate (%)" fill={chartColors.destructive} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/60 border-white/10 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="text-lg text-slate-200 font-medium">Peak Demand by Hour</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.peakDemandData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
                  <XAxis dataKey="hour" stroke={chartColors.text} fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke={chartColors.text} fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: 'rgba(255,255,255,0.1)', color: '#f1f5f9' }}
                    itemStyle={{ color: chartColors.secondary }}
                  />
                  <Bar dataKey="bookings" name="Active Bookings" fill={chartColors.secondary} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/60 border-white/10 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="text-lg text-slate-200 font-medium">Most Active Departments</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.departmentData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} horizontal={false} />
                  <XAxis type="number" stroke={chartColors.text} fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis dataKey="department" type="category" stroke={chartColors.text} fontSize={12} tickLine={false} axisLine={false} width={100} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: 'rgba(255,255,255,0.1)', color: '#f1f5f9' }}
                    itemStyle={{ color: chartColors.tertiary }}
                  />
                  <Bar dataKey="bookings" name="Total Bookings" fill={chartColors.tertiary} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
