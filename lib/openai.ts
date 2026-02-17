import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface FoodItem {
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
}

export interface MealGroup {
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  items: FoodItem[];
  confidence: number;
}

export interface ParsedFood {
  meals: MealGroup[];  // Changed from single items array to multiple meals
}

export async function parseFood(description: string): Promise<ParsedFood> {
  const currentHour = new Date().getHours();
  
  const response = await openai.chat.completions.create({
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

MICRONUTRIENTS (estimate if common food, use 0 if uncertain):
- fiber (g): whole grains, fruits, vegetables, legumes
- sugar (g): natural and added sugars
- sodium (mg): especially processed foods

MEAL TYPE DETECTION:
- breakfast: typical morning foods (eggs, cereal, toast, etc.) or explicit mention
- lunch: midday foods, sandwiches, salads, or explicit mention
- dinner: heavier meals, multiple courses, or explicit mention
- snack: single items, small portions, or explicit mention

Current time context: ${currentHour}:00 (use this to help guess meal type if ambiguous)

Return ONLY valid JSON in this format:

SINGLE MEAL EXAMPLE:
{
  "meals": [
    {
      "meal_type": "breakfast",
      "confidence": 0.95,
      "items": [
        {
          "food_name": "scrambled eggs",
          "quantity": "2 large",
          "calories": 140,
          "protein": 12,
          "fat": 10,
          "carbs": 1,
          "fiber": 0,
          "sugar": 1,
          "sodium": 140,
          "categories": ["protein", "dairy"]
        }
      ]
    }
  ]
}

MULTIPLE MEALS EXAMPLE:
{
  "meals": [
    {
      "meal_type": "breakfast",
      "confidence": 0.95,
      "items": [
        {
          "food_name": "scrambled eggs",
          "quantity": "2 large",
          "calories": 140,
          "protein": 12,
          "fat": 10,
          "carbs": 1,
          "fiber": 0,
          "sugar": 1,
          "sodium": 140,
          "categories": ["protein", "dairy"]
        }
      ]
    },
    {
      "meal_type": "lunch",
      "confidence": 0.90,
      "items": [
        {
          "food_name": "chicken salad",
          "quantity": "1 bowl",
          "calories": 350,
          "protein": 30,
          "fat": 15,
          "carbs": 20,
          "fiber": 5,
          "sugar": 8,
          "sodium": 450,
          "categories": ["protein", "vegetable"]
        }
      ]
    }
  ]
}

Be specific about portions. If user doesn't specify quantity, use standard serving sizes.`,
      },
      {
        role: 'user',
        content: description,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
  });

  const content = response.choices[0].message.content;
  if (!content) throw new Error('No response from OpenAI');

  return JSON.parse(content);
}