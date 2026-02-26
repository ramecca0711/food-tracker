import { NextRequest, NextResponse } from 'next/server';
import { parseFood } from '@/lib/openai';
import type { FoodItem } from '@/lib/openai';

// Internal URL for server-to-server calls to the get-food-macros route.
// NEXT_PUBLIC_APP_URL must be set in Vercel env vars; defaults to localhost for local dev.
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const LOOKUP_TIMEOUT_MS = 30_000;

// ─────────────────────────────────────────────────────────────────────────────
// Macro lookup helpers (cache → OpenFoodFacts → AI chain)
// ─────────────────────────────────────────────────────────────────────────────

// Calls the get-food-macros route for a single food name.
// Returns the full lookup response (source, food per-100g data, cache_candidate)
// or null if the request times out or the route returns an error.
async function lookupMacros(foodName: string): Promise<any | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LOOKUP_TIMEOUT_MS);
  try {
    const res = await fetch(`${APP_URL}/api/get-food-macros`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ foodName }),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// Merges a macro lookup result into an existing FoodItem.
//
// Priority rules:
//   1. User-provided macros (provided_by_user: true) are always preserved as-is.
//   2. Cache or OpenFoodFacts hits override the initial AI estimate with verified
//      / crowd-sourced per-100g label data (applied at 1:1 / 100g baseline ratio).
//   3. AI fallback results from get-food-macros are discarded — the AI macros
//      already returned by parseFood() are kept because they were estimated with
//      the full meal description as context (usually better quality).
function mergeItemWithLookup(item: FoodItem, lookup: any): FoodItem {
  if (!lookup?.food) return item;

  // Honour macros the user explicitly stated in their description
  if (item.provided_by_user) return item;

  // AI fallback: keep parseFood's macros (better context); cache_candidate is
  // still collected below so the per-100g estimate gets written to the DB cache.
  if (lookup.source === 'ai') return item;

  const food = lookup.food;

  // Scale from per-100g at ratio 1 (100 g baseline serving).
  // Not exact for every serving size but consistent with the existing lookup pattern.
  return {
    ...item,
    calories:   Math.round(Number(food.calories_per_100g    || 0)),
    protein:    Math.round(Number(food.protein_per_100g     || 0) * 10) / 10,
    fat:        Math.round(Number(food.fat_per_100g         || 0) * 10) / 10,
    carbs:      Math.round(Number(food.carbs_per_100g       || 0) * 10) / 10,
    fiber:      Math.round(Number(food.fiber_per_100g       || 0) * 10) / 10,
    sugar:      Math.round(Number(food.sugar_per_100g       || 0) * 10) / 10,
    sodium:     Math.round(Number(food.sodium_mg_per_100g   || 0)),
    source:     lookup.source as FoodItem['source'],
    unverified: !!lookup.unverified,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Route handler
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const { foodDescription } = await request.json();

    if (!foodDescription || typeof foodDescription !== 'string') {
      return NextResponse.json(
        { error: 'Food description is required' },
        { status: 400 }
      );
    }

    // Step 1 — AI parse: convert the free-text meal description into a structured
    // list of meals/items with food names, quantities, categories, and initial
    // macro estimates. All seven macros are estimated even if the user didn't
    // supply them explicitly.
    const parsed = await parseFood(foodDescription);

    // Step 2 — Macro lookup: for every parsed item, run the
    // cache → OpenFoodFacts → AI chain via get-food-macros.
    // All lookups fire in parallel so total latency equals the slowest single call.
    type LookupTask = { mealIdx: number; itemIdx: number; foodName: string };
    const tasks: LookupTask[] = [];

    for (let m = 0; m < parsed.meals.length; m++) {
      for (let i = 0; i < parsed.meals[m].items.length; i++) {
        tasks.push({ mealIdx: m, itemIdx: i, foodName: parsed.meals[m].items[i].food_name });
      }
    }

    const lookupResults = await Promise.all(tasks.map((t) => lookupMacros(t.foodName)));

    // Step 3 — Merge: override item macros with verified data where a cache or
    // OFF hit was found, and accumulate cache_candidates for the deferred DB write
    // that happens when the user confirms the log entry (handled in LogFoodView).
    const cache_candidates: any[] = [];

    for (let j = 0; j < tasks.length; j++) {
      const { mealIdx, itemIdx } = tasks[j];
      const lookup = lookupResults[j];

      if (lookup) {
        // Apply better macros if cache/OFF found; keep parseFood macros for AI fallback
        parsed.meals[mealIdx].items[itemIdx] = mergeItemWithLookup(
          parsed.meals[mealIdx].items[itemIdx],
          lookup
        );

        // cache_candidate is present for OFF and AI results (not for cache hits —
        // those are already stored in master_food_database).
        if (lookup.cache_candidate) {
          cache_candidates.push(lookup.cache_candidate);
        }
      }
    }

    // Return meals with enriched macros and the candidates to cache on save.
    return NextResponse.json({ ...parsed, cache_candidates });

  } catch (error) {
    console.error('Error parsing food:', error);
    return NextResponse.json(
      { error: 'Failed to parse food' },
      { status: 500 }
    );
  }
}




