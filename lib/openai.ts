import OpenAI from 'openai';

// Always create the client inside functions — never at module level.
// Module-level instantiation throws at build time when env vars are absent
// during Next.js static analysis (next build).
function getOpenAI(): OpenAI {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface FoodItem {
  food_name: string;
  quantity: string;

  calories: number;
  protein: number;
  fat: number;
  carbs: number;

  fiber: number;
  sugar: number;
  sodium: number;

  categories: string[];
  whole_food_ingredients: string[];

  provided_by_user?: boolean;

  // Source of the nutrition data:
  //   ai / ai_estimated / ai_fixed_from_macros / ai_user_provided — from parseFood()
  //   cache  — hit in master_food_database (via get-food-macros)
  //   off    — from Open Food Facts via get-food-macros
  //   barcode       — user scanned a product barcode (Open Food Facts direct lookup)
  //   label_photo   — user photographed a nutrition facts label (GPT-4o-mini vision)
  // barcode and label_photo are treated as authoritative and never overridden.
  source?: 'ai' | 'ai_estimated' | 'ai_user_provided' | 'ai_fixed_from_macros' | 'cache' | 'off' | 'barcode' | 'label_photo';
  unverified?: boolean;
}

export interface MealGroup {
  meal_type: MealType;
  items: FoodItem[];
  confidence: number;
}

export interface ParsedFood {
  meals: MealGroup[];
}

function numOrNull(v: any): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;

  const s = String(v).trim();
  if (!s) return null;

  const cleaned = s.replace(/,/g, '').replace(/[^0-9.\-]/g, '');
  if (!cleaned) return null;

  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function normalizeMealType(t: any): MealType {
  const x = String(t || '').toLowerCase().trim();
  if (x === 'breakfast' || x === 'lunch' || x === 'dinner' || x === 'snack') return x;
  if (x.includes('workout') || x.includes('post')) return 'snack';
  return 'snack';
}

function normalizeStringArray(v: any): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => String(x || '').trim()).filter(Boolean);
}

function normalizeCategories(cats: any): string[] {
  return normalizeStringArray(cats).map((c) => c.toLowerCase());
}

function normalizeWholeFoods(ings: any): string[] {
  return normalizeStringArray(ings).map((x) => x.toLowerCase());
}

function caloriesFromMacros(protein: number, carbs: number, fat: number): number {
  return Math.round(protein * 4 + carbs * 4 + fat * 9);
}

function normalizeFoodItem(raw: any): FoodItem {
  const caloriesRaw = numOrNull(raw?.calories);
  const proteinRaw  = numOrNull(raw?.protein);
  const fatRaw      = numOrNull(raw?.fat);
  const carbsRaw    = numOrNull(raw?.carbs);

  const fiberRaw  = numOrNull(raw?.fiber);
  const sugarRaw  = numOrNull(raw?.sugar);
  const sodiumRaw = numOrNull(raw?.sodium);

  let calories = caloriesRaw ?? 0;
  let protein  = proteinRaw ?? 0;
  let fat      = fatRaw ?? 0;
  let carbs    = carbsRaw ?? 0;

  let fiber  = fiberRaw ?? 0;
  let sugar  = sugarRaw ?? 0;
  let sodium = sodiumRaw ?? 0;

  let source: FoodItem['source'] = 'ai';
  let unverified = false;

  const providedCalories = caloriesRaw !== null && caloriesRaw > 0;

  const macroCount =
    (proteinRaw !== null && proteinRaw > 0 ? 1 : 0) +
    (fatRaw !== null && fatRaw > 0 ? 1 : 0) +
    (carbsRaw !== null && carbsRaw > 0 ? 1 : 0);

  const allZeroMacros =
    calories === 0 &&
    protein === 0 &&
    fat === 0 &&
    carbs === 0;

  if (allZeroMacros) {
    source = 'ai_estimated';
    unverified = true;
  }

  // Only compute calories from macros when we have enough macro info (>=2)
  if (!providedCalories && calories === 0 && macroCount >= 2) {
    calories = caloriesFromMacros(protein, carbs, fat);
    source = 'ai_fixed_from_macros';
    unverified = true;
  }

  const providedByUser = raw?.provided_by_user === true;
  if (providedByUser) {
    source = 'ai_user_provided';
    unverified = false;
  }

  return {
    food_name: String(raw?.food_name || '').trim() || 'Unknown food',
    quantity: String(raw?.quantity || '').trim() || '1 serving',

    calories,
    protein,
    fat,
    carbs,

    fiber,
    sugar,
    sodium,

    categories: normalizeCategories(raw?.categories),
    whole_food_ingredients: normalizeWholeFoods(raw?.whole_food_ingredients),

    provided_by_user: providedByUser,
    source,
    unverified,
  };
}

function normalizeParsedFood(raw: any): ParsedFood {
  const mealsRaw = Array.isArray(raw?.meals) ? raw.meals : [];
  return {
    meals: mealsRaw.map((m: any) => ({
      meal_type: normalizeMealType(m?.meal_type),
      confidence: numOrNull(m?.confidence) ?? 0.85,
      items: Array.isArray(m?.items) ? m.items.map(normalizeFoodItem) : [],
    })),
  };
}

export async function parseFood(description: string): Promise<ParsedFood> {
  const currentHour = new Date().getHours();

  const response = await getOpenAI().chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0,
    top_p: 1,
    response_format: { type: 'json_object' },

    // If your SDK/model supports seed, uncomment:
    // seed: 12345,

    messages: [
      {
        role: 'system',
        content: `You are a nutrition expert. Parse food descriptions and split into separate meals.

CRITICAL RULES:
1) If the user provides nutrition numbers for an item, copy them EXACTLY for that item.
2) If nutrition is not provided, estimate reasonably, but be CONSISTENT across runs:
   - Prefer typical label values / most common serving values for branded packaged foods.
   - If you recognize a common branded packaged item (e.g., Core Power Elite 42g), use the most typical label macros.
3) Do NOT output placeholder zeros for calories/protein/fat/carbs for normal foods.

MEALS:
- meal_type MUST be one of: breakfast | lunch | dinner | snack
- Post-workout/after workout -> snack

CATEGORIES (assign ALL that apply):
- protein, dairy, vegetable, fruit, grain, fat, beverage

WHOLE FOOD INGREDIENTS (for biodiversity):
- Extract whole/minimally processed ingredients (fruits, vegetables, legumes, nuts, seeds, grains, meats).
- Exclude processed components like syrup/jam/bread unless clearly whole-grain.
- Be specific.

PROVIDED_BY_USER FLAG:
For each item, set provided_by_user:
- true if the user explicitly stated ANY nutrition numbers for that specific item
- false if you are estimating

Current time context: ${currentHour}:00

Return ONLY valid JSON in this schema:

{
  "meals": [
    {
      "meal_type": "breakfast",
      "confidence": 0.95,
      "items": [
        {
          "food_name": "Core Power Elite 42g protein vanilla",
          "quantity": "1 bottle",
          "calories": 230,
          "protein": 42,
          "fat": 3,
          "carbs": 8,
          "fiber": 0,
          "sugar": 5,
          "sodium": 300,
          "categories": ["protein", "dairy"],
          "whole_food_ingredients": [],
          "provided_by_user": false
        }
      ]
    }
  ]
}

Units:
- calories kcal
- protein/fat/carbs/fiber/sugar grams
- sodium mg`,
      },
      { role: 'user', content: description },
    ],
  });

  const content = response.choices?.[0]?.message?.content;
  if (!content) throw new Error('No response from OpenAI');

  const raw = JSON.parse(content);
  return normalizeParsedFood(raw);
}
