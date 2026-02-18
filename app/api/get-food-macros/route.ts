import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const USDA_API_KEY = process.env.USDA_API_KEY;

export async function POST(request: NextRequest) {
  try {
    const { foodName, userId } = await request.json();

    if (!foodName) {
      return NextResponse.json({ error: 'Food name required' }, { status: 400 });
    }

    const normalized = foodName.toLowerCase().trim();

    // STEP 1: Check our cache (master_food_database)
    const { data: cached } = await supabase
      .from('master_food_database')
      .select('*')
      .ilike('normalized_name', `%${normalized}%`)
      .order('times_used', { ascending: false })
      .limit(1)
      .single();

    if (cached) {
      // Update usage count
      await supabase
        .from('master_food_database')
        .update({ times_used: cached.times_used + 1 })
        .eq('id', cached.id);

      return NextResponse.json({
        source: 'cache',
        food: {
          name: cached.food_name,
          calories_per_100g: cached.calories_per_100g,
          protein_per_100g: cached.protein_per_100g,
          fat_per_100g: cached.fat_per_100g,
          carbs_per_100g: cached.carbs_per_100g,
          fiber_per_100g: cached.fiber_per_100g,
          sugar_per_100g: cached.sugar_per_100g,
          sodium_per_100mg: cached.sodium_per_100mg,
          common_serving_size: cached.common_serving_size,
          common_serving_grams: cached.common_serving_grams,
        }
      });
    }

    // STEP 2: Try USDA API
    if (USDA_API_KEY) {
      try {
        const usdaResponse = await fetch(
          `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${USDA_API_KEY}&query=${encodeURIComponent(foodName)}&pageSize=1`
        );

        if (usdaResponse.ok) {
          const usdaData = await usdaResponse.json();
          const food = usdaData.foods?.[0];

          if (food) {
            const nutrients = food.foodNutrients || [];
            const getNutrient = (id: number) => nutrients.find((n: any) => n.nutrientId === id)?.value || 0;

            const foodData = {
              food_name: food.description,
              normalized_name: normalized,
              calories_per_100g: getNutrient(1008),
              protein_per_100g: getNutrient(1003),
              fat_per_100g: getNutrient(1004),
              carbs_per_100g: getNutrient(1005),
              fiber_per_100g: getNutrient(1079),
              sugar_per_100g: getNutrient(2000),
              sodium_per_100mg: getNutrient(1093) / 10,
              usda_fdc_id: food.fdcId,
              source: 'usda',
              common_serving_size: '100g',
              common_serving_grams: 100,
            };

            // Cache it
            await supabase.from('master_food_database').insert(foodData);

            return NextResponse.json({
              source: 'usda',
              food: {
                name: foodData.food_name,
                calories_per_100g: foodData.calories_per_100g,
                protein_per_100g: foodData.protein_per_100g,
                fat_per_100g: foodData.fat_per_100g,
                carbs_per_100g: foodData.carbs_per_100g,
                fiber_per_100g: foodData.fiber_per_100g,
                sugar_per_100g: foodData.sugar_per_100g,
                sodium_per_100mg: foodData.sodium_per_100mg,
                common_serving_size: foodData.common_serving_size,
                common_serving_grams: foodData.common_serving_grams,
              }
            });
          }
        }
      } catch (usdaError) {
        console.error('USDA lookup failed:', usdaError);
      }
    }

    // STEP 3: Fall back to AI estimation
    const aiResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a nutrition expert. Estimate nutritional information per 100g for the given food. Return ONLY valid JSON with no markdown.

Format:
{
  "food_name": "Food Name",
  "calories_per_100g": 165,
  "protein_per_100g": 31,
  "fat_per_100g": 3.6,
  "carbs_per_100g": 0,
  "fiber_per_100g": 0,
  "sugar_per_100g": 0,
  "sodium_per_100mg": 7.4,
  "common_serving_size": "100g",
  "common_serving_grams": 100
}`
        },
        {
          role: 'user',
          content: foodName
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const aiData = JSON.parse(aiResponse.choices[0].message.content || '{}');

    // Cache AI result
    const cacheData = {
      ...aiData,
      normalized_name: normalized,
      source: 'ai',
    };
    await supabase.from('master_food_database').insert(cacheData);

    return NextResponse.json({
      source: 'ai',
      food: aiData
    });

  } catch (error) {
    console.error('Get food macros error:', error);
    return NextResponse.json(
      { error: 'Failed to get nutritional information' },
      { status: 500 }
    );
  }
}