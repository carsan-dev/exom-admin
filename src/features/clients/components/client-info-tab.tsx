import { useState } from 'react'
import { Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/page'
import { LEVEL_LABELS, type ClientProfile } from '../types'
import { EditClientProfileDialog } from './edit-client-profile-dialog'

interface ClientInfoTabProps {
  profile: ClientProfile | null
  clientId: string
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

export function ClientInfoTab({ profile, clientId }: ClientInfoTabProps) {
  const [editProfileOpen, setEditProfileOpen] = useState(false)

  if (!profile) {
    return (
      <>
        <div className="border-y border-border">
          <EmptyState
            title="Este cliente todavía no tiene datos de perfil ampliados."
            action={
              <Button size="sm" variant="outline" onClick={() => setEditProfileOpen(true)}>
                <Pencil className="mr-2 h-4 w-4" />
                Añadir datos
              </Button>
            }
          />
        </div>
        <EditClientProfileDialog
          open={editProfileOpen}
          onOpenChange={setEditProfileOpen}
          clientId={clientId}
          profile={null}
        />
      </>
    )
  }

  const sections = [
    { label: 'Nivel', value: LEVEL_LABELS[profile.level] },
    { label: 'Peso actual', value: formatMetric(profile.current_weight, 'kg') },
    { label: 'Altura', value: formatMetric(profile.height, 'cm') },
    {
      label: 'Calorías objetivo',
      value: profile.target_calories ? `${profile.target_calories} kcal` : 'Sin registrar',
    },
    { label: 'Objetivo de masa muscular', value: formatMetric(profile.muscle_mass_goal, 'kg') },
    { label: 'Fecha de nacimiento', value: formatDate(profile.birth_date) },
    { label: 'Creado', value: formatDate(profile.created_at) },
    { label: 'Última actualización', value: formatDate(profile.updated_at) },
  ]

  return (
    <div className="space-y-8">
      <section aria-labelledby="client-goal-title">
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
          <div className="min-w-0 flex-[1_1_16rem]">
            <h2 id="client-goal-title" className="font-display text-xl font-extrabold uppercase leading-none text-foreground">Objetivo principal</h2>
            <p className="mt-1 text-[13px] leading-5 text-foreground-secondary">Motivación y foco actual del cliente</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => setEditProfileOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            Editar datos
          </Button>
        </div>
        <p className="mt-4 max-w-[72ch] text-sm leading-6 text-foreground [overflow-wrap:anywhere]">
          {profile.main_goal || 'El cliente todavía no ha definido un objetivo principal.'}
        </p>
      </section>

      <dl aria-label="Datos del perfil" className="grid grid-cols-1 border-y border-border sm:grid-cols-2 xl:grid-cols-4">
        {sections.map((section) => (
          <div key={section.label} className="-ml-px -mt-px min-w-0 border-l border-t border-border px-5 py-4">
            <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-foreground-muted">{section.label}</dt>
            <dd className="mt-2 text-lg font-semibold text-foreground [overflow-wrap:anywhere]">{section.value}</dd>
          </div>
        ))}
      </dl>

      <EditClientProfileDialog
        open={editProfileOpen}
        onOpenChange={setEditProfileOpen}
        clientId={clientId}
        profile={profile}
      />
    </div>
  )
}
