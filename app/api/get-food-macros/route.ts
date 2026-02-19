import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// ============================================================================
// CLIENTS
// ============================================================================

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const OFF_SEARCH_URL = 'https://world.openfoodfacts.org/cgi/search.pl';
const OFF_PRODUCT_URL = 'https://world.openfoodfacts.org/api/v2/product';
const TIMEOUT_MS = 30_000;

// ============================================================================
// TYPES
// ============================================================================

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
  serving_size_label?: string | null;
  serving_g?: number | null;
  serving_ml?: number | null;
};

// ============================================================================
// SCORING
// Composite = max(Jaccard, tokenContainment) — fixes branded items where the
// candidate has extra descriptor words that tank a pure Jaccard score.
// ============================================================================

const normalize = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

function tokenSet(s: string): Set<string> {
  return new Set(normalize(s).split(' ').filter(Boolean));
}

function jaccard(A: Set<string>, B: Set<string>): number {
  const inter = [...A].filter((x) => B.has(x)).length;
  const union = new Set([...A, ...B]).size;
  return union ? inter / union : 0;
}

// What fraction of query tokens are contained in the candidate?
function containment(query: Set<string>, candidate: Set<string>): number {
  if (!query.size) return 0;
  return [...query].filter((t) => candidate.has(t)).length / query.size;
}

function compositeScore(a: string, b: string): number {
  const A = tokenSet(a);
  const B = tokenSet(b);
  return Math.max(jaccard(A, B), containment(A, B));
}

const CACHE_THRESHOLD = 0.60;

// ============================================================================
// HELPERS
// ============================================================================

function withTimeout<T>(p: Promise<T>, ms = TIMEOUT_MS): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms);
    p.then((v) => { clearTimeout(t); resolve(v); })
     .catch((e) => { clearTimeout(t); reject(e); });
  });
}

function hasCompleteOFF(n: any): boolean {
  return (
    n?.['energy-kcal_100g'] != null &&
    n?.['proteins_100g'] != null &&
    n?.['fat_100g'] != null &&
    n?.['carbohydrates_100g'] != null &&
    n?.['sugars_100g'] != null &&
    n?.['fiber_100g'] != null &&
    n?.['sodium_100g'] != null
  );
}

function offToFood(p: any): FoodMacrosPer100g {
  const n = p.nutriments;
  // OFF sodium_100g is in grams — convert to mg
  const sodium_mg_per_100g = Number(n['sodium_100g'] || 0) * 1000;
  const servingLabel = p.serving_size || null;
  const servingQty = p.serving_quantity != null ? Number(p.serving_quantity) : null;
  let serving_g: number | null = null;
  let serving_ml: number | null = null;
  if (servingQty && servingLabel) {
    const s = String(servingLabel).toLowerCase();
    if (s.includes('ml') || s.includes('fl oz')) serving_ml = servingQty;
    else if (s.includes('g')) serving_g = servingQty;
  }
  return {
    name: p.product_name || p.generic_name || 'Unknown food',
    brand: p.brands ? String(p.brands).split(',')[0].trim() : null,
    calories_per_100g: Number(n['energy-kcal_100g'] || 0),
    protein_per_100g: Number(n['proteins_100g'] || 0),
    fat_per_100g: Number(n['fat_100g'] || 0),
    carbs_per_100g: Number(n['carbohydrates_100g'] || 0),
    fiber_per_100g: Number(n['fiber_100g'] || 0),
    sugar_per_100g: Number(n['sugars_100g'] || 0),
    sodium_mg_per_100g,
    serving_size_label: servingLabel,
    serving_g,
    serving_ml,
  };
}

function makeCacheCandidate(foodName: string, food: FoodMacrosPer100g, source: string, score: number, notes: string | null, unverified: boolean) {
  return {
    normalized_name: normalize(foodName),
    food_name: food.name,
    brand: food.brand ?? null,
    calories_per_100g: food.calories_per_100g,
    protein_per_100g: food.protein_per_100g,
    fat_per_100g: food.fat_per_100g,
    carbs_per_100g: food.carbs_per_100g,
    fiber_per_100g: food.fiber_per_100g,
    sugar_per_100g: food.sugar_per_100g,
    sodium_mg_per_100g: food.sodium_mg_per_100g,
    serving_size_label: food.serving_size_label ?? null,
    serving_g: food.serving_g ?? null,
    serving_ml: food.serving_ml ?? null,
    source,
    unverified,
    match_confidence: score,
    match_notes: notes,
  };
}

// ============================================================================
// 1. SUPABASE CACHE — two-attempt strategy
//    Attempt 1: full name ilike search
//    Attempt 2: per-token AND filter (catches partial matches)
// ============================================================================

