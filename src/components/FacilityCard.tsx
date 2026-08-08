import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'

type FacilityCardProps = {
  facility: {
    id: string
    name: string
    category: string
    capacity: number
    location: string
    requires_approval: boolean
  }
  onClick?: () => void
}

export default function FacilityCard({ facility, onClick }: FacilityCardProps) {
  const getGradient = (category: string) => {
    switch(category) {
      case 'Seminar Hall': return 'from-blue-500/20 to-purple-500/20 group-hover:from-blue-500/30 group-hover:to-purple-500/30'
      case 'Maker Space': return 'from-emerald-500/20 to-teal-500/20 group-hover:from-emerald-500/30 group-hover:to-teal-500/30'
      case 'Conference Room': return 'from-amber-500/20 to-orange-500/20 group-hover:from-amber-500/30 group-hover:to-orange-500/30'
      default: return 'from-slate-500/20 to-slate-400/20 group-hover:from-slate-500/30 group-hover:to-slate-400/30'
    }
  }

  const getBadgeVariant = (category: string) => {
    switch(category) {
      case 'Seminar Hall': return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
      case 'Maker Space': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
      case 'Conference Room': return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20'
    }
  }

  return (
    <Card 
      onClick={onClick}
      className={cn(
        "group relative overflow-hidden bg-slate-900/50 backdrop-blur-sm border-white/10 transition-all duration-300",
        onClick && "cursor-pointer hover:scale-[1.02] hover:shadow-xl hover:border-white/20"
      )}
    >
      <div className={cn("absolute inset-0 bg-gradient-to-br opacity-50 transition-colors", getGradient(facility.category))} />
      
      <CardHeader className="relative z-10 pb-4 border-b border-white/5">
        <div className="flex justify-between items-start gap-2">
          <CardTitle className="text-xl font-bold text-slate-200 leading-tight">
            {facility.name}
          </CardTitle>
          <Badge variant="outline" className={cn("whitespace-nowrap", getBadgeVariant(facility.category))}>
            {facility.category}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="relative z-10 pt-4 space-y-3">
        <div className="flex items-center text-slate-400 text-sm">
          <MapPin className="w-4 h-4 mr-2 opacity-70" />
          {facility.location}
        </div>
        <div className="flex items-center text-slate-400 text-sm">
          <Users className="w-4 h-4 mr-2 opacity-70" />
          Up to {facility.capacity} people
        </div>
        
        <div className="mt-4 pt-4 border-t border-white/5">
          {facility.requires_approval ? (
            <Badge variant="secondary" className="bg-white/5 text-slate-300 hover:bg-white/10">
              Requires Approval
            </Badge>
          ) : (
            <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20">
              Auto-approved
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
