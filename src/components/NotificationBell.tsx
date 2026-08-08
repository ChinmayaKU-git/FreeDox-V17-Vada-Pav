'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bell } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

type Notification = {
  id: string
  message: string
  isRead: boolean
  createdAt: string
}

export default function NotificationBell() {
  const queryClient = useQueryClient()

  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await fetch('/api/notifications')
      if (!res.ok) return []
      return res.json()
    },
    refetchInterval: 10000,
  })

  const markAsRead = useMutation({
    mutationFn: async (id?: string) => {
      await fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(id ? { id } : { all: true }),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    }
  })

  const unreadCount = notifications.filter(n => !n.isRead).length

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative hover:bg-white/10 rounded-full h-9 w-9">
          <Bell className="h-5 w-5 text-slate-300" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-blue-500 hover:bg-blue-600 rounded-full">
              {unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 bg-slate-900 border-white/10 shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h4 className="font-semibold text-slate-200">Notifications</h4>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => markAsRead.mutate(undefined)}
              className="text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-400/10 h-auto py-1"
            >
              Mark all read
            </Button>
          )}
        </div>
        <div className="max-h-[300px] overflow-y-auto p-2 space-y-1">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-slate-500">
              No new notifications
            </div>
          ) : (
            notifications.map((notif) => (
              <div 
                key={notif.id}
                onClick={() => !notif.isRead && markAsRead.mutate(notif.id)}
                className={`p-3 rounded-md text-sm transition-colors cursor-pointer ${
                  notif.isRead 
                    ? 'text-slate-400 hover:bg-white/5' 
                    : 'bg-blue-500/10 text-slate-200 hover:bg-blue-500/20'
                }`}
              >
                {notif.message}
                <div className="text-xs text-slate-500 mt-1">
                  {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
