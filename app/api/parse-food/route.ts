import { NextResponse } from 'next/server';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ============================================================================
// TYPES
// ============================================================================

interface ParsedMacros {
  calories?: number;
  protein?: number;
  fat?: number;
  carbs?: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
}

interface ParsedItem {
  food_name: string;      // full display name (may include "12 oz", "42 g protein" etc.)
  lookup_name: string;    // stripped of leading quantity tokens, sent to get-food-macros
  quantity: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber: number;
  sugar: number;
  sodium: number;
  categories?: string[];
  whole_food_ingredients?: string[];
  // macros sourced from lookup, not inline text
  needs_lookup: boolean;
  cache_candidate?: any;
}

interface ParsedMeal {
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  items: ParsedItem[];
  notes?: string;
  eating_out?: boolean;
}

// ============================================================================
// MACRO REGEX EXTRACTION
// Handles messy natural language: "10 g of fat", "150mg sodium", "3 g dietary fiber"
// ============================================================================

const MACRO_PATTERNS: Record<keyof ParsedMacros, RegExp[]> = {
  calories: [
    /(\d+(?:\.\d+)?)\s*(?:cal(?:ories?)?|kcal)/i,
  ],
  protein: [
    /(\d+(?:\.\d+)?)\s*g(?:rams?)?\s+(?:of\s+)?protein/i,
    /protein[:\s]+(\d+(?:\.\d+)?)\s*g/i,
  ],
  fat: [
    /(\d+(?:\.\d+)?)\s*g(?:rams?)?\s+(?:of\s+)?(?:total\s+)?fat/i,
    /fat[:\s]+(\d+(?:\.\d+)?)\s*g/i,
  ],
  carbs: [
    /(\d+(?:\.\d+)?)\s*g(?:rams?)?\s+(?:of\s+)?(?:total\s+)?carb(?:ohydrates?|s)?/i,
    /carb(?:ohydrates?|s)?[:\s]+(\d+(?:\.\d+)?)\s*g/i,
  ],
  fiber: [
    /(\d+(?:\.\d+)?)\s*g(?:rams?)?\s+(?:of\s+)?(?:dietary\s+)?fiber/i,
    /fiber[:\s]+(\d+(?:\.\d+)?)\s*g/i,
  ],
  sugar: [
    /(\d+(?:\.\d+)?)\s*g(?:rams?)?\s+(?:of\s+)?sugars?/i,
    /sugars?[:\s]+(\d+(?:\.\d+)?)\s*g/i,
  ],
  sodium: [
    /(\d+(?:\.\d+)?)\s*mg\s+(?:of\s+)?sodium/i,
    /sodium[:\s]+(\d+(?:\.\d+)?)\s*mg/i,
  ],
};

function extractMacros(text: string): ParsedMacros {
  const result: ParsedMacros = {};
  for (const [key, patterns] of Object.entries(MACRO_PATTERNS) as [keyof ParsedMacros, RegExp[]][]) {
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        result[key] = parseFloat(match[1]);
        break;
      }
    }
  }
  return result;
}

// ============================================================================
// MEAL SEGMENTATION
// Split on meal keyword phrases. Each segment inherits the last declared meal type.
// ============================================================================

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

const MEAL_KEYWORD_RE =
  /\b(?:for\s+)?(breakfast|lunch|dinner|supper|snack)(?:\s+(?:before|after)\s+\w+(?:\s+\w+)*)?\b/gi;

interface RawSegment {
  meal_type: MealType;
  text: string;
}

function segmentByMealType(input: string): RawSegment[] {
  const segments: RawSegment[] = [];
  let lastMealType: MealType = 'snack';
  let lastIndex = 0;
  let currentSegmentMeal: MealType | null = null;
  let segmentStart = 0;

  // Find all meal keyword positions
  const matches: { index: number; meal_type: MealType; fullMatch: string }[] = [];
  let m: RegExpExecArray | null;
  MEAL_KEYWORD_RE.lastIndex = 0;
  while ((m = MEAL_KEYWORD_RE.exec(input)) !== null) {
    const raw = m[1].toLowerCase();
    const meal_type: MealType = raw === 'supper' ? 'dinner' : raw as MealType;
    matches.push({ index: m.index, meal_type, fullMatch: m[0] });
  }

  if (matches.length === 0) {
    // No meal keywords — treat entire input as a single snack
    return [{ meal_type: 'snack', text: input.trim() }];
  }

  for (let i = 0; i < matches.length; i++) {
    const { index, meal_type } = matches[i];

    // Text before the first keyword (if any) — assign to the first found meal type
    if (i === 0 && index > 0) {
      const pre = input.slice(0, index).trim();
      if (pre) {
        segments.push({ meal_type: meal_type, text: pre });
      }
    }

    // Determine end of this segment: start of next keyword or end of string
    const nextIndex = i + 1 < matches.length ? matches[i + 1].index : input.length;
    const segText = input.slice(index, nextIndex).trim();

    segments.push({ meal_type, text: segText });
  }

  return segments;
}

