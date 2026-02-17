import { NextRequest, NextResponse } from 'next/server';
import { parseFood } from '@/lib/openai';

export async function POST(request: NextRequest) {
  try {
    const { foodDescription } = await request.json();

    if (!foodDescription || typeof foodDescription !== 'string') {
      return NextResponse.json(
        { error: 'Food description is required' },
        { status: 400 }
      );
    }

    const parsed = await parseFood(foodDescription);

    return NextResponse.json(parsed);
  } catch (error) {
    console.error('Error parsing food:', error);
    return NextResponse.json(
      { error: 'Failed to parse food' },
      { status: 500 }
    );
  }
}