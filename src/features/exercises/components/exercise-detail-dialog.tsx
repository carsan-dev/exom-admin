import { useState } from 'react'
import { ChevronDown, ChevronUp, Copy, Edit, Video } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { getLevelBadgeClass, LEVEL_LABELS, type Exercise } from '../types'

interface ExerciseDetailDialogProps {
  exercise: Exercise | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit?: (exercise: Exercise) => void
  onDuplicate?: (exercise: Exercise) => void
}

interface CollapsibleSectionProps {
  title: string
  content: string | null
}

function CollapsibleSection({ title, content }: CollapsibleSectionProps) {
  const [open, setOpen] = useState(false)

  if (!content) return null

  return (
    <div className="rounded-lg border border-border/60">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
      >
        {title}
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>
      {open && (
        <div className="border-t border-border/60 px-4 py-3">
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">{content}</p>
        </div>
      )}
    </div>
  )
}

export function ExerciseDetailDialog({ exercise, open, onOpenChange, onEdit, onDuplicate }: ExerciseDetailDialogProps) {
  if (!exercise) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] overflow-x-hidden overflow-y-auto p-4 sm:max-w-2xl sm:p-6">
        <DialogHeader>
          <DialogTitle className="pr-8">{exercise.name}</DialogTitle>
        </DialogHeader>

        <div className="min-w-0 space-y-4">
          {/* Level badge */}
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={getLevelBadgeClass(exercise.level)}>
              {LEVEL_LABELS[exercise.level]}
            </Badge>
          </div>

          <Separator />

          {/* Muscle groups */}
          {exercise.muscle_groups.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Grupos musculares</p>
              <div className="flex flex-wrap gap-1.5">
                {exercise.muscle_groups.map((group) => (
                  <Badge key={group} variant="outline" className="border-brand-soft/40 bg-brand-soft/10 text-brand-primary">
                    {group}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Equipment */}
          {exercise.equipment.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Equipamiento</p>
              <div className="flex flex-wrap gap-1.5">
                {exercise.equipment.map((item) => (
                  <Badge key={item} variant="outline" className="border-border bg-muted text-muted-foreground">
                    {item}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Video */}
          {exercise.video_url ? (
            <div className="space-y-1.5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Video</p>
              <div className="min-w-0 overflow-hidden rounded-lg border border-border/60 bg-muted">
                <video
                  src={exercise.video_url}
                  controls
                  poster={exercise.thumbnail_url ?? undefined}
                  className="block aspect-video max-h-64 w-full max-w-full bg-black object-contain"
                  preload="metadata"
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-lg border border-dashed border-border/60 px-4 py-3 text-sm text-muted-foreground">
              <Video className="h-4 w-4" />
              Sin video adjunto
            </div>
          )}

          {/* Collapsible text sections */}
          <div className="space-y-2">
            <CollapsibleSection title="Técnica" content={exercise.technique_text} />
            <CollapsibleSection title="Errores comunes" content={exercise.common_errors_text} />
            <CollapsibleSection title="Explicación" content={exercise.explanation_text} />
          </div>

          {/* Footer actions */}
          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
            {onDuplicate && (
              <Button
                variant="outline"
                onClick={() => {
                  onOpenChange(false)
                  onDuplicate(exercise)
                }}
              >
                <Copy className="h-4 w-4" />
                Duplicar
              </Button>
            )}
            {onEdit && (
              <Button
                onClick={() => {
                  onOpenChange(false)
                  onEdit(exercise)
                }}
              >
                <Edit className="h-4 w-4" />
                Editar
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