// import { NextResponse } from 'next/server';

// const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
// const LOOKUP_TIMEOUT_MS = 30_000;

// // ─────────────────────────────────────────────────────────────────────────────
// // Types
// // ─────────────────────────────────────────────────────────────────────────────

// type Nutrition = {
//   calories: number;
//   carbs: number;
//   protein: number;
//   fat: number;
//   fiber: number;
//   sugar: number;
//   sodium: number; // mg
// };

// type MealItem = {
//   food_name: string;
//   quantity: string;
//   calories: number;
//   protein: number;
//   fat: number;
//   carbs: number;
//   fiber: number;
//   sugar: number;
//   sodium: number;
//   categories: string[];
//   whole_food_ingredients: string[];
//   source?: 'parsed' | 'cache' | 'off' | 'ai';
//   match_description?: string;
//   match_score?: number;
//   unverified?: boolean;
//   cache_candidate?: any;
// };

// type Meal = {
//   meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
//   items: MealItem[];
//   notes?: string | null;
//   eating_out?: boolean;
// };

// type LookupTask = { meal: Meal; i: number; item: MealItem; lookupName: string };

// // ─────────────────────────────────────────────────────────────────────────────
// // Nutrition pattern matching
// // ─────────────────────────────────────────────────────────────────────────────

// const nutritionPatterns = {
//   calories: /([\d]+(?:\.\d+)?)\s*(?:k?cal)\b/gi,
//   carbs:    /([\d]+(?:\.\d+)?)\s*g(?:\s*of)?\s*(?:carbs?|carbohydrates?)\b/gi,
//   protein:  /([\d]+(?:\.\d+)?)\s*g(?:\s*of)?\s*protein\b/gi,
//   fat:      /([\d]+(?:\.\d+)?)\s*g(?:\s*of)?\s*fat\b/gi,
//   fiber:    /([\d]+(?:\.\d+)?)\s*g(?:\s*of)?\s*(?:fiber|dietary\s*fiber)\b/gi,
//   sugar:    /([\d]+(?:\.\d+)?)\s*g(?:\s*of)?\s*(?:sugar|sugars)\b/gi,
//   sodium:   /([\d]+(?:\.\d+)?)\s*mg\s*sodium\b/gi,
// };

// function parseNutrition(text: string): Nutrition {
//   const n: Nutrition = { calories: 0, carbs: 0, protein: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 };
//   for (const [key, pattern] of Object.entries(nutritionPatterns)) {
//     pattern.lastIndex = 0;
//     let total = 0;
//     for (const m of text.matchAll(pattern)) if (m[1]) total += parseFloat(m[1]);
//     (n as any)[key] = total;
//   }
//   return n;
// }

// function hasAnyMacros(text: string): boolean {
//   return Object.values(nutritionPatterns).some((p) => {
//     p.lastIndex = 0;
//     return p.test(text);
//   });
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // Text utilities
// // ─────────────────────────────────────────────────────────────────────────────

