import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { foodName, storageLocation, dateAdded } = await request.json();

    if (!foodName || !storageLocation) {
      return NextResponse.json({ error: 'Food name and storage location required' }, { status: 400 });
    }

    const normalized = foodName.toLowerCase();
    const addedDate = dateAdded ? new Date(dateAdded) : new Date();

    // Query expiration defaults
    const { data: defaults } = await supabase
      .from('food_expiration_defaults')
      .select('*');

    if (!defaults || defaults.length === 0) {
      return NextResponse.json({
        expiration_date: null,
        estimated: false,
        message: 'No expiration data available'
      });
    }

    // Find best match using keywords
    let bestMatch = null;
    let highestMatchScore = 0;

    for (const category of defaults) {
      const keywords = category.keywords || [];
      let matchScore = 0;

      for (const keyword of keywords) {
        if (normalized.includes(keyword.toLowerCase())) {
          matchScore++;
        }
      }

      if (matchScore > highestMatchScore) {
        highestMatchScore = matchScore;
        bestMatch = category;
      }
    }

    if (!bestMatch) {
      // Default fallback based on storage type
      const defaultDays = {
        fridge: 7,
        freezer: 90,
        pantry: 30
      };

      const expirationDate = new Date(addedDate);
      expirationDate.setDate(expirationDate.getDate() + defaultDays[storageLocation as keyof typeof defaultDays]);

      return NextResponse.json({
        expiration_date: expirationDate.toISOString().split('T')[0],
        estimated: true,
        shelf_life_days: defaultDays[storageLocation as keyof typeof defaultDays],
        category: 'unknown',
        confidence: 'low'
      });
    }

    // Get shelf life based on storage location
    let shelfLifeDays = null;
    if (storageLocation === 'fridge' && bestMatch.fridge_days) {
      shelfLifeDays = bestMatch.fridge_days;
    } else if (storageLocation === 'freezer' && bestMatch.freezer_days) {
      shelfLifeDays = bestMatch.freezer_days;
    } else if (storageLocation === 'pantry' && bestMatch.pantry_days) {
      shelfLifeDays = bestMatch.pantry_days;
    }

    if (!shelfLifeDays) {
      return NextResponse.json({
        expiration_date: null,
        estimated: false,
        message: `${bestMatch.food_category} cannot be stored in ${storageLocation}`,
        category: bestMatch.food_category,
        confidence: 'high'
      });
    }

    const expirationDate = new Date(addedDate);
    expirationDate.setDate(expirationDate.getDate() + shelfLifeDays);

    return NextResponse.json({
      expiration_date: expirationDate.toISOString().split('T')[0],
      estimated: true,
      shelf_life_days: shelfLifeDays,
      category: bestMatch.food_category,
      confidence: highestMatchScore > 1 ? 'high' : 'medium'
    });

  } catch (error) {
    console.error('Estimate expiration error:', error);
    return NextResponse.json(
      { error: 'Failed to estimate expiration' },
      { status: 500 }
    );
  }
}