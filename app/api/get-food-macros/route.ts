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

// ============================================================================
// TYPES
// ============================================================================

export interface FoodMacros {
  food_name: string;
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
  source: 'cache' | 'openfoodfacts' | 'ai';
  match_confidence?: number | null;
  match_notes?: string | null;
  unverified?: boolean;
  // Only present on cache hits (to increment times_used later)
  cache_hit?: boolean;
}

export interface CacheCandidate {
  normalized_name: string;
  food_name: string;
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
  source: string;
  unverified?: boolean;
  match_confidence?: number | null;
  match_notes?: string | null;
}

// ============================================================================
// SCORING
// ============================================================================

function tokenize(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(Boolean)
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  const intersection = new Set([...a].filter((x) => b.has(x)));
  const union = new Set([...a, ...b]);
  return intersection.size / union.size;
}

// Token containment: what fraction of query tokens appear in candidate?
// Great for branded items where the candidate has extra descriptor words.
function tokenContainment(query: Set<string>, candidate: Set<string>): number {
  if (query.size === 0) return 0;
  const matches = [...query].filter((t) => candidate.has(t)).length;
  return matches / query.size;
}

// Composite score: whichever metric is more favourable wins.
function compositeScore(queryStr: string, candidateStr: string): number {
  const q = tokenize(queryStr);
  const c = tokenize(candidateStr);
  return Math.max(jaccard(q, c), tokenContainment(q, c));
}

const CACHE_SCORE_THRESHOLD = 0.60;

// ============================================================================
// NORMALISATION
// ============================================================================

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ============================================================================
// SUPABASE CACHE — two-attempt strategy
//   Attempt 1: search by full food name
//   Attempt 2: search by individual meaningful tokens (OR across normalized_name)
// ============================================================================

async function queryCache(foodName: string): Promise<FoodMacros | null> {
  const normalized = normalizeName(foodName);

  // Attempt 1: full name search
  const { data: attempt1 } = await supabase
    .from('master_food_database')
    .select('*')
    .ilike('normalized_name', `%${normalized}%`)
    .order('times_used', { ascending: false })
    .limit(10);

  const best1 = pickBestCacheMatch(normalized, attempt1 ?? []);
  if (best1) return best1;

  // Attempt 2: per-token fallback — find rows containing ALL meaningful tokens
  const tokens = normalized.split(' ').filter((t) => t.length > 2);
  if (tokens.length <= 1) return null; // no point running a second pass

  // Build a query that requires every token to appear somewhere in normalized_name
  let query = supabase
    .from('master_food_database')
    .select('*')
    .order('times_used', { ascending: false })
    .limit(10);

  for (const token of tokens) {
    query = query.ilike('normalized_name', `%${token}%`);
  }

  const { data: attempt2 } = await query;
  return pickBestCacheMatch(normalized, attempt2 ?? []);
}

function pickBestCacheMatch(queryNorm: string, rows: any[]): FoodMacros | null {
  if (!rows || rows.length === 0) return null;

  let bestScore = 0;
  let bestRow: any = null;

  for (const row of rows) {
    const score = compositeScore(queryNorm, row.normalized_name ?? row.food_name);
    if (score > bestScore) {
      bestScore = score;
      bestRow = row;
    }
  }

  if (bestScore < CACHE_SCORE_THRESHOLD || !bestRow) return null;

  return {
    food_name: bestRow.food_name,
    brand: bestRow.brand ?? null,
    calories_per_100g: bestRow.calories_per_100g ?? 0,
    protein_per_100g: bestRow.protein_per_100g ?? 0,
    fat_per_100g: bestRow.fat_per_100g ?? 0,
    carbs_per_100g: bestRow.carbs_per_100g ?? 0,
    fiber_per_100g: bestRow.fiber_per_100g ?? 0,
    sugar_per_100g: bestRow.sugar_per_100g ?? 0,
    sodium_mg_per_100g: bestRow.sodium_mg_per_100g ?? 0,
    serving_size_label: bestRow.serving_size_label ?? null,
    serving_g: bestRow.serving_g ?? null,
    serving_ml: bestRow.serving_ml ?? null,
    source: 'cache',
    match_confidence: bestScore,
    match_notes: `Jaccard/containment score: ${bestScore.toFixed(2)}`,
    unverified: bestRow.unverified ?? false,
    cache_hit: true,
  };
}

