// POST /api/parse-food
//
// Parses a free-text food description into structured meal data.
//
// Strategy:
//   1. Use regex to split the input into meal segments (breakfast/lunch/dinner/snack)
//      and extract inline macro values the user may have stated (e.g. "420 cal, 30g protein").
//   2. For each item whose macros are incomplete, call /api/get-food-macros to look up
//      nutritional data via the cache → Open Food Facts → AI fallback chain.
//   3. Lookups are done SEQUENTIALLY (not parallel) to avoid regex global-lastIndex race
//      conditions that occur when pattern.test() runs concurrently on shared RegExp objects.
//   4. Return structured meals plus any cache_candidates (pending DB writes that the client
//      should commit only after the user confirms the logged entry).

import { NextResponse } from 'next/server';

// Base URL for internal API calls (parse-food → get-food-macros).
// Falls back to localhost during development.
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// Maximum ms to wait for a single macro lookup before giving up.
const LOOKUP_TIMEOUT_MS = 30_000;

// ============================================================================
// TYPES
// ============================================================================

// All macros are per-serving as entered/estimated by the user or lookup chain.
type Nutrition = {
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number; // mg
};

// Represents one food item within a meal, with optional provenance metadata.
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
  whole_food_ingredients: string[]; // used for biodiversity scoring
  // Provenance — where the macro data came from
  source?: 'parsed' | 'cache' | 'off' | 'ai';
  match_description?: string; // human-readable description of the match
  match_score?: number;       // composite similarity score (0–1)
  unverified?: boolean;       // true for AI estimates that need user review
  cache_candidate?: any;      // pending write to master_food_database on confirmation
  cache_hit?: boolean;        // true if data came from our Supabase cache
};

// A group of items belonging to one meal occasion.
type Meal = {
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  items: MealItem[];
  notes?: string | null;    // e.g. restaurant name extracted from the input
  eating_out?: boolean;
};

// ============================================================================
// NUTRITION EXTRACTION
//
// Patterns handle common user formats:
//   "10 g of fat", "150 mg sodium", "3 g dietary fiber", "420 cal", "420 kcal"
// Using 'gi' flags with matchAll() — lastIndex is reset explicitly before each use
// to prevent state bleed when the same pattern is reused across calls.
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

// Extract all nutritional values from a text segment and sum any duplicates
// (e.g. "10g fat from the burger, 5g fat from the sauce").
function parseNutrition(text: string): Nutrition {
  const n: Nutrition = { calories: 0, carbs: 0, protein: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 };
  for (const [key, pattern] of Object.entries(nutritionPatterns)) {
    // Reset lastIndex before each use — critical for 'g' flag patterns
    pattern.lastIndex = 0;
    let total = 0;
    for (const m of text.matchAll(pattern)) {
      if (m[1]) total += parseFloat(m[1]);
    }
    (n as any)[key] = total;
  }
  return n;
}

// Quick check: does this text contain any nutrition data at all?
// Used to decide whether a segment needs macro-lookup or is already self-described.
function hasAnyMacros(text: string): boolean {
  return Object.values(nutritionPatterns).some((p) => {
    p.lastIndex = 0;
    return p.test(text);
  });
}

// ============================================================================
// TEXT CLEANING HELPERS
// ============================================================================

// Phrases that contain the word "and" but should NOT be split on it.
// Temporarily replace " and " with " & " to protect them during item splitting.
const protectedPhrases = ['egg and cheese', 'mac and cheese', 'peanut butter and jelly', 'salt and pepper'];

function protectPhrases(text: string): string {
  let t = text;
  for (const phrase of protectedPhrases) {
    t = t.replace(new RegExp(phrase, 'gi'), phrase.replace(/\s+and\s+/i, ' & '));
  }
  return t;
}

// Restore " & " back to " and " after splitting is complete.
function unprotectPhrases(text: string): string {
  return text.replace(/\s&\s/gi, ' and ');
}

