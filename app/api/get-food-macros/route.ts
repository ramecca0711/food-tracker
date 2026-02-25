// POST /api/get-food-macros
//
// Macro lookup chain for a single food item. Tried in order:
//   1. Supabase master_food_database (our persistent cache, fastest + free)
//   2. Open Food Facts (OFF) — free, crowd-sourced product database
//      NOTE: USDA integration is intentionally disabled. Do not re-enable
//      without discussion. OFF covers most common foods well enough.
//   3. GPT-4o-mini AI estimate (slowest, but always provides an answer)
//
// Caller (parse-food) passes knownMacros — values the user already stated
// inline (e.g. "420 cal, 30g protein"). The AI respects these exactly and
// only estimates the unknowns, preventing contradictions.
//
// Returns per-100g values. The caller scales to the user's serving size.
// If the result came from OFF or AI (not already cached), a cache_candidate
// object is returned so the client can write it to the DB after user confirmation.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// ============================================================================
// CLIENTS
// ============================================================================

// Lazy factories — deferred so Next.js can import this module at build time
// without throwing "supabaseUrl is required" (env vars only available at runtime).

// Use service role key so the cache lookup can read/write master_food_database
// without being blocked by Row Level Security policies.
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

// Open Food Facts endpoints
const OFF_SEARCH_URL  = 'https://world.openfoodfacts.org/cgi/search.pl';
const OFF_PRODUCT_URL = 'https://world.openfoodfacts.org/api/v2/product';

// Global timeout for external fetch calls (OFF + AI)
const TIMEOUT_MS = 30_000;

// ============================================================================
// TYPES
// ============================================================================

// All nutritional values normalised to per-100g (or per-100ml for liquids).
// This allows consistent storage and quantity-based scaling in the UI.
type FoodMacrosPer100g = {
  name: string;
  brand?: string | null;
  calories_per_100g: number;
  protein_per_100g: number;
  fat_per_100g: number;
  carbs_per_100g: number;
  fiber_per_100g: number;
  sugar_per_100g: number;
  sodium_mg_per_100g: number;
  serving_size_label?: string | null; // e.g. "1 cup (240ml)" — for display only
  serving_g?: number | null;          // numeric serving size in grams
  serving_ml?: number | null;         // numeric serving size in ml (liquids)
};

// ============================================================================
// SCORING
//
// We use a composite similarity score = max(Jaccard, tokenContainment).
//
// Why not pure Jaccard?
//   Branded products have extra descriptor words that push Jaccard below the
//   threshold even when the query is clearly contained in the product name.
//   E.g. query "greek yogurt" vs candidate "Chobani Non-Fat Plain Greek Yogurt":
//     Jaccard ≈ 0.28 (poor), containment = 1.0 (perfect match).
//
// Taking the max of both catches these "contained in" relationships while
// still penalising unrelated names that score high on one metric by chance.
// ============================================================================

// Lowercase, strip punctuation, collapse whitespace
const normalize = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

function tokenSet(s: string): Set<string> {
  return new Set(normalize(s).split(' ').filter(Boolean));
}

// Classic Jaccard index: |A∩B| / |A∪B|
function jaccard(A: Set<string>, B: Set<string>): number {
  const inter = [...A].filter((x) => B.has(x)).length;
  const union = new Set([...A, ...B]).size;
  return union ? inter / union : 0;
}

// What fraction of query tokens are present in the candidate?
// Useful when the candidate name is much longer than the query.
function containment(query: Set<string>, candidate: Set<string>): number {
  if (!query.size) return 0;
  return [...query].filter((t) => candidate.has(t)).length / query.size;
}

// The combined score we compare against CACHE_THRESHOLD
function compositeScore(a: string, b: string): number {
  const A = tokenSet(a);
  const B = tokenSet(b);
  return Math.max(jaccard(A, B), containment(A, B));
}

// Minimum composite score required to accept a fuzzy cache / OFF match.
// Too low → wrong foods match; too high → misses branded/partial name variants.
const CACHE_THRESHOLD = 0.55;