// ============================================================================
// OPEN FOOD FACTS
// ============================================================================

async function queryOpenFoodFacts(foodName: string): Promise<FoodMacros | null> {
  try {
    const encoded = encodeURIComponent(foodName);
    const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encoded}&search_simple=1&action=process&json=1&page_size=5&fields=product_name,brands,nutriments,serving_size,serving_quantity`;

    const res = await fetch(url, {
      headers: { 'User-Agent': 'FoodTracker/1.0 (contact@example.com)' },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return null;

    const data = await res.json();
    const products: any[] = data.products ?? [];
    if (products.length === 0) return null;

    // Score each result and pick best
    let bestScore = 0;
    let bestProduct: any = null;

    for (const product of products) {
      const candidateName = [product.product_name, product.brands].filter(Boolean).join(' ');
      const score = compositeScore(foodName, candidateName);
      if (score > bestScore) {
        bestScore = score;
        bestProduct = product;
      }
    }

    if (bestScore < CACHE_SCORE_THRESHOLD || !bestProduct) return null;

    const n = bestProduct.nutriments ?? {};

    // OpenFoodFacts stores per-100g values with _100g suffix
    const cal = n['energy-kcal_100g'] ?? n['energy_100g'] ? (n['energy_100g'] / 4.184) : 0;
    const calories = n['energy-kcal_100g'] ?? Math.round(cal);

    return {
      food_name: bestProduct.product_name ?? foodName,
      brand: bestProduct.brands ?? null,
      calories_per_100g: calories ?? 0,
      protein_per_100g: n['proteins_100g'] ?? 0,
      fat_per_100g: n['fat_100g'] ?? 0,
      carbs_per_100g: n['carbohydrates_100g'] ?? 0,
      fiber_per_100g: n['fiber_100g'] ?? 0,
      sugar_per_100g: n['sugars_100g'] ?? 0,
      sodium_mg_per_100g: (n['sodium_100g'] ?? 0) * 1000, // OFF stores in g, we need mg
      serving_size_label: bestProduct.serving_size ?? null,
      serving_g: bestProduct.serving_quantity ? parseFloat(bestProduct.serving_quantity) : null,
      serving_ml: null,
      source: 'openfoodfacts',
      match_confidence: bestScore,
      match_notes: `OpenFoodFacts score: ${bestScore.toFixed(2)}`,
      unverified: false,
    };
  } catch {
    return null;
  }
}

// ============================================================================
// GPT-4o-mini FALLBACK — context-aware: only estimate unknowns
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

async function queryAI(foodName: string, knownMacros: KnownMacros = {}): Promise<FoodMacros | null> {
  try {
    // Build a description of what's already known so the model doesn't contradict it
    const knownLines: string[] = [];
    if (knownMacros.calories != null) knownLines.push(`- Calories: ${knownMacros.calories} kcal (KNOWN — do not change)`);
    if (knownMacros.protein != null) knownLines.push(`- Protein: ${knownMacros.protein} g (KNOWN — do not change)`);
    if (knownMacros.fat != null) knownLines.push(`- Fat: ${knownMacros.fat} g (KNOWN — do not change)`);
    if (knownMacros.carbs != null) knownLines.push(`- Carbs: ${knownMacros.carbs} g (KNOWN — do not change)`);
    if (knownMacros.fiber != null) knownLines.push(`- Fiber: ${knownMacros.fiber} g (KNOWN — do not change)`);
    if (knownMacros.sugar != null) knownLines.push(`- Sugar: ${knownMacros.sugar} g (KNOWN — do not change)`);
    if (knownMacros.sodium != null) knownLines.push(`- Sodium: ${knownMacros.sodium} mg (KNOWN — do not change)`);

    const knownContext =
      knownLines.length > 0
        ? `\n\nThe user has already told me some values for this item. Use EXACTLY these values and only estimate the rest:\n${knownLines.join('\n')}`
        : '';

    // Determine which serving size to estimate for — if caller knows some macros
    // they were likely stated per serving; figure out a plausible serving_g and
    // back-calculate per-100g values.
    const hasKnownMacros = knownLines.length > 0;

    const systemPrompt = `You are a nutrition database assistant. Return ONLY valid JSON — no markdown, no explanation.

When values are marked KNOWN, reproduce them exactly. For everything else, make your best estimate based on typical nutrition data for this food.

If you know a typical serving size, provide it. All macro values in your JSON must be PER 100g (or per 100ml for liquids). If the user provided per-serving values, convert them to per-100g using the serving_g you estimate.`;

    const userPrompt = `Food item: "${foodName}"${knownContext}

Return JSON with this exact shape:
{
  "food_name": string,
  "brand": string | null,
  "calories_per_100g": number,
  "protein_per_100g": number,
  "fat_per_100g": number,
  "carbs_per_100g": number,
  "fiber_per_100g": number,
  "sugar_per_100g": number,
  "sodium_mg_per_100g": number,
  "serving_size_label": string | null,
  "serving_g": number | null,
  "confidence": "high" | "medium" | "low"
}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0,
      max_tokens: 300,
      response_format: { type: 'json_object' },
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) return null;

    const parsed = JSON.parse(raw);

    // If caller had known per-serving macros, the AI was asked to convert to /100g.
    // Honour any KNOWN values directly as per-serving and convert ourselves as a
    // safety net in case the model deviated. Use serving_g from the AI response.
    const servingG: number | null = parsed.serving_g ?? null;

    function resolvePerHundred(knownPerServing: number | undefined, aiPerHundred: number): number {
      if (knownPerServing != null && servingG && servingG > 0) {
        return (knownPerServing / servingG) * 100;
      }
      return aiPerHundred;
    }

    return {
      food_name: parsed.food_name ?? foodName,
      brand: parsed.brand ?? null,
      calories_per_100g: resolvePerHundred(knownMacros.calories, parsed.calories_per_100g ?? 0),
      protein_per_100g: resolvePerHundred(knownMacros.protein, parsed.protein_per_100g ?? 0),
      fat_per_100g: resolvePerHundred(knownMacros.fat, parsed.fat_per_100g ?? 0),
      carbs_per_100g: resolvePerHundred(knownMacros.carbs, parsed.carbs_per_100g ?? 0),
      fiber_per_100g: resolvePerHundred(knownMacros.fiber, parsed.fiber_per_100g ?? 0),
      sugar_per_100g: resolvePerHundred(knownMacros.sugar, parsed.sugar_per_100g ?? 0),
      sodium_mg_per_100g: resolvePerHundred(knownMacros.sodium, parsed.sodium_mg_per_100g ?? 0),
      serving_size_label: parsed.serving_size_label ?? null,
      serving_g: servingG,
      serving_ml: null,
      source: 'ai',
      match_confidence: parsed.confidence === 'high' ? 0.9 : parsed.confidence === 'medium' ? 0.7 : 0.5,
      match_notes: `AI estimate (confidence: ${parsed.confidence})${hasKnownMacros ? ', user macros honoured' : ''}`,
      unverified: true,
    };
  } catch (err) {
    console.error('[get-food-macros] AI fallback error:', err);
    return null;
  }
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { foodName, knownMacros } = body as {
      foodName: string;
      knownMacros?: KnownMacros;
    };

    if (!foodName || typeof foodName !== 'string') {
      return NextResponse.json({ error: 'foodName is required' }, { status: 400 });
    }

    const name = foodName.trim();

    // 1. Supabase cache — two-attempt strategy
    const cached = await queryCache(name);
    if (cached) {
      const cacheCandidate: CacheCandidate = {
        normalized_name: normalizeName(cached.food_name),
        food_name: cached.food_name,
        brand: cached.brand,
        calories_per_100g: cached.calories_per_100g,
        protein_per_100g: cached.protein_per_100g,
        fat_per_100g: cached.fat_per_100g,
        carbs_per_100g: cached.carbs_per_100g,
        fiber_per_100g: cached.fiber_per_100g,
        sugar_per_100g: cached.sugar_per_100g,
        sodium_mg_per_100g: cached.sodium_mg_per_100g,
        serving_size_label: cached.serving_size_label,
        serving_g: cached.serving_g,
        serving_ml: cached.serving_ml,
        source: 'cache',
        match_confidence: cached.match_confidence,
        match_notes: cached.match_notes,
        unverified: cached.unverified,
      };

      return NextResponse.json({
        food: cached,
        source: 'cache',
        cache_hit: true,        // caller should fire increment_times_used RPC
        cache_candidate: null,  // no write needed; already in DB
      });
    }

    // 2. OpenFoodFacts
    const offResult = await queryOpenFoodFacts(name);
    if (offResult) {
      const cacheCandidate: CacheCandidate = {
        normalized_name: normalizeName(offResult.food_name),
        food_name: offResult.food_name,
        brand: offResult.brand,
        calories_per_100g: offResult.calories_per_100g,
        protein_per_100g: offResult.protein_per_100g,
        fat_per_100g: offResult.fat_per_100g,
        carbs_per_100g: offResult.carbs_per_100g,
        fiber_per_100g: offResult.fiber_per_100g,
        sugar_per_100g: offResult.sugar_per_100g,
        sodium_mg_per_100g: offResult.sodium_mg_per_100g,
        serving_size_label: offResult.serving_size_label,
        serving_g: offResult.serving_g,
        serving_ml: offResult.serving_ml,
        source: 'openfoodfacts',
        match_confidence: offResult.match_confidence,
        match_notes: offResult.match_notes,
        unverified: false,
      };

      return NextResponse.json({
        food: offResult,
        source: 'openfoodfacts',
        cache_hit: false,
        cache_candidate: cacheCandidate,
      });
    }

    // 3. GPT-4o-mini fallback — pass known macros for context-aware estimation
    const aiResult = await queryAI(name, knownMacros ?? {});
    if (aiResult) {
      const cacheCandidate: CacheCandidate = {
        normalized_name: normalizeName(aiResult.food_name),
        food_name: aiResult.food_name,
        brand: aiResult.brand,
        calories_per_100g: aiResult.calories_per_100g,
        protein_per_100g: aiResult.protein_per_100g,
        fat_per_100g: aiResult.fat_per_100g,
        carbs_per_100g: aiResult.carbs_per_100g,
        fiber_per_100g: aiResult.fiber_per_100g,
        sugar_per_100g: aiResult.sugar_per_100g,
        sodium_mg_per_100g: aiResult.sodium_mg_per_100g,
        serving_size_label: aiResult.serving_size_label,
        serving_g: aiResult.serving_g,
        serving_ml: aiResult.serving_ml,
        source: 'ai',
        match_confidence: aiResult.match_confidence,
        match_notes: aiResult.match_notes,
        unverified: true,
      };

      return NextResponse.json({
        food: aiResult,
        source: 'ai',
        cache_hit: false,
        cache_candidate: cacheCandidate,
      });
    }

    // All sources failed
    return NextResponse.json(
      { error: `No nutrition data found for "${name}"` },
      { status: 404 }
    );
  } catch (error) {
    console.error('[get-food-macros] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
