import { Plus, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface UsersListEmptyCardProps {
  title: string
  description: string
  actionLabel: string
  onAction: () => void
}

/**
 * Mismo aspecto que EmptyState, pero con el título como h2: la página lo localiza por
 * ese encabezado y EmptyState lo pinta como párrafo.
 */
export function UsersListEmptyCard({ title, description, actionLabel, onAction }: UsersListEmptyCardProps) {
  return (
    <div className="flex flex-col items-center border-y border-border px-6 pb-14 pt-12 text-center">
      <div aria-hidden="true" className="mb-6 text-foreground-muted [&_svg]:size-8">
        <Users aria-hidden="true" />
      </div>
      <h2 className="text-base font-semibold leading-6 text-foreground">{title}</h2>
      <p className="mt-1 max-w-[46ch] text-[13px] leading-5 text-foreground-secondary">{description}</p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <Button onClick={onAction} className="max-md:h-11">
          <Plus aria-hidden="true" className="h-4 w-4" />
          {actionLabel}
        </Button>
      </div>
    </div>
  )
}