// ============================================================================
// HELPERS
// ============================================================================

// Wrap a promise with a hard timeout so slow external calls don't stall the route.
function withTimeout<T>(p: Promise<T>, ms = TIMEOUT_MS): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms);
    p.then((v) => { clearTimeout(t); resolve(v); })
     .catch((e) => { clearTimeout(t); reject(e); });
  });
}

// Accept an OFF product if it has the four core macros. fiber/sugar/sodium are
// often missing in OFF entries — we'd rather return partial data than fall through
// to a potentially slower AI call.
function hasCompleteOFF(n: any): boolean {
  return (
    n?.['energy-kcal_100g'] != null &&
    n?.['proteins_100g']    != null &&
    n?.['fat_100g']         != null &&
    n?.['carbohydrates_100g'] != null
  );
}

// Map an OFF product object to our normalised FoodMacrosPer100g shape.
// OFF stores sodium in grams; we convert to mg to match our DB schema.
function offToFood(p: any): FoodMacrosPer100g {
  const n = p.nutriments;
  // OFF sodium_100g field is in grams (g/100g) — multiply by 1000 to get mg/100g
  const sodium_mg_per_100g = Number(n['sodium_100g'] || 0) * 1000;

  const servingLabel = p.serving_size || null;
  const servingQty   = p.serving_quantity != null ? Number(p.serving_quantity) : null;
  let serving_g: number | null  = null;
  let serving_ml: number | null = null;

  // Classify the serving unit as weight or volume
  if (servingQty && servingLabel) {
    const s = String(servingLabel).toLowerCase();
    if (s.includes('ml') || s.includes('fl oz')) serving_ml = servingQty;
    else if (s.includes('g'))                     serving_g  = servingQty;
  }

  return {
    name: p.product_name || p.generic_name || 'Unknown food',
    brand: p.brands ? String(p.brands).split(',')[0].trim() : null,
    calories_per_100g: Number(n['energy-kcal_100g'] || 0),
    protein_per_100g:  Number(n['proteins_100g']    || 0),
    fat_per_100g:      Number(n['fat_100g']          || 0),
    carbs_per_100g:    Number(n['carbohydrates_100g']|| 0),
    fiber_per_100g:    Number(n['fiber_100g']        || 0),
    sugar_per_100g:    Number(n['sugars_100g']       || 0),
    sodium_mg_per_100g,
    serving_size_label: servingLabel,
    serving_g,
    serving_ml,
  };
}

// Build a cache_candidate record ready for insertion into master_food_database.
// The client holds this and writes it only when the user confirms the food log entry,
// preventing the DB from filling up with data the user never actually used.
function makeCacheCandidate(
  foodName: string,
  food: FoodMacrosPer100g,
  source: string,
  score: number,
  notes: string | null,
  unverified: boolean
) {
  return {
    normalized_name:    normalize(foodName),
    food_name:          food.name,
    brand:              food.brand ?? null,
    calories_per_100g:  food.calories_per_100g,
    protein_per_100g:   food.protein_per_100g,
    fat_per_100g:       food.fat_per_100g,
    carbs_per_100g:     food.carbs_per_100g,
    fiber_per_100g:     food.fiber_per_100g,
    sugar_per_100g:     food.sugar_per_100g,
    sodium_mg_per_100g: food.sodium_mg_per_100g,
    serving_size_label: food.serving_size_label ?? null,
    serving_g:          food.serving_g  ?? null,
    serving_ml:         food.serving_ml ?? null,
    source,
    unverified,
    match_confidence: score,
    match_notes:      notes,
  };
}

// ============================================================================
// 1. SUPABASE CACHE — two-attempt fuzzy strategy
//
// Attempt 1: ilike substring match on the full normalised name
// Attempt 2: per-token AND filter — catches cases where word order differs or
//            the query is only a partial phrase (e.g. "oat milk" vs "Oatly Barista Oat Milk")
//
// We score all returned rows and accept only if the best score ≥ CACHE_THRESHOLD.
// Rows are sorted by times_used desc so popular/frequently-confirmed entries win ties.
// ============================================================================

