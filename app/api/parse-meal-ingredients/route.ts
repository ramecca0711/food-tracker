import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import * as cheerio from 'cheerio';

// Lazy factories — deferred so Next.js can import this module at build time
// without throwing "supabaseUrl is required" (env vars only available at runtime).
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const openai = getOpenAI();

    const { inputType, input, servings, userId } = await request.json();

    if (!inputType || !input) {
      return NextResponse.json({ error: 'Input type and input required' }, { status: 400 });
    }

    let ingredientsList = '';
    let recipeInstructions: string[] = [];
    let recipeUrl = '';
    let mealName = '';

    // Handle different input types
    if (inputType === 'text') {
      ingredientsList = input;
      mealName = 'Custom Meal';
    } 
    else if (inputType === 'saved_meal') {
      // Fetch saved meal from database
      const { data: savedMeal } = await supabase
        .from('saved_meals')
        .select('*')
        .eq('id', input)
        .eq('user_id', userId)
        .single();

      if (!savedMeal) {
        return NextResponse.json({ error: 'Saved meal not found' }, { status: 404 });
      }

      mealName = savedMeal.meal_name;
      recipeUrl = savedMeal.recipe_url || '';
      recipeInstructions = savedMeal.recipe_instructions || [];

      // Convert saved meal items to ingredient list
      const items = savedMeal.items || [];
      ingredientsList = items.map((item: any) => 
        `${item.quantity} ${item.food_name}`
      ).join(', ');
    }
    else if (inputType === 'url') {
      // Fetch and parse recipe from URL
      try {
        const response = await fetch(input);
        const html = await response.text();
        const $ = cheerio.load(html);

        recipeUrl = input;

        // Extract title
        mealName = $('h1').first().text().trim() || 
                   $('title').text().trim() || 
                   'Recipe from URL';

        // Try to find ingredients (common recipe site patterns)
        const ingredientSelectors = [
          '.recipe-ingredients li',
          '.ingredients li',
          '[itemprop="recipeIngredient"]',
          '.ingredient',
          'li.ingredient'
        ];

        let ingredients: string[] = [];
        for (const selector of ingredientSelectors) {
          const found = $(selector);
          if (found.length > 0) {
            found.each((i, el) => {
              const text = $(el).text().trim();
              if (text) ingredients.push(text);
            });
            break;
          }
        }

        if (ingredients.length === 0) {
          // Fallback: use AI to extract from full text
          const pageText = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 5000);
          
          const aiExtraction = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: 'Extract the ingredient list from this recipe webpage text. Return only the ingredients, one per line.'
              },
              {
                role: 'user',
                content: pageText
              }
            ],
            temperature: 0.3,
          });

          ingredients = (aiExtraction.choices[0].message.content || '')
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);
        }

        ingredientsList = ingredients.join(', ');

        // Extract instructions
        const instructionSelectors = [
          '.recipe-instructions li',
          '.instructions li',
          '[itemprop="recipeInstructions"] li',
          '.instruction',
          'ol li'
        ];

        for (const selector of instructionSelectors) {
          const found = $(selector);
          if (found.length > 0) {
            found.each((i, el) => {
              const text = $(el).text().trim();
              if (text && text.length > 10) {
                recipeInstructions.push(text);
              }
            });
            break;
          }
        }

      } catch (urlError) {
        console.error('URL parsing error:', urlError);
        return NextResponse.json({ 
          error: 'Failed to parse recipe URL. Please try entering ingredients manually.' 
        }, { status: 400 });
      }
    }

    if (!ingredientsList) {
      return NextResponse.json({ error: 'No ingredients found' }, { status: 400 });
    }

    // Parse ingredients with AI
    const aiResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a recipe parser. Extract structured ingredient data from the given text.

For each ingredient, determine:
- name: the food item
- quantity: numeric amount
- unit: measurement unit (cup, tbsp, oz, g, lb, piece, etc.)
- original_text: the exact text as provided

Return ONLY valid JSON array with no markdown:
{
  "ingredients": [
    {
      "name": "chicken breast",
      "quantity": 2,
      "unit": "lb",
      "original_text": "2 lbs chicken breast"
    }
  ]
}

If servings are mentioned, scale quantities appropriately. Default serving size: ${servings || 4}`
        },
        {
          role: 'user',
          content: ingredientsList
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const parsed = JSON.parse(aiResponse.choices[0].message.content || '{"ingredients":[]}');
    const ingredients = parsed.ingredients || [];

    return NextResponse.json({
      meal_name: mealName,
      servings: servings || 4,
      ingredients: ingredients,
      recipe_url: recipeUrl,
      recipe_instructions: recipeInstructions,
      source: inputType
    });

  } catch (error) {
    console.error('Parse meal ingredients error:', error);
    return NextResponse.json(
      { error: 'Failed to parse ingredients' },
      { status: 500 }
    );
  }
}