// // Compound food phrases that contain "and" but must NOT be split on it.
// const protectedPhrases = ['egg and cheese', 'mac and cheese', 'peanut butter and jelly'];

// function protectPhrases(text: string): string {
//   let t = text;
//   for (const phrase of protectedPhrases) {
//     t = t.replace(new RegExp(phrase, 'gi'), phrase.replace(/\s+and\s+/i, ' & '));
//   }
//   return t;
// }

// function unprotectPhrases(text: string): string {
//   return text.replace(/\s&\s/gi, ' and ');
// }

// /** Detect a restaurant/coffee-shop name from natural language. */
// function extractRestaurant(text: string): string | null {
//   const match = text.match(
//     /\b(?:from|at|went to)\s+(?:my favorite\s+)?(?:coffee shop|restaurant|cafe)?\s*(?:called\s+)?([A-Z][\w'&\s]+?)(?:\s+and\s+got|\s+and\s+ordered|\s+for|\s+to\s+get|,|\.|$)/i
//   );
//   return match?.[1]?.trim() || null;
// }

// /** Drop everything after "that was …" or "which was …" macro declarations. */
// function stripMacroSuffix(text: string): string {
//   let t = text;
//   if (/\b(?:that was|which was)\b/i.test(t)) t = t.split(/\b(?:that was|which was)\b/i)[0];
//   t = t.replace(/\bwith\s+\d+(?:\.\d+)?\s*(?:k?cal|g|mg)\b.*$/i, '');
//   return t.trim();
// }

// /** Remove all inline macro tokens from a string so only the food name remains. */
// function cleanFoodText(text: string): string {
//   let t = text;
//   for (const p of Object.values(nutritionPatterns)) {
//     p.lastIndex = 0;
//     t = t.replace(p, '');
//   }
//   return t.replace(/\s+/g, ' ').trim();
// }

// /**
//  * Extract a clean food name from a phrase.
//  * Works on individual parts after splitting ("a rice cake that was 35 cal"),
//  * as well as full clauses ("I had a turkey sandwich").
//  */
// function extractFoodName(text: string): string {
//   // Try to capture the food from common eating verb patterns first
//   const match = text.match(/(?:had|got|ate|ordered)\s+(.+?)(?:\s+that was|\s+which was|\s+with\b|,|\.|$)/i);
//   const raw = match?.[1] || text;
//   const stripped = stripMacroSuffix(raw);

//   return cleanFoodText(stripped)
//     .replace(/^(?:for|at)\s+(?:breakfast|lunch|dinner|snack)\b[:,]?\s*/i, '')
//     .replace(/^(?:also,?\s*)/i, '')
//     // Strip leading activity context that sometimes leaks in ("before I worked out")
//     .replace(/^(?:before|after)\s+(?:i\s+)?worked?\s+out\b[:,]?\s*/i, '')
//     .replace(/^(?:a|an|the)\s+/i, '')
//     .trim()
//     .split(/\s+/)
//     .slice(0, 16)
//     .join(' ');
// }

// /**
//  * Strip leading quantity expressions so database lookups are cleaner.
//  * The display food_name keeps the full text; this is only used for the lookup call.
//  *
//  * Examples:
//  *   "12 oz minor figures oat milk latte" → "minor figures oat milk latte"
//  *   "2 cups chicken broth"               → "chicken broth"
//  *   "vanilla core power elite"           → "vanilla core power elite"  (unchanged)
//  */
// function forLookup(foodName: string): string {
//   const stripped = foodName
//     .replace(/^\d+(?:\/\d+)?\s*(?:oz|ml|g|kg|lb|lbs|fl\s*oz|cup|cups|tbsp|tsp|serving|servings|piece|pieces|slice|slices)\s+/i, '')
//     .replace(/^(?:a|an|the)\s+/i, '')
//     .trim();
//   return stripped || foodName; // fallback if stripping removes everything
// }

