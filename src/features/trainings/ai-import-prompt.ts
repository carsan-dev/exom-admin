export const AI_IMPORT_PROMPT = `Genera un entrenamiento para EXOM en JSON válido, sin markdown y sin texto adicional.

IMPORTANTE:
- Sustituye todas las partes marcadas como [MODIFICAR].
- Usa solo nombres exactos de ejercicios del catálogo EXOM.
- Cada ejercicio suelto debe tener kind "EXERCISE".
- Cada circuito debe tener kind "CIRCUIT" y una lista exercises.
- En circuitos, cada ejercicio representa 1 serie por ronda.
- Cada ejercicio debe indicar measure_type ("REPS" o "SECONDS") y un objetivo exacto en target_value, o un rango en target_value_min/target_value_max, nunca ambos.
- Mantén reps_or_duration como espejo legacy del objetivo (por ejemplo "10", "8-10" o "30-45s").
- Si NO hay circuito, no incluyas ningún objeto kind "CIRCUIT".
- Si hay varios ejercicios sueltos, repite el bloque kind "EXERCISE" dentro de items.
- Si hay varios circuitos, repite el bloque kind "CIRCUIT" dentro de items.
- level solo puede ser: "PRINCIPIANTE", "INTERMEDIO" o "AVANZADO".

Catálogo de ejercicios disponible:
[MODIFICAR: pega aquí los nombres exactos de ejercicios del catálogo EXOM, uno por línea]

Objetivo del entrenamiento:
[MODIFICAR: describe objetivo, nivel, duración, material disponible, lesiones, foco muscular y restricciones]

Devuelve exactamente este JSON:

{
  "name": "[MODIFICAR: nombre del entrenamiento]",
  "types": ["[MODIFICAR: tipo principal, ej. Fuerza]"],
  "accentColor": "[MODIFICAR: color hex, ej. #C5E384, o null]",
  "level": "[MODIFICAR: PRINCIPIANTE | INTERMEDIO | AVANZADO]",
  "estimated_duration_min": [MODIFICAR: número de minutos o null],
  "estimated_calories": [MODIFICAR: kcal estimadas o null],
  "warmup_description": "[MODIFICAR: calentamiento breve o cadena vacia]",
  "warmup_duration_min": [MODIFICAR: minutos de calentamiento o null],
  "cooldown_description": "[MODIFICAR: vuelta a la calma o cadena vacia]",
  "tags": ["[MODIFICAR: etiqueta 1]", "[MODIFICAR: etiqueta 2]"],
  "items": [
    {
      "kind": "EXERCISE",
      "exercise_name": "[MODIFICAR: nombre exacto del ejercicio 1]",
      "sets": [MODIFICAR: número de series],
      "reps_or_duration": "[MODIFICAR: reps o duración, ej. 10, 12-15, 30s]",
      "measure_type": "[MODIFICAR: REPS | SECONDS]",
      "target_value": [MODIFICAR: entero exacto o null si usa rango],
      "target_value_min": [MODIFICAR: entero mínimo o null si usa objetivo exacto],
      "target_value_max": [MODIFICAR: entero máximo o null si usa objetivo exacto],
      "target_rir": [MODIFICAR: entero 0-10 o null],
      "rest_seconds": [MODIFICAR: descanso entre series en segundos]
    },
    {
      "kind": "EXERCISE",
      "exercise_name": "[MODIFICAR: nombre exacto del ejercicio 2; duplica este bloque para más ejercicios]",
      "sets": [MODIFICAR: número de series],
      "reps_or_duration": "[MODIFICAR: reps o duración]",
      "measure_type": "[MODIFICAR: REPS | SECONDS]",
      "target_value": [MODIFICAR: entero exacto o null si usa rango],
      "target_value_min": [MODIFICAR: entero mínimo o null si usa objetivo exacto],
      "target_value_max": [MODIFICAR: entero máximo o null si usa objetivo exacto],
      "target_rir": [MODIFICAR: entero 0-10 o null],
      "rest_seconds": [MODIFICAR: descanso entre series en segundos]
    },
    {
      "kind": "CIRCUIT",
      "name": "[MODIFICAR: nombre del circuito; elimina este bloque completo si no hay circuito]",
      "rounds": [MODIFICAR: número de rondas],
      "rest_between_rounds_seconds": [MODIFICAR: descanso entre rondas en segundos],
      "exercises": [
        {
          "exercise_name": "[MODIFICAR: nombre exacto del ejercicio del circuito 1]",
          "reps_or_duration": "[MODIFICAR: reps o duración de 1 serie]",
          "measure_type": "[MODIFICAR: REPS | SECONDS]",
          "target_value": [MODIFICAR: entero exacto o null si usa rango],
          "target_value_min": [MODIFICAR: entero mínimo o null si usa objetivo exacto],
          "target_value_max": [MODIFICAR: entero máximo o null si usa objetivo exacto],
          "target_rir": [MODIFICAR: entero 0-10 o null],
          "rest_seconds": [MODIFICAR: descanso tras este ejercicio dentro de la ronda]
        },
        {
          "exercise_name": "[MODIFICAR: nombre exacto del ejercicio del circuito 2]",
          "reps_or_duration": "[MODIFICAR: reps o duración de 1 serie]",
          "measure_type": "[MODIFICAR: REPS | SECONDS]",
          "target_value": [MODIFICAR: entero exacto o null si usa rango],
          "target_value_min": [MODIFICAR: entero mínimo o null si usa objetivo exacto],
          "target_value_max": [MODIFICAR: entero máximo o null si usa objetivo exacto],
          "target_rir": [MODIFICAR: entero 0-10 o null],
          "rest_seconds": [MODIFICAR: descanso tras este ejercicio dentro de la ronda]
        }
      ]
    }
  ]
}

CASO SIN CIRCUITO:
- items debe contener solo objetos kind "EXERCISE".
- elimina por completo el bloque kind "CIRCUIT".

CASO CON VARIOS EJERCICIOS:
- añade un objeto kind "EXERCISE" por cada ejercicio suelto.
- no metas varios nombres dentro del mismo exercise_name.

CASO CON CIRCUITO:
- dentro del circuito, añade un objeto en exercises por cada ejercicio del circuito.
- rounds indica cuántas veces se repite la lista completa.
- cada ejercicio del circuito es 1 serie por ronda.`

