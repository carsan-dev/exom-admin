import { getChallengeProgressVariant } from '../types'

export function formatDeadline(deadline: string | null) {
  if (!deadline) {
    return 'Sin fecha límite'
  }

  return new Date(deadline).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function getProgressClass(variant: ReturnType<typeof getChallengeProgressVariant>) {
  if (variant === 'complete') {
    return 'bg-status-success'
  }

  if (variant === 'active') {
    return 'bg-brand-primary'
  }

  return 'bg-muted-foreground/40'
}
