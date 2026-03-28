import { CalendarClock, Flame, Trophy } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { Streak } from '../types'

interface ClientStreakCardProps {
  streak: Streak | null
}

const dateFormatter = new Intl.DateTimeFormat('es-ES', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
})

export function ClientStreakCard({ streak }: ClientStreakCardProps) {
  if (!streak) {
    return (
      <Card>
        <CardContent className="pt-6 text-sm text-muted-foreground">
          El cliente todavia no tiene una racha registrada.
        </CardContent>
      </Card>
    )
  }

  const items = [
    {
      label: 'Racha actual',
      value: `${streak.current_days} dias`,
      icon: Flame,
      accent: 'text-status-warning',
    },
    {
      label: 'Mejor record',
      value: `${streak.longest_days} dias`,
      icon: Trophy,
      accent: 'text-brand-primary',
    },
    {
      label: 'Ultima actividad',
      value: streak.last_active_date ? dateFormatter.format(new Date(streak.last_active_date)) : 'Sin actividad',
      icon: CalendarClock,
      accent: 'text-status-info',
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Racha del cliente</CardTitle>
        <CardDescription>Actividad reciente y mejor consistencia historica</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-3">
        {items.map((item) => {
          const Icon = item.icon

          return (
            <div key={item.label} className="rounded-xl border border-border/60 bg-background/60 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Icon className={`h-4 w-4 ${item.accent}`} />
                {item.label}
              </div>
              <p className="mt-3 text-2xl font-semibold text-foreground">{item.value}</p>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
