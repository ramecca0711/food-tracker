import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Always create the OpenAI client inside the handler — never at module level —
// so that next build doesn't throw when env vars are absent during static analysis.
function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

// ─────────────────────────────────────────────────────────────────────────────
// Route handler
// ─────────────────────────────────────────────────────────────────────────────

// POST /api/parse-nutrition-label
// Accepts a base64-encoded image of a nutrition facts panel and uses
// GPT-4o-mini vision to extract the exact values printed on the label.
//
// Returns per-serving nutrition data formatted for direct use as a FoodItem.
// The caller should treat these values as authoritative (provided_by_user: true).
export async function POST(request: NextRequest) {
  try {
    const { imageBase64, mimeType = 'image/jpeg' } = await request.json();

    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return NextResponse.json({ error: 'Image data is required' }, { status: 400 });
    }

    const openai = getOpenAI();

    // Ask GPT-4o-mini to read the nutrition facts panel precisely.
    // We emphasise "exact values only" to prevent the model from estimating.
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You are a nutrition facts label reader. Read the EXACT numbers printed on the nutrition facts panel — do not estimate, round differently, or guess any values.

Return this exact JSON structure (all numeric values per serving as shown on the label):
{
  "food_name": "product name or description visible on the label, or 'Unknown Product' if not visible",
  "serving_size": "exactly as shown on the label, e.g. '1 cup (240ml)' or '28g (1 oz)'",
  "calories": number,
  "protein": number in grams,
  "fat": number in grams (Total Fat),
  "carbs": number in grams (Total Carbohydrate),
  "fiber": number in grams (Dietary Fiber, use 0 if not listed),
  "sugar": number in grams (Total Sugars, use 0 if not listed),
  "sodium": number in milligrams
}

If the image is unclear, not a nutrition label, or values are unreadable, include an "error" field with a brief description.`,
        },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                // Pass the image as a base64 data URL for inline processing
                url: `data:${mimeType};base64,${imageBase64}`,
                detail: 'high', // use high-detail mode for small label text
              },
            },
            {
              type: 'text',
              text: 'Please read all nutrition values exactly as shown on this label.',
            },
          ],
        },
      ],
    });

    const content = response.choices?.[0]?.message?.content;
    if (!content) throw new Error('No response from OpenAI');

    const parsed = JSON.parse(content);

    // Surface any model-detected errors (e.g. blurry image, not a nutrition label)
    if (parsed.error) {
      return NextResponse.json({ error: parsed.error }, { status: 422 });
    }

    // Normalise and return in FoodItem-compatible shape
    return NextResponse.json({
      food_name: String(parsed.food_name || 'Unknown Product').trim(),
      serving_size: String(parsed.serving_size || '1 serving').trim(),
      amount: 1,
      quantity:  String(parsed.serving_size || '1 serving').trim(),
      calories:  Math.round(Number(parsed.calories)  || 0),
      protein:   Math.round(Number(parsed.protein)   * 10) / 10 || 0,
      fat:       Math.round(Number(parsed.fat)        * 10) / 10 || 0,
      carbs:     Math.round(Number(parsed.carbs)      * 10) / 10 || 0,
      fiber:     Math.round(Number(parsed.fiber)      * 10) / 10 || 0,
      sugar:     Math.round(Number(parsed.sugar)      * 10) / 10 || 0,
      sodium:    Math.round(Number(parsed.sodium)     || 0),
      base_calories: Math.round(Number(parsed.calories)  || 0),
      base_protein:  Math.round(Number(parsed.protein)   * 10) / 10 || 0,
      base_fat:      Math.round(Number(parsed.fat)       * 10) / 10 || 0,
      base_carbs:    Math.round(Number(parsed.carbs)     * 10) / 10 || 0,
      base_fiber:    Math.round(Number(parsed.fiber)     * 10) / 10 || 0,
      base_sugar:    Math.round(Number(parsed.sugar)     * 10) / 10 || 0,
      base_sodium:   Math.round(Number(parsed.sodium)    || 0),
      source: 'label_photo' as const,
      // Categories and whole-food-ingredients can't be determined from a label photo;
      // set to empty arrays and let the user edit if needed.
      categories: [] as string[],
      whole_food_ingredients: [] as string[],
    });
  } catch (error) {
    console.error('Nutrition label parse error:', error);
    return NextResponse.json({ error: 'Failed to parse nutrition label' }, { status: 500 });
  }
}
