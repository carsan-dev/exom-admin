import { Plus } from 'lucide-react'
import { PageHeader } from '@/components/page'
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
    <PageHeader
      eyebrow="Gestión de usuarios"
      title={title}
      description={
        <>
          {description}
          <span className="mt-1 block tabular-nums text-foreground-muted">{countLabel}</span>
        </>
      }
      actions={
        <Button onClick={onCreate} className="max-md:h-11">
          <Plus aria-hidden="true" className="h-4 w-4" />
          {createLabel}
        </Button>
      }
    />
  )
}
