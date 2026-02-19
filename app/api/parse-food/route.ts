import { NextResponse } from 'next/server';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const LOOKUP_TIMEOUT_MS = 30_000;

// ============================================================================
// TYPES
// ============================================================================

type Nutrition = {
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number; // mg
};

type MealItem = {
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
  source?: 'parsed' | 'cache' | 'off' | 'ai';
  match_description?: string;
  match_score?: number;
  unverified?: boolean;
  cache_candidate?: any;
  cache_hit?: boolean;
};

type Meal = {
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  items: MealItem[];
  notes?: string | null;
  eating_out?: boolean;
};

// ============================================================================
// NUTRITION EXTRACTION
// Handles: "10 g of fat", "150 mg sodium", "3 g dietary fiber", "420 cal"
// ============================================================================

const nutritionPatterns = {
  calories: /([\d]+(?:\.\d+)?)\s*(?:k?cal)\b/gi,
  carbs:    /([\d]+(?:\.\d+)?)\s*g(?:\s*of)?\s*(?:total\s+)?(?:carbs?|carbohydrates?)\b/gi,
  protein:  /([\d]+(?:\.\d+)?)\s*g(?:\s*of)?\s*protein\b/gi,
  fat:      /([\d]+(?:\.\d+)?)\s*g(?:\s*of)?\s*(?:total\s+)?fat\b/gi,
  fiber:    /([\d]+(?:\.\d+)?)\s*g(?:\s*of)?\s*(?:dietary\s+)?fiber\b/gi,
  sugar:    /([\d]+(?:\.\d+)?)\s*g(?:\s*of)?\s*(?:sugar|sugars)\b/gi,
  sodium:   /([\d]+(?:\.\d+)?)\s*mg\s*(?:of\s+)?sodium\b/gi,
};

function parseNutrition(text: string): Nutrition {
  const n: Nutrition = { calories: 0, carbs: 0, protein: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 };
  for (const [key, pattern] of Object.entries(nutritionPatterns)) {
    pattern.lastIndex = 0;
    let total = 0;
    for (const m of text.matchAll(pattern)) {
      if (m[1]) total += parseFloat(m[1]);
    }
    (n as any)[key] = total;
  }
  return n;
}

function hasAnyMacros(text: string): boolean {
  return Object.values(nutritionPatterns).some((p) => {
    p.lastIndex = 0;
    return p.test(text);
  });
}

// ============================================================================
// TEXT CLEANING HELPERS
// ============================================================================

// Protect food phrases that contain "and" so they don't get split
const protectedPhrases = ['egg and cheese', 'mac and cheese', 'peanut butter and jelly', 'salt and pepper'];

function protectPhrases(text: string): string {
  let t = text;
  for (const phrase of protectedPhrases) {
    t = t.replace(new RegExp(phrase, 'gi'), phrase.replace(/\s+and\s+/i, ' & '));
  }
  return t;
}

function unprotectPhrases(text: string): string {
  return text.replace(/\s&\s/gi, ' and ');
}

