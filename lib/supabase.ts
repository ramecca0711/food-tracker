import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types for our food logs
export interface FoodLog {
  id: string;
  user_id: string;
  food_description: string;
  parsed_items: any;
  total_calories: number;
  total_protein: number;
  total_fat: number;
  total_carbs: number;
  meal_type?: string;
  logged_at: string;
  created_at: string;
}