async function lookupCache(foodName: string) {
  // Instantiate client inside the function call — env vars are available at runtime
  const supabase = getSupabase();
  const n = normalize(foodName);

  // Score a list of DB rows and return the best one above threshold, or null.
  async function pickBest(rows: any[]): Promise<any | null> {
    if (!rows?.length) return null;
    const scored = rows
      .map((row: any) => ({
        row,
        score: compositeScore(n, row.normalized_name || row.food_name || ''),
      }))
      .sort((a: any, b: any) => b.score - a.score);
    const best = scored[0];
    return best.score >= CACHE_THRESHOLD ? best : null;
  }

  // Attempt 1: full normalised-name substring match
  const { data: rows1 } = await supabase
    .from('master_food_database')
    .select('*')
    .ilike('normalized_name', `%${n}%`)
    .order('times_used', { ascending: false })
    .limit(10);

  let best = await pickBest(rows1 ?? []);

  // Attempt 2: apply a per-token AND filter for multi-word queries that failed attempt 1.
  // Skip for single-token queries (the ilike above already covers them).
  if (!best) {
    const tokens = n.split(' ').filter((t) => t.length > 2);
    if (tokens.length > 1) {
      let q = supabase
        .from('master_food_database')
        .select('*')
        .order('times_used', { ascending: false })
        .limit(10);
      for (const token of tokens) {
        q = q.ilike('normalized_name', `%${token}%`);
      }
      const { data: rows2 } = await q;
      best = await pickBest(rows2 ?? []);
    }
  }

  if (!best) return null;

  // Map the DB row back to FoodMacrosPer100g
  const r = best.row;
  const food: FoodMacrosPer100g = {
    name:               r.food_name,
    brand:              r.brand ?? null,
    calories_per_100g:  Number(r.calories_per_100g   || 0),
    protein_per_100g:   Number(r.protein_per_100g    || 0),
    fat_per_100g:       Number(r.fat_per_100g         || 0),
    carbs_per_100g:     Number(r.carbs_per_100g       || 0),
    fiber_per_100g:     Number(r.fiber_per_100g       || 0),
    sugar_per_100g:     Number(r.sugar_per_100g       || 0),
    sodium_mg_per_100g: Number(r.sodium_mg_per_100g   || 0),
    serving_size_label: r.serving_size_label ?? null,
    serving_g:          r.serving_g  ?? null,
    serving_ml:         r.serving_ml ?? null,
  };

  return {
    source: 'cache' as const,
    food,
    match_description: r.food_name,
    match_score: best.score,
    // AI-sourced cache rows are still marked unverified until a user corrects them
    unverified: r.source === 'ai' || !!r.unverified,
    cache_candidate: null, // already in DB — no write needed
    cache_hit: true,
  };
}

// ============================================================================
// 2. OPEN FOOD FACTS (OFF)
//
// Free, community-maintained food product database. Covers most packaged foods
// and many common items worldwide. Preferred over AI because it's:
//   - Data from actual product labels (more accurate for packaged foods)
//   - Free with no rate limits (beyond reasonable use)
//   - Faster than an AI completion for most queries
//
// NOTE: USDA FoodData Central integration is intentionally disabled.
//       Do not re-enable without discussion. OFF covers our use cases well.
//       The USDA_API_KEY env var is kept in case we revisit this in future.
//
// Supports barcode lookup: if foodName is a 8–14 digit UPC, we use the
// direct product endpoint for an exact match. Otherwise we use text search.
// ============================================================================