// /**
//  * Return false for strings that look like activity/context phrases that slipped
//  * through splitting, not actual foods (e.g. "after I worked out", "I", "").
//  */
// function isValidFoodName(name: string): boolean {
//   if (!name || name.length < 3) return false;
//   const junkPattern = /^(?:i\s+)?(?:worked?\s+out|exercised?|went\s+to\s+the\s+gym|ran?|jogged?|before|after|then|also|and|worked)$/i;
//   return !junkPattern.test(name.trim());
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // Item construction helpers
// // ─────────────────────────────────────────────────────────────────────────────

// function mergeMacros(target: MealItem, nutrition: Nutrition): MealItem {
//   return {
//     ...target,
//     // Only overwrite with a parsed value if it is non-zero
//     calories: nutrition.calories || target.calories,
//     protein:  nutrition.protein  || target.protein,
//     fat:      nutrition.fat      || target.fat,
//     carbs:    nutrition.carbs    || target.carbs,
//     fiber:    nutrition.fiber    || target.fiber,
//     sugar:    nutrition.sugar    || target.sugar,
//     sodium:   nutrition.sodium   || target.sodium,
//     source: 'parsed',
//   };
// }

// function buildItem(name: string, nutrition?: Nutrition): MealItem {
//   const hasValues = nutrition && Object.values(nutrition).some((v) => v > 0);
//   return {
//     food_name: name || 'Unknown item',
//     quantity: '1 serving',
//     calories: nutrition?.calories ?? 0,
//     protein:  nutrition?.protein  ?? 0,
//     fat:      nutrition?.fat      ?? 0,
//     carbs:    nutrition?.carbs    ?? 0,
//     fiber:    nutrition?.fiber    ?? 0,
//     sugar:    nutrition?.sugar    ?? 0,
//     sodium:   nutrition?.sodium   ?? 0,
//     categories: [],
//     whole_food_ingredients: [],
//     source: hasValues ? 'parsed' : undefined,
//   };
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // Segment parsing
// // ─────────────────────────────────────────────────────────────────────────────

// /**
//  * Splits a meal segment into independent eating sub-clauses when the user
//  * describes multiple eating events within one meal entry.
//  *
//  * SPLITS on: "…and [optional context like 'after I worked out,'] I had/got/ate/ordered…"
//  * The critical requirement is that "I" precedes the eating verb — this prevents
//  * splitting on "…and got a kolache and a latte" (no subject "I").
//  *
//  * Example that DOES split:
//  *   "…rice cake that was 35 cal and after I worked out, I had a protein shake"
//  *   → ["…rice cake that was 35 cal", "I had a protein shake"]
//  *
//  * Example that does NOT split:
//  *   "…got a kolache and a 12 oz latte with vanilla syrup"
//  *   → ["…got a kolache and a 12 oz latte with vanilla syrup"]  (unchanged)
//  */
// function extractSubClauses(segment: string): string[] {
//   // Match "and [optional non-comma chars, then comma+space] I (eating verb)"
//   // The [^,]* up to a comma handles phrases like "after I worked out,"
//   const splitRe = /\s+and\s+(?:[^,]*,\s*)?(?=I\s+(?:had|got|ate|ordered)\b)/gi;
//   const parts = segment.split(splitRe).map((s) => s.trim()).filter(Boolean);
//   return parts.length > 0 ? parts : [segment];
// }

// /**
//  * Process one contiguous food-description clause into MealItems.
//  * A clause is the text after one eating verb up to the next (e.g.
//  * "I had X and Y" or "got a kolache and a latte").
//  */
// function processClause(clause: string): MealItem[] {
//   // Extract everything after the first eating verb
//   const clauseMatch = clause.match(/(?:had|got|ate|ordered)\s+(.+)/i);
//   const rawClause = protectPhrases(
//     (clauseMatch?.[1] || clause)
//       .replace(/^(?:also,?\s*)/i, '')
//       .replace(/\.$/, '')
//       .trim()
//   );

//   // Split compound items on "and a/an …", plain "and …", or ", …"
//   const parts = rawClause
//     .split(/\s+and\s+(?:a|an)\s+|\s+and\s+|,\s+/i)
//     .map((p) => unprotectPhrases(p.replace(/^(?:a|an|the)\s+/i, '').trim()))
//     .filter(Boolean);

