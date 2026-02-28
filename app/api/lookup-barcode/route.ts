import { NextRequest, NextResponse } from 'next/server';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

// Safely extract a finite number from the Open Food Facts nutriments object.
// Returns 0 if the value is missing, null, or non-finite.
function n(nutrients: any, key: string): number {
  const v = nutrients?.[key];
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

// Normalize a food name to a lowercase, alphanumeric key for deduplication
// in master_food_database (matches the normalize() fn in get-food-macros).
function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// Route handler
// ─────────────────────────────────────────────────────────────────────────────

// POST /api/lookup-barcode
// Looks up a UPC/EAN barcode via the Open Food Facts API and returns
// nutrition data formatted for direct use as a FoodItem.
//
// Prefers per-serving values when the product has them; falls back to
// per-100 g values when per-serving data is absent.
//
// Also returns a `cache_candidate` (per-100g data) so the caller can write
// this product to master_food_database on confirm — avoiding repeated OFF
// lookups for the same barcode in the future.
export async function POST(request: NextRequest) {
  try {
    const { barcode } = await request.json();

    if (!barcode || typeof barcode !== 'string') {
      return NextResponse.json({ error: 'Barcode is required' }, { status: 400 });
    }

    // Strip anything that isn't a digit (spaces, dashes, etc.)
    const cleanBarcode = barcode.replace(/\D/g, '');
    if (cleanBarcode.length < 6) {
      return NextResponse.json({ error: 'Invalid barcode — must be at least 6 digits' }, { status: 400 });
    }

    // Open Food Facts v2 product endpoint — also fetch serving_quantity so we
    // can determine whether the serving is gram- or ml-based for the cache.
    const offUrl =
      `https://world.openfoodfacts.org/api/v2/product/${cleanBarcode}.json` +
      `?fields=product_name,brands,serving_size,serving_quantity,nutriments`;

    const res = await fetch(offUrl, {
      // Identify ourselves to OFF so they can track usage/contact us if needed
      headers: { 'User-Agent': 'HomeBase-FoodTracker/1.0' },
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const data = await res.json();

    if (data.status !== 1 || !data.product) {
      return NextResponse.json(
        { error: 'Product not found in Open Food Facts' },
        { status: 404 }
      );
    }

    const product = data.product;
    const nuts = product.nutriments || {};

    // ── Per-serving display values ─────────────────────────────────────────
    // Prefer per-serving values; fall back to per-100g when not available.
    // The '_serving' suffix in OFF means the value is already scaled to serving size.
    const hasServing = typeof nuts['energy-kcal_serving'] === 'number';
    const suffix = hasServing ? '_serving' : '_100g';

    // Sodium in OFF is stored in grams; convert to milligrams for our schema
    const sodiumG = n(nuts, `sodium${suffix}`);

    const foodName =
      [product.brands, product.product_name].filter(Boolean).join(' ') ||
      'Unknown Product';

    const result = {
      food_name: foodName,
      quantity:  product.serving_size || (hasServing ? '1 serving' : '100g'),
      calories:  Math.round(n(nuts, `energy-kcal${suffix}`)),
      protein:   Math.round(n(nuts, `proteins${suffix}`)       * 10) / 10,
      fat:       Math.round(n(nuts, `fat${suffix}`)            * 10) / 10,
      carbs:     Math.round(n(nuts, `carbohydrates${suffix}`)  * 10) / 10,
      fiber:     Math.round(n(nuts, `fiber${suffix}`)          * 10) / 10,
      sugar:     Math.round(n(nuts, `sugars${suffix}`)         * 10) / 10,
      sodium:    Math.round(sodiumG * 1000), // grams → milligrams
      source:    'barcode' as const,
      // Categories and whole-food-ingredients are unknown from a barcode scan;
      // the client sets these to empty arrays and the user can edit if needed.
      categories:             [] as string[],
      whole_food_ingredients: [] as string[],
    };

    // ── Per-100g cache candidate ───────────────────────────────────────────
    // Build a cache_candidate from the per-100g OFF values so the caller can
    // write this to master_food_database on confirm, enabling future lookups
    // to hit the local cache instead of querying OFF again.
    // Only include if OFF has 100g calorie data (i.e., the product is complete).
    const has100g = typeof nuts['energy-kcal_100g'] === 'number';

    // Determine serving unit (grams or ml) for the cache row
    const servingLabel  = product.serving_size || null;
    const servingQty    = product.serving_quantity != null ? Number(product.serving_quantity) : null;
    let serving_g: number | null = null;
    let serving_ml: number | null = null;
    if (servingQty && servingLabel) {
      const sl = String(servingLabel).toLowerCase();
      if (sl.includes('ml') || sl.includes('fl oz')) serving_ml = servingQty;
      else if (sl.includes('g'))                      serving_g  = servingQty;
    }

    const cache_candidate = has100g ? {
      normalized_name:    normalize(foodName),
      food_name:          foodName,
      brand:              product.brands ? String(product.brands).split(',')[0].trim() : null,
      calories_per_100g:  Math.round(n(nuts, 'energy-kcal_100g')),
      protein_per_100g:   Math.round(n(nuts, 'proteins_100g')       * 10) / 10,
      fat_per_100g:       Math.round(n(nuts, 'fat_100g')            * 10) / 10,
      carbs_per_100g:     Math.round(n(nuts, 'carbohydrates_100g')  * 10) / 10,
      fiber_per_100g:     Math.round(n(nuts, 'fiber_100g')          * 10) / 10,
      sugar_per_100g:     Math.round(n(nuts, 'sugars_100g')         * 10) / 10,
      sodium_mg_per_100g: Math.round(n(nuts, 'sodium_100g') * 1000),
      serving_size_label: servingLabel,
      serving_g,
      serving_ml,
      source:             'off',
      unverified:         false,
      match_confidence:   1.0,
      match_notes:        product.product_name || null,
    } : null;

    return NextResponse.json({ ...result, cache_candidate });
  } catch (error) {
    console.error('Barcode lookup error:', error);
    return NextResponse.json({ error: 'Failed to look up barcode' }, { status: 500 });
  }
}
