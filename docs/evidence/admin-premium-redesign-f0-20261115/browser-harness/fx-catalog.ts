import { has, isoAt, list, paginate, svgImage, uuid, type FixtureCtx } from './fx-util'

// ---- Ejercicios -----------------------------------------------------------------------------
type Level = 'PRINCIPIANTE' | 'INTERMEDIO' | 'AVANZADO'
const exerciseSeeds: Array<[string, string[], string[], Level, boolean]> = [
  ['Press de banca con barra', ['Pecho', 'Tríceps'], ['Barra', 'Banco'], 'INTERMEDIO', true],
  ['Sentadilla trasera', ['Cuádriceps', 'Glúteos'], ['Barra'], 'INTERMEDIO', true],
  ['Peso muerto rumano', ['Isquiotibiales', 'Glúteos'], ['Barra'], 'AVANZADO', true],
  ['Remo con mancuerna', ['Espalda', 'Bíceps'], ['Mancuernas', 'Banco'], 'PRINCIPIANTE', false],
  ['Press militar', ['Hombros', 'Tríceps'], ['Barra'], 'INTERMEDIO', true],
  ['Dominadas asistidas', ['Espalda', 'Bíceps'], ['Máquina'], 'PRINCIPIANTE', false],
  ['Zancadas caminando', ['Cuádriceps', 'Glúteos'], ['Mancuernas'], 'PRINCIPIANTE', false],
  ['Hip thrust', ['Glúteos'], ['Barra', 'Banco'], 'INTERMEDIO', false],
  ['Curl de bíceps con barra EZ', ['Bíceps'], ['Barra EZ'], 'PRINCIPIANTE', false],
  ['Plancha frontal', ['Core'], ['Peso corporal'], 'PRINCIPIANTE', false],
  ['Kettlebell swing', ['Glúteos', 'Posterior'], ['Kettlebell'], 'AVANZADO', false],
  ['Elevación de gemelos', ['Gemelos'], ['Máquina'], 'PRINCIPIANTE', false],
]
const exerciseVideo = (i: number) => (i % 3 === 0 ? svgImage(`Vídeo ${i + 1}`, 30 + i * 20, 640, 360) : null)
export const exercises = exerciseSeeds.map(([name, muscle_groups, equipment, level], i) => ({
  id: uuid('e8e00000', i + 1), name, muscle_groups, equipment, level,
  video_url: exerciseVideo(i), video_stream_id: null,
  thumbnail_url: i % 3 === 2 ? null : svgImage(name.slice(0, 18), 30 + i * 20, 320, 200),
  technique_text: 'Mantén la espalda neutra, controla la fase excéntrica y respira de forma constante.',
  common_errors_text: i % 2 === 0 ? 'Perder tensión en el core o acortar el recorrido.' : null,
  explanation_text: i % 2 === 1 ? 'Ejercicio base del catálogo de ejemplo.' : null,
  is_active: i !== 11, created_at: isoAt(-400 + i * 10), updated_at: isoAt(-30 - i),
  training_usage_count: exerciseSeeds[i][4] ? 2 : 0, is_used_in_training: exerciseSeeds[i][4],
}))

