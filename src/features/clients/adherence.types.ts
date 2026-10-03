// Public v1 DTO from AdherenceEvaluationService; no private prescription payload.
export const ADHERENCE_STATUS = {
  EVALUABLE: 'evaluable', INSUFFICIENT: 'insufficient', NOT_APPLICABLE: 'not_applicable', NEUTRAL: 'neutral',
} as const
export type AdherenceStatus = (typeof ADHERENCE_STATUS)[keyof typeof ADHERENCE_STATUS]
export const PERIOD = { CLOSED: 'closed', PROVISIONAL: 'provisional', FUTURE: 'future' } as const
export type Period = (typeof PERIOD)[keyof typeof PERIOD]
export const BASIS = { ORIGINAL: 'original', CURRENT: 'current_provisional', UNKNOWN: 'unknown' } as const
export type Basis = (typeof BASIS)[keyof typeof BASIS]
export const CALENDAR = {
  FUTURE: 'future', INSUFFICIENT: 'insufficient', REST: 'rest', NOT_ASSIGNED: 'not_assigned',
  COMPLETE: 'complete', INCOMPLETE: 'incomplete', PARTIAL: 'partial',
} as const
export type CalendarStatus = (typeof CALENDAR)[keyof typeof CALENDAR]
export const SCHEDULE = { REST: 'rest', ASSIGNED: 'assigned', NOT_ASSIGNED: 'not_assigned', UNKNOWN: 'unknown' } as const
export type ScheduleStatus = (typeof SCHEDULE)[keyof typeof SCHEDULE]
export const INDICATOR = { MET: 'met', BELOW: 'below', ABOVE: 'above', INSUFFICIENT: 'insufficient', NOT_APPLICABLE: 'not_applicable' } as const
export type IndicatorStatus = (typeof INDICATOR)[keyof typeof INDICATOR]
export const GLOBAL_SOURCE = { BOTH: 'both', TRAINING_ONLY: 'training_only', NUTRITION_ONLY: 'nutrition_only', NONE: 'none' } as const
export type GlobalSource = (typeof GLOBAL_SOURCE)[keyof typeof GLOBAL_SOURCE]
export interface ComponentAdherence {
  status: AdherenceStatus
  numerator: number
  denominator: number
  ratio: number | null
  caveats: string[]
}
export interface GlobalAdherence extends ComponentAdherence { source: GlobalSource }
export interface ClosedAggregate {
  training: ComponentAdherence
  nutrition: ComponentAdherence
  global: GlobalAdherence
}
export interface DailyEvaluation extends ClosedAggregate {
  date: string
  period: Period
  includeInClosedAggregate: boolean
}
export interface TargetIndicator { status: IndicatorStatus }
export interface TargetIndicators { calories: TargetIndicator; protein: TargetIndicator; weeklySteps: TargetIndicator }
export interface NutritionTargets { calories: number | null; protein_g: number | null }
export interface Intake { estimated_calories: number | null; estimated_protein_g: number | null }
export interface EvaluationConfiguration { known: boolean; version: number | null; low_global_percent: number | null }
export interface EvaluationSchedule { training: ScheduleStatus; nutrition: ScheduleStatus }
export interface AdherenceDay {
  date: string
  revision: number | null
  basis: Basis
  evaluation: DailyEvaluation
  indicators: TargetIndicators
  intake: Intake
  calendar: CalendarStatus
  targets: NutritionTargets
  configuration: EvaluationConfiguration
  schedule: EvaluationSchedule
}
export interface WeeklyStepTarget {
  date: string
  goal: number | null
  steps_min_percent: number | null
  version: number | null
  effective_date: string | null
  status: IndicatorStatus
}
export interface WeeklyStepsIndicator extends TargetIndicator { threshold: number | null }
export interface AdherenceWeek {
  start: string
  average_daily_steps: number | null
  weeklySteps: WeeklyStepsIndicator
  dailyTargets: WeeklyStepTarget[]
  aggregate: ClosedAggregate
}
export interface AdherenceReport {
  version: 1
  start: string
  end: string
  evaluated_at: string
  today: string
  days: AdherenceDay[]
  weeks: AdherenceWeek[]
  aggregate: ClosedAggregate
}
export interface AdherenceRange { start: string; end: string }
export interface ConfigValues {
  steps_goal: number | null
  calorie_lower_percent: number
  calorie_upper_percent: number
  protein_min_percent: number
  steps_min_percent: number
  low_global_percent: number
}
export const CONFIG_SOURCE = { REVISION: 'revision', DEFAULT: 'default', UNCAPTURED: 'uncaptured' } as const
export interface KnownConfig extends ConfigValues {
  version: number
  known: true
  source: typeof CONFIG_SOURCE.REVISION | typeof CONFIG_SOURCE.DEFAULT
  effective_date: string | null
}
export interface UnknownConfig {
  version: number
  known: false
  source: typeof CONFIG_SOURCE.UNCAPTURED
  effective_date: null
}
export type AdherenceConfig = KnownConfig | UnknownConfig
export interface UpdateAdherenceConfig extends ConfigValues { effective_date: string; expected_version: number }
