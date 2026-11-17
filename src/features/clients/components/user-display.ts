interface DisplayableUser {
  email: string
  is_active: boolean
  is_locked: boolean
  created_at: string
  profile?: { first_name?: string | null; last_name?: string | null } | null
}

const dateFormatter = new Intl.DateTimeFormat('es-ES', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

export function formatRegistrationDate(value: string) {
  return dateFormatter.format(new Date(value))
}

export function getInitials(user: DisplayableUser) {
  const firstName = user.profile?.first_name?.[0] ?? ''
  const lastName = user.profile?.last_name?.[0] ?? ''
  const initials = `${firstName}${lastName}`.trim().toUpperCase()

  return initials || user.email.slice(0, 2).toUpperCase()
}

/** Bloqueada gana a activa; el texto lleva el significado, el color solo decora. */
export function getUserStatus(user: Pick<DisplayableUser, 'is_active' | 'is_locked'>) {
  if (user.is_locked) {
    return { variant: 'danger', label: 'Bloqueada' } as const
  }

  return user.is_active
    ? ({ variant: 'success', label: 'Activa' } as const)
    : ({ variant: 'neutral', label: 'Inactiva' } as const)
}