// ---- Entrenamientos -------------------------------------------------------------------------
export const TRAINING_IDS = Array.from({ length: 8 }, (_, i) => uuid('7a1e0000', i + 1))
export const TRAINING_GROUP_IDS = [uuid('7a600000', 1), uuid('7a600000', 2), uuid('7a600000', 3)]
const trainingGroups = [
  { id: TRAINING_GROUP_IDS[0], name: 'Fuerza', item_count: 3, created_at: isoAt(-200), updated_at: isoAt(-20) },
  { id: TRAINING_GROUP_IDS[1], name: 'Cardio y movilidad', item_count: 2, created_at: isoAt(-190), updated_at: isoAt(-18) },
  { id: TRAINING_GROUP_IDS[2], name: 'Programa verano', item_count: 2, created_at: isoAt(-60), updated_at: isoAt(-5) },
]
export const TRAINING_TYPE_COLORS = [
  { value: 'Fuerza', color: '#7FB5D8' }, { value: 'Cardio', color: '#D76C5E' }, { value: 'HIIT', color: '#E5BE58' }, { value: 'Movilidad', color: '#9B7FCC' },
]
const trainingSeeds: Array<[string, string, Level, number, number, number[], number | null, string[], string | null]> = [
  ['Fuerza tren superior', 'Fuerza', 'INTERMEDIO', 60, 420, [0, 3, 4, 8], 0, ['pecho', 'espalda'], '#7FB5D8'],
  ['Pierna y glúteo', 'Fuerza', 'INTERMEDIO', 55, 480, [1, 2, 6, 7, 11], 0, ['pierna'], '#7FB5D8'],
  ['Cardio base', 'Cardio', 'PRINCIPIANTE', 40, 350, [9, 10], 1, ['cardio'], '#D76C5E'],
  ['Movilidad y core', 'Movilidad', 'PRINCIPIANTE', 30, 150, [9, 5], 1, ['movilidad'], '#9B7FCC'],
  ['HIIT corto', 'HIIT', 'AVANZADO', 25, 300, [10, 6, 9], 2, ['hiit'], '#E5BE58'],
  ['Full body iniciación', 'Fuerza', 'PRINCIPIANTE', 50, 380, [1, 3, 4, 9], 0, ['full-body'], '#7FB5D8'],
  ['Empuje y tirón avanzado', 'Fuerza', 'AVANZADO', 70, 520, [0, 2, 3, 5, 4], 2, ['fuerza'], null],
  ['Glúteo enfocado', 'Fuerza', 'INTERMEDIO', 45, 330, [7, 1, 6], null, ['glúteo'], '#7FB5D8'],
]
export const trainings = trainingSeeds.map(([name, type, level, duration, calories, exIdx, groupIdx, tags, accentColor], i) => {
  const trainingExercises = exIdx.map((ei, order) => ({
    id: uuid('7e000000', i * 10 + order + 1), order: order + 1, sets: 3 + (order % 2), reps_or_duration: order % 3 === 2 ? '45 s' : '8-10',
    measure_type: order % 3 === 2 ? 'SECONDS' as const : 'REPS' as const, target_value: null, target_value_min: order % 3 === 2 ? null : 8, target_value_max: order % 3 === 2 ? 45 : 10,
    target_rir: 2, request_set_tracking: order === 0, rest_seconds: 90, block_id: null, position_in_block: null, block: null, exercise: exercises[ei],
  }))
  return {
    id: TRAINING_IDS[i], name, type, types: [type], accentColor, level, estimated_duration_min: duration, estimated_calories: calories, total_volume: 4200 + i * 300,
    warmup_description: 'Movilidad articular y series de aproximación.', warmup_duration_min: 8, cooldown_description: 'Estiramientos suaves.', tags,
    is_active: i !== 7, created_by: null, created_at: isoAt(-250 + i * 12), updated_at: isoAt(-40 + i * 3),
    group_id: groupIdx === null ? null : TRAINING_GROUP_IDS[groupIdx], group: groupIdx === null ? null : { id: TRAINING_GROUP_IDS[groupIdx], name: trainingGroups[groupIdx].name },
    exercises_count: trainingExercises.length, exercises: trainingExercises,
    items: trainingExercises.map((te) => ({ ...te, kind: 'EXERCISE' as const })),
  }
})
const trainingListItem = (t: (typeof trainings)[number]) => ({ ...t })

// ---- Ingredientes ---------------------------------------------------------------------------
const ingredientSeeds: Array<[string, string | null, number, number, number, number]> = [
  ['Arroz integral cocido', '🍚', 123, 2.7, 25.6, 1], ['Pechuga de pollo', '🍗', 120, 22.5, 0, 2.6], ['Huevo entero', '🥚', 143, 12.6, 0.7, 9.5],
  ['Avena en copos', '🌾', 372, 13.5, 60, 7], ['Aguacate', '🥑', 160, 2, 8.5, 14.7], ['Plátano', '🍌', 89, 1.1, 22.8, 0.3],
  ['Salmón fresco', '🐟', 208, 20, 0, 13], ['Yogur griego natural', '🥛', 97, 9, 3.9, 5], ['Brócoli', '🥦', 34, 2.8, 6.6, 0.4],
  ['Aceite de oliva virgen extra', '🫒', 884, 0, 0, 100], ['Boniato asado', '🍠', 90, 2, 20.7, 0.2], ['Almendras', '🥜', 579, 21.2, 21.6, 49.9],
  ['Lentejas cocidas', null, 116, 9, 20, 0.4], ['Pan integral', '🍞', 247, 13, 41, 3.4], ['Tomate', '🍅', 18, 0.9, 3.9, 0.2],
]
export const ingredients = ingredientSeeds.map(([name, icon, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g], i) => ({
  id: uuid('1e000000', i + 1), name, icon, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, is_active: i !== 14,
  created_at: isoAt(-300 + i * 9), updated_at: isoAt(-60 + i * 3),
}))