// Attempt to extract a restaurant name from phrases like "from Starbucks" or "at Chipotle".
// Returns null if no restaurant is detected.
function extractRestaurant(text: string): string | null {
  const match = text.match(
    /\b(?:from|at|went\s+to)\s+(?:my\s+(?:favorite\s+)?)?(?:coffee\s+shop|restaurant|cafe|spot)?\s*(?:called\s+)?([A-Z][\w'&\s]+?)(?:\s+and\s+(?:got|had|ordered)|\s+for\b|\s+to\s+get\b|[,.]|$)/i
  );
  return match?.[1]?.trim() || null;
}

// Strip trailing macro qualifiers like "that was 190 cal" or "with 10g fat, 20g carbs"
// so they don't end up as part of the food name.
function stripMacroSuffix(text: string): string {
  let t = text;
  // "that was / which was" signals the start of inline macros
  if (/\b(?:that was|which was)\b/i.test(t)) t = t.split(/\b(?:that was|which was)\b/i)[0];
  // "with 10g fat..." trailing clause
  t = t.replace(/\bwith\s+\d+(?:\.\d+)?\s*(?:k?cal|g|mg)\b.*$/i, '');
  return t.trim();
}

// Remove all matched nutrition tokens from a text, leaving just the food description.
function cleanFoodText(text: string): string {
  let t = text;
  for (const p of Object.values(nutritionPatterns)) {
    p.lastIndex = 0;
    t = t.replace(p, '');
  }
  return t.replace(/\s+/g, ' ').trim();
}

// Extract a clean food name from a raw segment, capping at 16 words to avoid
// pulling in surrounding sentence context.
function extractFoodName(text: string): string {
  // Grab the phrase after a food verb — "had a large coffee" → "large coffee"
  const match = text.match(/(?:had|got|ate|ordered)\s+(.+?)(?:\s+that was|\s+which was|\s+with\b|[,.]|$)/i);
  const raw = match?.[1] || text;
  const stripped = stripMacroSuffix(raw);
  return cleanFoodText(stripped)
    .replace(/^(?:a|an|the)\s+/i, '')          // drop leading articles
    .replace(/^(?:before|after)\s+(?:i\s+)?worked\s+out\b[,:\s]*/i, '') // drop workout context
    .trim()
    .split(/\s+/)
    .slice(0, 16)
    .join(' ');
}

// Build a MealItem shell with zeroed macros. If nutrition is provided and has
// any non-zero values the source is marked as 'parsed' (inline user data).
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
    // Mark as 'parsed' only when we actually extracted numbers from the text
    source: nutrition && Object.values(nutrition).some(Boolean) ? 'parsed' : undefined,
  };
}

// Merge inline macro data into an existing item. Inline values always win over
// whatever the item previously had (they are explicitly stated by the user).
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
//
// Splits "a kolache and a latte" into TWO items using simple "and a/an" rules,
// while protecting compound-name phrases like "egg and cheese".
//
// Does NOT split on "and after I worked out, I had" style mid-sentence
// continuations — those are handled at the meal-segment level in parseMeals().
// ============================================================================

function splitItemsFromSegment(segment: string): MealItem[] {
  // Isolate the food clause after the introductory verb
  const clauseMatch = segment.match(/(?:had|got|ate|ordered)\s+(.+)/i);
  const clause = protectPhrases(clauseMatch?.[1] || segment)
    .replace(/^(?:also,?\s*)/i, '') // strip leading "also"
    .replace(/\.$/, '')
    .trim();

  // Split on "and a/an <word>", comma-delimited items, or bare commas between foods.
  // This is intentionally aggressive — false splits are recovered by the macro-suffix
  // merge pass below (a "which was 190 cal" part re-attaches to the prior item).
  const parts = clause
    .split(/\s+and\s+(?:a|an)\s+|\s*,\s+(?=(?:a|an)\s+\w)|,\s*/i)
    .map((p) => unprotectPhrases(p.replace(/^(?:a|an|the)\s+/i, '').trim()))
    .filter(Boolean);

  const items: MealItem[] = [];

  for (const part of parts) {
    const isMacroPart = hasAnyMacros(part);
    // "which was 190 cal …" is a modifier that belongs to the preceding item
    const isModifier  = /^\s*(?:which|that)\s+was\b/i.test(part);

    if (isMacroPart && isModifier && items.length > 0) {
      // Attach inline macros to the item we just pushed
      items[items.length - 1] = mergeMacros(items[items.length - 1], parseNutrition(part));
      continue;
    }

    if (isMacroPart) {
      // This part IS the food item and it already contains its own macros
      const nutrition = parseNutrition(part);
      const name = extractFoodName(part);
      items.push({ ...buildItem(name, nutrition), source: 'parsed' });
      continue;
    }

    // No macros in this part — just a food name; macros will be looked up later
    items.push(buildItem(extractFoodName(part)));
  }

  return items;
}

// ============================================================================
// MEAL SEGMENTATION
//
// Splits the full user input into meal groups keyed by "for breakfast/lunch/dinner/snack"
// anchors. Also handles:
//   - "as a snack", "also, for breakfast"
//   - mid-sentence "and after I worked out, I had …" creates a new sub-segment
//     within the same meal type (time context carries forward)
// ============================================================================

