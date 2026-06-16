import { z } from 'zod'
import { normalizeSearchText } from '@/lib/search'
import { LEVEL_OPTIONS, type Exercise } from '../exercises/types'
import type { TrainingFormValues, TrainingItemFormValues } from './schemas'
import { normalizeTrainingTags } from './schemas'
import { DEFAULT_TRAINING_TYPE, normalizeTrainingTypes } from './types'

export interface TrainingImportResult {
  values: TrainingFormValues
  issues: string[]
}

const optionalInteger = z
  .union([z.number(), z.string(), z.null(), z.undefined()])
  .transform((value) => {
    if (value == null || value === '') return null
    const parsed = typeof value === 'number' ? value : Number(value)
    return Number.isFinite(parsed) ? Math.trunc(parsed) : Number.NaN
  })
  .refine((value) => value == null || Number.isFinite(value), 'Numero invalido')

const optionalText = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => value?.trim() ?? '')

const stringList = z.union([z.array(z.string()), z.string(), z.null(), z.undefined()]).transform((value) => {
  if (Array.isArray(value)) return value
  if (typeof value === 'string') {
    return value
      .split('|')
      .map((entry) => entry.trim())
      .filter(Boolean)
  }
  return []
})

const importExerciseSchema = z
  .object({
    kind: z.literal('EXERCISE').default('EXERCISE'),
    exercise_id: optionalText,
    exercise_name: optionalText,
    sets: optionalInteger.transform((value) => value ?? 3),
    reps_or_duration: z.string().trim().min(1, 'reps_or_duration es obligatorio'),
    rest_seconds: optionalInteger.transform((value) => value ?? 60),
  })
  .superRefine((value, context) => {
    if (!value.exercise_id && !value.exercise_name) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Cada ejercicio necesita exercise_id o exercise_name',
      })
    }
  })

const importCircuitExerciseSchema = z
  .object({
    exercise_id: optionalText,
    exercise_name: optionalText,
    reps_or_duration: z.string().trim().min(1, 'reps_or_duration es obligatorio'),
    rest_seconds: optionalInteger.transform((value) => value ?? 15),
  })
  .superRefine((value, context) => {
    if (!value.exercise_id && !value.exercise_name) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Cada ejercicio de circuito necesita exercise_id o exercise_name',
      })
    }
  })

const importCircuitSchema = z.object({
  kind: z.literal('CIRCUIT'),
  name: optionalText.transform((value) => value || 'Circuito'),
  rounds: optionalInteger.transform((value) => value ?? 3),
  rest_between_rounds_seconds: optionalInteger.transform((value) => value ?? 60),
  exercises: z.array(importCircuitExerciseSchema).min(1, 'Cada circuito necesita ejercicios'),
})

const importTrainingSchema = z.object({
  name: z.string().trim().min(1, 'name es obligatorio'),
  types: stringList.transform((types) => normalizeTrainingTypes(types)),
  accentColor: optionalText.nullable().transform((value) => value || null),
  level: z.enum(LEVEL_OPTIONS),
  estimated_duration_min: optionalInteger,
  estimated_calories: optionalInteger,
  warmup_description: optionalText,
  warmup_duration_min: optionalInteger,
  cooldown_description: optionalText,
  tags: stringList.transform((tags) => normalizeTrainingTags(tags)),
  items: z.array(z.union([importExerciseSchema, importCircuitSchema])).min(1),
})

type ImportTraining = z.infer<typeof importTrainingSchema>
type ImportExercise = z.infer<typeof importExerciseSchema>
type ImportCircuitExercise = z.infer<typeof importCircuitExerciseSchema>

function buildExerciseIndexes(exercises: Exercise[]) {
  const byName = new Map<string, Exercise[]>()

  for (const exercise of exercises) {
    const key = normalizeSearchText(exercise.name.trim())
    byName.set(key, [...(byName.get(key) ?? []), exercise])
  }

  return { byName }
}

function resolveExerciseId(
  exercise: Pick<ImportExercise | ImportCircuitExercise, 'exercise_id' | 'exercise_name'>,
  indexes: ReturnType<typeof buildExerciseIndexes>,
  issues: string[],
) {
  if (exercise.exercise_id) {
    return exercise.exercise_id
  }

  const exerciseName = exercise.exercise_name

  if (!exerciseName) {
    return ''
  }

  const matches = indexes.byName.get(normalizeSearchText(exerciseName))

  if (!matches?.length) {
    issues.push(`Ejercicio no encontrado: ${exerciseName}`)
    return ''
  }

  if (matches.length > 1) {
    issues.push(`Ejercicio ambiguo: ${exerciseName}`)
    return ''
  }

  return matches[0].id
}