// ============================================================================
// SUB-CLAUSE SPLITTING
// Split "I got a kolache and a latte" as ONE item (no split)
// Split "I had a rice cake and after I worked out, I had a protein shake" as TWO items
// Pattern: "and ... I (had|got|ate|ordered|picked up)"
// ============================================================================

function splitSubClauses(text: string): string[] {
  // Only split on "and" followed (optionally with interstitial words) by "I had/got/ate/ordered"
  const SPLIT_RE = /\s+and\s+(?:[^,]+?,\s*)?i\s+(?:had|got|ate|ordered|picked\s+up)\b/gi;

  const parts: string[] = [];
  let last = 0;
  let match: RegExpExecArray | null;

  SPLIT_RE.lastIndex = 0;
  while ((match = SPLIT_RE.exec(text)) !== null) {
    parts.push(text.slice(last, match.index).trim());
    // The new clause starts at the "I had/got/ate" part
    const iIdx = match[0].search(/\bi\s+(?:had|got|ate|ordered|picked\s+up)\b/i);
    last = match.index + iIdx;
  }
  parts.push(text.slice(last).trim());

  return parts.filter(Boolean);
}

// ============================================================================
// QUANTITY / LEADING TOKEN STRIPPING
// "12 oz minor figures oat milk latte" → lookup_name = "minor figures oat milk latte"
// "42 g protein vanilla core power elite" → lookup_name = "vanilla core power elite"
// ============================================================================

const LEADING_QUANTITY_RE =
  /^(?:\d+(?:\.\d+)?)\s*(?:oz|fl\s*oz|ml|g|gram|grams|kg|lb|lbs?|cup|cups|tbsp|tsp|piece|pieces|serving|servings?|packet|packets?|bar|bars?|bottle|bottles?|can|cans?|slice|slices?|scoop|scoops?)\s+(?:of\s+)?/i;

// Also strips patterns like "42 g protein" at the start (number + unit + macro word)
const LEADING_MACRO_TOKEN_RE =
  /^(?:\d+(?:\.\d+)?)\s*g(?:rams?)?\s+(?:of\s+)?protein\s+/i;

function forLookup(displayName: string): string {
  return displayName
    .replace(LEADING_MACRO_TOKEN_RE, '')
    .replace(LEADING_QUANTITY_RE, '')
    .trim();
}

// ============================================================================
// EATING-OUT / RESTAURANT DETECTION
// ============================================================================

