import { Dumbbell, HeartPulse, MessageSquareText, Salad, Sparkles } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatAverageDailySteps, formatRecapOption, type RecapItem } from '../types'
import { RecapDetailField } from './recap-detail-field'
import { formatNotes } from './recap-detail-format'
import { RecapSectionCard } from './recap-section-card'

export function RecapDetailTabs({ recap }: { recap: RecapItem }) {
  return (
    <Tabs defaultValue="training" className="space-y-4">
      <TabsList className="grid h-auto w-full grid-cols-2 gap-2 bg-transparent p-0 lg:grid-cols-5">
        <TabsTrigger className="rounded-xl border border-border bg-card py-3 data-[state=active]:border-brand-primary/40 data-[state=active]:bg-brand-soft/10 data-[state=active]:text-accent-text" value="training">
          Entreno
        </TabsTrigger>
        <TabsTrigger className="rounded-xl border border-border bg-card py-3 data-[state=active]:border-brand-primary/40 data-[state=active]:bg-brand-soft/10 data-[state=active]:text-accent-text" value="nutrition">
          Nutrición
        </TabsTrigger>
        <TabsTrigger className="rounded-xl border border-border bg-card py-3 data-[state=active]:border-brand-primary/40 data-[state=active]:bg-brand-soft/10 data-[state=active]:text-accent-text" value="recovery">
          Recuperación
        </TabsTrigger>
        <TabsTrigger className="rounded-xl border border-border bg-card py-3 data-[state=active]:border-brand-primary/40 data-[state=active]:bg-brand-soft/10 data-[state=active]:text-accent-text" value="general">
          General
        </TabsTrigger>
        <TabsTrigger className="rounded-xl border border-border bg-card py-3 data-[state=active]:border-brand-primary/40 data-[state=active]:bg-brand-soft/10 data-[state=active]:text-accent-text" value="improvement">
          Mejora
        </TabsTrigger>
      </TabsList>

      <TabsContent value="training">
        <RecapSectionCard
          title="Entrenos"
          description="Resumen del rendimiento y la percepción de la semana de entreno."
          action={<Dumbbell className="h-5 w-5 text-accent-text" />}
        >
          <div className="grid gap-3 md:grid-cols-2">
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
          title="Nutrición"
          description="Calidad de alimentación, hidratación y observaciones nutricionales."
          action={<Salad className="h-5 w-5 text-accent-text" />}
        >
          <div className="grid gap-3 md:grid-cols-2">
            <RecapDetailField label="Calidad de alimentación" value={formatRecapOption(recap.nutrition_quality)} />
            <RecapDetailField label="Calidad de comidas" value={recap.food_quality?.toString() ?? 'No indicado'} />
            <RecapDetailField label="Hidratación activada" value={recap.hydration_enabled ? 'Sí' : 'No'} />
            <RecapDetailField label="Nivel de hidratación" value={formatRecapOption(recap.hydration_level)} />
            <div className="md:col-span-2">
              <RecapDetailField label="Notas" value={formatNotes(recap.nutrition_notes)} />
            </div>
          </div>
        </RecapSectionCard>
      </TabsContent>

      <TabsContent value="recovery">
        <RecapSectionCard
          title="Recuperación y hábitos"
          description="Sueño, fatiga y molestias reportadas durante la semana."
          action={<HeartPulse className="h-5 w-5 text-accent-text" />}
        >
          <div className="grid gap-3 md:grid-cols-2">
            <RecapDetailField label="Horas de sueño" value={formatRecapOption(recap.sleep_hours_range)} />
            <RecapDetailField label="Fatiga" value={formatRecapOption(recap.fatigue_level)} />
            <RecapDetailField label="Intensidad del dolor" value={formatRecapOption(recap.pain_intensity)} />
            <div className="rounded-xl border border-border/70 bg-background px-4 py-3 md:col-span-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Zonas con dolor muscular
              </p>
              {recap.muscle_pain_zones.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {recap.muscle_pain_zones.map((zone) => (
                    <span
                      key={zone}
                      className="inline-flex rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-foreground"
                    >
                      {formatRecapOption(zone)}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-1 text-sm text-muted-foreground">Sin zonas reportadas.</p>
              )}
            </div>
            <div className="md:col-span-2">
              <RecapDetailField label="Notas" value={formatNotes(recap.recovery_notes)} />
            </div>
          </div>
        </RecapSectionCard>
      </TabsContent>

      <TabsContent value="general">
        <RecapSectionCard
          title="Sensaciones generales"
          description="Estado de ánimo, estrés y sensación global de la semana."
          action={<MessageSquareText className="h-5 w-5 text-accent-text" />}
        >
          <div className="grid gap-3 md:grid-cols-2">
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
          title="Ayúdanos a mejorar"
          description="Valoraciones del servicio y feedback abierto sobre la experiencia."
          action={<Sparkles className="h-5 w-5 text-accent-text" />}
        >
          <div className="grid gap-3 md:grid-cols-2">
            <RecapDetailField
              label="Valoración del servicio"
              value={recap.improvement_service_rating?.toString() ?? 'No indicado'}
            />
            <RecapDetailField
              label="Valoración de la app"
              value={recap.improvement_app_rating?.toString() ?? 'No indicado'}
            />
            <div className="rounded-xl border border-border/70 bg-background px-4 py-3 md:col-span-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Áreas de mejora
              </p>
              {recap.improvement_areas.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {recap.improvement_areas.map((area) => (
                    <span
                      key={area}
                      className="inline-flex rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-foreground"
                    >
                      {formatRecapOption(area)}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-1 text-sm text-muted-foreground">Sin áreas destacadas.</p>
              )}
            </div>
            <div className="md:col-span-2">
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
