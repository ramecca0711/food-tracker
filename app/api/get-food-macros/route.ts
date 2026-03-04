import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

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

type Source = 'cache' | 'off' | 'ai';

// Always create clients inside functions — never at module level.
// Module-level instantiation throws at build time when env vars are absent
// during Next.js static analysis (next build).
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

const OFF_SEARCH_URL = 'https://world.openfoodfacts.org/cgi/search.pl';
const OFF_PRODUCT_URL = 'https://world.openfoodfacts.org/api/v2/product';

const TIMEOUT_MS = 30_000;

const normalize = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const tokenJaccard = (a: string, b: string) => {
  const A = new Set(normalize(a).split(' ').filter(Boolean));
  const B = new Set(normalize(b).split(' ').filter(Boolean));
  const inter = [...A].filter((x) => B.has(x)).length;
  const union = new Set([...A, ...B]).size;
  return union ? inter / union : 0;
};

function withTimeout<T>(p: Promise<T>, ms = TIMEOUT_MS): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms);
    p.then((v) => {
      clearTimeout(t);
      resolve(v);
    }).catch((e) => {
      clearTimeout(t);
      reject(e);
    });
  });
}

function hasCompleteOFF(n: any) {
  return (
    n?.['energy-kcal_100g'] != null &&
    n?.['proteins_100g'] != null &&
    n?.['fat_100g'] != null &&
    n?.['carbohydrates_100g'] != null &&
    n?.['sugars_100g'] != null &&
    n?.['fiber_100g'] != null &&
    // OFF sodium_100g is often present as grams of sodium per 100g
    n?.['sodium_100g'] != null
  );
}

async function lookupCache(foodName: string) {
  const n = normalize(foodName);

  // Grab a few candidates and pick best match in JS (fast + robust)
  const { data } = await getSupabase()
    .from('master_food_database')
    .select('*')
    .ilike('normalized_name', `%${n}%`)
    .order('times_used', { ascending: false })
    .limit(10);

  if (!data?.length) return null;

  const best = data
    .map((row: any) => ({
      row,
      score: Math.max(
        tokenJaccard(row.normalized_name || '', n),
        tokenJaccard(row.food_name || '', foodName)
      ),
    }))
    .sort((a: any, b: any) => b.score - a.score)[0];

  if (!best || best.score < 0.85) return null;

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
    cache_candidate: null, // already cached
    unverified: (r.source === 'ai') || !!r.unverified,
  };
}

async function lookupOFF(foodName: string) {
  const isUPC = /^\d{8,14}$/.test(foodName.trim());
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    if (isUPC) {
      const res = await fetch(`${OFF_PRODUCT_URL}/${foodName}.json`, {
        signal: controller.signal,
      });
      if (!res.ok) return null;
      const data = await res.json();
      const p = data?.product;
      if (!p?.nutriments || !hasCompleteOFF(p.nutriments)) return null;

      return { product: p, score: 1 };
    }

    const res = await fetch(
      `${OFF_SEARCH_URL}?search_terms=${encodeURIComponent(
        foodName
      )}&search_simple=1&action=process&json=1&page_size=10`,
      { signal: controller.signal }
    );
    if (!res.ok) return null;
    const data = await res.json();

    const target = foodName;
    const candidates = (data?.products || [])
      .map((p: any) => ({
        p,
        score: tokenJaccard(p.product_name || p.generic_name || '', target),
      }))
      .filter((x: any) => x.score >= 0.80)
      .filter((x: any) => hasCompleteOFF(x.p.nutriments))
      .sort((a: any, b: any) => b.score - a.score);

    const best = candidates[0];
    if (!best) return null;

    return { product: best.p, score: best.score };
  } finally {
    clearTimeout(t);
  }
}