function toFormValues(training: ImportTraining, exercises: Exercise[]): TrainingImportResult {
  const issues: string[] = []
  const indexes = buildExerciseIndexes(exercises)

  const items: TrainingItemFormValues[] = training.items.map((item, order) => {
    if (item.kind === 'CIRCUIT') {
      return {
        kind: 'CIRCUIT',
        order,
        name: item.name,
        rounds: item.rounds,
        rest_between_rounds_seconds: item.rest_between_rounds_seconds,
        exercises: item.exercises.map((exercise) => ({
          exercise_id: resolveExerciseId(exercise, indexes, issues),
          reps_or_duration: exercise.reps_or_duration,
          rest_seconds: exercise.rest_seconds,
        })),
      }
    }

    return {
      kind: 'EXERCISE',
      exercise_id: resolveExerciseId(item, indexes, issues),
      order,
      sets: item.sets,
      reps_or_duration: item.reps_or_duration,
      rest_seconds: item.rest_seconds,
    }
  })

  return {
    values: {
      name: training.name,
      types: training.types.length > 0 ? training.types : [DEFAULT_TRAINING_TYPE],
      accentColor: training.accentColor,
      level: training.level,
      estimated_duration_min: training.estimated_duration_min,
      estimated_calories: training.estimated_calories,
      warmup_description: training.warmup_description,
      warmup_duration_min: training.warmup_duration_min,
      cooldown_description: training.cooldown_description,
      tags: training.tags,
      items,
    },
    issues,
  }
}

function parseCsv(text: string) {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    const next = text[index + 1]

    if (char === '"' && quoted && next === '"') {
      field += '"'
      index += 1
      continue
    }

    if (char === '"') {
      quoted = !quoted
      continue
    }

    if (char === ',' && !quoted) {
      row.push(field)
      field = ''
      continue
    }

    if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') index += 1
      row.push(field)
      rows.push(row)
      row = []
      field = ''
      continue
    }

    field += char
  }

  row.push(field)
  rows.push(row)

  return rows.filter((entries) => entries.some((entry) => entry.trim()))
}

function csvToJson(text: string) {
  const rows = parseCsv(text)
  const [header, ...dataRows] = rows

  if (!header || dataRows.length === 0) {
    throw new Error('CSV vacio o sin filas de ejercicios')
  }

  const columns = header.map((column) => column.trim())
  const records = dataRows.map((row) =>
    Object.fromEntries(columns.map((column, index) => [column, row[index]?.trim() ?? ''])),
  )
  const first = records[0]
  const orderedRecords = records
    .map((record, index) => ({
      record,
      index,
      order: Number(record.item_order || index),
    }))
    .sort((left, right) => left.order - right.order || left.index - right.index)

  const items: Array<Record<string, unknown>> = []
  const circuitIndexes = new Map<string, number>()

  for (const { record, order } of orderedRecords) {
    const kind = (record.item_kind || 'EXERCISE').toUpperCase()

    if (kind === 'CIRCUIT') {
      const circuitKey = String(order)
      let itemIndex = circuitIndexes.get(circuitKey)

      if (itemIndex == null) {
        itemIndex = items.length
        circuitIndexes.set(circuitKey, itemIndex)
        items.push({
          kind: 'CIRCUIT',
          name: record.circuit_name || 'Circuito',
          rounds: record.circuit_rounds,
          rest_between_rounds_seconds: record.circuit_rest_between_rounds_seconds,
          exercises: [],
        })
      }

      const circuit = items[itemIndex] as { exercises: Array<Record<string, unknown>> }
      circuit.exercises.push({
        exercise_id: record.exercise_id,
        exercise_name: record.exercise_name,
        reps_or_duration: record.reps_or_duration,
        rest_seconds: record.rest_seconds,
      })
      continue
    }

    items.push({
      kind: 'EXERCISE',
      exercise_id: record.exercise_id,
      exercise_name: record.exercise_name,
      sets: record.sets,
      reps_or_duration: record.reps_or_duration,
      rest_seconds: record.rest_seconds,
    })
  }

  return {
    name: first.training_name,
    types: first.types,
    accentColor: first.accentColor || null,
    level: first.level,
    estimated_duration_min: first.estimated_duration_min,
    estimated_calories: first.estimated_calories,
    warmup_description: first.warmup_description,
    warmup_duration_min: first.warmup_duration_min,
    cooldown_description: first.cooldown_description,
    tags: first.tags,
    items,
  }
}

function getParseError(error: unknown) {
  if (error instanceof z.ZodError) {
    return error.issues.map((issue) => issue.message).join('. ')
  }

  return error instanceof Error ? error.message : 'No se ha podido leer el archivo'
}

export function parseTrainingImport(fileName: string, text: string, exercises: Exercise[]) {
  try {
    const source = fileName.toLowerCase().endsWith('.csv') ? csvToJson(text) : JSON.parse(text)
    const parsed = importTrainingSchema.parse(source)
    return toFormValues(parsed, exercises)
  } catch (error) {
    throw new Error(getParseError(error))
  }
}
