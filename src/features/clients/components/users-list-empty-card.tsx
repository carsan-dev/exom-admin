import { Plus, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface UsersListEmptyCardProps {
  title: string
  description: string
  actionLabel: string
  onAction: () => void
}

export function UsersListEmptyCard({ title, description, actionLabel, onAction }: UsersListEmptyCardProps) {
  return (
    <Card className="border-dashed border-border/70">
      <CardContent className="flex flex-col items-center gap-4 pt-10 text-center">
        <div className="rounded-full bg-brand-soft/10 p-4 text-accent-text">
          <Users className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-foreground">{title}</h2>
          <p className="max-w-xl text-sm text-muted-foreground">{description}</p>
        </div>
        <Button onClick={onAction}>
          <Plus className="h-4 w-4" />
          {actionLabel}
        </Button>
      </CardContent>
    </Card>
  )
}
