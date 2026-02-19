// Import necessary modules and definitions

import { NextResponse } from 'next/server';
import type { NextApiRequest, NextApiResponse } from 'next';

// Define the function to parse nutrition information
export async function GET(request: NextApiRequest, response: NextApiResponse) {
    try {
        // Get user input from request
        const userInput = request.url;

        // Define regex patterns for nutritional information
        const nutritionPatterns = {
            calories: /([\d]+)\s*cal/i,
            carbs: /([\d]+)\s*g carbs/i,
            protein: /([\d]+)\s*g protein/i,
            fat: /([\d]+)\s*g fat/i,
            fiber: /([\d]+)\s*g fiber/i,
            sugar: /([\d]+)\s*g sugar/i,
            sodium: /([\d]+)\s*mg sodium/i,
        };

        // Initialize the nutrition object
        const nutrition = {
            calories: 0,
            carbs: 0,
            protein: 0,
            fat: 0,
            fiber: 0,
            sugar: 0,
            sodium: 0,
        };

        // Extract values from user input
        for (const [key, pattern] of Object.entries(nutritionPatterns)) {
            const match = userInput.match(pattern);
            if (match && match[1]) {
                nutrition[key] = parseInt(match[1]);
            }
        }

        // Return nutrition data as JSON response
        return NextResponse.json({ success: true, nutrition });
    } catch (error) {
        // Handle errors
        return NextResponse.json({ success: false, message: 'Error parsing nutrition data', error });
    }
}