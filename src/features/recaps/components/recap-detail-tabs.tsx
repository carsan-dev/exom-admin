import { Dumbbell, HeartPulse, MessageSquareText, Salad, Sparkles } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tag } from '@/components/ui/tag'
import { formatAverageDailySteps, formatRecapOption, type RecapItem } from '../types'
import { RecapDetailField } from './recap-detail-field'
import { formatNotes } from './recap-detail-format'
import { RecapSectionCard } from './recap-section-card'

const TAB_TRIGGER_CLASS = 'min-h-11 shrink-0 md:min-h-10'
const FIELDS_CLASS = 'grid gap-x-8 md:grid-cols-2'
const ICON_CLASS = 'h-5 w-5 shrink-0 text-accent-text'

function RecapTagList({ label, items, emptyCopy }: { label: string; items: string[]; emptyCopy: string }) {
  return (
    <div className="min-w-0 border-t border-border py-3 md:col-span-2">
      <p className="text-[11px] font-semibold uppercase leading-4 tracking-[0.1em] text-foreground-muted">{label}</p>
      {items.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {items.map((item) => (
            <Tag key={item} className="h-auto min-h-6 max-w-full whitespace-normal py-1 [overflow-wrap:anywhere]">
              {formatRecapOption(item)}
            </Tag>
          ))}
        </div>
      ) : (
        <p className="mt-1 text-sm text-muted-foreground">{emptyCopy}</p>
      )}
    </div>
  )
}

export function RecapDetailTabs({ recap }: { recap: RecapItem }) {
  return (
    <Tabs defaultValue="training" className="space-y-6">
      <TabsList className="h-auto w-full max-w-full justify-start gap-1 overflow-x-auto">
        <TabsTrigger className={TAB_TRIGGER_CLASS} value="training">
          Entreno
        </TabsTrigger>
        <TabsTrigger className={TAB_TRIGGER_CLASS} value="nutrition">
          Nutrición
        </TabsTrigger>
        <TabsTrigger className={TAB_TRIGGER_CLASS} value="recovery">
          Recuperación
        </TabsTrigger>
        <TabsTrigger className={TAB_TRIGGER_CLASS} value="general">
          General
        </TabsTrigger>
        <TabsTrigger className={TAB_TRIGGER_CLASS} value="improvement">
          Mejora
        </TabsTrigger>
      </TabsList>

      <TabsContent value="training">
        <RecapSectionCard
          flush
          title="Entrenos"
          description="Resumen del rendimiento y la percepción de la semana de entreno."
          action={<Dumbbell aria-hidden="true" className={ICON_CLASS} />}
        >
          <div className={FIELDS_CLASS}>
            <RecapDetailField label="Esfuerzo semanal" value={recap.training_effort?.toString() ?? 'No indicado'} />
            <RecapDetailField
              label="Sesiones completadas"
              value={recap.training_sessions?.toString() ?? 'No indicado'}
            />
            <RecapDetailField
              label="Media diaria de pasos"
              value={formatAverageDailySteps(recap.average_daily_steps, true)}
            />
            <RecapDetailField label="Progreso" value={formatRecapOption(recap.training_progress)} />
            <RecapDetailField label="Notas" value={formatNotes(recap.training_notes)} />
          </div>
        </RecapSectionCard>
      </TabsContent>

      <TabsContent value="nutrition">
        <RecapSectionCard
          flush
          title="Nutrición"
          description="Calidad de alimentación, hidratación y observaciones nutricionales."
          action={<Salad aria-hidden="true" className={ICON_CLASS} />}
        >
          <div className={FIELDS_CLASS}>
            <RecapDetailField label="Calidad de alimentación" value={formatRecapOption(recap.nutrition_quality)} />
            <RecapDetailField label="Calidad de comidas" value={recap.food_quality?.toString() ?? 'No indicado'} />
            <RecapDetailField label="Hidratación activada" value={recap.hydration_enabled ? 'Sí' : 'No'} />
            <RecapDetailField label="Nivel de hidratación" value={formatRecapOption(recap.hydration_level)} />
            <div className="min-w-0 md:col-span-2">
              <RecapDetailField label="Notas" value={formatNotes(recap.nutrition_notes)} />
            </div>
          </div>
        </RecapSectionCard>
      </TabsContent>

      <TabsContent value="recovery">
        <RecapSectionCard
          flush
          title="Recuperación y hábitos"
          description="Sueño, fatiga y molestias reportadas durante la semana."
          action={<HeartPulse aria-hidden="true" className={ICON_CLASS} />}
        >
          <div className={FIELDS_CLASS}>
            <RecapDetailField label="Horas de sueño" value={formatRecapOption(recap.sleep_hours_range)} />
            <RecapDetailField label="Fatiga" value={formatRecapOption(recap.fatigue_level)} />
            <RecapDetailField label="Intensidad del dolor" value={formatRecapOption(recap.pain_intensity)} />
            <RecapTagList
              label="Zonas con dolor muscular"
              items={recap.muscle_pain_zones}
              emptyCopy="Sin zonas reportadas."
            />
            <div className="min-w-0 md:col-span-2">
              <RecapDetailField label="Notas" value={formatNotes(recap.recovery_notes)} />
            </div>
          </div>
        </RecapSectionCard>
      </TabsContent>

      <TabsContent value="general">
        <RecapSectionCard
          flush
          title="Sensaciones generales"
          description="Estado de ánimo, estrés y sensación global de la semana."
          action={<MessageSquareText aria-hidden="true" className={ICON_CLASS} />}
        >
          <div className={FIELDS_CLASS}>
            <RecapDetailField label="Estado de ánimo" value={formatRecapOption(recap.mood)} />
            <RecapDetailField label="Estrés activado" value={recap.stress_enabled ? 'Sí' : 'No'} />
            <RecapDetailField label="Nivel de estrés" value={recap.stress_level?.toString() ?? 'No indicado'} />
            <RecapDetailField label="Hambre semanal (1 sin hambre – 10 extrema)" value={recap.hunger_level?.toString() ?? 'No indicado'} />
            <RecapDetailField label="Energía semanal (1 sin energía – 10 mucha)" value={recap.energy_level?.toString() ?? 'No indicado'} />
            <RecapDetailField label="Digestión semanal (1 muy mala – 10 muy buena)" value={recap.digestion_level?.toString() ?? 'No indicado'} />
            <RecapDetailField label="Notas" value={formatNotes(recap.general_notes)} />
          </div>
        </RecapSectionCard>
      </TabsContent>

      <TabsContent value="improvement">
        <RecapSectionCard
          flush
          title="Ayúdanos a mejorar"
          description="Valoraciones del servicio y feedback abierto sobre la experiencia."
          action={<Sparkles aria-hidden="true" className={ICON_CLASS} />}
        >
          <div className={FIELDS_CLASS}>
            <RecapDetailField
              label="Valoración del servicio"
              value={recap.improvement_service_rating?.toString() ?? 'No indicado'}
            />
            <RecapDetailField
              label="Valoración de la app"
              value={recap.improvement_app_rating?.toString() ?? 'No indicado'}
            />
            <RecapTagList
              label="Áreas de mejora"
              items={recap.improvement_areas}
              emptyCopy="Sin áreas destacadas."
            />
            <div className="min-w-0 md:col-span-2">
              <RecapDetailField
                label="Comentario del cliente"
                value={formatNotes(recap.improvement_feedback_text, 'Sin comentario adicional')}
              />
            </div>
          </div>
        </RecapSectionCard>
      </TabsContent>
    </Tabs>
  )
}