async function lookupOFF(foodName: string) {
  const isUPC = /^\d{8,14}$/.test(foodName.trim());
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    if (isUPC) {
      // Exact barcode lookup — no scoring needed, it's either right or not
      const res = await fetch(`${OFF_PRODUCT_URL}/${foodName}.json`, { signal: controller.signal });
      if (!res.ok) return null;
      const data = await res.json();
      const p = data?.product;
      if (!p?.nutriments || !hasCompleteOFF(p.nutriments)) return null;
      return { product: p, score: 1 };
    }

    // Text search: retrieve top 10 candidates and pick the best scoring one
    const res = await fetch(
      `${OFF_SEARCH_URL}?search_terms=${encodeURIComponent(foodName)}&search_simple=1&action=process&json=1&page_size=10`,
      { signal: controller.signal }
    );
    if (!res.ok) return null;

    const data = await res.json();
    const candidates = (data?.products || [])
      .map((p: any) => ({
        p,
        score: compositeScore(foodName, p.product_name || p.generic_name || ''),
      }))
      // Filter out low-confidence matches and products with incomplete core macros
      .filter((x: any) => x.score >= CACHE_THRESHOLD && hasCompleteOFF(x.p.nutriments))
      .sort((a: any, b: any) => b.score - a.score);

    const best = candidates[0];
    return best ? { product: best.p, score: best.score } : null;
  } catch {
    // AbortError (timeout) or network error — return null to trigger AI fallback
    return null;
  } finally {
    clearTimeout(t);
  }
}

// ============================================================================
// 3. GPT-4o-mini AI FALLBACK
//
// Used when neither the cache nor OFF has a good match — e.g. custom restaurant
// dishes, meal preps, or obscure food items not in the OFF database.
//
// knownMacros contains values the user explicitly stated in their input text.
// We send these to the model with "KNOWN — do not change" instructions so the
// AI estimates only the unknown fields and doesn't accidentally contradict the user.
//
// The model returns per-100g values. If we have knownMacros (per-serving) and a
// serving_g estimate, we re-derive the per-100g values ourselves as a safety net
// in case the model drifted during its estimation.
// ============================================================================

interface KnownMacros {
  calories?: number;
  protein?: number;
  fat?: number;
  carbs?: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
}

