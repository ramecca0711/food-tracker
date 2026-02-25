import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Lazy factory — deferred so Next.js can import this module at build time
// without throwing "supabaseUrl is required" (env vars only available at runtime).
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! // Use service role for admin operations
  );
}

export async function POST(request: Request) {
  try {
    const supabase = getSupabase();

    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    // Get all food items for this user that need biodiversity data
    const { data: items, error: fetchError } = await supabase
      .from('food_items')
      .select('*')
      .eq('user_id', userId)
      .or('whole_food_ingredients.is.null,whole_food_ingredients.eq.{}')
      .limit(500); // Process in batches

    if (fetchError) {
      console.error('Fetch error:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 });
    }

    if (!items || items.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No items need processing',
        processed: 0 
      });
    }

    let successCount = 0;
    let errorCount = 0;

    // Process each item
    for (const item of items) {
      try {
        // Call OpenAI to re-parse
        const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/parse-food`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ foodDescription: item.food_name }),
        });

        if (!response.ok) {
          errorCount++;
          continue;
        }

        const parsed = await response.json();
        
        if (parsed.meals?.[0]?.items?.[0]) {
          const parsedItem = parsed.meals[0].items[0];
          
          // Update the item with new biodiversity data
          const { error: updateError } = await supabase
            .from('food_items')
            .update({
              whole_food_ingredients: parsedItem.whole_food_ingredients || [],
              categories: parsedItem.categories || [],
            })
            .eq('id', item.id);

          if (updateError) {
            console.error('Update error for item:', item.id, updateError);
            errorCount++;
          } else {
            successCount++;
          }
        } else {
          errorCount++;
        }

        // Add small delay to avoid rate limits
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
      total: items.length
    });

  } catch (error) {
    console.error('Backfill error:', error);
    return NextResponse.json({ 
      error: 'Failed to backfill',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