async function lookupCache(foodName: string) {
  const n = normalize(foodName);

  async function pickBest(rows: any[]): Promise<any | null> {
    if (!rows?.length) return null;
    const scored = rows.map((row: any) => ({
      row,
      score: compositeScore(n, row.normalized_name || row.food_name || ''),
    })).sort((a: any, b: any) => b.score - a.score);
    const best = scored[0];
    return best.score >= CACHE_THRESHOLD ? best : null;
  }

  // Attempt 1: full normalized name substring match
  const { data: rows1 } = await supabase
    .from('master_food_database')
    .select('*')
    .ilike('normalized_name', `%${n}%`)
    .order('times_used', { ascending: false })
    .limit(10);

  let best = await pickBest(rows1 ?? []);

  // Attempt 2: per-token AND filter (catches cases where full phrase doesn't match)
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

  const r = best.row;
  const food: FoodMacrosPer100g = {
    name: r.food_name,
    brand: r.brand ?? null,
    calories_per_100g: Number(r.calories_per_100g || 0),
    protein_per_100g: Number(r.protein_per_100g || 0),
    fat_per_100g: Number(r.fat_per_100g || 0),
    carbs_per_100g: Number(r.carbs_per_100g || 0),
    fiber_per_100g: Number(r.fiber_per_100g || 0),
    sugar_per_100g: Number(r.sugar_per_100g || 0),
    sodium_mg_per_100g: Number(r.sodium_mg_per_100g || 0),
    serving_size_label: r.serving_size_label ?? null,
    serving_g: r.serving_g ?? null,
    serving_ml: r.serving_ml ?? null,
  };

  return {
    source: 'cache' as const,
    food,
    match_description: r.food_name,
    match_score: best.score,
    unverified: r.source === 'ai' || !!r.unverified,
    cache_candidate: null,  // already in DB — no write needed
    cache_hit: true,
  };
}

// ============================================================================
// 2. OPEN FOOD FACTS
// ============================================================================

async function lookupOFF(foodName: string) {
  const isUPC = /^\d{8,14}$/.test(foodName.trim());
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    if (isUPC) {
      const res = await fetch(`${OFF_PRODUCT_URL}/${foodName}.json`, { signal: controller.signal });
      if (!res.ok) return null;
      const data = await res.json();
      const p = data?.product;
      if (!p?.nutriments || !hasCompleteOFF(p.nutriments)) return null;
      return { product: p, score: 1 };
    }

    const res = await fetch(
      `${OFF_SEARCH_URL}?search_terms=${encodeURIComponent(foodName)}&search_simple=1&action=process&json=1&page_size=10`,
      { signal: controller.signal }
    );
    if (!res.ok) return null;

    const data = await res.json();
    const candidates = (data?.products || [])
      .map((p: any) => ({
        p,
        score: compositeScore(p.product_name || p.generic_name || '', foodName),
      }))
      .filter((x: any) => x.score >= CACHE_THRESHOLD && hasCompleteOFF(x.p.nutriments))
      .sort((a: any, b: any) => b.score - a.score);

    const best = candidates[0];
    return best ? { product: best.p, score: best.score } : null;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

// ============================================================================
// 3. GPT-4o-mini FALLBACK — context-aware
//    knownMacros: values the user already stated (per serving). These are
//    honoured verbatim; the AI only fills in what's missing.
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
      temperature: 0.2,
    }),
    TIMEOUT_MS
  );

  const parsed = JSON.parse(completion.choices[0].message.content || '{}');
  const servingG: number | null = parsed.serving_g ?? null;

  // Safety net: if caller had known per-serving values, re-derive per-100g ourselves
  // in case the model drifted.
  function perHundred(knownPerServing: number | undefined, aiPerHundred: number): number {
    if (knownPerServing != null && servingG && servingG > 0) {
      return (knownPerServing / servingG) * 100;
    }
    return aiPerHundred;
  }

  const food: FoodMacrosPer100g = {
    name: String(parsed.name || foodName),
    brand: parsed.brand ?? null,
    calories_per_100g: perHundred(knownMacros.calories, Number(parsed.calories_per_100g || 0)),
    protein_per_100g:  perHundred(knownMacros.protein,  Number(parsed.protein_per_100g  || 0)),
    fat_per_100g:      perHundred(knownMacros.fat,      Number(parsed.fat_per_100g       || 0)),
    carbs_per_100g:    perHundred(knownMacros.carbs,    Number(parsed.carbs_per_100g     || 0)),
    fiber_per_100g:    perHundred(knownMacros.fiber,    Number(parsed.fiber_per_100g     || 0)),
    sugar_per_100g:    perHundred(knownMacros.sugar,    Number(parsed.sugar_per_100g     || 0)),
    sodium_mg_per_100g: perHundred(knownMacros.sodium, Number(parsed.sodium_mg_per_100g || 0)),
    serving_size_label: null,
    serving_g: servingG,
    serving_ml: null,
  };

  return {
    source: 'ai' as const,
    food,
    unverified: true,
    match_description: 'AI estimate (unverified)',
    match_score: 0,
  };
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const foodName = String(body?.foodName || '').trim();
    const knownMacros: KnownMacros = body?.knownMacros ?? {};

    if (!foodName) {
      return NextResponse.json({ error: 'foodName is required' }, { status: 400 });
    }

    // 1. Supabase cache
    const cached = await lookupCache(foodName);
    if (cached) return NextResponse.json(cached);

    // 2. OpenFoodFacts
    const off = await withTimeout(lookupOFF(foodName), TIMEOUT_MS);
    if (off?.product) {
      const food = offToFood(off.product);
      const cache_candidate = makeCacheCandidate(
        foodName, food, 'off', off.score,
        off.product.product_name || off.product.generic_name || null,
        false
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

    // 3. AI fallback — pass known macros so it doesn't contradict the user
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
