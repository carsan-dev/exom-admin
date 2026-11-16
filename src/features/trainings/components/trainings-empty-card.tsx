import { Dumbbell, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface TrainingsEmptyCardProps {
  onCreate: () => void
}

export function TrainingsEmptyCard({ onCreate }: TrainingsEmptyCardProps) {
  return (
    <Card className="border-dashed border-border/70">
      <CardContent className="flex flex-col items-center gap-4 pt-10 text-center">
        <div className="rounded-full bg-brand-soft/10 p-4 text-accent-text">
          <Dumbbell className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-foreground">Aún no hay entrenamientos</h2>
          <p className="max-w-xl text-sm text-muted-foreground">
            Crea el primer entrenamiento para empezar a asignarlo a tus clientes.
          </p>
        </div>
        <Button onClick={onCreate}>
          <Plus className="h-4 w-4" />
          Crear primer entrenamiento
        </Button>
      </CardContent>
    </Card>
  )
}
