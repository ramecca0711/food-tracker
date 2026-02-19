import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function convertToGrams(quantity: string): number {
  const normalized = quantity.toLowerCase().trim();
  const numMatch = normalized.match(/[\d.]+/);
  if (!numMatch) return 100;
  const num = parseFloat(numMatch[0]);
  
  if (normalized.includes('cup')) return num * 240;
  if (normalized.includes('tbsp')) return num * 15;
  if (normalized.includes('tsp')) return num * 5;
  if (normalized.includes('oz') && !normalized.includes('fl')) return num * 28.35;
  if (normalized.includes('lb')) return num * 453.6;
  if (normalized.includes('kg')) return num * 1000;
  if (normalized.includes('g') && !normalized.includes('kg')) return num;
  
  return num;
}

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    // Get all unique food names for this user
    const { data: items, error: fetchError } = await supabase
      .from('food_items')
      .select('id, food_name, quantity, calories')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(500);

    if (fetchError) {
      console.error('Fetch error:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 });
    }

    if (!items || items.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No items to process',
        processed: 0 
      });
    }

    let successCount = 0;
    let errorCount = 0;
    let cacheHits = 0;
    let offHits = 0;
    let aiHits = 0;

    // Process each item
    for (const item of items) {
      try {
        // Get accurate macros
        const macroResponse = await fetch(
          `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/get-food-macros`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ foodName: item.food_name })
          }
        );

        if (!macroResponse.ok) {
          errorCount++;
          continue;
        }

        const macroData = await macroResponse.json();
        
        // Track source ('off' is the value returned by get-food-macros for OpenFoodFacts)
        if (macroData.source === 'cache') cacheHits++;
        else if (macroData.source === 'off' || macroData.source === 'openfoodfacts') offHits++;
        else if (macroData.source === 'ai') aiHits++;

        // Calculate based on quantity
        const quantityInGrams = convertToGrams(item.quantity);
        const ratio = quantityInGrams / 100;

        // Update the item
        const { error: updateError } = await supabase
          .from('food_items')
          .update({
            calories: Math.round((macroData.food.calories_per_100g || 0) * ratio),
            protein: Math.round((macroData.food.protein_per_100g || 0) * ratio * 10) / 10,
            fat: Math.round((macroData.food.fat_per_100g || 0) * ratio * 10) / 10,
            carbs: Math.round((macroData.food.carbs_per_100g || 0) * ratio * 10) / 10,
            fiber: Math.round((macroData.food.fiber_per_100g || 0) * ratio * 10) / 10,
            sugar: Math.round((macroData.food.sugar_per_100g || 0) * ratio * 10) / 10,
            sodium: Math.round((macroData.food.sodium_per_100mg || 0) * ratio * 10),
          })
          .eq('id', item.id);

        if (updateError) {
          console.error('Update error for item:', item.id, updateError);
          errorCount++;
        } else {
          successCount++;
        }

        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (itemError) {
        console.error('Error processing item:', item.id, itemError);
        errorCount++;
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Processed ${successCount + errorCount} items`,
      successful: successCount,
      failed: errorCount,
      total: items.length,
      sources: {
        cache: cacheHits,
        openfoodfacts: offHits,
        ai: aiHits
      }
    });

  } catch (error) {
    console.error('Backfill error:', error);
    return NextResponse.json({ 
      error: 'Failed to backfill',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}