function extractRestaurant(text: string): string | null {
  const match = text.match(
    /\b(?:from|at|went\s+to)\s+(?:my\s+(?:favorite\s+)?)?(?:coffee\s+shop|restaurant|cafe|spot)?\s*(?:called\s+)?([A-Z][\w'&\s]+?)(?:\s+and\s+(?:got|had|ordered)|\s+for\b|\s+to\s+get\b|[,.]|$)/i
  );
  return match?.[1]?.trim() || null;
}

function stripMacroSuffix(text: string): string {
  let t = text;
  if (/\b(?:that was|which was)\b/i.test(t)) t = t.split(/\b(?:that was|which was)\b/i)[0];
  t = t.replace(/\bwith\s+\d+(?:\.\d+)?\s*(?:k?cal|g|mg)\b.*$/i, '');
  return t.trim();
}

function cleanFoodText(text: string): string {
  let t = text;
  for (const p of Object.values(nutritionPatterns)) {
    p.lastIndex = 0;
    t = t.replace(p, '');
  }
  return t.replace(/\s+/g, ' ').trim();
}

function extractFoodName(text: string): string {
  // Try to grab the food name after the verb
  const match = text.match(/(?:had|got|ate|ordered)\s+(.+?)(?:\s+that was|\s+which was|\s+with\b|[,.]|$)/i);
  const raw = match?.[1] || text;
  const stripped = stripMacroSuffix(raw);
  return cleanFoodText(stripped)
    .replace(/^(?:a|an|the)\s+/i, '')
    .replace(/^(?:before|after)\s+(?:i\s+)?worked\s+out\b[,:\s]*/i, '')
    .trim()
    .split(/\s+/)
    .slice(0, 16)
    .join(' ');
}

function buildItem(name: string, nutrition?: Nutrition): MealItem {
  return {
    food_name: name || 'Unknown item',
    quantity: '1 serving',
    calories: nutrition?.calories || 0,
    protein:  nutrition?.protein  || 0,
    fat:      nutrition?.fat      || 0,
    carbs:    nutrition?.carbs    || 0,
    fiber:    nutrition?.fiber    || 0,
    sugar:    nutrition?.sugar    || 0,
    sodium:   nutrition?.sodium   || 0,
    categories: [],
    whole_food_ingredients: [],
    source: nutrition && Object.values(nutrition).some(Boolean) ? 'parsed' : undefined,
  };
}

function mergeMacros(target: MealItem, nutrition: Nutrition): MealItem {
  return {
    ...target,
    calories: nutrition.calories || target.calories,
    protein:  nutrition.protein  || target.protein,
    fat:      nutrition.fat      || target.fat,
    carbs:    nutrition.carbs    || target.carbs,
    fiber:    nutrition.fiber    || target.fiber,
    sugar:    nutrition.sugar    || target.sugar,
    sodium:   nutrition.sodium   || target.sodium,
    source: 'parsed',
  };
}

// ============================================================================
// ITEM SPLITTING
// Splits "a kolache and a latte" as TWO items (simple "and a/an" split)
// but protects phrases like "egg and cheese".
// Does NOT split on "and after I worked out, I had" style — that's handled
// at the meal-segment level by parseMeals() below.
// ============================================================================

function splitItemsFromSegment(segment: string): MealItem[] {
  // Grab the part after the introductory verb (had/got/ate/ordered)
  const clauseMatch = segment.match(/(?:had|got|ate|ordered)\s+(.+)/i);
  const clause = protectPhrases(clauseMatch?.[1] || segment)
    .replace(/^(?:also,?\s*)/i, '')
    .replace(/\.$/, '')
    .trim();

  // Split on "and a/an <word>", commas between items, or bare "and" between
  // two food-looking chunks. This is intentionally aggressive — we recover
  // false splits via the macro-suffix merge pass below.
  const parts = clause
    .split(/\s+and\s+(?:a|an)\s+|\s*,\s+(?=(?:a|an)\s+\w)|,\s*/i)
    .map((p) => unprotectPhrases(p.replace(/^(?:a|an|the)\s+/i, '').trim()))
    .filter(Boolean);

  const items: MealItem[] = [];
  for (const part of parts) {
    const isMacroPart = hasAnyMacros(part);
    const isModifier  = /^\s*(?:which|that)\s+was\b/i.test(part);

    if (isMacroPart && isModifier && items.length > 0) {
      // "which was 190 cal …" — attach to previous item
      items[items.length - 1] = mergeMacros(items[items.length - 1], parseNutrition(part));
      continue;
    }

    if (isMacroPart) {
      const nutrition = parseNutrition(part);
      const name = extractFoodName(part);
      items.push({ ...buildItem(name, nutrition), source: 'parsed' });
      continue;
    }

    items.push(buildItem(extractFoodName(part)));
  }

  return items;
}

// ============================================================================
// MEAL SEGMENTATION
//
// Splits on "for breakfast/lunch/dinner/snack" anchors. Crucially:
// - We also handle "as a snack" and "also, for breakfast"
// - "and after I worked out, I had" mid-sentence creates a NEW segment
//   carrying the SAME meal_type (since meal context doesn't change)
// ============================================================================

function parseMeals(userInput: string): Meal[] {
  // Step 1: handle mid-sentence "I had/got" splits that introduce new food items
  // within the same meal context. We rewrite them as sentence breaks so the
  // segment regex below can treat them as separate segments.
  //
  // Pattern: "and <filler>, I had/got" → ". I had/got"
  const normalised = userInput.replace(
    /\s+and\s+(?:[^,.]+,\s*)?i\s+(?:had|got|ate|ordered)\s+/gi,
    (match) => {
      // Only convert if there's interstitial content (not plain "and I had")
      const hasInterstitial = /and\s+\S[^,]+,/.test(match);
      return hasInterstitial ? '. I had ' : match;
    }
  );

  // Step 2: find all meal anchors
  const mealRegex =
    /(?:^|(?<=\.\s*))(?:(?:also|and|then)[,\s]+)?(?:(?:as\s+a|for)\s+)(breakfast|lunch|dinner|snack)\b/gi;

  const matches: { index: number; type: Meal['meal_type'] }[] = [];
  let m: RegExpExecArray | null;
  while ((m = mealRegex.exec(normalised)) !== null) {
    const type = m[1].toLowerCase() as Meal['meal_type'];
    matches.push({ index: m.index, type });
  }

  if (matches.length === 0) {
    const notes = extractRestaurant(userInput);
    return [{
      meal_type: 'lunch',
      items: splitItemsFromSegment(userInput),
      notes: notes || null,
      eating_out: !!notes,
    }];
  }

  const meals: Meal[] = [];

  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index;
    const end   = i + 1 < matches.length ? matches[i + 1].index : normalised.length;
    const segment = normalised.slice(start, end).trim();
    const mealType = matches[i].type;
    const notes = extractRestaurant(segment);

    // Each sentence (split by ". I had") within this segment is a sub-segment
    // whose items all belong to this meal group.
    const subSegments = segment.split(/\.\s+(?=i\s+(?:had|got|ate|ordered)\b)/i);

    const allItems: MealItem[] = [];
    for (const sub of subSegments) {
      allItems.push(...splitItemsFromSegment(sub));
    }

    if (allItems.length > 0) {
      meals.push({
        meal_type: mealType,
        items: allItems,
        notes: notes || null,
        eating_out: !!notes,
      });
    }
  }

  return meals;
}

// ============================================================================
// MACRO LOOKUP — with known-macros passed for context-aware AI
// ============================================================================

function knownMacrosFromItem(item: MealItem): Record<string, number> {
  const known: Record<string, number> = {};
  if (item.calories) known.calories = item.calories;
  if (item.protein)  known.protein  = item.protein;
  if (item.fat)      known.fat      = item.fat;
  if (item.carbs)    known.carbs    = item.carbs;
  if (item.fiber)    known.fiber    = item.fiber;
  if (item.sugar)    known.sugar    = item.sugar;
  if (item.sodium)   known.sodium   = item.sodium;
  return known;
}

async function lookupMacros(foodName: string, knownMacros?: Record<string, number>) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), LOOKUP_TIMEOUT_MS);
  try {
    const res = await fetch(`${APP_URL}/api/get-food-macros`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ foodName, knownMacros }),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

