export const AI_IMPORT_PROMPT = `Genera una dieta para EXOM en JSON válido, sin markdown y sin texto adicional.

IMPORTANTE:
- Sustituye solo el bloque "Objetivo de la dieta".
- Usa solo nombres exactos de ingredientes del catálogo EXOM incluido.
- Si quieres 4 comidas, dilo en el objetivo.
- Si quieres variantes, dilo por comida.
- Si no quieres variantes, cada comida debe devolver "variants": [].
- Si hay variantes, cada variante debe incluir type, name, calories, protein_g, carbs_g, fat_g, nutritional_badges e ingredients.
- type solo puede ser: "BREAKFAST", "LUNCH", "SNACK" o "DINNER".
- Usa unidades visuales cuando tenga sentido; no devuelvas todos los ingredientes en gramos.
- grams_equivalent es obligatorio cuando unit no es "g".

Catálogo de ingredientes disponible:
[CATALOGO_INGREDIENTES]

Objetivo de la dieta:
[MODIFICAR: indica número de comidas, tipos de comida, si quieres variantes por comida, calorías objetivo, macros objetivo, preferencias, restricciones, alergias y alimentos prohibidos]

Devuelve exactamente este JSON:

{
  "name": "[nombre visible de la dieta]",
  "tags": ["[etiqueta interna 1]", "[etiqueta interna 2]"],
  "total_calories": 2000,
  "total_protein_g": 150,
  "total_carbs_g": 220,
  "total_fat_g": 60,
  "meals": [
    {
      "type": "BREAKFAST",
      "name": "[nombre de la comida]",
      "calories": 450,
      "protein_g": 35,
      "carbs_g": 55,
      "fat_g": 12,
      "nutritional_badges": ["Alto en proteína"],
      "ingredients": [
        {
          "ingredient_name": "[nombre exacto del catálogo]",
          "quantity": 1,
          "unit": "bowl",
          "grams_equivalent": 250
        }
      ],
      "variants": [
        {
          "type": "BREAKFAST",
          "name": "[nombre de la variante]",
          "calories": 430,
          "protein_g": 32,
          "carbs_g": 50,
          "fat_g": 11,
          "nutritional_badges": ["Alto en proteína"],
          "ingredients": [
            {
              "ingredient_name": "[nombre exacto del catálogo]",
              "quantity": 2,
              "unit": "palm",
              "grams_equivalent": 220
            }
          ]
        }
      ]
    }
  ]
}

Unidades de medida disponibles:
- g: gramos. Úsalo para alimentos pesados o cuando no haya una medida casera clara.
- ml: líquidos.
- piece: unidades completas, por ejemplo huevos, frutas, tortitas o latas.
- tablespoon: cucharada, por ejemplo aceite, crema de cacahuete o miel.
- teaspoon: cucharadita, por ejemplo canela, semillas o una cantidad pequeña de miel.
- handful: puñado, por ejemplo frutos secos, frutos rojos o espinacas.
- slice: rebanada o loncha, por ejemplo pan, queso o fiambre.
- palm: palma de proteína, por ejemplo pollo, pavo, ternera o pescado.
- fist: puño, por ejemplo arroz cocido, patata, fruta o verduras.
- ladle: cucharón, por ejemplo legumbres, sopa o guisos.
- cold_cut_slice: loncha de embutido o fiambre.
- glass: vaso, por ejemplo leche, zumo o bebida.
- cup: taza, por ejemplo avena, arroz cocido o cereales.
- bowl: bol, por ejemplo yogur con fruta, ensalada o crema.
- finger: dedo, por ejemplo queso o porciones pequeñas.
- pinch: pizca, por ejemplo sal o especias.
- serving: ración comercial, por ejemplo batido, barrita o yogur individual.
- to_taste: al gusto, solo para condimentos sin impacto relevante.

Reglas para cantidades:
- Prioriza unidades visuales y fáciles para el cliente: palm, fist, handful, slice, piece, tablespoon, glass, bowl.
- Evita usar todo en gramos salvo que sea necesario.
- Cada ingrediente debe incluir siempre quantity, unit y grams_equivalent.
- grams_equivalent debe ser el equivalente real aproximado en gramos de esa cantidad.
- Si usas unit "g", grams_equivalent debe ser igual a quantity.`

export const AI_IMPORT_GUIDE_STEPS = [
  {
    title: 'Número de comidas',
    text: 'Indica en el objetivo si quieres 3, 4, 5 o más comidas y los tipos esperados.',
  },
  {
    title: 'Variantes',
    text: 'Pide variantes por comida si las necesitas. Si no, ChatGPT debe devolver variants: [] en cada comida.',
  },
  {
    title: 'Catálogo',
    text: 'La IA debe usar solo ingredientes del catálogo incluido para que el formulario los enlace automáticamente.',
  },
  {
    title: 'Medidas visuales',
    text: 'Prioriza palmas, puños, puñados, rebanadas, vasos o boles cuando sean más claros que gramos.',
  },
]

export const AI_IMPORT_NO_VARIANTS_EXAMPLE = `{
  "meals": [
    {
      "type": "LUNCH",
      "name": "Pollo con arroz y verduras",
      "calories": 620,
      "protein_g": 48,
      "carbs_g": 70,
      "fat_g": 16,
      "nutritional_badges": ["Alto en proteína"],
      "ingredients": [
        { "ingredient_name": "Pechuga de pollo", "quantity": 2, "unit": "palm", "grams_equivalent": 220 },
        { "ingredient_name": "Arroz", "quantity": 1, "unit": "fist", "grams_equivalent": 180 }
      ],
      "variants": []
    }
  ]
}`

export const AI_IMPORT_VARIANTS_EXAMPLE = `{
  "type": "SNACK",
  "name": "Yogur con fruta",
  "calories": 260,
  "protein_g": 22,
  "carbs_g": 30,
  "fat_g": 6,
  "nutritional_badges": ["Proteína"],
  "ingredients": [
    { "ingredient_name": "Yogurt griego", "quantity": 1, "unit": "bowl", "grams_equivalent": 200 }
  ],
  "variants": [
    {
      "type": "SNACK",
      "name": "Tostada proteica",
      "calories": 280,
      "protein_g": 20,
      "carbs_g": 28,
      "fat_g": 9,
      "nutritional_badges": ["Proteína"],
      "ingredients": [
        { "ingredient_name": "Pan integral", "quantity": 2, "unit": "slice", "grams_equivalent": 60 },
        { "ingredient_name": "Pavo", "quantity": 4, "unit": "cold_cut_slice", "grams_equivalent": 80 }
      ]
    }
  ]
}`

export const AI_IMPORT_UNITS_EXAMPLE = `{
  "ingredients": [
    { "ingredient_name": "Avena", "quantity": 60, "unit": "g", "grams_equivalent": 60 },
    { "ingredient_name": "Pechuga de pollo", "quantity": 2, "unit": "palm", "grams_equivalent": 220 },
    { "ingredient_name": "Arroz basmati", "quantity": 1, "unit": "fist", "grams_equivalent": 180 },
    { "ingredient_name": "Aceite de oliva", "quantity": 1, "unit": "tablespoon", "grams_equivalent": 15 }
  ]
}`

export function buildImportPromptWithIngredientCatalog(ingredientNames: string[]) {
  const catalog =
    ingredientNames.length > 0
      ? ingredientNames.map((name) => `- ${name}`).join('\n')
      : '[pega aquí los nombres exactos de ingredientes del catálogo EXOM, uno por línea]'

  return AI_IMPORT_PROMPT.replace('[CATALOGO_INGREDIENTES]', catalog)
}
