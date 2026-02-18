'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import SummaryCards from './SummaryCards';
import DayCard from './DayCard';
import ManualAddModal from './ManualAddModal';

export default function DashboardView({ userId }: { userId: string | null }) {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================
  
  // Today's stats
  const [todayStats, setTodayStats] = useState({
    calories: 0,
    protein: 0,
    fat: 0,
    carbs: 0,
    fiber: 0,
    sugar: 0,
    sodium: 0,
    meals: 0,
  });
  
  // Averages
  const [sevenDayAvg, setSevenDayAvg] = useState({
    calories: 0,
    protein: 0,
    fat: 0,
    carbs: 0,
    fiber: 0,
    sugar: 0,
    sodium: 0,
  });

  const [thirtyDayAvg, setThirtyDayAvg] = useState({
    calories: 0,
    protein: 0,
    fat: 0,
    carbs: 0,
    fiber: 0,
    sugar: 0,
    sodium: 0,
  });

  // Goals and biodiversity
  const [goals, setGoals] = useState<any>(null);
  const [todayBiodiversity, setTodayBiodiversity] = useState<any>(null);
  const [sevenDayBiodiversity, setSevenDayBiodiversity] = useState<any>(null);
  const [thirtyDayBiodiversity, setThirtyDayBiodiversity] = useState<any>(null);
  
  // UI state
  const [expandedBioPeriods, setExpandedBioPeriods] = useState<Set<string>>(new Set());
  const [dailyData, setDailyData] = useState<any[]>([]);
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [expandedMeals, setExpandedMeals] = useState<Map<string, Set<string>>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  
  // Manual add modal
  const [showManualAddModal, setShowManualAddModal] = useState(false);
  const [manualAddDate, setManualAddDate] = useState<string>('');
  const [savedMeals, setSavedMeals] = useState<any[]>([]);

  // ============================================================================
  // TOGGLE FUNCTIONS
  // ============================================================================

  const toggleDay = (dayKey: string) => {
    const newExpanded = new Set(expandedDays);
    if (newExpanded.has(dayKey)) {
      newExpanded.delete(dayKey);
    } else {
      newExpanded.add(dayKey);
    }
    setExpandedDays(newExpanded);
  };

  const toggleMeal = (dayKey: string, mealType: string) => {
    const newExpanded = new Map(expandedMeals);
    if (!newExpanded.has(dayKey)) {
      newExpanded.set(dayKey, new Set());
    }
    const dayMeals = newExpanded.get(dayKey)!;
    if (dayMeals.has(mealType)) {
      dayMeals.delete(mealType);
    } else {
      dayMeals.add(mealType);
    }
    setExpandedMeals(newExpanded);
  };

  const toggleBioPeriod = (period: string) => {
    const newExpanded = new Set(expandedBioPeriods);
    if (newExpanded.has(period)) {
      newExpanded.delete(period);
    } else {
      newExpanded.add(period);
    }
    setExpandedBioPeriods(newExpanded);
  };

  // ============================================================================
  // FOOD ITEM EDITING & DELETION
  // ============================================================================

  const handleEditItem = async (itemId: string, updates: any) => {
    if (!userId) return;

    try {
      const { error } = await supabase
        .from('food_items')
        .update({
          food_name: updates.food_name,
          quantity: updates.quantity,
          calories: parseInt(updates.calories) || 0,
          protein: parseFloat(updates.protein) || 0,
          fat: parseFloat(updates.fat) || 0,
          carbs: parseFloat(updates.carbs) || 0,
          fiber: parseFloat(updates.fiber) || 0,
          sugar: parseFloat(updates.sugar) || 0,
          sodium: parseInt(updates.sodium) || 0,
        })
        .eq('id', itemId)
        .eq('user_id', userId);

      if (error) throw error;
      loadDashboardData();
    } catch (error) {
      console.error('Error updating item:', error);
      alert('Failed to update item');
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!userId) return;
    if (!confirm('Delete this food item?')) return;

    try {
      const { error } = await supabase
        .from('food_items')
        .delete()
        .eq('id', itemId)
        .eq('user_id', userId);

      if (error) throw error;
      loadDashboardData();
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Failed to delete item');
    }
  };

  // ============================================================================
  // BIODIVERSITY CALCULATION
  // ============================================================================
  
  const calculateBiodiversity = (items: any[]) => {
    const uniqueFruits = new Set();
    const uniqueVegetables = new Set();
    const uniqueNuts = new Set();
    const uniqueLegumes = new Set();
    const uniqueGrains = new Set();
    
    items.forEach(item => {
      const categories = item.categories || [];
      const ingredients = item.whole_food_ingredients || [];
      
      // Process each whole food ingredient
      ingredients.forEach((ingredient: string) => {
        const foodName = ingredient.toLowerCase().trim();
        
        // Skip empty strings
        if (!foodName) return;
        
        // Classify based on categories
        if (categories.includes('fruit')) {
          uniqueFruits.add(foodName);
        }
        
        if (categories.includes('vegetable')) {
          uniqueVegetables.add(foodName);
        }
        
        // Nuts and seeds
        if (categories.includes('fat') || foodName.includes('nut') || foodName.includes('seed') || 
            foodName.includes('almond') || foodName.includes('walnut') || foodName.includes('cashew') || 
            foodName.includes('peanut') || foodName === 'avocado') {
          uniqueNuts.add(foodName);
        }
        
        // Legumes
        if (foodName.includes('bean') || foodName.includes('lentil') || 
            foodName.includes('chickpea') || foodName.includes('pea')) {
          uniqueLegumes.add(foodName);
        }
        
        // Whole grains
        if (categories.includes('grain') && (foodName.includes('whole') || foodName.includes('brown rice') || 
            foodName.includes('quinoa') || foodName.includes('oat') || foodName === 'rice')) {
          uniqueGrains.add(foodName);
        }
      });
    });

    return {
      fruits: uniqueFruits.size,
      vegetables: uniqueVegetables.size,
      nuts: uniqueNuts.size,
      legumes: uniqueLegumes.size,
      wholeGrains: uniqueGrains.size,
      total: uniqueFruits.size + uniqueVegetables.size + uniqueNuts.size + uniqueLegumes.size + uniqueGrains.size,
      items: {
        fruits: Array.from(uniqueFruits),
        vegetables: Array.from(uniqueVegetables),
        nuts: Array.from(uniqueNuts),
        legumes: Array.from(uniqueLegumes),
        wholeGrains: Array.from(uniqueGrains),
      }
    };
  };

  // ============================================================================
  // MANUAL ADD FUNCTIONS
  // ============================================================================

  const openManualAddModal = (dateKey: string) => {
    setManualAddDate(dateKey);
    setShowManualAddModal(true);
    loadSavedMeals();
  };

  const loadSavedMeals = async () => {
    if (!userId) return;

    const { data } = await supabase
      .from('saved_meals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (data) {
      setSavedMeals(data);
    }
  };

  const addSavedMealToDate = async (savedMeal: any) => {
    if (!userId || !manualAddDate) return;

    try {
      const mealGroupId = crypto.randomUUID();
      const selectedDateTime = new Date(manualAddDate + 'T12:00:00');
      
      const itemsToInsert = savedMeal.items.map((item: any) => ({
        user_id: userId,
        food_name: item.food_name,
        quantity: item.quantity,
        calories: parseInt(item.calories) || 0,
        protein: parseFloat(item.protein) || 0,
        fat: parseFloat(item.fat) || 0,
        carbs: parseFloat(item.carbs) || 0,
        fiber: parseFloat(item.fiber) || 0,
        sugar: parseFloat(item.sugar) || 0,
        sodium: parseInt(item.sodium) || 0,
        categories: item.categories || [],
        whole_food_ingredients: item.whole_food_ingredients || [],
        meal_type: savedMeal.meal_type,
        meal_group_id: mealGroupId,
        notes: savedMeal.notes || null,
        eating_out: false,
        logged_at: selectedDateTime.toISOString(),
      }));

      const { error } = await supabase
        .from('food_items')
        .insert(itemsToInsert);

      if (error) throw error;

      alert(`✅ Added "${savedMeal.meal_name}"!`);
      setShowManualAddModal(false);
      loadDashboardData();
    } catch (error) {
      console.error('Error adding saved meal:', error);
      alert('Failed to add meal');
    }
  };

  const addCustomMealToDate = async (customMeal: any) => {
    if (!userId || !manualAddDate) return;

    try {
      const mealGroupId = crypto.randomUUID();
      const selectedDateTime = new Date(manualAddDate + 'T12:00:00');
      
      const { error } = await supabase
        .from('food_items')
        .insert({
          user_id: userId,
          food_name: customMeal.food_name,
          quantity: customMeal.quantity,
          calories: customMeal.calories,
          protein: customMeal.protein,
          fat: customMeal.fat,
          carbs: customMeal.carbs,
          fiber: customMeal.fiber,
          sugar: customMeal.sugar,
          sodium: customMeal.sodium,
          meal_type: customMeal.meal_type,
          meal_group_id: mealGroupId,
          notes: customMeal.notes,
          eating_out: customMeal.eating_out,
          categories: [],
          whole_food_ingredients: [],
          logged_at: selectedDateTime.toISOString(),
        });

      if (error) throw error;

      alert(`✅ Added "${customMeal.food_name}"!`);
      setShowManualAddModal(false);
      loadDashboardData();
    } catch (error) {
      console.error('Error adding custom meal:', error);
      alert('Failed to add meal');
    }
  };

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  const loadGoals = async () => {
    if (!userId) return;

    const { data } = await supabase
      .from('user_goals')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (data) {
      setGoals({
        calories: data.override_calories || data.target_calories,
        protein: data.override_protein || data.target_protein,
        fat: data.override_fat || data.target_fat,
        carbs: data.override_carbs || data.target_carbs,
        fiber: data.override_fiber || data.target_fiber,
        sugar: data.sugar_limit || 50,
        sodium: data.sodium_limit || 2300,
        biodiversity: data.biodiversity_target || 5,
      });
    }
  };

  const loadDashboardData = async () => {
    if (!userId) return;
    setIsLoading(true);
    
    try {
      // Calculate date ranges
      const today = new Date();
      const eightDaysAgo = new Date();
      eightDaysAgo.setDate(eightDaysAgo.getDate() - 7);
      const eightDaysStart = new Date(eightDaysAgo.setHours(0, 0, 0, 0)).toISOString();

      const thirtyOneDaysAgo = new Date();
      thirtyOneDaysAgo.setDate(thirtyOneDaysAgo.getDate() - 30);
      const thirtyOneDaysStart = new Date(thirtyOneDaysAgo.setHours(0, 0, 0, 0)).toISOString();

      // Fetch last 7 days
      const { data: sevenDayData, error: sevenError } = await supabase
        .from('food_items')
        .select('*')
        .eq('user_id', userId)
        .gte('logged_at', eightDaysStart)
        .order('logged_at', { ascending: false });

      if (sevenError) throw sevenError;

      // Fetch last 30 days
      const { data: thirtyDayData, error: thirtyError } = await supabase
        .from('food_items')
        .select('*')
        .eq('user_id', userId)
        .gte('logged_at', thirtyOneDaysStart)
        .order('logged_at', { ascending: false });

      if (thirtyError) throw thirtyError;

      // Process 7-day data
      if (sevenDayData) {
        const dateGroups = new Map();
        
        // Group by date
        sevenDayData.forEach(item => {
          const itemDate = new Date(item.logged_at);
          const dateKey = itemDate.toDateString();
          
          if (!dateGroups.has(dateKey)) {
            dateGroups.set(dateKey, {
              date: itemDate,
              dateKey,
              items: [],
              totals: { calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0, sugar: 0, sodium: 0 },
              mealsByType: new Map()
            });
          }
          
          const dayData = dateGroups.get(dateKey);
          dayData.items.push(item);
          
          // Add to totals
          dayData.totals.calories += item.calories || 0;
          dayData.totals.protein += item.protein || 0;
          dayData.totals.fat += item.fat || 0;
          dayData.totals.carbs += item.carbs || 0;
          dayData.totals.fiber += item.fiber || 0;
          dayData.totals.sugar += item.sugar || 0;
          dayData.totals.sodium += item.sodium || 0;

          // Group by meal type
          const mealType = item.meal_type || 'snack';
          if (!dayData.mealsByType.has(mealType)) {
            dayData.mealsByType.set(mealType, {
              meal_type: mealType,
              items: [],
              totals: { calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0, sugar: 0, sodium: 0 },
              earliest_time: item.logged_at
            });
          }
          
          const meal = dayData.mealsByType.get(mealType);
          meal.items.push(item);
          meal.totals.calories += item.calories || 0;
          meal.totals.protein += item.protein || 0;
          meal.totals.fat += item.fat || 0;
          meal.totals.carbs += item.carbs || 0;
          meal.totals.fiber += item.fiber || 0;
          meal.totals.sugar += item.sugar || 0;
          meal.totals.sodium += item.sodium || 0;
          
          if (new Date(item.logged_at) < new Date(meal.earliest_time)) {
            meal.earliest_time = item.logged_at;
          }
        });

        // Sort and structure days
        const sortedDays = Array.from(dateGroups.values())
          .sort((a, b) => b.date.getTime() - a.date.getTime())
          .map(day => {
            const mealOrder = { breakfast: 0, lunch: 1, dinner: 2, snack: 3 };
            const meals = Array.from(day.mealsByType.values())
              .sort((a: any, b: any) => {
                const orderA = mealOrder[a.meal_type as keyof typeof mealOrder] ?? 999;
                const orderB = mealOrder[b.meal_type as keyof typeof mealOrder] ?? 999;
                return orderA - orderB;
              });
            
            return {
              ...day,
              meals,
              biodiversity: calculateBiodiversity(day.items)
            };
          });

        setDailyData(sortedDays);

        // Set today's stats
        if (sortedDays.length > 0) {
          const firstDay = sortedDays[0];
          const isToday = firstDay.dateKey === new Date().toDateString();
          
          if (isToday) {
            setTodayStats({
              calories: firstDay.totals.calories,
              protein: firstDay.totals.protein,
              fat: firstDay.totals.fat,
              carbs: firstDay.totals.carbs,
              fiber: firstDay.totals.fiber,
              sugar: firstDay.totals.sugar,
              sodium: firstDay.totals.sodium,
              meals: firstDay.meals.length
            });
            setTodayBiodiversity(firstDay.biodiversity);
          } else {
            setTodayStats({ calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0, sugar: 0, sodium: 0, meals: 0 });
            setTodayBiodiversity(null);
          }
        }

        // Calculate 7-day averages
        if (sortedDays.length > 0) {
          const sums = sortedDays.reduce(
            (acc, day) => ({
              calories: acc.calories + day.totals.calories,
              protein: acc.protein + day.totals.protein,
              fat: acc.fat + day.totals.fat,
              carbs: acc.carbs + day.totals.carbs,
              fiber: acc.fiber + day.totals.fiber,
              sugar: acc.sugar + day.totals.sugar,
              sodium: acc.sodium + day.totals.sodium,
            }),
            { calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0, sugar: 0, sodium: 0 }
          );

          const numDays = sortedDays.length;
          setSevenDayAvg({
            calories: Math.round(sums.calories / numDays),
            protein: Math.round((sums.protein / numDays) * 10) / 10,
            fat: Math.round((sums.fat / numDays) * 10) / 10,
            carbs: Math.round((sums.carbs / numDays) * 10) / 10,
            fiber: Math.round((sums.fiber / numDays) * 10) / 10,
            sugar: Math.round((sums.sugar / numDays) * 10) / 10,
            sodium: Math.round(sums.sodium / numDays),
          });
        }

        setSevenDayBiodiversity(calculateBiodiversity(sevenDayData));
      }

      // Process 30-day data
      if (thirtyDayData && thirtyDayData.length > 0) {
        const dayTotals = new Map();
        thirtyDayData.forEach(item => {
          const day = new Date(item.logged_at).toDateString();
          if (!dayTotals.has(day)) {
            dayTotals.set(day, { calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0, sugar: 0, sodium: 0 });
          }
          const totals = dayTotals.get(day);
          totals.calories += item.calories || 0;
          totals.protein += item.protein || 0;
          totals.fat += item.fat || 0;
          totals.carbs += item.carbs || 0;
          totals.fiber += item.fiber || 0;
          totals.sugar += item.sugar || 0;
          totals.sodium += item.sodium || 0;
        });

        const numDays = dayTotals.size;
        const sums = Array.from(dayTotals.values()).reduce(
          (acc, day) => ({
            calories: acc.calories + day.calories,
            protein: acc.protein + day.protein,
            fat: acc.fat + day.fat,
            carbs: acc.carbs + day.carbs,
            fiber: acc.fiber + day.fiber,
            sugar: acc.sugar + day.sugar,
            sodium: acc.sodium + day.sodium,
          }),
          { calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0, sugar: 0, sodium: 0 }
        );

        setThirtyDayAvg({
          calories: Math.round(sums.calories / numDays),
          protein: Math.round((sums.protein / numDays) * 10) / 10,
          fat: Math.round((sums.fat / numDays) * 10) / 10,
          carbs: Math.round((sums.carbs / numDays) * 10) / 10,
          fiber: Math.round((sums.fiber / numDays) * 10) / 10,
          sugar: Math.round((sums.sugar / numDays) * 10) / 10,
          sodium: Math.round(sums.sodium / numDays),
        });

        setThirtyDayBiodiversity(calculateBiodiversity(thirtyDayData));
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================================================
  // EFFECTS
  // ============================================================================

  useEffect(() => {
    loadDashboardData();
    loadGoals();
    
    const handleFoodLogged = () => {
      loadDashboardData();
    };
    
    window.addEventListener('foodLogged', handleFoodLogged);
    const interval = setInterval(loadDashboardData, 30000);
    
    return () => {
      window.removeEventListener('foodLogged', handleFoodLogged);
      clearInterval(interval);
    };
  }, [userId]);

  // ============================================================================
  // LOADING STATE
  // ============================================================================

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="space-y-8">
      
      {/* Summary Cards */}
      <SummaryCards
        todayStats={todayStats}
        sevenDayAvg={sevenDayAvg}
        thirtyDayAvg={thirtyDayAvg}
        todayBiodiversity={todayBiodiversity}
        sevenDayBiodiversity={sevenDayBiodiversity}
        thirtyDayBiodiversity={thirtyDayBiodiversity}
        goals={goals}
        expandedBioPeriods={expandedBioPeriods}
        onToggleBioPeriod={toggleBioPeriod}
      />

      {/* Food History */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Food History</h2>
        
        {dailyData.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-8 text-center">
            <div className="text-gray-400 mb-2">No meals logged yet</div>
            <div className="text-sm text-gray-500">
              Click "Food Log" in the menu to add your first meal
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {dailyData.map((day, dayIndex) => {
              const dayKey = dayIndex === 0 ? 'today' : day.dateKey;
              const isExpanded = expandedDays.has(dayKey);
              const dayExpandedMeals = expandedMeals.get(dayKey) || new Set();

              return (
                <DayCard
                  key={day.dateKey}
                  day={day}
                  dayKey={dayKey}
                  isExpanded={isExpanded}
                  onToggleDay={() => toggleDay(dayKey)}
                  onEditItem={handleEditItem}
                  onDeleteItem={handleDeleteItem}
                  onManualAdd={openManualAddModal}
                  expandedMeals={dayExpandedMeals}
                  onToggleMeal={(mealType) => toggleMeal(dayKey, mealType)}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Manual Add Modal */}

        <ManualAddModal
        isOpen={showManualAddModal}
        onClose={() => setShowManualAddModal(false)}
        savedMeals={savedMeals}
        onAddMeal={addSavedMealToDate}
        onAddCustomMeal={addCustomMealToDate}
        dateKey={manualAddDate}
      />
    </div>

  );
}