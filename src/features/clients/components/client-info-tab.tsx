import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LEVEL_LABELS, type ClientProfile } from '../types'

interface ClientInfoTabProps {
  profile: ClientProfile | null
}

const dateFormatter = new Intl.DateTimeFormat('es-ES', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
})

function formatMetric(value: number | null, unit: string) {
  if (value == null) {
    return 'Sin registrar'
  }

  return `${value} ${unit}`
}

function formatDate(value: string | null) {
  if (!value) {
    return 'Sin registrar'
  }

  return dateFormatter.format(new Date(value))
}

export function ClientInfoTab({ profile }: ClientInfoTabProps) {
  if (!profile) {
    return (
      <Card>
        <CardContent className="pt-6 text-sm text-muted-foreground">
          Este cliente todavía no tiene datos de perfil ampliados.
        </CardContent>
      </Card>
    )
  }

  const sections = [
    { label: 'Nivel', value: LEVEL_LABELS[profile.level] },
    { label: 'Peso actual', value: formatMetric(profile.current_weight, 'kg') },
    { label: 'Altura', value: formatMetric(profile.height, 'cm') },
    { label: 'Calorías objetivo', value: profile.target_calories ? `${profile.target_calories} kcal` : 'Sin registrar' },
    { label: 'Objetivo de masa muscular', value: formatMetric(profile.muscle_mass_goal, 'kg') },
    { label: 'Fecha de nacimiento', value: formatDate(profile.birth_date) },
    { label: 'Creado', value: formatDate(profile.created_at) },
    { label: 'Última actualización', value: formatDate(profile.updated_at) },
  ]

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Objetivo principal</CardTitle>
          <CardDescription>Motivación y foco actual del cliente</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-border/60 bg-background/60 p-4 text-sm leading-6 text-foreground">
            {profile.main_goal || 'El cliente todavía no ha definido un objetivo principal.'}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {sections.map((section) => (
          <Card key={section.label} className="border-border/70">
            <CardHeader className="pb-3">
              <CardDescription>{section.label}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold text-foreground">{section.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