async function lookupAI(foodName: string, knownMacros: KnownMacros = {}) {
  // Instantiate OpenAI client inside the function call — env var available at runtime
  const openai = getOpenAI();

  // Build the "KNOWN" context lines to inject into the prompt
  const knownLines: string[] = [];
  if (knownMacros.calories != null) knownLines.push(`- Calories: ${knownMacros.calories} kcal (KNOWN — do not change)`);
  if (knownMacros.protein  != null) knownLines.push(`- Protein: ${knownMacros.protein} g (KNOWN — do not change)`);
  if (knownMacros.fat      != null) knownLines.push(`- Fat: ${knownMacros.fat} g (KNOWN — do not change)`);
  if (knownMacros.carbs    != null) knownLines.push(`- Carbs: ${knownMacros.carbs} g (KNOWN — do not change)`);
  if (knownMacros.fiber    != null) knownLines.push(`- Fiber: ${knownMacros.fiber} g (KNOWN — do not change)`);
  if (knownMacros.sugar    != null) knownLines.push(`- Sugar: ${knownMacros.sugar} g (KNOWN — do not change)`);
  if (knownMacros.sodium   != null) knownLines.push(`- Sodium: ${knownMacros.sodium} mg (KNOWN — do not change)`);

  const knownContext = knownLines.length > 0
    ? `\n\nThe user already told me these values per serving. Use them EXACTLY and only estimate the rest:\n${knownLines.join('\n')}`
    : '';

  const completion = await withTimeout(
    openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            `You estimate nutrition per 100g (or per 100ml for liquids). Return ONLY valid JSON — no markdown.\n` +
            `When values are marked KNOWN, reproduce them exactly after converting from per-serving to per-100g using your estimated serving_g.\n\n` +
            `Schema:\n` +
            `{\n` +
            `  "name": string,\n` +
            `  "brand": string | null,\n` +
            `  "calories_per_100g": number,\n` +
            `  "protein_per_100g": number,\n` +
            `  "fat_per_100g": number,\n` +
            `  "carbs_per_100g": number,\n` +
            `  "fiber_per_100g": number,\n` +
            `  "sugar_per_100g": number,\n` +
            `  "sodium_mg_per_100g": number,\n` +
            `  "serving_g": number | null\n` +
            `}`,
        },
        { role: 'user', content: `Food: "${foodName}"${knownContext}` },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2, // low temp for consistent, reproducible estimates
    }),
    TIMEOUT_MS
  );

  const parsed  = JSON.parse(completion.choices[0].message.content || '{}');
  const servingG: number | null = parsed.serving_g ?? null;

  // Safety net: if the caller provided known per-serving values AND the AI estimated
  // a serving_g, we re-derive per-100g ourselves rather than trusting the AI's math.
  function perHundred(knownPerServing: number | undefined, aiPerHundred: number): number {
    if (knownPerServing != null && servingG && servingG > 0) {
      return (knownPerServing / servingG) * 100;
    }
    return aiPerHundred;
  }

  const food: FoodMacrosPer100g = {
    name:  String(parsed.name || foodName),
    brand: parsed.brand ?? null,
    calories_per_100g:  perHundred(knownMacros.calories, Number(parsed.calories_per_100g  || 0)),
    protein_per_100g:   perHundred(knownMacros.protein,  Number(parsed.protein_per_100g   || 0)),
    fat_per_100g:       perHundred(knownMacros.fat,      Number(parsed.fat_per_100g        || 0)),
    carbs_per_100g:     perHundred(knownMacros.carbs,    Number(parsed.carbs_per_100g      || 0)),
    fiber_per_100g:     perHundred(knownMacros.fiber,    Number(parsed.fiber_per_100g      || 0)),
    sugar_per_100g:     perHundred(knownMacros.sugar,    Number(parsed.sugar_per_100g      || 0)),
    sodium_mg_per_100g: perHundred(knownMacros.sodium,   Number(parsed.sodium_mg_per_100g  || 0)),
    serving_size_label: null,
    serving_g:  servingG,
    serving_ml: null,
  };

  return {
    source: 'ai' as const,
    food,
    unverified: true, // AI estimates require user review before being trusted
    match_description: 'AI estimate (unverified)',
    match_score: 0,
  };
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

export async function POST(req: NextRequest) {
  try {
    const body       = await req.json();
    const foodName   = String(body?.foodName || '').trim();
    const knownMacros: KnownMacros = body?.knownMacros ?? {};

    if (!foodName) {
      return NextResponse.json({ error: 'foodName is required' }, { status: 400 });
    }

    // --- Step 1: Supabase cache (fastest — already normalized and verified) ---
    const cached = await lookupCache(foodName);
    if (cached) return NextResponse.json(cached);

    // --- Step 2: Open Food Facts (free product DB, no API key required) ---
    const off = await withTimeout(lookupOFF(foodName), TIMEOUT_MS);
    if (off?.product) {
      const food = offToFood(off.product);
      const cache_candidate = makeCacheCandidate(
        foodName, food, 'off', off.score,
        off.product.product_name || off.product.generic_name || null,
        false // OFF data comes from product labels — not considered unverified
      );
      return NextResponse.json({
        source: 'off' as const,
        food,
        match_description: cache_candidate.match_notes,
        match_score: off.score,
        unverified: false,
        cache_candidate,
        cache_hit: false,
      });
    }

    // --- Step 3: AI fallback — slow but always returns an answer ---
    // Pass knownMacros so the model doesn't contradict what the user explicitly stated.
    const ai = await lookupAI(foodName, knownMacros);
    const cache_candidate = makeCacheCandidate(
      foodName, ai.food, 'ai', 0.3, 'AI fallback estimate', true
    );
    return NextResponse.json({
      ...ai,
      cache_candidate,
      cache_hit: false,
    });

  } catch (e: any) {
    console.error('[get-food-macros] error:', e);
    return NextResponse.json(
      { error: 'Failed to get nutritional information', details: String(e?.message || e) },
      { status: 500 }
    );
  }
}
