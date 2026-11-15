import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ClientsPageHeaderProps {
  title: string
  description: string
  countLabel: string
  createLabel: string
  onCreate: () => void
}

export function ClientsPageHeader({ title, description, countLabel, createLabel, onCreate }: ClientsPageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-card p-6 shadow-none sm:shadow-sm lg:flex-row lg:items-center lg:justify-between">
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.24em] text-accent-text">Gestión de usuarios</p>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">{title}</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p>
        </div>
        <p className="text-sm text-muted-foreground">{countLabel}</p>
      </div>

      <Button onClick={onCreate} className="lg:self-start">
        <Plus className="h-4 w-4" />
        {createLabel}
      </Button>
    </div>
  )
}
