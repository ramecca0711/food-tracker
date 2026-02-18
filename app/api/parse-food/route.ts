import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface FoodItem {
  food_name: string;
  quantity: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber: number;
  sugar: number;
  sodium: number;
  categories: string[];
  whole_food_ingredients: string[];
  macro_source?: string;
}

interface MealGroup {
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  items: FoodItem[];
  confidence: number;
}

// Helper: Convert various quantities to grams
function convertToGrams(quantity: string): number {
  const normalized = quantity.toLowerCase().trim();
  
  // Extract number
  const numMatch = normalized.match(/[\d.]+/);
  if (!numMatch) return 100; // default
  
  const num = parseFloat(numMatch[0]);
  
  // Volume conversions (approximate for common foods)
  if (normalized.includes('cup')) return num * 240;
  if (normalized.includes('tbsp') || normalized.includes('tablespoon')) return num * 15;
  if (normalized.includes('tsp') || normalized.includes('teaspoon')) return num * 5;
  if (normalized.includes('oz') && !normalized.includes('fl')) return num * 28.35;
  if (normalized.includes('lb') || normalized.includes('pound')) return num * 453.6;
  if (normalized.includes('kg')) return num * 1000;
  if (normalized.includes('g') && !normalized.includes('kg')) return num;
  
  // Default to grams if just a number
  return num;
}

export async function POST(request: NextRequest) {
  try {
    const { foodDescription } = await request.json();

    if (!foodDescription || typeof foodDescription !== 'string') {
      return NextResponse.json(
        { error: 'Food description is required' },
        { status: 400 }
      );
    }

    const currentHour = new Date().getHours();
    
    // STEP 1: Get meal structure from AI (unchanged)
    const structureResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a nutrition expert. Parse food descriptions and intelligently split into separate meals.

IMPORTANT: Detect if user is describing MULTIPLE meals in one input:
- Look for meal type keywords: "breakfast", "lunch", "dinner", "snack"
- Look for time indicators: "morning", "noon", "evening", "after workout"
- Look for transitions: "then", "later", "for lunch", "at dinner"
- Look for context clues: "today I had...", "this morning..., this afternoon..."

FOOD CATEGORIES (assign ALL that apply):
- protein: meat, poultry, fish, eggs, legumes, tofu
- dairy: milk, cheese, yogurt, butter
- vegetable: all vegetables
- fruit: all fruits
- grain: bread, rice, pasta, cereal, oats
- fat: oils, nuts, seeds, avocado
- beverage: coffee, tea, juice, soda, water

WHOLE FOOD INGREDIENTS (CRITICAL FOR BIODIVERSITY):
For each food item, extract the actual whole food ingredients:
- "blueberry jam" → ["blueberry"]
- "spinach and feta kolache" → ["spinach"]
- "chicken katsu with rice" → ["chicken", "rice"]
- "strawberry yogurt" → ["strawberry"]
- "avocado toast" → ["avocado", "bread"]
- "greek salad" → ["cucumber", "tomato", "olives", "feta"]
- Only include WHOLE, UNPROCESSED ingredients (fruits, vegetables, nuts, legumes, whole grains)
- Do NOT include processed items like "jam", "bread" (unless whole grain), "pasta" (unless whole grain)
- Be specific: "spinach", "kale", "broccoli" not just "greens"

DO NOT estimate nutritional values yet - just structure.

Return ONLY valid JSON in this format:

{
  "meals": [
    {
      "meal_type": "breakfast",
      "confidence": 0.95,
      "items": [
        {
          "food_name": "blueberry jam on toast",
          "quantity": "2 slices",
          "categories": ["grain", "fruit"],
          "whole_food_ingredients": ["blueberry"]
        }
      ]
    }
  ]
}

Current time context: ${currentHour}:00 (use this to help guess meal type if ambiguous)`
        },
        {
          role: 'user',
          content: foodDescription
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const structure = JSON.parse(structureResponse.choices[0].message.content || '{"meals":[]}');

    // STEP 2: Enhance each item with ACCURATE macros using smart lookup
    for (const meal of structure.meals) {
      for (const item of meal.items) {
        try {
          // Call smart macro lookup
          const macroResponse = await fetch(
            `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/get-food-macros`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ foodName: item.food_name })
            }
          );

          if (!macroResponse.ok) {
            throw new Error('Macro lookup failed');
          }

          const macroData = await macroResponse.json();
          
          // Convert quantity to grams for calculation
          const quantityInGrams = convertToGrams(item.quantity);
          const ratio = quantityInGrams / 100; // per 100g

          // Calculate macros based on quantity
          item.calories = Math.round((macroData.food.calories_per_100g || 0) * ratio);
          item.protein = Math.round((macroData.food.protein_per_100g || 0) * ratio * 10) / 10;
          item.fat = Math.round((macroData.food.fat_per_100g || 0) * ratio * 10) / 10;
          item.carbs = Math.round((macroData.food.carbs_per_100g || 0) * ratio * 10) / 10;
          item.fiber = Math.round((macroData.food.fiber_per_100g || 0) * ratio * 10) / 10;
          item.sugar = Math.round((macroData.food.sugar_per_100g || 0) * ratio * 10) / 10;
          item.sodium = Math.round((macroData.food.sodium_per_100mg || 0) * ratio * 10);
          item.macro_source = macroData.source; // 'cache', 'usda', or 'ai'

        } catch (macroError) {
          console.error(`Failed to get macros for ${item.food_name}:`, macroError);
          
          // Fallback: use AI estimation (old method)
          item.calories = 0;
          item.protein = 0;
          item.fat = 0;
          item.carbs = 0;
          item.fiber = 0;
          item.sugar = 0;
          item.sodium = 0;
          item.macro_source = 'error';
        }
      }
    }

    return NextResponse.json(structure);

  } catch (error) {
    console.error('Error parsing food:', error);
    return NextResponse.json(
      { error: 'Failed to parse food' },
      { status: 500 }
    );
  }
}