// Merge lookup result into item. Inline (parsed) values always win.
function fillFromLookup(item: MealItem, lookup: any): MealItem {
  const food = lookup?.food;
  if (!food) return item;
  // Default: 1 serving = 100g for lookup-scaled macros
  const ratio = 1; // per-100g values used directly as "per serving" baseline
  return {
    ...item,
    calories: item.calories || Math.round(Number(food.calories_per_100g  || 0) * ratio),
    protein:  item.protein  || Math.round(Number(food.protein_per_100g   || 0) * ratio * 10) / 10,
    fat:      item.fat      || Math.round(Number(food.fat_per_100g        || 0) * ratio * 10) / 10,
    carbs:    item.carbs    || Math.round(Number(food.carbs_per_100g      || 0) * ratio * 10) / 10,
    fiber:    item.fiber    || Math.round(Number(food.fiber_per_100g      || 0) * ratio * 10) / 10,
    sugar:    item.sugar    || Math.round(Number(food.sugar_per_100g      || 0) * ratio * 10) / 10,
    sodium:   item.sodium   || Math.round(Number(food.sodium_mg_per_100g  || 0) * ratio),
    source:         lookup?.source         || item.source,
    match_description: lookup?.match_description,
    match_score:    lookup?.match_score,
    unverified:     !!lookup?.unverified,
    cache_candidate: lookup?.cache_candidate || null,
    cache_hit:      lookup?.cache_hit ?? false,
  };
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const userInput = String(body?.foodDescription || '').trim();

    if (!userInput) {
      return NextResponse.json({ success: false, message: 'Missing foodDescription' }, { status: 400 });
    }

    const meals = parseMeals(userInput);
    const cache_candidates: any[] = [];

    // Sequential lookups (parallel caused race conditions with regex global state)
    for (const meal of meals) {
      for (let i = 0; i < meal.items.length; i++) {
        const item = meal.items[i];
        const missingMacros =
          !item.calories || !item.protein || !item.fat || !item.carbs;

        if (!missingMacros) continue;

        const knownMacros = knownMacrosFromItem(item);
        const lookup = await lookupMacros(item.food_name, Object.keys(knownMacros).length ? knownMacros : undefined);

        if (lookup?.food) {
          meal.items[i] = fillFromLookup(item, lookup);
          if (lookup.cache_candidate) {
            cache_candidates.push(lookup.cache_candidate);
          }
        } else {
          meal.items[i] = { ...item, source: item.source || 'ai', unverified: true };
        }
      }
    }

    return NextResponse.json({ success: true, meals, cache_candidates });

  } catch (error: any) {
    console.error('[parse-food] error:', error);
    return NextResponse.json(
      { success: false, message: 'Error parsing nutrition data', error: String(error?.message || error) },
      { status: 500 }
    );
  }
}
