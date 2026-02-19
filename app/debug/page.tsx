import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { parseFood } from '@/lib/openai';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function isMissing(v: any) {
  if (v == null) return true;
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === 'string') return v.trim() === '';
  try {
    const s = JSON.stringify(v);
    return s === '[]' || s === '{}' || s === 'null';
  } catch {
    return true;
  }
}

function buildPromptFromRow(item: any) {
  const parts: string[] = [];
  parts.push(`Food item: ${item.food_name}`);
  if (item.quantity) parts.push(`Quantity: ${item.quantity}`);

  // If row already has nutrition, include so we don't drift
  const nums: string[] = [];
  if (item.calories > 0) nums.push(`${item.calories} calories`);
  if (item.protein > 0) nums.push(`${item.protein}g protein`);
  if (item.fat > 0) nums.push(`${item.fat}g fat`);
  if (item.carbs > 0) nums.push(`${item.carbs}g carbs`);
  if (item.fiber > 0) nums.push(`${item.fiber}g fiber`);
  if (item.sugar > 0) nums.push(`${item.sugar}g sugar`);
  if (item.sodium > 0) nums.push(`${item.sodium}mg sodium`);
  if (nums.length) parts.push(`Known nutrition: ${nums.join(', ')}`);

  parts.push(`Goal: Return categories and whole_food_ingredients for biodiversity.`);
  return parts.join('\n');
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();
    if (!userId) return NextResponse.json({ error: 'User ID required' }, { status: 400 });

    const { data: items, error } = await supabase
      .from('food_items')
      .select('id,food_name,quantity,calories,protein,fat,carbs,fiber,sugar,sodium,whole_food_ingredients,categories')
      .eq('user_id', userId)
      .order('logged_at', { ascending: false });

    if (error) {
      console.error('Fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch items', details: error.message }, { status: 500 });
    }

    const targets = (items || []).filter((it: any) => isMissing(it.whole_food_ingredients));
    if (targets.length === 0) {
      return NextResponse.json({ success: true, message: 'No items need processing', processed: 0 });
    }

    const results: any[] = [];
    let successCount = 0;

    for (const item of targets) {
      try {
        const prompt = buildPromptFromRow(item);
        const parsed = await parseFood(prompt);

        const parsedItem = parsed?.meals?.[0]?.items?.[0];
        if (!parsedItem) {
          results.push({ id: item.id, food_name: item.food_name, ok: false, error: 'No parsed item returned' });
          continue;
        }

        const whole = Array.isArray(parsedItem.whole_food_ingredients) ? parsedItem.whole_food_ingredients : [];
        const cats = Array.isArray(parsedItem.categories) ? parsedItem.categories : [];

        const { error: updateError } = await supabase
          .from('food_items')
          .update({ whole_food_ingredients: whole, categories: cats })
          .eq('id', item.id);

        if (updateError) {
          results.push({ id: item.id, food_name: item.food_name, ok: false, error: updateError.message });
          continue;
        }

        successCount++;
        results.push({ id: item.id, food_name: item.food_name, ok: true, whole_food_ingredients: whole, categories: cats });

        await sleep(100);
      } catch (e: any) {
        results.push({ id: item.id, food_name: item.food_name, ok: false, error: e?.message || String(e) });
        await sleep(200);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Backfill complete',
      totalTargets: targets.length,
      successful: successCount,
      failed: targets.length - successCount,
      // show only failures to keep payload small (or return all if you want)
      failures: results.filter(r => !r.ok),
    });
  } catch (e: any) {
    console.error('Backfill error:', e);
    return NextResponse.json({ error: 'Failed to backfill', details: e?.message || String(e) }, { status: 500 });
  }
}