function parseMeals(userInput: string): Meal[] {
  // Normalise mid-sentence "and <filler>, I had/got" transitions into sentence breaks
  // so that they are treated as separate item segments by the regex below.
  // Only rewrite if there is genuinely interstitial content (e.g. "and after workout,")
  // rather than a plain "and I had" which might just mean "additionally".
  const normalised = userInput.replace(
    /\s+and\s+(?:[^,.]+,\s*)?i\s+(?:had|got|ate|ordered)\s+/gi,
    (match) => {
      const hasInterstitial = /and\s+\S[^,]+,/.test(match);
      return hasInterstitial ? '. I had ' : match;
    }
  );

  // Find all meal-type anchors in the normalised text
  const mealRegex =
    /(?:^|(?<=\.\s*))(?:(?:also|and|then)[,\s]+)?(?:(?:as\s+a|for)\s+)(breakfast|lunch|dinner|snack)\b/gi;

  const matches: { index: number; type: Meal['meal_type'] }[] = [];
  let m: RegExpExecArray | null;
  while ((m = mealRegex.exec(normalised)) !== null) {
    const type = m[1].toLowerCase() as Meal['meal_type'];
    matches.push({ index: m.index, type });
  }

  // If no anchors were found, treat the whole input as a single un-typed meal.
  // Default to 'lunch' — this will be overridden by the UI if needed.
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
    const start   = matches[i].index;
    const end     = i + 1 < matches.length ? matches[i + 1].index : normalised.length;
    const segment = normalised.slice(start, end).trim();
    const mealType = matches[i].type;
    const notes    = extractRestaurant(segment);

    // Further split the segment at internal sentence breaks (". I had …")
    // introduced by the normalisation pass above, keeping all items under
    // the same meal_type.
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
// MACRO LOOKUP
//
// knownMacros: values the user explicitly stated in the input text.
// These are forwarded to get-food-macros so the AI fallback doesn't override them.
// ============================================================================

// Collect whichever macros the item already has from inline parsing.
// These are considered "known" because the user stated them directly.
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

// Call the get-food-macros route with a per-request AbortController timeout.
// Returns null on network error or timeout so callers can gracefully fall through.
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
    // Timeout or network error — return null so the item stays unverified
    return null;
  } finally {
    clearTimeout(t);
  }
}

// Merge lookup result into an item. Inline (parsed) values always take precedence
// over lookup values — they represent what the user explicitly told us.
function fillFromLookup(item: MealItem, lookup: any): MealItem {
  const food = lookup?.food;
  if (!food) return item;

  // lookup values are per 100g; use them directly as a "1 serving ≈ 100g" baseline
  // until the user adjusts the quantity in the UI (which triggers proportional scaling).
  const ratio = 1;
  return {
    ...item,
    calories: item.calories || Math.round(Number(food.calories_per_100g  || 0) * ratio),
    protein:  item.protein  || Math.round(Number(food.protein_per_100g   || 0) * ratio * 10) / 10,
    fat:      item.fat      || Math.round(Number(food.fat_per_100g        || 0) * ratio * 10) / 10,
    carbs:    item.carbs    || Math.round(Number(food.carbs_per_100g      || 0) * ratio * 10) / 10,
    fiber:    item.fiber    || Math.round(Number(food.fiber_per_100g      || 0) * ratio * 10) / 10,
    sugar:    item.sugar    || Math.round(Number(food.sugar_per_100g      || 0) * ratio * 10) / 10,
    sodium:   item.sodium   || Math.round(Number(food.sodium_mg_per_100g  || 0) * ratio),
    source:          lookup?.source            || item.source,
    match_description: lookup?.match_description,
    match_score:     lookup?.match_score,
    unverified:      !!lookup?.unverified,
    cache_candidate: lookup?.cache_candidate   || null,
    cache_hit:       lookup?.cache_hit ?? false,
  };
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

export async function POST(request: Request) {
  try {
    const body      = await request.json();
    const userInput = String(body?.foodDescription || '').trim();

    if (!userInput) {
      return NextResponse.json(
        { success: false, message: 'Missing foodDescription' },
        { status: 400 }
      );
    }

    // Parse the raw text into meal segments with extracted items
    const meals = parseMeals(userInput);

    // Accumulate all pending DB writes — client commits these after user confirmation
    const cache_candidates: any[] = [];

    // Sequential lookups: parallel fetch + global regex patterns = lastIndex race conditions.
    // Each item whose core macros are missing gets a lookup call.
    for (const meal of meals) {
      for (let i = 0; i < meal.items.length; i++) {
        const item = meal.items[i];

        // Skip lookup if the user already stated all four core macros inline
        const missingMacros =
          !item.calories || !item.protein || !item.fat || !item.carbs;

        if (!missingMacros) continue;

        const knownMacros = knownMacrosFromItem(item);
        const lookup = await lookupMacros(
          item.food_name,
          Object.keys(knownMacros).length ? knownMacros : undefined
        );

        if (lookup?.food) {
          meal.items[i] = fillFromLookup(item, lookup);
          // Collect cache_candidates from OFF and AI results for deferred DB write
          if (lookup.cache_candidate) {
            cache_candidates.push(lookup.cache_candidate);
          }
        } else {
          // Lookup failed or timed out — mark as unverified so the UI can flag it
          meal.items[i] = { ...item, source: item.source || 'ai', unverified: true };
        }
      }
    }

    return NextResponse.json({ success: true, meals, cache_candidates });

  } catch (error: any) {
    console.error('[parse-food] error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Error parsing nutrition data',
        error: String(error?.message || error),
      },
      { status: 500 }
    );
  }
}