// ---- Dietas ---------------------------------------------------------------------------------
export const DIET_IDS = Array.from({ length: 5 }, (_, i) => uuid('d1e70000', i + 1))
const DIET_GROUP_IDS = [uuid('d1600000', 1), uuid('d1600000', 2)]
const dietGroups = [
  { id: DIET_GROUP_IDS[0], name: 'Definición', item_count: 2, created_at: isoAt(-150), updated_at: isoAt(-15) },
  { id: DIET_GROUP_IDS[1], name: 'Volumen', item_count: 1, created_at: isoAt(-140), updated_at: isoAt(-12) },
]
export const DIET_BADGE_COLORS = [
  { value: 'Alta en proteína', color: '#8CCB68' }, { value: 'Sin gluten', color: '#E5BE58' }, { value: 'Vegetariana', color: '#7FB5D8' }, { value: 'Baja en carbohidratos', color: '#D76C5E' },
]
const mealIngredient = (n: number, ing: number, quantity: number, unit: 'g' | 'piece' | 'ml') => ({ id: uuid('3e1a0000', n), quantity, unit, grams_equivalent: unit === 'piece' ? quantity * 60 : quantity, ingredient: ingredients[ing] })
const mealTypes = ['BREAKFAST', 'LUNCH', 'SNACK', 'DINNER'] as const
const mealNames = ['Avena con plátano y yogur', 'Arroz con pollo y brócoli', 'Yogur con almendras', 'Salmón con boniato']
function buildMeal(dietIdx: number, mealIdx: number, variant = false) {
  const n = dietIdx * 100 + mealIdx * 10 + (variant ? 5 : 0)
  return {
    id: uuid('3e000000', n), type: mealTypes[mealIdx % 4], name: variant ? `${mealNames[mealIdx % 4]} (variante)` : mealNames[mealIdx % 4],
    image_url: mealIdx === 0 ? svgImage('Desayuno', 40, 320, 200) : null, calories: 420 + mealIdx * 70, protein_g: 28 + mealIdx * 4, carbs_g: 45 + mealIdx * 6, fat_g: 14 + mealIdx * 2,
    nutritional_badges: mealIdx % 2 === 0 ? ['Alta en proteína'] : ['Sin gluten'], order: mealIdx + 1,
    ingredients: [mealIngredient(n + 1, mealIdx % 4 === 0 ? 3 : 0, 80, 'g'), mealIngredient(n + 2, mealIdx % 4 === 1 ? 1 : 7, 150, 'g'), mealIngredient(n + 3, 5, 1, 'piece')],
    variants: [] as unknown[],
  }
}
const dietSeeds: Array<[string, string[], number, number, number, number, number | null]> = [
  ['Dieta base 2200 kcal', ['mantenimiento'], 2200, 150, 240, 70, 1], ['Dieta descarga 1900 kcal', ['descarga'], 1900, 140, 190, 65, 0],
  ['Definición 1800 kcal', ['definición', 'alta proteína'], 1800, 160, 150, 55, 0], ['Volumen limpio 2800 kcal', ['volumen'], 2800, 170, 330, 80, 1], ['Vegetariana equilibrada', ['vegetariana'], 2000, 110, 250, 65, null],
]
export const diets = dietSeeds.map(([name, tags, kcal, p, c, f, groupIdx], i) => {
  const meals = Array.from({ length: i === 1 ? 4 : 5 }, (_, m) => {
    const meal = buildMeal(i + 1, m)
    if (m === 1) meal.variants = [buildMeal(i + 1, m, true)]
    return meal
  })
  return {
    id: DIET_IDS[i], name, tags, total_calories: kcal, total_protein_g: p, total_carbs_g: c, total_fat_g: f, is_active: true, created_by: null,
    created_at: isoAt(-120 + i * 9), updated_at: isoAt(-20 + i * 2), group_id: groupIdx === null ? null : DIET_GROUP_IDS[groupIdx],
    group: groupIdx === null ? null : { id: DIET_GROUP_IDS[groupIdx], name: dietGroups[groupIdx].name }, meals_count: meals.length, meals,
  }
})

