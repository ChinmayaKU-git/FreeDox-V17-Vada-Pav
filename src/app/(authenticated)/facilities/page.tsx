'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import FacilityCard from '@/components/FacilityCard'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Facility = {
  id: string
  name: string
  category: string
  capacity: number
  location: string
  requires_approval: boolean
}

export default function FacilitiesPage() {
  const router = useRouter()
  const [category, setCategory] = useState<string>('All')
  const [minCapacity, setMinCapacity] = useState<string>('')

  const { data: facilities, isLoading } = useQuery<Facility[]>({
    queryKey: ['facilities'],
    queryFn: async () => {
      const res = await fetch('/api/facilities')
      if (!res.ok) throw new Error('Failed to fetch facilities')
      return res.json()
    }
  })

  const filteredFacilities = facilities?.filter(f => {
    if (category !== 'All' && f.category !== category) return false
    if (minCapacity && f.capacity < parseInt(minCapacity)) return false
    return true
  })

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-200">Explore Facilities</h1>
          <p className="text-slate-400 mt-1">Find and book the perfect space for your needs</p>
        </div>
        
        <div className="flex items-center gap-4 bg-white/5 p-2 rounded-lg border border-white/10 backdrop-blur-md">
          <div className="space-y-1">
            <Label className="text-xs text-slate-400 px-1">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-[180px] bg-slate-900/50 border-white/10 text-slate-200 h-9">
                <SelectValue placeholder="Select Category" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/10 text-slate-200">
                <SelectItem value="All">All Categories</SelectItem>
                <SelectItem value="Seminar Hall">Seminar Hall</SelectItem>
                <SelectItem value="Maker Space">Maker Space</SelectItem>
                <SelectItem value="Conference Room">Conference Room</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-1">
            <Label className="text-xs text-slate-400 px-1">Min Capacity</Label>
            <Input 
              type="number" 
              placeholder="e.g. 10" 
              value={minCapacity}
              onChange={(e) => setMinCapacity(e.target.value)}
              className="w-[120px] bg-slate-900/50 border-white/10 text-slate-200 h-9"
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="h-48 rounded-xl bg-white/5 animate-pulse border border-white/10" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredFacilities?.map(facility => (
            <FacilityCard 
              key={facility.id} 
              facility={facility} 
              onClick={() => router.push(`/facilities/${facility.id}`)} 
            />
          ))}
          {filteredFacilities?.length === 0 && (
            <div className="col-span-full py-12 text-center text-slate-500">
              No facilities found matching your criteria.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
