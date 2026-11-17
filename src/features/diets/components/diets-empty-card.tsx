import { Plus, UtensilsCrossed } from 'lucide-react'
import { EmptyState } from '@/components/page'
import { Button } from '@/components/ui/button'

interface DietsEmptyCardProps {
  onCreate: () => void
}

export function DietsEmptyCard({ onCreate }: DietsEmptyCardProps) {
  return (
    <EmptyState
      className="border-y border-border"
      icon={<UtensilsCrossed aria-hidden="true" />}
      title="Aún no hay dietas"
      description="Crea la primera dieta para empezar a asignarla a tus clientes."
      action={
        <Button onClick={onCreate}>
          <Plus aria-hidden="true" className="h-4 w-4" />
          Crear primera dieta
        </Button>
      }
    />
  )
}