export const AI_IMPORT_GUIDE_STEPS = [
  {
    title: 'Varios ejercicios sueltos',
    text: 'Repite un bloque kind "EXERCISE" dentro de items por cada ejercicio. No juntes varios nombres en exercise_name.',
  },
  {
    title: 'Sin circuito',
    text: 'Elimina por completo el bloque kind "CIRCUIT". El array items queda solo con ejercicios sueltos.',
  },
  {
    title: 'Con circuito',
    text: 'Incluye un bloque kind "CIRCUIT". Dentro de exercises pon cada ejercicio del circuito; rounds marca cuántas rondas se repite la lista.',
  },
]

export const AI_IMPORT_NO_CIRCUIT_EXAMPLE = `{
  "items": [
    {
      "kind": "EXERCISE",
      "exercise_name": "Sentadilla goblet",
      "sets": 3,
      "reps_or_duration": "10",
      "measure_type": "REPS",
      "target_value": 10,
      "target_rir": 2,
      "rest_seconds": 60
    },
    {
      "kind": "EXERCISE",
      "exercise_name": "Press banca",
      "sets": 4,
      "reps_or_duration": "8",
      "measure_type": "REPS",
      "target_value": 8,
      "target_rir": null,
      "rest_seconds": 90
    }
  ]
}`

export const AI_IMPORT_CIRCUIT_EXAMPLE = `{
  "items": [
    {
      "kind": "CIRCUIT",
      "name": "Circuito final",
      "rounds": 3,
      "rest_between_rounds_seconds": 60,
      "exercises": [
        {
          "exercise_name": "Jumping jacks",
          "reps_or_duration": "30s",
          "measure_type": "SECONDS",
          "target_value": 30,
          "target_rir": null,
          "rest_seconds": 15
        },
        {
          "exercise_name": "Mountain climbers",
          "reps_or_duration": "20",
          "measure_type": "REPS",
          "target_value": 20,
          "target_rir": 3,
          "rest_seconds": 15
        }
      ]
    }
  ]
}`

export function buildImportPromptWithExerciseCatalog(exerciseNames: string[]) {
  const catalog =
    exerciseNames.length > 0
      ? exerciseNames.map((name) => `- ${name}`).join('\n')
      : '[MODIFICAR: pega aquí los nombres exactos de ejercicios del catálogo EXOM, uno por línea]'

  return AI_IMPORT_PROMPT.replace(
    '[MODIFICAR: pega aquí los nombres exactos de ejercicios del catálogo EXOM, uno por línea]',
    catalog
  )
}
