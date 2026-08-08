'use client'

import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

type User = {
  id: string
  name: string
  email: string
  role: 'Student' | 'Faculty' | 'Admin'
  department: string
}

export default function LoginPage() {
  const router = useRouter()
  
  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await fetch('/api/users')
      if (!res.ok) throw new Error('Failed to fetch users')
      return res.json()
    }
  })

  const handleLogin = async (userId: string) => {
    try {
      await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      router.push('/facilities')
    } catch (error) {
      console.error('Login failed', error)
    }
  }

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  const groupedUsers = users?.reduce((acc, user) => {
    if (!acc[user.role]) acc[user.role] = []
    acc[user.role].push(user)
    return acc
  }, {} as Record<string, User[]>) || {}

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-slate-950 relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-900/30 blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-900/30 blur-[120px]" />
      
      <div className="z-10 text-center mb-12">
        <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent mb-4">
          BookSpace
        </h1>
        <p className="text-slate-400 text-lg">Select a user to login</p>
      </div>

      <div className="z-10 w-full max-w-6xl space-y-12">
        {Object.entries(groupedUsers).map(([role, roleUsers]) => (
          <div key={role} className="space-y-4">
            <h2 className="text-2xl font-semibold text-slate-200 border-b border-white/10 pb-2">{role}s</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {roleUsers.map(user => (
                <Card 
                  key={user.id} 
                  className="bg-white/5 backdrop-blur-md border-white/10 hover:bg-white/10 transition-all duration-300 cursor-pointer hover:scale-105 hover:shadow-[0_0_30px_rgba(59,130,246,0.15)] group"
                  onClick={() => handleLogin(user.id)}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="flex justify-between items-center">
                      <span className="text-slate-200 group-hover:text-blue-400 transition-colors">{user.name}</span>
                      <Badge variant="outline" className="border-blue-500/30 text-blue-300">
                        {user.role}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-400">{user.email}</p>
                    <p className="text-xs text-slate-500 mt-2 font-medium">{user.department}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
