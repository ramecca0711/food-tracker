import { NextRequest, NextResponse } from 'next/server';

const USDA_API_KEY = process.env.USDA_API_KEY;
const USDA_BASE_URL = 'https://api.nal.usda.gov/fdc/v1';

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    if (!USDA_API_KEY) {
      return NextResponse.json({ error: 'USDA API key not configured' }, { status: 500 });
    }

    // Search USDA database
    const response = await fetch(
      `${USDA_BASE_URL}/foods/search?api_key=${USDA_API_KEY}&query=${encodeURIComponent(query)}&pageSize=5`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error('USDA API request failed');
    }

    const data = await response.json();

    // Parse and format results
    const foods = data.foods?.map((food: any) => {
      const nutrients = food.foodNutrients || [];
      
      const getNutrient = (nutrientId: number) => {
        const nutrient = nutrients.find((n: any) => n.nutrientId === nutrientId);
        return nutrient?.value || 0;
      };

      return {
        fdcId: food.fdcId,
        description: food.description,
        brandName: food.brandName,
        dataType: food.dataType,
        // Per 100g values
        calories: getNutrient(1008),
        protein: getNutrient(1003),
        fat: getNutrient(1004),
        carbs: getNutrient(1005),
        fiber: getNutrient(1079),
        sugar: getNutrient(2000),
        sodium: getNutrient(1093) / 10, // convert mg to match our schema
      };
    }) || [];

    return NextResponse.json({ foods });

  } catch (error) {
    console.error('USDA API error:', error);
    return NextResponse.json(
      { error: 'Failed to search USDA database' },
      { status: 500 }
    );
  }
}