//   const items: MealItem[] = [];

//   for (const part of parts) {
//     const isMacroPart = hasAnyMacros(part);
//     // "which was 190 cal…" or "that was 35 cal…" modifies the preceding item
//     const isModifier = /^\s*(which|that)\s+was\b/i.test(part);

//     if (isMacroPart && isModifier && items.length > 0) {
//       // Merge parsed nutrition onto the last item without creating a new one
//       items[items.length - 1] = mergeMacros(items[items.length - 1], parseNutrition(part));
//       continue;
//     }

//     const name = extractFoodName(part);

//     // Filter out non-food context fragments that can appear after splitting
//     // (e.g. "after I worked out", "I", very short noise)
//     if (!isValidFoodName(name)) continue;

//     if (isMacroPart) {
//       // User supplied at least some nutrition inline — use what they gave us.
//       // fillFromLookup will fill any remaining zeros from the database.
//       items.push({ ...buildItem(name, parseNutrition(part)), source: 'parsed' });
//     } else {
//       // No inline nutrition — will be looked up after all items are collected.
//       items.push(buildItem(name));
//     }
//   }

//   return items;
// }

// /**
//  * Main item-extraction entry point for a meal segment.
//  * Handles multiple eating events per segment by first splitting into sub-clauses,
//  * then processing each independently.
//  */
// function splitItemsFromSegment(segment: string): MealItem[] {
//   const subClauses = extractSubClauses(segment);
//   const allItems: MealItem[] = [];
//   for (const clause of subClauses) {
//     allItems.push(...processClause(clause));
//   }
//   return allItems;
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // Meal segmentation
// // ─────────────────────────────────────────────────────────────────────────────

// /**
//  * Top-level parser: split the full user input into per-meal segments using
//  * meal-type keywords, then extract items from each segment.
//  */
// function parseMeals(userInput: string): Meal[] {
//   const mealRegex = /(?:for|at)\s+(breakfast|lunch|dinner|snack)\b|as a\s+(snack)\b/gi;
//   const matches: { index: number; type: Meal['meal_type'] }[] = [];
//   let m: RegExpExecArray | null;

//   while ((m = mealRegex.exec(userInput)) !== null) {
//     const type = ((m[1] || m[2]) as Meal['meal_type']) || 'lunch';
//     matches.push({ index: m.index, type });
//   }

//   // No meal-type keyword found — treat the whole input as a single (lunch) meal
//   if (matches.length === 0) {
//     const notes = extractRestaurant(userInput);
//     return [{
//       meal_type: 'lunch',
//       items: splitItemsFromSegment(userInput),
//       notes: notes || null,
//       eating_out: !!notes,
//     }];
//   }

//   const meals: Meal[] = [];

//   for (let i = 0; i < matches.length; i++) {
//     const start = matches[i].index;
//     const end = i + 1 < matches.length ? matches[i + 1].index : userInput.length;
//     const segment = userInput.slice(start, end).trim();

//     meals.push({
//       meal_type: matches[i].type,
//       items: splitItemsFromSegment(segment),
//       notes: extractRestaurant(segment) || null,
//       eating_out: !!extractRestaurant(segment),
//     });
//   }

//   return meals;
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // Macro lookup & fill
// // ─────────────────────────────────────────────────────────────────────────────

// /**
//  * Merge lookup results onto an item while preserving any macros the user
//  * already supplied inline.  Only zero fields are filled from the database.
//  *
//  * Baseline: 1 serving ≈ 100 g (ratio = 1).  Quantity-aware scaling can be
//  * added later once quantity parsing is in place.
//  */
// function fillFromLookup(item: MealItem, lookup: any): MealItem {
//   const food = lookup?.food;
//   if (!food) return item;

//   const ratio = 1; // 100 g baseline

