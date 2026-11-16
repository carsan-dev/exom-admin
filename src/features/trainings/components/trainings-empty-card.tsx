import { Dumbbell, Plus } from 'lucide-react'
import { EmptyState } from '@/components/page'
import { Button } from '@/components/ui/button'

interface TrainingsEmptyCardProps {
  onCreate: () => void
}

export function TrainingsEmptyCard({ onCreate }: TrainingsEmptyCardProps) {
  return (
    <EmptyState
      className="border-y border-border"
      icon={<Dumbbell />}
      title="Aún no hay entrenamientos"
      description="Crea el primer entrenamiento para empezar a asignarlo a tus clientes."
      action={
        <Button onClick={onCreate}>
          <Plus className="h-4 w-4" />
          Crear primer entrenamiento
        </Button>
      }
    />
  )
}
