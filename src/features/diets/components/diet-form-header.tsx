import { DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface DietFormHeaderProps {
  title: string
  description: string
}

export function DietFormHeader({ title, description }: DietFormHeaderProps) {
  return (
    <DialogHeader className="pr-8">
      <DialogTitle>{title}</DialogTitle>
      <DialogDescription>{description}</DialogDescription>
    </DialogHeader>
  )
}
