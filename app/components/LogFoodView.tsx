'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function LogFoodView({ userId }: { userId: string | null }) {
  const [foodInput, setFoodInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [parsedData, setParsedData] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [editingMeals, setEditingMeals] = useState<any[]>([]);
  const [expandedItems, setExpandedItems] = useState<Map<string, Set<number>>>(new Map());
  
  // NEW - Saved meals state
  const [savedMeals, setSavedMeals] = useState<any[]>([]);
  const [showSavedMeals, setShowSavedMeals] = useState(false);
  const [showSaveMealModal, setShowSaveMealModal] = useState(false);
  const [mealToSave, setMealToSave] = useState<any>(null);
  const [saveMealName, setSaveMealName] = useState('');

  // Load saved meals when component mounts
  useEffect(() => {
    loadSavedMeals();
  }, [userId]);

  const loadSavedMeals = async () => {
    if (!userId) return;

    const { data, error } = await supabase
      .from('saved_meals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (data) {
      setSavedMeals(data);
    }
  };

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
          whole_food_ingredients: item.whole_food_ingredients || [],
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

  // NEW - Save meal for reuse
  const openSaveMealModal = (meal: any) => {
    setMealToSave(meal);
    setSaveMealName('');
    setShowSaveMealModal(true);
  };

  const saveMealForLater = async () => {
    if (!userId || !mealToSave || !saveMealName.trim()) return;

    try {
      const { error } = await supabase
        .from('saved_meals')
        .insert({
          user_id: userId,
          meal_name: saveMealName,
          meal_type: mealToSave.meal_type,
          items: mealToSave.items,
        });

      if (error) throw error;

      alert('✅ Meal saved! You can reuse it anytime.');
      setShowSaveMealModal(false);
      loadSavedMeals();
    } catch (error) {
      console.error('Error saving meal:', error);
      alert('Failed to save meal');
    }
  };

  // NEW - Add saved meal to today
  const addSavedMeal = async (savedMeal: any) => {
    if (!userId) return;

    try {
      const mealGroupId = crypto.randomUUID();
      
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
      }));

      const { error } = await supabase
        .from('food_items')
        .insert(itemsToInsert);

      if (error) throw error;

      alert(`✅ Added "${savedMeal.meal_name}" to today!`);
      setShowSavedMeals(false);
      
      setTimeout(() => {
        window.dispatchEvent(new Event('foodLogged'));
      }, 100);
    } catch (error) {
      console.error('Error adding saved meal:', error);
      alert('Failed to add meal');
    }
  };

  // NEW - Delete saved meal
  const deleteSavedMeal = async (mealId: string) => {
    if (!confirm('Delete this saved meal?')) return;

    try {
      const { error } = await supabase
        .from('saved_meals')
        .delete()
        .eq('id', mealId)
        .eq('user_id', userId);

      if (error) throw error;

      loadSavedMeals();
    } catch (error) {
      console.error('Error deleting meal:', error);
      alert('Failed to delete meal');
    }
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
      {/* Saved Meals Button */}
      {savedMeals.length > 0 && (
        <div className="mb-4">
          <button
            onClick={() => setShowSavedMeals(!showSavedMeals)}
            className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
          >
            📚 My Saved Meals ({savedMeals.length})
          </button>
        </div>
      )}

      {/* Saved Meals List */}
      {showSavedMeals && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <h3 className="font-semibold text-blue-900 mb-3">Saved Meals</h3>
          <div className="space-y-2">
            {savedMeals.map((meal) => (
              <div key={meal.id} className="bg-white p-3 rounded-lg border border-blue-200 flex items-center justify-between">
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{meal.meal_name}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {formatMealType(meal.meal_type)} · {meal.items.length} items
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => addSavedMeal(meal)}
                    className="px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                  >
                    Add to Today
                  </button>
                  <button
                    onClick={() => deleteSavedMeal(meal.id)}
                    className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
                        <div className="flex items-center gap-2">
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
                          {/* NEW - Save this meal button */}
                          <button
                            onClick={() => openSaveMealModal(meal)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                            title="Save this meal for later"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                            </svg>
                          </button>
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

      {/* Save Meal Modal */}
      {showSaveMealModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Save This Meal</h3>
            <p className="text-sm text-gray-600 mb-4">
              Give this meal a name so you can quickly add it again in the future.
            </p>
            <input
              type="text"
              value={saveMealName}
              onChange={(e) => setSaveMealName(e.target.value)}
              placeholder="e.g., Chicken Katsu Plate, Morning Smoothie"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={saveMealForLater}
                disabled={!saveMealName.trim()}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-medium py-2 rounded-lg"
              >
                Save Meal
              </button>
              <button
                onClick={() => setShowSaveMealModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}