const EATING_OUT_RE = /\b(?:went\s+to|at|from|ordered\s+from|got\s+(?:it\s+)?(?:at|from))\b/i;
const PLACE_RE = /(?:at|from|to)\s+(?:my\s+(?:favorite\s+)?(?:coffee\s+shop|restaurant|place)\s+called\s+)?([A-Z][a-zA-Z'\s&]+?)(?:\s+and\b|\.|,|$)/;

function detectEatingOut(text: string): { eating_out: boolean; notes?: string } {
  if (!EATING_OUT_RE.test(text)) return { eating_out: false };

  const placeMatch = text.match(PLACE_RE);
  const notes = placeMatch ? placeMatch[1].trim() : undefined;
  return { eating_out: true, notes };
}

// ============================================================================
// MACRO LOOKUP via get-food-macros
// ============================================================================

async function lookupMacros(
  lookupName: string,
  knownMacros: ParsedMacros
): Promise<{ food: any; cache_candidate: any | null; cache_hit: boolean } | null> {
  try {
    const body: any = { foodName: lookupName };

    // Pass known macros so AI fallback stays consistent with user-stated values
    const hasKnown = Object.keys(knownMacros).length > 0;
    if (hasKnown) {
      body.knownMacros = knownMacros;
    }

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/api/get-food-macros`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    );

    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// ============================================================================
// CONVERT per-100g lookup result to absolute macros for a given serving
// ============================================================================

function macrosFromLookup(
  food: any,
  quantity: string,
  knownMacros: ParsedMacros
): Omit<ParsedMacros, never> & { serving_g: number } {
  // Parse quantity into grams
  const qLower = quantity.toLowerCase().trim();
  const numMatch = qLower.match(/[\d.]+/);
  const num = numMatch ? parseFloat(numMatch[0]) : 1;

  let servingG: number;
  if (qLower.includes('oz') && !qLower.includes('fl')) {
    servingG = num * 28.35;
  } else if (qLower.includes('fl oz')) {
    servingG = num * 29.57;
  } else if (qLower.includes('ml')) {
    servingG = num;
  } else if (qLower.includes('lb')) {
    servingG = num * 453.6;
  } else if (qLower.includes('kg')) {
    servingG = num * 1000;
  } else if (qLower.includes('cup')) {
    servingG = num * 240;
  } else if (qLower.includes('tbsp')) {
    servingG = num * 15;
  } else if (qLower.includes('tsp')) {
    servingG = num * 5;
  } else if (qLower.match(/\bg\b/) || qLower.match(/grams?/)) {
    servingG = num;
  } else if (food.serving_g) {
    // "1 serving" or unit-less integer: use the food's declared serving size
    servingG = num * food.serving_g;
  } else {
    // Fallback: assume 100g serving
    servingG = 100;
  }

  const ratio = servingG / 100;

  return {
    serving_g: servingG,
    calories:  knownMacros.calories  ?? Math.round((food.calories_per_100g ?? 0)  * ratio),
    protein:   knownMacros.protein   ?? Math.round((food.protein_per_100g  ?? 0)  * ratio * 10) / 10,
    fat:       knownMacros.fat       ?? Math.round((food.fat_per_100g       ?? 0)  * ratio * 10) / 10,
    carbs:     knownMacros.carbs     ?? Math.round((food.carbs_per_100g     ?? 0)  * ratio * 10) / 10,
    fiber:     knownMacros.fiber     ?? Math.round((food.fiber_per_100g     ?? 0)  * ratio * 10) / 10,
    sugar:     knownMacros.sugar     ?? Math.round((food.sugar_per_100g     ?? 0)  * ratio * 10) / 10,
    sodium:    knownMacros.sodium    ?? Math.round((food.sodium_mg_per_100g ?? 0)  * ratio),
  };
}

// ============================================================================
// EXTRACT INDIVIDUAL ITEMS FROM A SEGMENT
// Each sub-clause is one food item. Items are separated by "and" only when
// followed by "I had/got/ate/…".
// ============================================================================

interface ExtractedItem {
  display_name: string;
  lookup_name: string;
  quantity: string;
  inline_macros: ParsedMacros;
}

// Leading article + optional quantity descriptor
const INTRO_RE =
  /^(?:i\s+(?:had|got|ate|ordered|picked\s+up)\s+)?(?:a\s+|an\s+|the\s+)?(?:(\d+(?:\.\d+)?)\s*(?:oz|ml|g|lb|cup|cups|tbsp|tsp|slice|slices?|piece|pieces?|serving|servings?|scoop|scoops?)\s+(?:of\s+)?)?/i;

function extractItem(clauseText: string): ExtractedItem {
  const inline = extractMacros(clauseText);

  // Derive a clean display name: strip leading "I had/got" phrasing and
  // leading articles. Keep size tokens like "12 oz".
  const display = clauseText
    .replace(/^(?:i\s+(?:had|got|ate|ordered|picked\s+up)\s+)/i, '')
    .replace(/^(?:a\s+|an\s+|the\s+)/i, '')
    .replace(/,?\s+which\s+was\b.*/i, '')  // strip "which was 190 cal..." from display
    .replace(/,\s*that\s+was\b.*/i, '')    // strip "that was 35 cal..."
    .trim();

  // Quantity: look for a leading quantity token in the display name
  const qMatch = display.match(/^(\d+(?:\.\d+)?)\s*(oz|ml|g(?:rams?)?|lb|cup|cups|tbsp|tsp|fl\s*oz)\b/i);
  const quantity = qMatch ? `${qMatch[1]} ${qMatch[2]}` : '1 serving';

  return {
    display_name: display,
    lookup_name: forLookup(display),
    quantity,
    inline_macros: inline,
  };
}

// ============================================================================
// MAIN PARSE HANDLER
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const { foodDescription } = await request.json();

    if (!foodDescription || typeof foodDescription !== 'string') {
      return NextResponse.json({ error: 'foodDescription is required' }, { status: 400 });
    }

    // 1. Segment by meal type
    const segments = segmentByMealType(foodDescription);

    // 2. For each segment, split sub-clauses and build a raw item list
    interface RawItem {
      meal_type: MealType;
      eating_out: boolean;
      notes?: string;
      display_name: string;
      lookup_name: string;
      quantity: string;
      inline_macros: ParsedMacros;
    }

    const rawItems: RawItem[] = [];

    for (const segment of segments) {
      const { eating_out, notes } = detectEatingOut(segment.text);
      const clauses = splitSubClauses(segment.text);

      for (const clause of clauses) {
        const item = extractItem(clause);
        // Skip empty/trivial
        if (!item.display_name || item.display_name.length < 2) continue;

        rawItems.push({
          meal_type: segment.meal_type,
          eating_out,
          notes,
          ...item,
        });
      }
    }

    // 3. For items that need macro lookup, fire requests in parallel
    const lookupPromises = rawItems.map(async (raw) => {
      const allMacrosDefined =
        raw.inline_macros.calories != null &&
        raw.inline_macros.protein  != null &&
        raw.inline_macros.fat      != null &&
        raw.inline_macros.carbs    != null;

      if (allMacrosDefined) {
        return null; // no lookup needed
      }

      return lookupMacros(raw.lookup_name, raw.inline_macros);
    });
  }

  return meals;
}

    const lookupResults = await Promise.all(lookupPromises);

    // 4. Merge lookup results with inline macros and group into meals
    // Track which meal type + notes combos we've seen to group correctly
    interface MealKey { meal_type: MealType; notes?: string; eating_out: boolean }
    const mealMap = new Map<string, ParsedMeal>();
    const mealOrder: string[] = [];

    function mealKey(mk: MealKey, index: number): string {
      // Each distinct segment occurrence gets its own meal group.
      // We differentiate by the segment's original index so that two separate
      // breakfast mentions create two meal groups.
      return `${mk.meal_type}::${mk.notes ?? ''}::${mk.eating_out}::${index}`;
    }

    // Build a segment-index map so items in the same original segment group together
    // We track segment boundaries from the original segmentation
    const segmentIndexPerRaw: number[] = [];
    {
      let segIdx = 0;
      let clauseIdx = 0;
      for (const segment of segments) {
        const clauses = splitSubClauses(segment.text).filter((c) => c.length >= 2);
        for (let i = 0; i < clauses.length; i++) {
          segmentIndexPerRaw.push(segIdx);
        }
        segIdx++;
      }
    }

    for (let i = 0; i < rawItems.length; i++) {
      const raw = rawItems[i];
      const lookupResult = lookupResults[i];
      const segIdx = segmentIndexPerRaw[i] ?? i;

      const key = mealKey({ meal_type: raw.meal_type, notes: raw.notes, eating_out: raw.eating_out }, segIdx);

      if (!mealMap.has(key)) {
        mealMap.set(key, {
          meal_type: raw.meal_type,
          items: [],
          notes: raw.notes,
          eating_out: raw.eating_out,
        });
        mealOrder.push(key);
      }

      const meal = mealMap.get(key)!;

      // Merge: inline macros take priority over lookup
      let calories = raw.inline_macros.calories ?? 0;
      let protein  = raw.inline_macros.protein  ?? 0;
      let fat      = raw.inline_macros.fat       ?? 0;
      let carbs    = raw.inline_macros.carbs     ?? 0;
      let fiber    = raw.inline_macros.fiber     ?? 0;
      let sugar    = raw.inline_macros.sugar     ?? 0;
      let sodium   = raw.inline_macros.sodium    ?? 0;
      let cache_candidate: any = null;

      if (lookupResult?.food) {
        const computed = macrosFromLookup(lookupResult.food, raw.quantity, raw.inline_macros);
        calories = raw.inline_macros.calories ?? computed.calories ?? 0;
        protein  = raw.inline_macros.protein  ?? computed.protein  ?? 0;
        fat      = raw.inline_macros.fat       ?? computed.fat      ?? 0;
        carbs    = raw.inline_macros.carbs     ?? computed.carbs    ?? 0;
        fiber    = raw.inline_macros.fiber     ?? computed.fiber    ?? 0;
        sugar    = raw.inline_macros.sugar     ?? computed.sugar    ?? 0;
        sodium   = raw.inline_macros.sodium    ?? computed.sodium   ?? 0;
        cache_candidate = lookupResult.cache_candidate ?? null;
      }

      const item: ParsedItem = {
        food_name: raw.display_name,
        lookup_name: raw.lookup_name,
        quantity: raw.quantity,
        calories,
        protein,
        fat,
        carbs,
        fiber,
        sugar,
        sodium,
        needs_lookup: lookupResult != null,
        cache_candidate,
      };

      meal.items.push(item);
    }

    const meals = mealOrder.map((k) => mealMap.get(k)!);

    // 5. Collect all cache_candidates for the caller (LogFoodView) to upsert on save
    const cache_candidates = meals.flatMap((meal) =>
      meal.items.map((item: any) => item.cache_candidate).filter(Boolean)
    );

    return NextResponse.json({ meals, cache_candidates });
  } catch (error) {
    console.error('[parse-food] Error:', error);
    return NextResponse.json(
      { error: 'Failed to parse food description', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
