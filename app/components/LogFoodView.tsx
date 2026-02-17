'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function LogFoodView({ userId }: { userId: string | null }) {
  const [foodInput, setFoodInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [parsedData, setParsedData] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [editingMeals, setEditingMeals] = useState<any[]>([]);
  const [expandedItems, setExpandedItems] = useState<Map<string, Set<number>>>(new Map());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!foodInput.trim()) return;
    
    setIsLoading(true);
    setParsedData(null);
    
    try {
      const response = await fetch('/api/parse-food', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ foodDescription: foodInput }),
      });

      if (!response.ok) throw new Error('Failed to parse food');

      const data = await response.json();
      setParsedData(data);
      setEditingMeals(data.meals || []);
      setExpandedItems(new Map());
      console.log('Parsed:', data);
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to parse food. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleExpand = (mealIndex: number, itemIndex: number) => {
    const newExpanded = new Map(expandedItems);
    const key = `${mealIndex}`;
    
    if (!newExpanded.has(key)) {
      newExpanded.set(key, new Set());
    }
    
    const mealExpanded = newExpanded.get(key)!;
    if (mealExpanded.has(itemIndex)) {
      mealExpanded.delete(itemIndex);
    } else {
      mealExpanded.add(itemIndex);
    }
    
    setExpandedItems(newExpanded);
  };

  const handleMealTypeChange = (mealIndex: number, newType: 'breakfast' | 'lunch' | 'dinner' | 'snack') => {
    const updated = [...editingMeals];
    updated[mealIndex].meal_type = newType;
    setEditingMeals(updated);
  };

  const handleItemEdit = (mealIndex: number, itemIndex: number, field: string, value: any) => {
    const updated = [...editingMeals];
    updated[mealIndex].items[itemIndex] = {
      ...updated[mealIndex].items[itemIndex],
      [field]: value
    };
    setEditingMeals(updated);
  };

  const handleConfirm = async () => {
    if (!editingMeals.length || !userId) return;
    
    setIsSaving(true);
    
    try {
      const allItemsToInsert = [];
      
      for (const meal of editingMeals) {
        const mealGroupId = crypto.randomUUID();
        
        const mealItems = (meal.items || []).map((item: any) => ({
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
          meal_type: meal.meal_type,
          meal_group_id: mealGroupId,
        }));
        
        allItemsToInsert.push(...mealItems);
      }

      const { error } = await supabase
        .from('food_items')
        .insert(allItemsToInsert);

      if (error) throw error;

      console.log('✅ Saved all meals to database!');
      
      setFoodInput('');
      setParsedData(null);
      setEditingMeals([]);
      
      setTimeout(() => {
        window.dispatchEvent(new Event('foodLogged'));
      }, 100);
      
    } catch (error) {
      console.error('Error saving:', error);
      alert('Failed to save. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setParsedData(null);
    setFoodInput('');
    setEditingMeals([]);
  };

  const formatMealType = (type: string) => {
    const emoji = {
      breakfast: '🌅',
      lunch: '🌞',
      dinner: '🌙',
      snack: '🍎'
    }[type] || '🍽️';
    return `${emoji} ${type.charAt(0).toUpperCase() + type.slice(1)}`;
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <form onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            What did you eat today?
          </label>
          <textarea
            value={foodInput}
            onChange={(e) => setFoodInput(e.target.value)}
            placeholder="Enter your entire day, or just one meal - I'll figure it out!

Examples:
- Single meal: Grilled chicken breast with broccoli and rice
- Multiple meals: Breakfast: oatmeal with berries. Lunch: turkey sandwich. Dinner: pasta with marinara
- With context: This morning I had eggs and toast. For lunch at Chipotle I got a burrito bowl. Dinner was homemade stir fry"
            className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none text-gray-900 placeholder-gray-400"
            rows={6}
            disabled={isLoading || !!parsedData}
          />
          
          <button
            type="submit"
            disabled={isLoading || !foodInput.trim() || !!parsedData}
            className="w-full mt-4 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-3 px-6 rounded-xl transition-colors"
          >
            {isLoading ? 'Analyzing...' : 'Analyze Food'}
          </button>
        </form>

        {parsedData && editingMeals.length > 0 && (
          <div className="mt-8 pt-8 border-t border-gray-200">
            <div className="mb-6 p-4 bg-gray-50 rounded-xl">
              <div className="text-sm font-medium text-gray-700 mb-1">You entered:</div>
              <div className="text-gray-900">{foodInput}</div>
            </div>

            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <div className="text-sm font-medium text-blue-900 mb-1">
                🎯 Detected {editingMeals.length} {editingMeals.length === 1 ? 'meal' : 'meals'}
              </div>
              <div className="text-sm text-blue-700">
                {editingMeals.map((meal, idx) => formatMealType(meal.meal_type)).join(' · ')}
              </div>
            </div>

            <div className="space-y-6">
              {editingMeals.map((meal, mealIndex) => {
                const mealTotals = (meal.items || []).reduce(
                  (acc: any, item: any) => ({
                    calories: acc.calories + (parseInt(item.calories) || 0),
                    protein: acc.protein + (parseFloat(item.protein) || 0),
                    fat: acc.fat + (parseFloat(item.fat) || 0),
                    carbs: acc.carbs + (parseFloat(item.carbs) || 0),
                  }),
                  { calories: 0, protein: 0, fat: 0, carbs: 0 }
                );

                return (
                  <div key={mealIndex} className="border-2 border-gray-200 rounded-xl overflow-hidden">
                    <div className="bg-gray-50 px-5 py-4 border-b border-gray-200">
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-lg font-semibold text-gray-900">
                          Meal {mealIndex + 1}
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-gray-900">
                            {mealTotals.calories} cal
                          </div>
                          <div className="text-xs text-gray-500">
                            P: {mealTotals.protein.toFixed(0)}g · 
                            F: {mealTotals.fat.toFixed(0)}g · 
                            C: {mealTotals.carbs.toFixed(0)}g
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-2">
                        {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((type) => (
                          <button
                            key={type}
                            type="button"
                            onClick={() => handleMealTypeChange(mealIndex, type)}
                            className={`py-2 px-3 rounded-lg text-xs font-medium transition-all ${
                              meal.meal_type === type
                                ? 'bg-gray-900 text-white'
                                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
                            }`}
                          >
                            {formatMealType(type)}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="p-4 space-y-2 bg-white">
                      {(meal.items || []).map((item: any, itemIndex: number) => {
                        const isExpanded = expandedItems.get(`${mealIndex}`)?.has(itemIndex);
                        
                        return (
                          <div key={itemIndex} className="border border-gray-200 rounded-lg overflow-hidden">
                            <button
                              type="button"
                              onClick={() => toggleExpand(mealIndex, itemIndex)}
                              className="w-full p-3 text-left hover:bg-gray-50 transition-colors flex items-center justify-between"
                            >
                              <div className="flex-1">
                                <div className="font-medium text-gray-900">{item.food_name}</div>
                                <div className="text-sm text-gray-600 mt-0.5">
                                  {item.quantity} · {item.calories} cal · 
                                  P: {item.protein}g · F: {item.fat}g · C: {item.carbs}g
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
                              <div className="p-3 pt-0 border-t border-gray-200 bg-gray-50 space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="text-xs text-gray-600 mb-1.5 block font-medium">Food</label>
                                    <input
                                      type="text"
                                      value={item.food_name}
                                      onChange={(e) => handleItemEdit(mealIndex, itemIndex, 'food_name', e.target.value)}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs text-gray-600 mb-1.5 block font-medium">Quantity</label>
                                    <input
                                      type="text"
                                      value={item.quantity}
                                      onChange={(e) => handleItemEdit(mealIndex, itemIndex, 'quantity', e.target.value)}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                                    />
                                  </div>
                                </div>

                                <div>
                                  <label className="text-xs text-gray-600 mb-1.5 block font-medium">Macronutrients</label>
                                  <div className="grid grid-cols-4 gap-2">
                                    <div>
                                      <input
                                        type="number"
                                        value={item.calories}
                                        onChange={(e) => handleItemEdit(mealIndex, itemIndex, 'calories', e.target.value)}
                                        className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm bg-white text-center"
                                      />
                                      <div className="text-xs text-gray-500 mt-1 text-center">cal</div>
                                    </div>
                                    <div>
                                      <input
                                        type="number"
                                        step="0.1"
                                        value={item.protein}
                                        onChange={(e) => handleItemEdit(mealIndex, itemIndex, 'protein', e.target.value)}
                                        className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm bg-white text-center"
                                      />
                                      <div className="text-xs text-gray-500 mt-1 text-center">protein</div>
                                    </div>
                                    <div>
                                      <input
                                        type="number"
                                        step="0.1"
                                        value={item.fat}
                                        onChange={(e) => handleItemEdit(mealIndex, itemIndex, 'fat', e.target.value)}
                                        className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm bg-white text-center"
                                      />
                                      <div className="text-xs text-gray-500 mt-1 text-center">fat</div>
                                    </div>
                                    <div>
                                      <input
                                        type="number"
                                        step="0.1"
                                        value={item.carbs}
                                        onChange={(e) => handleItemEdit(mealIndex, itemIndex, 'carbs', e.target.value)}
                                        className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm bg-white text-center"
                                      />
                                      <div className="text-xs text-gray-500 mt-1 text-center">carbs</div>
                                    </div>
                                  </div>
                                </div>

                                {item.categories && item.categories.length > 0 && (
                                  <div className="flex gap-2 flex-wrap">
                                    {item.categories.map((cat: string, i: number) => (
                                      <span
                                        key={i}
                                        className="px-2.5 py-1 bg-white border border-gray-200 text-gray-700 text-xs rounded-md font-medium"
                                      >
                                        {cat}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 bg-gray-900 text-white rounded-xl p-5">
              <div className="text-sm font-medium text-gray-300 mb-2">Total for All Meals</div>
              <div className="text-3xl font-bold mb-3">
                {editingMeals.reduce((sum, meal) => 
                  sum + (meal.items || []).reduce((s: number, item: any) => s + (parseInt(item.calories) || 0), 0), 0
                )} cal
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-gray-300">Protein</div>
                  <div className="text-lg font-semibold">
                    {editingMeals.reduce((sum, meal) => 
                      sum + (meal.items || []).reduce((s: number, item: any) => s + (parseFloat(item.protein) || 0), 0), 0
                    ).toFixed(1)}g
                  </div>
                </div>
                <div>
                  <div className="text-gray-300">Fat</div>
                  <div className="text-lg font-semibold">
                    {editingMeals.reduce((sum, meal) => 
                      sum + (meal.items || []).reduce((s: number, item: any) => s + (parseFloat(item.fat) || 0), 0), 0
                    ).toFixed(1)}g
                  </div>
                </div>
                <div>
                  <div className="text-gray-300">Carbs</div>
                  <div className="text-lg font-semibold">
                    {editingMeals.reduce((sum, meal) => 
                      sum + (meal.items || []).reduce((s: number, item: any) => s + (parseFloat(item.carbs) || 0), 0), 0
                    ).toFixed(1)}g
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleConfirm}
                disabled={isSaving}
                className="flex-1 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300 text-white font-medium py-3.5 px-6 rounded-xl transition-colors"
              >
                {isSaving ? 'Saving...' : `Save ${editingMeals.length} ${editingMeals.length === 1 ? 'Meal' : 'Meals'}`}
              </button>
              <button
                onClick={handleCancel}
                disabled={isSaving}
                className="px-6 py-3.5 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}