//   return {
//     ...item,
//     // Preserve user-provided (non-zero) values; fill zeros from lookup
//     calories: item.calories || Math.round(Number(food.calories_per_100g || 0) * ratio),
//     protein:  item.protein  || Math.round(Number(food.protein_per_100g  || 0) * ratio * 10) / 10,
//     fat:      item.fat      || Math.round(Number(food.fat_per_100g      || 0) * ratio * 10) / 10,
//     carbs:    item.carbs    || Math.round(Number(food.carbs_per_100g    || 0) * ratio * 10) / 10,
//     fiber:    item.fiber    || Math.round(Number(food.fiber_per_100g    || 0) * ratio * 10) / 10,
//     sugar:    item.sugar    || Math.round(Number(food.sugar_per_100g    || 0) * ratio * 10) / 10,
//     sodium:   item.sodium   || Math.round(Number(food.sodium_mg_per_100g || 0) * ratio),
//     source:            lookup?.source           ?? item.source,
//     match_description: lookup?.match_description,
//     match_score:       lookup?.match_score,
//     unverified:        !!lookup?.unverified,
//     cache_candidate:   lookup?.cache_candidate ?? null,
//   };
// }

// async function lookupMacros(foodName: string): Promise<any | null> {
//   const controller = new AbortController();
//   const timer = setTimeout(() => controller.abort(), LOOKUP_TIMEOUT_MS);
//   try {
//     const res = await fetch(`${APP_URL}/api/get-food-macros`, {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({ foodName }),
//       signal: controller.signal,
//     });
//     if (!res.ok) return null;
//     return res.json();
//   } catch {
//     return null;
//   } finally {
//     clearTimeout(timer);
//   }
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // Route handler
// // ─────────────────────────────────────────────────────────────────────────────

// export async function POST(request: Request) {
//   try {
//     const body = await request.json();
//     const userInput = String(body?.foodDescription || '').trim();

//     if (!userInput) {
//       return NextResponse.json({ success: false, message: 'Missing foodDescription' }, { status: 400 });
//     }

//     const meals = parseMeals(userInput);
//     const cache_candidates: any[] = [];

//     // ── Step 1: Collect all items that still need any macro filled ────────────
//     // An item needs a lookup if ANY of its 7 macro fields is still zero.
//     // Items where the user provided all macros inline are skipped entirely,
//     // saving a network round-trip for each of them.
//     const tasks: LookupTask[] = [];

//     for (const meal of meals) {
//       for (let i = 0; i < meal.items.length; i++) {
//         const item = meal.items[i];
//         const needsLookup =
//           !item.calories || !item.protein || !item.fat ||
//           !item.carbs   || !item.fiber   || !item.sugar || !item.sodium;

//         if (needsLookup) {
//           // forLookup() strips leading quantity tokens ("12 oz", "2 cups") so
//           // the database receives a cleaner food name and returns better matches.
//           tasks.push({ meal, i, item, lookupName: forLookup(item.food_name) });
//         }
//       }
//     }

//     // ── Step 2: Fire ALL lookups in parallel ──────────────────────────────────
//     // Previously these ran sequentially — for a 5-item meal that's 5× the latency.
//     // Promise.all means the total wait time equals the slowest single lookup.
//     const results = await Promise.all(tasks.map((t) => lookupMacros(t.lookupName)));

//     // ── Step 3: Apply results back to their items ─────────────────────────────
//     for (let j = 0; j < tasks.length; j++) {
//       const { meal, i, item } = tasks[j];
//       const lookup = results[j];

//       if (lookup?.food) {
//         meal.items[i] = fillFromLookup(item, lookup);
//         // Accumulate cache candidates to be written to master_food_database
//         // on the user's next Save (handled in LogFoodView handleConfirm).
//         if (lookup.cache_candidate) {
//           cache_candidates.push(lookup.cache_candidate);
//         }
//       } else {
//         // Lookup failed entirely — keep whatever inline macros we have and flag it
//         meal.items[i] = { ...item, source: item.source || 'ai', unverified: true };
//       }
//     }

//     return NextResponse.json({ success: true, meals, cache_candidates });
//   } catch (error: any) {
//     return NextResponse.json(
//       { success: false, message: 'Error parsing nutrition data', error: String(error?.message || error) },
//       { status: 500 }
//     );
//   }
// }