function offToFood(p: any): FoodMacrosPer100g {
  const n = p.nutriments;

  // OFF sodium_100g is in grams (often). Convert to mg.
  const sodium_mg_per_100g = Number(n['sodium_100g'] || 0) * 1000;

  const servingLabel = p.serving_size || null;
  const servingQty = p.serving_quantity != null ? Number(p.serving_quantity) : null;

  // serving_quantity is frequently grams/ml, ambiguous. Keep it as grams when label includes "g",
  // ml when label includes "ml" or "fl oz" etc.
  let serving_g: number | null = null;
  let serving_ml: number | null = null;
  if (servingQty && servingLabel) {
    const s = String(servingLabel).toLowerCase();
    if (s.includes('ml') || s.includes('fl oz')) serving_ml = servingQty;
    else if (s.includes('g')) serving_g = servingQty;
  }

  const name = p.product_name || p.generic_name || 'Unknown food';
  const brand = p.brands ? String(p.brands).split(',')[0].trim() : null;

  return {
    name,
    brand,
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

async function lookupAI(foodName: string) {
  const aiResponse = await withTimeout(
    getOpenAI().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            `You estimate nutrition per 100g. Return ONLY valid JSON, no markdown.\n\n` +
            `Schema:\n` +
            `{\n` +
            `  "name": "string",\n` +
            `  "brand": "string or null",\n` +
            `  "calories_per_100g": number,\n` +
            `  "protein_per_100g": number,\n` +
            `  "fat_per_100g": number,\n` +
            `  "carbs_per_100g": number,\n` +
            `  "fiber_per_100g": number,\n` +
            `  "sugar_per_100g": number,\n` +
            `  "sodium_mg_per_100g": number\n` +
            `}`,
        },
        { role: 'user', content: foodName },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    }),
    TIMEOUT_MS
  );

  const parsed = JSON.parse(aiResponse.choices[0].message.content || '{}');

  const food: FoodMacrosPer100g = {
    name: String(parsed.name || foodName),
    brand: parsed.brand ?? null,
    calories_per_100g: Number(parsed.calories_per_100g || 0),
    protein_per_100g: Number(parsed.protein_per_100g || 0),
    fat_per_100g: Number(parsed.fat_per_100g || 0),
    carbs_per_100g: Number(parsed.carbs_per_100g || 0),
    fiber_per_100g: Number(parsed.fiber_per_100g || 0),
    sugar_per_100g: Number(parsed.sugar_per_100g || 0),
    sodium_mg_per_100g: Number(parsed.sodium_mg_per_100g || 0),
    serving_size_label: null,
    serving_g: null,
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const foodName = String(body?.foodName || '').trim();
    if (!foodName) {
      return NextResponse.json({ error: 'Food name required' }, { status: 400 });
    }

    // 1) Cache
    const cached = await lookupCache(foodName);
    if (cached) return NextResponse.json(cached);

    // 2) OpenFoodFacts
    const off = await withTimeout(lookupOFF(foodName), TIMEOUT_MS);
    if (off?.product) {
      const food = offToFood(off.product);

      // We do NOT write now — we return a candidate payload that can be written later on Save.
      const normalized_name = normalize(foodName);
      const cache_candidate = {
        normalized_name,
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
        source: 'off',
        unverified: false,
        match_confidence: off.score,
        match_notes: off.product.product_name || off.product.generic_name || null,
      };

      return NextResponse.json({
        source: 'off' as const,
        food,
        match_description: cache_candidate.match_notes,
        match_score: off.score,
        unverified: false,
        cache_candidate,
      });
    }

    // 3) AI fallback
    const ai = await lookupAI(foodName);
    const normalized_name = normalize(foodName);

    return NextResponse.json({
      ...ai,
      cache_candidate: {
        normalized_name,
        food_name: ai.food.name,
        brand: ai.food.brand ?? null,
        calories_per_100g: ai.food.calories_per_100g,
        protein_per_100g: ai.food.protein_per_100g,
        fat_per_100g: ai.food.fat_per_100g,
        carbs_per_100g: ai.food.carbs_per_100g,
        fiber_per_100g: ai.food.fiber_per_100g,
        sugar_per_100g: ai.food.sugar_per_100g,
        sodium_mg_per_100g: ai.food.sodium_mg_per_100g,
        serving_size_label: null,
        serving_g: null,
        serving_ml: null,
        source: 'ai',
        unverified: true,
        match_confidence: 0.3,
        match_notes: 'AI fallback estimate',
      },
    });
  } catch (e: any) {
    console.error('get-food-macros error', e);
    return NextResponse.json(
      { error: 'Failed to get nutritional information', details: String(e?.message || e) },
      { status: 500 }
    );
  }
}
