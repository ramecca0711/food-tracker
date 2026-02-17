'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function DashboardView({ userId }: { userId: string | null }) {
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

  const [goals, setGoals] = useState<any>(null);
  const [todayBiodiversity, setTodayBiodiversity] = useState<any>(null);
  const [sevenDayBiodiversity, setSevenDayBiodiversity] = useState<any>(null);
  const [thirtyDayBiodiversity, setThirtyDayBiodiversity] = useState<any>(null);
  const [expandedBioPeriods, setExpandedBioPeriods] = useState<Set<string>>(new Set());

  const [dailyData, setDailyData] = useState<any[]>([]);
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [expandedMeals, setExpandedMeals] = useState<Map<string, Set<string>>>(new Map());
  const [expandedBiodiversity, setExpandedBiodiversity] = useState<Set<string>>(new Set());
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);

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

  const toggleBiodiversity = (dayKey: string) => {
    const newExpanded = new Set(expandedBiodiversity);
    if (newExpanded.has(dayKey)) {
      newExpanded.delete(dayKey);
    } else {
      newExpanded.add(dayKey);
    }
    setExpandedBiodiversity(newExpanded);
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

  const startEdit = (itemId: string, item: any) => {
    setEditingItem(itemId);
    setEditValues({
      food_name: item.food_name,
      quantity: item.quantity,
      calories: item.calories,
      protein: item.protein,
      fat: item.fat,
      carbs: item.carbs,
      fiber: item.fiber,
      sugar: item.sugar,
      sodium: item.sodium,
    });
  };

  const cancelEdit = () => {
    setEditingItem(null);
    setEditValues({});
  };

  const saveEdit = async (itemId: string) => {
    if (!userId) return;

    try {
      const { error } = await supabase
        .from('food_items')
        .update({
          food_name: editValues.food_name,
          quantity: editValues.quantity,
          calories: parseInt(editValues.calories) || 0,
          protein: parseFloat(editValues.protein) || 0,
          fat: parseFloat(editValues.fat) || 0,
          carbs: parseFloat(editValues.carbs) || 0,
          fiber: parseFloat(editValues.fiber) || 0,
          sugar: parseFloat(editValues.sugar) || 0,
          sodium: parseInt(editValues.sodium) || 0,
        })
        .eq('id', itemId)
        .eq('user_id', userId);

      if (error) throw error;

      setEditingItem(null);
      setEditValues({});
      loadDashboardData();
    } catch (error) {
      console.error('Error updating item:', error);
      alert('Failed to update item');
    }
  };

  const calculateBiodiversity = (items: any[]) => {
    const uniqueFruits = new Set();
    const uniqueVegetables = new Set();
    const uniqueNuts = new Set();
    const uniqueLegumes = new Set();
    const uniqueGrains = new Set();
    
    items.forEach(item => {
      const categories = item.categories || [];
      const foodName = item.food_name.toLowerCase();
      
      categories.forEach((cat: string) => {
        if (cat === 'fruit') uniqueFruits.add(foodName);
        if (cat === 'vegetable') uniqueVegetables.add(foodName);
        if (cat === 'fat' && (foodName.includes('nut') || foodName.includes('almond') || foodName.includes('walnut') || foodName.includes('cashew') || foodName.includes('peanut'))) {
          uniqueNuts.add(foodName);
        }
      });
      
      if (foodName.includes('bean') || foodName.includes('lentil') || foodName.includes('chickpea')) {
        uniqueLegumes.add(foodName);
      }
      if (categories.includes('grain') && (foodName.includes('whole') || foodName.includes('brown rice') || foodName.includes('quinoa') || foodName.includes('oat'))) {
        uniqueGrains.add(foodName);
      }
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

  const getProgressColor = (actual: number, target: number, metric: 'calories' | 'macro' | 'fiber') => {
    if (!target) return 'text-gray-400';
    
    const percentage = (actual / target) * 100;
    
    if (metric === 'fiber') {
      if (percentage >= 100) return 'text-green-600';
      if (percentage >= 80) return 'text-yellow-600';
      return 'text-red-600';
    }
    
    if (percentage >= 90 && percentage <= 110) return 'text-green-600';
    if (percentage >= 80 && percentage <= 120) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getProgressColorInverse = (actual: number, target: number) => {
    if (!target) return 'text-gray-400';
    
    const percentage = (actual / target) * 100;
    
    if (percentage <= 100) return 'text-green-600';
    if (percentage <= 120) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatProgress = (actual: number, target: number) => {
    if (!target) return '';
    const percentage = (actual / target) * 100;
    return `${Math.round(percentage)}%`;
  };

  const loadGoals = async () => {
    if (!userId) return;

    const { data, error } = await supabase
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
      const today = new Date();
      const todayStart = new Date(today.setHours(0, 0, 0, 0)).toISOString();
      const todayEnd = new Date(today.setHours(23, 59, 59, 999)).toISOString();

      const eightDaysAgo = new Date();
      eightDaysAgo.setDate(eightDaysAgo.getDate() - 7);
      const eightDaysStart = new Date(eightDaysAgo.setHours(0, 0, 0, 0)).toISOString();

      const thirtyOneDaysAgo = new Date();
      thirtyOneDaysAgo.setDate(thirtyOneDaysAgo.getDate() - 30);
      const thirtyOneDaysStart = new Date(thirtyOneDaysAgo.setHours(0, 0, 0, 0)).toISOString();

      const { data: sevenDayData, error: sevenError } = await supabase
        .from('food_items')
        .select('*')
        .eq('user_id', userId)
        .gte('logged_at', eightDaysStart)
        .order('logged_at', { ascending: false });

      if (sevenError) throw sevenError;

      const { data: thirtyDayData, error: thirtyError } = await supabase
        .from('food_items')
        .select('*')
        .eq('user_id', userId)
        .gte('logged_at', thirtyOneDaysStart)
        .order('logged_at', { ascending: false });

      if (thirtyError) throw thirtyError;

      if (sevenDayData) {
        const dateGroups = new Map();
        
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
          dayData.totals.calories += item.calories || 0;
          dayData.totals.protein += item.protein || 0;
          dayData.totals.fat += item.fat || 0;
          dayData.totals.carbs += item.carbs || 0;
          dayData.totals.fiber += item.fiber || 0;
          dayData.totals.sugar += item.sugar || 0;
          dayData.totals.sodium += item.sodium || 0;

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

        const sortedDays = Array.from(dateGroups.values())
          .sort((a, b) => b.date.getTime() - a.date.getTime())
          .map(day => {
            const mealOrder = { breakfast: 0, lunch: 1, dinner: 2, snack: 3 };
            const meals = Array.from(day.mealsByType.values())
              .sort((a, b) => {
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  const formatMealType = (type: string) => {
    const emoji = {
      breakfast: '🌅',
      lunch: '🌞',
      dinner: '🌙',
      snack: '🍎'
    }[type] || '🍽️';
    return `${emoji} ${type.charAt(0).toUpperCase() + type.slice(1)}`;
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (date: Date, includeYear = false) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        ...(includeYear && { year: 'numeric' })
      });
    }
  };

  return (
    <div className="space-y-8">
      {/* Today vs 7-Day vs 30-Day Average with Goal Progress */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Today */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-gray-500">Today</div>
            {goals && (
              <div className="text-xs font-medium text-gray-400">vs Goal</div>
            )}
          </div>
          <div className="text-5xl font-bold text-gray-900 mb-1">
            {todayStats.calories.toLocaleString()}
          </div>
          {goals && (
            <div className={`text-sm font-semibold mb-2 ${getProgressColor(todayStats.calories, goals.calories, 'calories')}`}>
              {formatProgress(todayStats.calories, goals.calories)} of {goals.calories} cal
            </div>
          )}
          {!goals && <div className="text-gray-500 mb-4">calories</div>}
          
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-100">
            <div>
              <div className="text-xs text-gray-500 mb-1">Protein</div>
              <div className="text-xl font-semibold text-gray-900">
                {Math.round(todayStats.protein)}g
              </div>
              {goals && (
                <div className={`text-xs font-medium mt-1 ${getProgressColor(todayStats.protein, goals.protein, 'macro')}`}>
                  {formatProgress(todayStats.protein, goals.protein)}
                </div>
              )}
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Fat</div>
              <div className="text-xl font-semibold text-gray-900">
                {Math.round(todayStats.fat)}g
              </div>
              {goals && (
                <div className={`text-xs font-medium mt-1 ${getProgressColor(todayStats.fat, goals.fat, 'macro')}`}>
                  {formatProgress(todayStats.fat, goals.fat)}
                </div>
              )}
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Carbs</div>
              <div className="text-xl font-semibold text-gray-900">
                {Math.round(todayStats.carbs)}g
              </div>
              {goals && (
                <div className={`text-xs font-medium mt-1 ${getProgressColor(todayStats.carbs, goals.carbs, 'macro')}`}>
                  {formatProgress(todayStats.carbs, goals.carbs)}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-3 text-sm">
            <div>
              <div className="text-xs text-gray-500 mb-0.5">Fiber</div>
              <div className="font-semibold text-gray-700">
                {Math.round(todayStats.fiber)}g
              </div>
              {goals && (
                <div className={`text-xs font-medium mt-0.5 ${getProgressColor(todayStats.fiber, goals.fiber, 'fiber')}`}>
                  {formatProgress(todayStats.fiber, goals.fiber)}
                </div>
              )}
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-0.5">Sugar</div>
              <div className="font-semibold text-gray-700">
                {Math.round(todayStats.sugar)}g
              </div>
              {goals && (
                <div className={`text-xs font-medium mt-0.5 ${getProgressColorInverse(todayStats.sugar, goals.sugar)}`}>
                  {formatProgress(todayStats.sugar, goals.sugar)}
                </div>
              )}
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-0.5">Sodium</div>
              <div className="font-semibold text-gray-700">
                {todayStats.sodium}mg
              </div>
              {goals && (
                <div className={`text-xs font-medium mt-0.5 ${getProgressColorInverse(todayStats.sodium, goals.sodium)}`}>
                  {formatProgress(todayStats.sodium, goals.sodium)}
                </div>
              )}
            </div>
          </div>

          {/* Today's Biodiversity */}
          {todayBiodiversity && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <button
                onClick={() => toggleBioPeriod('today')}
                className="w-full flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">🌱</span>
                  <span className="text-xs font-medium text-gray-800">
                    Biodiversity
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-900">
                    {todayBiodiversity.total} unique foods
                  </span>
                  {goals && (
                    <span className={`text-xs font-medium ${getProgressColor(todayBiodiversity.total, goals.biodiversity, 'fiber')}`}>
                      {formatProgress(todayBiodiversity.total, goals.biodiversity)}
                    </span>
                  )}
                  <svg
                    className={`w-3 h-3 text-gray-700 transition-transform ${
                      expandedBioPeriods.has('today') ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {expandedBioPeriods.has('today') && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <div className="text-gray-700 font-medium mb-0.5">🍎 Fruits: {todayBiodiversity.fruits}</div>
                      {todayBiodiversity.items.fruits.length > 0 && (
                        <div className="text-gray-600 text-xs">
                          {todayBiodiversity.items.fruits.slice(0, 2).join(', ')}
                          {todayBiodiversity.items.fruits.length > 2 && '...'}
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="text-gray-700 font-medium mb-0.5">🥦 Veg: {todayBiodiversity.vegetables}</div>
                      {todayBiodiversity.items.vegetables.length > 0 && (
                        <div className="text-gray-600 text-xs">
                          {todayBiodiversity.items.vegetables.slice(0, 2).join(', ')}
                          {todayBiodiversity.items.vegetables.length > 2 && '...'}
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="text-gray-700 font-medium mb-0.5">🥜 Nuts: {todayBiodiversity.nuts}</div>
                    </div>
                    <div>
                      <div className="text-gray-700 font-medium mb-0.5">🫘 Legumes: {todayBiodiversity.legumes}</div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-gray-700 font-medium mb-0.5">🌾 Grains: {todayBiodiversity.wholeGrains}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 7-Day Average with Biodiversity */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-blue-600">7-Day Average</div>
            {goals && (
              <div className="text-xs font-medium text-blue-500">vs Goal</div>
            )}
          </div>
          <div className="text-5xl font-bold text-blue-900 mb-1">
            {sevenDayAvg.calories.toLocaleString()}
          </div>
          {goals && (
            <div className={`text-sm font-semibold mb-2 ${getProgressColor(sevenDayAvg.calories, goals.calories, 'calories').replace('text-', 'text-blue-').replace('600', '700')}`}>
              {formatProgress(sevenDayAvg.calories, goals.calories)} of {goals.calories} cal
            </div>
          )}
          {!goals && <div className="text-blue-600 mb-4">calories/day</div>}
          
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-blue-200/50">
            <div>
              <div className="text-xs text-blue-600 mb-1">Protein</div>
              <div className="text-xl font-semibold text-blue-900">
                {sevenDayAvg.protein}g
              </div>
              {goals && (
                <div className={`text-xs font-medium mt-1 ${getProgressColor(sevenDayAvg.protein, goals.protein, 'macro').replace('text-', 'text-blue-').replace('600', '700')}`}>
                  {formatProgress(sevenDayAvg.protein, goals.protein)}
                </div>
              )}
            </div>
            <div>
              <div className="text-xs text-blue-600 mb-1">Fat</div>
              <div className="text-xl font-semibold text-blue-900">
                {sevenDayAvg.fat}g
              </div>
              {goals && (
                <div className={`text-xs font-medium mt-1 ${getProgressColor(sevenDayAvg.fat, goals.fat, 'macro').replace('text-', 'text-blue-').replace('600', '700')}`}>
                  {formatProgress(sevenDayAvg.fat, goals.fat)}
                </div>
              )}
            </div>
            <div>
              <div className="text-xs text-blue-600 mb-1">Carbs</div>
              <div className="text-xl font-semibold text-blue-900">
                {sevenDayAvg.carbs}g
              </div>
              {goals && (
                <div className={`text-xs font-medium mt-1 ${getProgressColor(sevenDayAvg.carbs, goals.carbs, 'macro').replace('text-', 'text-blue-').replace('600', '700')}`}>
                  {formatProgress(sevenDayAvg.carbs, goals.carbs)}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-3 text-sm">
            <div>
              <div className="text-xs text-blue-600 mb-0.5">Fiber</div>
              <div className="font-semibold text-blue-800">
                {sevenDayAvg.fiber}g
              </div>
              {goals && (
                <div className={`text-xs font-medium mt-0.5 ${getProgressColor(sevenDayAvg.fiber, goals.fiber, 'fiber').replace('text-', 'text-blue-').replace('600', '700')}`}>
                  {formatProgress(sevenDayAvg.fiber, goals.fiber)}
                </div>
              )}
            </div>
            <div>
              <div className="text-xs text-blue-600 mb-0.5">Sugar</div>
              <div className="font-semibold text-blue-800">
                {sevenDayAvg.sugar}g
              </div>
              {goals && (
                <div className={`text-xs font-medium mt-0.5 ${getProgressColorInverse(sevenDayAvg.sugar, goals.sugar).replace('text-', 'text-blue-').replace('600', '700')}`}>
                  {formatProgress(sevenDayAvg.sugar, goals.sugar)}
                </div>
              )}
            </div>
            <div>
              <div className="text-xs text-blue-600 mb-0.5">Sodium</div>
              <div className="font-semibold text-blue-800">
                {sevenDayAvg.sodium}mg
              </div>
              {goals && (
                <div className={`text-xs font-medium mt-0.5 ${getProgressColorInverse(sevenDayAvg.sodium, goals.sodium).replace('text-', 'text-blue-').replace('600', '700')}`}>
                  {formatProgress(sevenDayAvg.sodium, goals.sodium)}
                </div>
              )}
            </div>
          </div>

          {sevenDayBiodiversity && (
            <div className="mt-4 pt-4 border-t border-blue-200/50">
              <button
                onClick={() => toggleBioPeriod('7day')}
                className="w-full flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">🌱</span>
                  <span className="text-xs font-medium text-blue-800">
                    Biodiversity
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-blue-900">
                    {sevenDayBiodiversity.total} unique foods
                  </span>
                  <svg
                    className={`w-3 h-3 text-blue-700 transition-transform ${
                      expandedBioPeriods.has('7day') ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {expandedBioPeriods.has('7day') && (
                <div className="mt-3 p-3 bg-white/60 backdrop-blur rounded-lg">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <div className="text-blue-700 font-medium mb-0.5">🍎 Fruits: {sevenDayBiodiversity.fruits}</div>
                      {sevenDayBiodiversity.items.fruits.length > 0 && (
                        <div className="text-blue-600 text-xs">
                          {sevenDayBiodiversity.items.fruits.slice(0, 2).join(', ')}
                          {sevenDayBiodiversity.items.fruits.length > 2 && '...'}
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="text-blue-700 font-medium mb-0.5">🥦 Veg: {sevenDayBiodiversity.vegetables}</div>
                      {sevenDayBiodiversity.items.vegetables.length > 0 && (
                        <div className="text-blue-600 text-xs">
                          {sevenDayBiodiversity.items.vegetables.slice(0, 2).join(', ')}
                          {sevenDayBiodiversity.items.vegetables.length > 2 && '...'}
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="text-blue-700 font-medium mb-0.5">🥜 Nuts: {sevenDayBiodiversity.nuts}</div>
                    </div>
                    <div>
                      <div className="text-blue-700 font-medium mb-0.5">🫘 Legumes: {sevenDayBiodiversity.legumes}</div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-blue-700 font-medium mb-0.5">🌾 Grains: {sevenDayBiodiversity.wholeGrains}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 30-Day Average with Biodiversity */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-purple-600">30-Day Average</div>
            {goals && (
              <div className="text-xs font-medium text-purple-500">vs Goal</div>
            )}
          </div>
          <div className="text-5xl font-bold text-purple-900 mb-1">
            {thirtyDayAvg.calories.toLocaleString()}
          </div>
          {goals && (
            <div className={`text-sm font-semibold mb-2 ${getProgressColor(thirtyDayAvg.calories, goals.calories, 'calories').replace('text-', 'text-purple-').replace('600', '700')}`}>
              {formatProgress(thirtyDayAvg.calories, goals.calories)} of {goals.calories} cal
            </div>
          )}
          {!goals && <div className="text-purple-600 mb-4">calories/day</div>}
          
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-purple-200/50">
            <div>
              <div className="text-xs text-purple-600 mb-1">Protein</div>
              <div className="text-xl font-semibold text-purple-900">
                {thirtyDayAvg.protein}g
              </div>
              {goals && (
                <div className={`text-xs font-medium mt-1 ${getProgressColor(thirtyDayAvg.protein, goals.protein, 'macro').replace('text-', 'text-purple-').replace('600', '700')}`}>
                  {formatProgress(thirtyDayAvg.protein, goals.protein)}
                </div>
              )}
            </div>
            <div>
              <div className="text-xs text-purple-600 mb-1">Fat</div>
              <div className="text-xl font-semibold text-purple-900">
                {thirtyDayAvg.fat}g
              </div>
              {goals && (
                <div className={`text-xs font-medium mt-1 ${getProgressColor(thirtyDayAvg.fat, goals.fat, 'macro').replace('text-', 'text-purple-').replace('600', '700')}`}>
                  {formatProgress(thirtyDayAvg.fat, goals.fat)}
                </div>
              )}
            </div>
            <div>
              <div className="text-xs text-purple-600 mb-1">Carbs</div>
              <div className="text-xl font-semibold text-purple-900">
                {thirtyDayAvg.carbs}g
              </div>
              {goals && (
                <div className={`text-xs font-medium mt-1 ${getProgressColor(thirtyDayAvg.carbs, goals.carbs, 'macro').replace('text-', 'text-purple-').replace('600', '700')}`}>
                  {formatProgress(thirtyDayAvg.carbs, goals.carbs)}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-3 text-sm">
            <div>
              <div className="text-xs text-purple-600 mb-0.5">Fiber</div>
              <div className="font-semibold text-purple-800">
                {thirtyDayAvg.fiber}g
              </div>
              {goals && (
                <div className={`text-xs font-medium mt-0.5 ${getProgressColor(thirtyDayAvg.fiber, goals.fiber, 'fiber').replace('text-', 'text-purple-').replace('600', '700')}`}>
                  {formatProgress(thirtyDayAvg.fiber, goals.fiber)}
                </div>
              )}
            </div>
            <div>
              <div className="text-xs text-purple-600 mb-0.5">Sugar</div>
              <div className="font-semibold text-purple-800">
                {thirtyDayAvg.sugar}g
              </div>
              {goals && (
                <div className={`text-xs font-medium mt-0.5 ${getProgressColorInverse(thirtyDayAvg.sugar, goals.sugar).replace('text-', 'text-purple-').replace('600', '700')}`}>
                  {formatProgress(thirtyDayAvg.sugar, goals.sugar)}
                </div>
              )}
            </div>
            <div>
              <div className="text-xs text-purple-600 mb-0.5">Sodium</div>
              <div className="font-semibold text-purple-800">
                {thirtyDayAvg.sodium}mg
              </div>
              {goals && (
                <div className={`text-xs font-medium mt-0.5 ${getProgressColorInverse(thirtyDayAvg.sodium, goals.sodium).replace('text-', 'text-purple-').replace('600', '700')}`}>
                  {formatProgress(thirtyDayAvg.sodium, goals.sodium)}
                </div>
              )}
            </div>
          </div>

          {thirtyDayBiodiversity && (
            <div className="mt-4 pt-4 border-t border-purple-200/50">
              <button
                onClick={() => toggleBioPeriod('30day')}
                className="w-full flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">🌳</span>
                  <span className="text-xs font-medium text-purple-800">
                    Biodiversity
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-purple-900">
                    {thirtyDayBiodiversity.total} unique foods
                  </span>
                  <svg
                    className={`w-3 h-3 text-purple-700 transition-transform ${
                      expandedBioPeriods.has('30day') ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {expandedBioPeriods.has('30day') && (
                <div className="mt-3 p-3 bg-white/60 backdrop-blur rounded-lg">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <div className="text-purple-700 font-medium mb-0.5">🍎 Fruits: {thirtyDayBiodiversity.fruits}</div>
                      {thirtyDayBiodiversity.items.fruits.length > 0 && (
                        <div className="text-purple-600 text-xs">
                          {thirtyDayBiodiversity.items.fruits.slice(0, 2).join(', ')}
                          {thirtyDayBiodiversity.items.fruits.length > 2 && '...'}
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="text-purple-700 font-medium mb-0.5">🥦 Veg: {thirtyDayBiodiversity.vegetables}</div>
                      {thirtyDayBiodiversity.items.vegetables.length > 0 && (
                        <div className="text-purple-600 text-xs">
                          {thirtyDayBiodiversity.items.vegetables.slice(0, 2).join(', ')}
                          {thirtyDayBiodiversity.items.vegetables.length > 2 && '...'}
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="text-purple-700 font-medium mb-0.5">🥜 Nuts: {thirtyDayBiodiversity.nuts}</div>
                    </div>
                    <div>
                      <div className="text-purple-700 font-medium mb-0.5">🫘 Legumes: {thirtyDayBiodiversity.legumes}</div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-purple-700 font-medium mb-0.5">🌾 Grains: {thirtyDayBiodiversity.wholeGrains}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Daily History */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Food History</h2>
        
        {dailyData.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-8 text-center">
            <div className="text-gray-400 mb-2">No meals logged yet</div>
            <div className="text-sm text-gray-500">
              Click "Log Food" above to add your first meal
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {dailyData.map((day, dayIndex) => {
              const dayKey = dayIndex === 0 ? 'today' : day.dateKey;
              const isExpanded = expandedDays.has(dayKey);
              const isBioExpanded = expandedBiodiversity.has(dayKey);
              const isToday = day.dateKey === new Date().toDateString();

              return (
                <div
                  key={day.dateKey}
                  className="bg-white border border-gray-200 rounded-xl overflow-hidden"
                >
                  <button
                    onClick={() => toggleDay(dayKey)}
                    className="w-full px-5 py-4 text-left hover:bg-gray-50 transition-colors flex items-center justify-between"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className="font-semibold text-gray-900">
                          {formatDate(day.date)}
                        </div>
                        {isToday && (
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded">
                            Today
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        {new Date(day.date).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </div>
                    </div>
                    <div className="text-right mr-4">
                      <div className="font-semibold text-gray-900">
                        {day.totals.calories} cal
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {day.meals.length} {day.meals.length === 1 ? 'meal' : 'meals'}
                      </div>
                    </div>
                    <svg
                      className={`w-5 h-5 text-gray-400 transition-transform ${
                        isExpanded ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-gray-200 bg-gray-50 p-4">
                      <div className="mb-4 p-3 bg-white rounded-lg border border-gray-200">
                        <div className="text-xs font-medium text-gray-500 mb-2">Daily Totals</div>
                        <div className="grid grid-cols-4 gap-3 text-sm mb-2">
                          <div>
                            <div className="text-gray-600">Calories</div>
                            <div className="font-semibold text-gray-900">{day.totals.calories}</div>
                          </div>
                          <div>
                            <div className="text-gray-600">Protein</div>
                            <div className="font-semibold text-gray-900">{Math.round(day.totals.protein)}g</div>
                          </div>
                          <div>
                            <div className="text-gray-600">Fat</div>
                            <div className="font-semibold text-gray-900">{Math.round(day.totals.fat)}g</div>
                          </div>
                          <div>
                            <div className="text-gray-600">Carbs</div>
                            <div className="font-semibold text-gray-900">{Math.round(day.totals.carbs)}g</div>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3 text-xs pt-2 border-t border-gray-100">
                          <div>
                            <div className="text-gray-500">Fiber</div>
                            <div className="font-medium text-gray-700">{Math.round(day.totals.fiber)}g</div>
                          </div>
                          <div>
                            <div className="text-gray-500">Sugar</div>
                            <div className="font-medium text-gray-700">{Math.round(day.totals.sugar)}g</div>
                          </div>
                          <div>
                            <div className="text-gray-500">Sodium</div>
                            <div className="font-medium text-gray-700">{day.totals.sodium}mg</div>
                          </div>
                        </div>
                      </div>

                      <div className="mb-4">
                        <button
                          onClick={() => toggleBiodiversity(dayKey)}
                          className="w-full p-3 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-xl">🌱</span>
                            <span className="text-sm font-medium text-green-900">
                              Biodiversity Score
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-semibold text-green-700">
                              {day.biodiversity.total} unique whole foods
                            </span>
                            <svg
                              className={`w-4 h-4 text-green-600 transition-transform ${
                                isBioExpanded ? 'rotate-180' : ''
                              }`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </button>

                        {isBioExpanded && (
                          <div className="mt-2 p-3 bg-white border border-green-200 rounded-lg">
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div>
                                <div className="text-gray-600 mb-1">🍎 Fruits</div>
                                <div className="font-semibold text-gray-900 mb-1">{day.biodiversity.fruits}</div>
                                {day.biodiversity.items.fruits.length > 0 && (
                                  <div className="text-xs text-gray-500">
                                    {day.biodiversity.items.fruits.slice(0, 3).join(', ')}
                                    {day.biodiversity.items.fruits.length > 3 && '...'}
                                  </div>
                                )}
                              </div>
                              <div>
                                <div className="text-gray-600 mb-1">🥦 Vegetables</div>
                                <div className="font-semibold text-gray-900 mb-1">{day.biodiversity.vegetables}</div>
                                {day.biodiversity.items.vegetables.length > 0 && (
                                  <div className="text-xs text-gray-500">
                                    {day.biodiversity.items.vegetables.slice(0, 3).join(', ')}
                                    {day.biodiversity.items.vegetables.length > 3 && '...'}
                                  </div>
                                )}
                              </div>
                              <div>
                                <div className="text-gray-600 mb-1">🥜 Nuts & Seeds</div>
                                <div className="font-semibold text-gray-900 mb-1">{day.biodiversity.nuts}</div>
                                {day.biodiversity.items.nuts.length > 0 && (
                                  <div className="text-xs text-gray-500">
                                    {day.biodiversity.items.nuts.slice(0, 3).join(', ')}
                                  </div>
                                )}
                              </div>
                              <div>
                                <div className="text-gray-600 mb-1">🫘 Legumes</div>
                                <div className="font-semibold text-gray-900 mb-1">{day.biodiversity.legumes}</div>
                                {day.biodiversity.items.legumes.length > 0 && (
                                  <div className="text-xs text-gray-500">
                                    {day.biodiversity.items.legumes.slice(0, 3).join(', ')}
                                  </div>
                                )}
                              </div>
                              <div className="col-span-2">
                                <div className="text-gray-600 mb-1">🌾 Whole Grains</div>
                                <div className="font-semibold text-gray-900 mb-1">{day.biodiversity.wholeGrains}</div>
                                {day.biodiversity.items.wholeGrains.length > 0 && (
                                  <div className="text-xs text-gray-500">
                                    {day.biodiversity.items.wholeGrains.slice(0, 3).join(', ')}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        {day.meals.map((meal: any) => {
                          const isMealExpanded = expandedMeals.get(dayKey)?.has(meal.meal_type);
                          
                          return (
                            <div
                              key={meal.meal_type}
                              className="bg-white border border-gray-200 rounded-lg overflow-hidden"
                            >
                              <button
                                onClick={() => toggleMeal(dayKey, meal.meal_type)}
                                className="w-full p-3 text-left hover:bg-gray-50 transition-colors flex items-center justify-between"
                              >
                                <div className="flex-1">
                                  <div className="font-medium text-gray-900 text-sm">
                                    {formatMealType(meal.meal_type)}
                                  </div>
                                  <div className="text-xs text-gray-500 mt-0.5">
                                    {formatTime(meal.earliest_time)} · {meal.items.length} items
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <div className="text-right">
                                    <div className="font-semibold text-gray-900 text-sm">
                                      {meal.totals.calories} cal
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      P: {Math.round(meal.totals.protein)}g · 
                                      F: {Math.round(meal.totals.fat)}g · 
                                      C: {Math.round(meal.totals.carbs)}g
                                    </div>
                                  </div>
                                  <svg
                                    className={`w-4 h-4 text-gray-400 transition-transform ${
                                      isMealExpanded ? 'rotate-180' : ''
                                    }`}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                  </svg>
                                </div>
                              </button>

                              {isMealExpanded && (
                                <div className="px-3 pb-3 space-y-1.5 border-t border-gray-100">
                                  {meal.items.map((item: any, idx: number) => {
                                    const isEditing = editingItem === item.id;
                                    
                                    return (
                                      <div
                                        key={idx}
                                        className="py-2 px-3 bg-gray-50 rounded-lg border border-gray-100"
                                      >
                                        {isEditing ? (
                                          <div className="space-y-2">
                                            <div className="grid grid-cols-2 gap-2">
                                              <input
                                                type="text"
                                                value={editValues.food_name}
                                                onChange={(e) => setEditValues({...editValues, food_name: e.target.value})}
                                                className="px-2 py-1 text-sm border border-gray-300 rounded"
                                                placeholder="Food name"
                                              />
                                              <input
                                                type="text"
                                                value={editValues.quantity}
                                                onChange={(e) => setEditValues({...editValues, quantity: e.target.value})}
                                                className="px-2 py-1 text-sm border border-gray-300 rounded"
                                                placeholder="Quantity"
                                              />
                                            </div>
                                            <div className="grid grid-cols-4 gap-2">
                                              <input
                                                type="number"
                                                value={editValues.calories}
                                                onChange={(e) => setEditValues({...editValues, calories: e.target.value})}
                                                className="px-2 py-1 text-xs border border-gray-300 rounded"
                                                placeholder="Cal"
                                              />
                                              <input
                                                type="number"
                                                step="0.1"
                                                value={editValues.protein}
                                                onChange={(e) => setEditValues({...editValues, protein: e.target.value})}
                                                className="px-2 py-1 text-xs border border-gray-300 rounded"
                                                placeholder="P"
                                              />
                                              <input
                                                type="number"
                                                step="0.1"
                                                value={editValues.fat}
                                                onChange={(e) => setEditValues({...editValues, fat: e.target.value})}
                                                className="px-2 py-1 text-xs border border-gray-300 rounded"
                                                placeholder="F"
                                              />
                                              <input
                                                type="number"
                                                step="0.1"
                                                value={editValues.carbs}
                                                onChange={(e) => setEditValues({...editValues, carbs: e.target.value})}
                                                className="px-2 py-1 text-xs border border-gray-300 rounded"
                                                placeholder="C"
                                              />
                                            </div>
                                            <div className="flex gap-2">
                                              <button
                                                onClick={() => saveEdit(item.id)}
                                                className="flex-1 px-3 py-1.5 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                                              >
                                                Save
                                              </button>
                                              <button
                                                onClick={cancelEdit}
                                                className="flex-1 px-3 py-1.5 bg-gray-300 text-gray-700 text-xs rounded hover:bg-gray-400"
                                              >
                                                Cancel
                                              </button>
                                            </div>
                                          </div>
                                        ) : (
                                          <>
                                            <div className="flex items-start justify-between mb-1.5">
                                              <div className="flex-1">
                                                <span className="text-sm text-gray-900 font-medium">
                                                  {item.food_name}
                                                </span>
                                                <span className="text-xs text-gray-500 ml-2">
                                                  {item.quantity}
                                                </span>
                                              </div>
                                              <div className="flex items-center gap-2">
                                                <div className="text-sm font-semibold text-gray-900">
                                                  {item.calories} cal
                                                </div>
                                                <button
                                                  onClick={() => startEdit(item.id, item)}
                                                  className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded"
                                                  title="Edit"
                                                >
                                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                  </svg>
                                                </button>
                                              </div>
                                            </div>
                                            
                                            <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-600">
                                              <span>
                                                <span className="font-medium text-gray-700">P:</span> {item.protein}g
                                              </span>
                                              <span>
                                                <span className="font-medium text-gray-700">F:</span> {item.fat}g
                                              </span>
                                              <span>
                                                <span className="font-medium text-gray-700">C:</span> {item.carbs}g
                                              </span>
                                              {item.fiber > 0 && (
                                                <span>
                                                  <span className="font-medium text-gray-700">Fiber:</span> {item.fiber}g
                                                </span>
                                              )}
                                              {item.sugar > 0 && (
                                                <span>
                                                  <span className="font-medium text-gray-700">Sugar:</span> {item.sugar}g
                                                </span>
                                              )}
                                              {item.sodium > 0 && (
                                                <span>
                                                  <span className="font-medium text-gray-700">Sodium:</span> {item.sodium}mg
                                                </span>
                                              )}
                                            </div>

                                            {item.categories && item.categories.length > 0 && (
                                              <div className="flex gap-1.5 flex-wrap mt-2">
                                                {item.categories.map((cat: string, i: number) => (
                                                  <span
                                                    key={i}
                                                    className="px-1.5 py-0.5 bg-white border border-gray-200 text-gray-600 text-xs rounded"
                                                  >
                                                    {cat}
                                                  </span>
                                                ))}
                                              </div>
                                            )}
                                          </>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}