const sortBy = <T extends Record<string, unknown>>(items: T[], params: Record<string, unknown>) => {
  const key = params.sort_by ? String(params.sort_by) : null
  if (!key) return items
  const dir = params.sort_dir === 'desc' ? -1 : 1
  return [...items].sort((a, b) => (String(a[key] ?? '') < String(b[key] ?? '') ? -dir : dir))
}
const dedupe = (values: string[]) => [...new Set(values)].sort()

export const handleCatalog = ({ method, path, params }: FixtureCtx): unknown => {
  if (method !== 'get') return undefined
  if (path === '/exercises') {
    const muscles = list(params.muscle_groups), equip = list(params.equipment), levels = list(params.level)
    return paginate(sortBy(exercises.filter((e) => has(e.name, params.search) && (muscles.length === 0 || muscles.some((m) => e.muscle_groups.includes(m)))
      && (equip.length === 0 || equip.some((m) => e.equipment.includes(m))) && (levels.length === 0 || levels.includes(e.level))
      && (params.training_usage !== 'used' || e.is_used_in_training) && (params.training_usage !== 'unused' || !e.is_used_in_training)), params), params, 12)
  }
  if (path === '/exercises/muscle-groups') return { muscle_groups: dedupe(exercises.flatMap((e) => e.muscle_groups)) }
  if (path === '/exercises/equipment') return { equipment: dedupe(exercises.flatMap((e) => e.equipment)) }
  const exerciseUsage = path.match(/^\/exercises\/([^/]+)\/training-usage$/)
  if (exerciseUsage) return { exercise_id: exerciseUsage[1], training_count: 2, trainings: trainings.slice(0, 2).map((t) => ({ id: t.id, name: t.name })) }
  const exerciseOne = path.match(/^\/exercises\/([^/]+)$/)
  if (exerciseOne) return exercises.find((e) => e.id === exerciseOne[1])

  if (path === '/trainings') {
    const types = list(params.type), levels = list(params.level), tags = list(params.tags)
    return paginate(sortBy(trainings.filter((t) => has(t.name, params.search) && (types.length === 0 || types.includes(t.type)) && (levels.length === 0 || levels.includes(t.level))
      && (tags.length === 0 || tags.some((x) => t.tags.includes(x))) && (!params.group_id || t.group_id === params.group_id) && (!params.ungrouped || t.group_id === null)).map(trainingListItem), params), params)
  }
  if (path === '/trainings/tags') return { tags: dedupe(trainings.flatMap((t) => t.tags)) }
  if (path === '/trainings/types') return { types: TRAINING_TYPE_COLORS }
  if (path === '/training-groups') return trainingGroups
  const trainingOne = path.match(/^\/trainings\/([^/]+)$/)
  if (trainingOne) return trainings.find((t) => t.id === trainingOne[1])

  if (path === '/ingredients') {
    const icon = list(params.has_icon)
    return paginate(ingredients.filter((g) => has(g.name, params.search) && (icon.length === 0 || icon.length === 2 || (icon[0] === 'true' ? g.icon !== null : g.icon === null))), params)
  }

  if (path === '/diets') {
    const tags = list(params.tags)
    return paginate(sortBy(diets.filter((d) => has(d.name, params.search) && (tags.length === 0 || tags.some((x) => d.tags.includes(x)))
      && (!params.group_id || d.group_id === params.group_id) && (!params.ungrouped || d.group_id === null)), params), params)
  }
  if (path === '/diets/tags') return { tags: dedupe(diets.flatMap((d) => d.tags)) }
  if (path === '/diets/nutritional-badges') return { nutritional_badges: DIET_BADGE_COLORS }
  if (path === '/diet-groups') return dietGroups
  const dietOne = path.match(/^\/diets\/([^/]+)$/)
  if (dietOne) return diets.find((d) => d.id === dietOne[1])
  return undefined
}
