import type { ReactNode } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface RecapSectionCardProps {
  title: string
  description: string
  action?: ReactNode
  children: ReactNode
}

export function RecapSectionCard({ title, description, action, children }: RecapSectionCardProps) {
  return (
    <Card className="border-border/70">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <CardTitle className="text-lg">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        {action}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}
