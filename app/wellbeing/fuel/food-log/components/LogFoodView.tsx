'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function LogFoodView({ userId }: { userId: string | null }) {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================
  
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  
  const [foodInput, setFoodInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [parsedData, setParsedData] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [editingMeals, setEditingMeals] = useState<any[]>([]);
  const [expandedItems, setExpandedItems] = useState<Map<string, Set<number>>>(new Map());
  
  const [mealNotes, setMealNotes] = useState<Map<number, string>>(new Map());
  const [mealEatingOut, setMealEatingOut] = useState<Map<number, boolean>>(new Map());
  
  const [savedMeals, setSavedMeals] = useState<any[]>([]);
  const [isLoadingSavedMeals, setIsLoadingSavedMeals] = useState(true);
  const [editingSavedMeal, setEditingSavedMeal] = useState<string | null>(null);
  const [editingSavedMealData, setEditingSavedMealData] = useState<any>(null);
  const [showSavedMeals, setShowSavedMeals] = useState(false);
  
  const [showSaveMealModal, setShowSaveMealModal] = useState(false);
  const [mealToSave, setMealToSave] = useState<any>(null);
  const [saveMealName, setSaveMealName] = useState('');
  const [saveMealNotes, setSaveMealNotes] = useState('');

  // ============================================================================
  // LOAD SAVED MEALS
  // ============================================================================
  
  useEffect(() => {
    loadSavedMeals();
  }, [userId]);

  const loadSavedMeals = async () => {
    if (!userId) {
      setIsLoadingSavedMeals(false);
      return;
    }

    setIsLoadingSavedMeals(true);
    
    const { data, error } = await supabase
      .from('saved_meals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (data) {
      setSavedMeals(data);
    }
    
    setIsLoadingSavedMeals(false);
  };

  // ============================================================================
  // FOOD PARSING
  // ============================================================================
  
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
      setMealNotes(new Map());
      setMealEatingOut(new Map());
      console.log('Parsed:', data);
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to parse food. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================================================
  // MEAL EDITING
  // ============================================================================
  
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
    
    if (field === 'quantity') {
      const oldQuantity = parseFloat(updated[mealIndex].items[itemIndex].quantity) || 1;
      const newQuantity = parseFloat(value) || 1;
      const ratio = newQuantity / oldQuantity;
      
      const item = updated[mealIndex].items[itemIndex];
      updated[mealIndex].items[itemIndex] = {
        ...item,
        quantity: value,
        calories: Math.round(item.calories * ratio),
        protein: Math.round(item.protein * ratio * 10) / 10,
        fat: Math.round(item.fat * ratio * 10) / 10,
        carbs: Math.round(item.carbs * ratio * 10) / 10,
        fiber: Math.round(item.fiber * ratio * 10) / 10,
        sugar: Math.round(item.sugar * ratio * 10) / 10,
        sodium: Math.round(item.sodium * ratio),
      };
    } else {
      updated[mealIndex].items[itemIndex] = {
        ...updated[mealIndex].items[itemIndex],
        [field]: value
      };
    }
    setEditingMeals(updated);
  };

  const updateMealNotes = (mealIndex: number, notes: string) => {
    const newNotes = new Map(mealNotes);
    newNotes.set(mealIndex, notes);
    setMealNotes(newNotes);
  };

  const toggleMealEatingOut = (mealIndex: number) => {
    const newEatingOut = new Map(mealEatingOut);
    newEatingOut.set(mealIndex, !newEatingOut.get(mealIndex));
    setMealEatingOut(newEatingOut);
  };

  // ============================================================================
  // SAVE TO DATABASE
  // ============================================================================
  
  const handleConfirm = async () => {
    if (!editingMeals.length || !userId) return;
    
    setIsSaving(true);
    
    try {
      const allItemsToInsert = [];
      const selectedDateTime = new Date(selectedDate + 'T12:00:00');
      
      for (let i = 0; i < editingMeals.length; i++) {
        const meal = editingMeals[i];
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
          notes: mealNotes.get(i) || null,
          eating_out: mealEatingOut.get(i) || false,
          logged_at: selectedDateTime.toISOString(),
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
      setMealNotes(new Map());
      setMealEatingOut(new Map());
      
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
    setMealNotes(new Map());
    setMealEatingOut(new Map());
  };

  // ============================================================================
  // SAVE MEAL FOR REUSE
  // ============================================================================
  
  const openSaveMealModal = (meal: any, mealIndex: number) => {
    setMealToSave({...meal, mealIndex});
    setSaveMealName('');
    setSaveMealNotes(mealNotes.get(mealIndex) || '');
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
          notes: saveMealNotes || null,
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

  // ============================================================================
  // EDIT SAVED MEAL
  // ============================================================================
  
  const startEditSavedMeal = (meal: any) => {
    setEditingSavedMeal(meal.id);
    setEditingSavedMealData({
      meal_name: meal.meal_name,
      meal_type: meal.meal_type,
      items: JSON.parse(JSON.stringify(meal.items)),
      notes: meal.notes || '',
    });
  };

  const saveEditedSavedMeal = async (mealId: string) => {
    if (!userId || !editingSavedMealData) return;

    try {
      const { error } = await supabase
        .from('saved_meals')
        .update({
          meal_name: editingSavedMealData.meal_name,
          meal_type: editingSavedMealData.meal_type,
          items: editingSavedMealData.items,
          notes: editingSavedMealData.notes,
        })
        .eq('id', mealId)
        .eq('user_id', userId);

      if (error) throw error;

      setEditingSavedMeal(null);
      setEditingSavedMealData(null);
      loadSavedMeals();
    } catch (error) {
      console.error('Error updating saved meal:', error);
      alert('Failed to update meal');
    }
  };

  const cancelEditSavedMeal = () => {
    setEditingSavedMeal(null);
    setEditingSavedMealData(null);
  };

  const updateEditingSavedMealItem = (itemIndex: number, field: string, value: any) => {
    if (!editingSavedMealData) return;
    
    const updated = {...editingSavedMealData};
    updated.items[itemIndex] = {
      ...updated.items[itemIndex],
      [field]: value
    };
    setEditingSavedMealData(updated);
  };

  // ============================================================================
  // ADD SAVED MEAL
  // ============================================================================
  
  const addSavedMeal = async (savedMeal: any) => {
    if (!userId) return;

    try {
      const mealGroupId = crypto.randomUUID();
      const selectedDateTime = new Date(selectedDate + 'T12:00:00');
      
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

      alert(`✅ Added "${savedMeal.meal_name}" to ${selectedDate}!`);
      
      setTimeout(() => {
        window.dispatchEvent(new Event('foodLogged'));
      }, 100);
    } catch (error) {
      console.error('Error adding saved meal:', error);
      alert('Failed to add meal');
    }
  };

  // ============================================================================
  // DELETE SAVED MEAL
  // ============================================================================
  
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

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================
  
  const formatMealType = (type: string) => {
    const emoji = {
      breakfast: '🌅',
      lunch: '🌞',
      dinner: '🌙',
      snack: '🍎'
    }[type] || '🍽️';
    return `${emoji} ${type.charAt(0).toUpperCase() + type.slice(1)}`;
  };

  // ============================================================================
  // RENDER
  // ============================================================================
  
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      
      {/* DATE SELECTOR */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <label className="block text-sm font-medium text-blue-900 mb-2">
          Logging food for:
        </label>
        <input
          type="date"
          value={selectedDate}
          max={new Date().toISOString().split('T')[0]}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="w-full px-4 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
        />
      </div>

      {/* INSTRUCTIONS */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-yellow-900 mb-2">💡 Tips for best results:</h3>
        <ul className="text-sm text-yellow-800 space-y-1">
          <li>• Include which meal (breakfast, lunch, dinner, snack)</li>
          <li>• Mention if you ate out and where (e.g., "Chipotle burrito bowl")</li>
          <li>• Add any notes about the experience or preparation</li>
        </ul>
      </div>

      {/* FOOD INPUT FORM */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <form onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            What did you eat?
          </label>
          <textarea
            value={foodInput}
            onChange={(e) => setFoodInput(e.target.value)}
            placeholder="Enter your meals - I'll figure it out!

Examples:
- For breakfast I had oatmeal with berries and almond butter
- Lunch at Chipotle: chicken burrito bowl with brown rice, black beans, fajita veggies
- Homemade dinner: grilled salmon with roasted broccoli and quinoa
- Evening snack: apple with peanut butter"
            className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none text-gray-900 placeholder-gray-400 text-base"
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

        {/* PARSED MEALS */}
        {parsedData && editingMeals.length > 0 && (
          <div className="mt-8 pt-8 border-t border-gray-200">
            
            <div className="mb-6 p-4 bg-gray-50 rounded-xl">
              <div className="text-sm font-medium text-gray-700 mb-1">You entered:</div>
              <div className="text-gray-900">{foodInput}</div>
            </div>

            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <div className="text-sm font-medium text-blue-900 mb-1">
                Detected {editingMeals.length} {editingMeals.length === 1 ? 'meal' : 'meals'}
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
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="text-lg font-semibold text-gray-900 mb-1">
                            Meal {mealIndex + 1}
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-gray-900">
                              {mealTotals.calories} cal
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              P: {mealTotals.protein.toFixed(0)}g · 
                              F: {mealTotals.fat.toFixed(0)}g · 
                              C: {mealTotals.carbs.toFixed(0)}g
                            </div>
                          </div>
                        </div>
                        
                        <button
                          onClick={() => openSaveMealModal(meal, mealIndex)}
                          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                          </svg>
                          <span className="hidden sm:inline">Save Meal</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-4 gap-2 mb-3">
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

                      <div className="mb-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Notes (restaurant, location, etc.)
                        </label>
                        <input
                          type="text"
                          value={mealNotes.get(mealIndex) || ''}
                          onChange={(e) => updateMealNotes(mealIndex, e.target.value)}
                          placeholder="e.g., Chipotle, homemade, meal prep"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </div>

                      <div>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={mealEatingOut.get(mealIndex) || false}
                            onChange={() => toggleMealEatingOut(mealIndex)}
                            className="w-4 h-4 text-blue-600 rounded"
                          />
                          <span className="text-sm text-gray-700">Eating out / Restaurant</span>
                        </label>
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
                                    <label className="text-xs text-gray-600 mb-1.5 block font-medium">Food Name</label>
                                    <input
                                      type="text"
                                      value={item.food_name}
                                      onChange={(e) => handleItemEdit(mealIndex, itemIndex, 'food_name', e.target.value)}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs text-gray-600 mb-1.5 block font-medium">Quantity (auto-adjusts macros)</label>
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
                                      <label className="text-xs text-gray-500 block mb-1">Calories</label>
                                      <input
                                        type="number"
                                        value={item.calories}
                                        onChange={(e) => handleItemEdit(mealIndex, itemIndex, 'calories', e.target.value)}
                                        className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm bg-white text-center"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-xs text-gray-500 block mb-1">Protein (g)</label>
                                      <input
                                        type="number"
                                        step="0.1"
                                        value={item.protein}
                                        onChange={(e) => handleItemEdit(mealIndex, itemIndex, 'protein', e.target.value)}
                                        className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm bg-white text-center"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-xs text-gray-500 block mb-1">Fat (g)</label>
                                      <input
                                        type="number"
                                        step="0.1"
                                        value={item.fat}
                                        onChange={(e) => handleItemEdit(mealIndex, itemIndex, 'fat', e.target.value)}
                                        className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm bg-white text-center"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-xs text-gray-500 block mb-1">Carbs (g)</label>
                                      <input
                                        type="number"
                                        step="0.1"
                                        value={item.carbs}
                                        onChange={(e) => handleItemEdit(mealIndex, itemIndex, 'carbs', e.target.value)}
                                        className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm bg-white text-center"
                                      />
                                    </div>
                                  </div>
                                </div>

                                <div>
                                  <label className="text-xs text-gray-600 mb-1.5 block font-medium">Micronutrients</label>
                                  <div className="grid grid-cols-3 gap-2">
                                    <div>
                                      <label className="text-xs text-gray-500 block mb-1">Fiber (g)</label>
                                      <input
                                        type="number"
                                        step="0.1"
                                        value={item.fiber}
                                        onChange={(e) => handleItemEdit(mealIndex, itemIndex, 'fiber', e.target.value)}
                                        className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm bg-white text-center"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-xs text-gray-500 block mb-1">Sugar (g)</label>
                                      <input
                                        type="number"
                                        step="0.1"
                                        value={item.sugar}
                                        onChange={(e) => handleItemEdit(mealIndex, itemIndex, 'sugar', e.target.value)}
                                        className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm bg-white text-center"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-xs text-gray-500 block mb-1">Sodium (mg)</label>
                                      <input
                                        type="number"
                                        value={item.sodium}
                                        onChange={(e) => handleItemEdit(mealIndex, itemIndex, 'sodium', e.target.value)}
                                        className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm bg-white text-center"
                                      />
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
                {isSaving ? 'Saving...' : `Save to ${selectedDate}`}
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

      {/* SAVED MEALS SECTION - COLLAPSED */}
      <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-2xl overflow-hidden">
        <button
          onClick={() => setShowSavedMeals(!showSavedMeals)}
          className="w-full p-5 sm:p-6 flex items-center justify-between hover:bg-blue-100/50 transition-colors"
        >
          <div>
            <h2 className="text-lg font-semibold text-blue-900 flex items-center gap-2">
              Saved Meals
              <span className="text-sm font-normal text-blue-600">
                ({savedMeals.length})
              </span>
            </h2>
            <p className="text-sm text-blue-700 mt-1">Quick access to frequently eaten meals</p>
          </div>
          <svg
            className={`w-6 h-6 text-blue-700 transition-transform ${showSavedMeals ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showSavedMeals && (
          <div className="px-5 sm:px-6 pb-5 sm:pb-6 border-t border-blue-200">
            {/* Instructions inside collapsed section */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4 mb-4">
              <h3 className="text-sm font-semibold text-yellow-900 mb-2">How to use saved meals:</h3>
              <ul className="text-sm text-yellow-800 space-y-1">
                <li>• Save frequently eaten meals for quick logging</li>
                <li>• Click "Save Meal" after analyzing to add to your library</li>
                <li>• Use "Add to [Date]" to quickly log saved meals</li>
                <li>• Edit saved meals anytime by clicking the edit icon</li>
              </ul>
            </div>

            {isLoadingSavedMeals ? (
              <div className="text-sm text-blue-600">Loading saved meals...</div>
            ) : savedMeals.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-blue-400 mb-2 text-4xl">📖</div>
                <div className="text-sm font-medium text-blue-900 mb-1">
                  No saved meals yet
                </div>
                <div className="text-xs text-blue-600">
                  Save meals you eat often for quick logging later
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {savedMeals.map((meal) => {
                  const isEditing = editingSavedMeal === meal.id;
                  const totalCals = meal.items.reduce((sum: number, item: any) => 
                    sum + (parseInt(item.calories) || 0), 0
                  );
                  
                  return (
                    <div 
                      key={meal.id} 
                      className="bg-white p-4 rounded-xl border border-blue-200"
                    >
                      {isEditing ? (
                        <div className="space-y-4">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Meal Name</label>
                            <input
                              type="text"
                              value={editingSavedMealData.meal_name}
                              onChange={(e) => setEditingSavedMealData({...editingSavedMealData, meal_name: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                            <input
                              type="text"
                              value={editingSavedMealData.notes}
                              onChange={(e) => setEditingSavedMealData({...editingSavedMealData, notes: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                              placeholder="Restaurant, location, etc."
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-2">Food Items</label>
                            <div className="space-y-3">
                              {editingSavedMealData.items.map((item: any, idx: number) => (
                                <div key={idx} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                                  <div className="grid grid-cols-2 gap-2 mb-3">
                                    <div>
                                      <label className="block text-xs font-medium text-gray-600 mb-1">Food Name</label>
                                      <input
                                        type="text"
                                        value={item.food_name}
                                        onChange={(e) => updateEditingSavedMealItem(idx, 'food_name', e.target.value)}
                                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-xs font-medium text-gray-600 mb-1">Quantity</label>
                                      <input
                                        type="text"
                                        value={item.quantity}
                                        onChange={(e) => updateEditingSavedMealItem(idx, 'quantity', e.target.value)}
                                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                                      />
                                    </div>
                                  </div>

                                  <div className="mb-3">
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Macronutrients</label>
                                    <div className="grid grid-cols-4 gap-2">
                                      <div>
                                        <label className="block text-xs text-gray-500 mb-1">Calories</label>
                                        <input
                                          type="number"
                                          value={item.calories}
                                          onChange={(e) => updateEditingSavedMealItem(idx, 'calories', e.target.value)}
                                          className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded text-center focus:ring-2 focus:ring-blue-500"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-xs text-gray-500 mb-1">Protein (g)</label>
                                        <input
                                          type="number"
                                          step="0.1"
                                          value={item.protein}
                                          onChange={(e) => updateEditingSavedMealItem(idx, 'protein', e.target.value)}
                                          className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded text-center focus:ring-2 focus:ring-blue-500"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-xs text-gray-500 mb-1">Fat (g)</label>
                                        <input
                                          type="number"
                                          step="0.1"
                                          value={item.fat}
                                          onChange={(e) => updateEditingSavedMealItem(idx, 'fat', e.target.value)}
                                          className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded text-center focus:ring-2 focus:ring-blue-500"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-xs text-gray-500 mb-1">Carbs (g)</label>
                                        <input
                                          type="number"
                                          step="0.1"
                                          value={item.carbs}
                                          onChange={(e) => updateEditingSavedMealItem(idx, 'carbs', e.target.value)}
                                          className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded text-center focus:ring-2 focus:ring-blue-500"
                                        />
                                      </div>
                                    </div>
                                  </div>

                                  <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Micronutrients</label>
                                    <div className="grid grid-cols-3 gap-2">
                                      <div>
                                        <label className="block text-xs text-gray-500 mb-1">Fiber (g)</label>
                                        <input
                                          type="number"
                                          step="0.1"
                                          value={item.fiber || 0}
                                          onChange={(e) => updateEditingSavedMealItem(idx, 'fiber', e.target.value)}
                                          className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded text-center focus:ring-2 focus:ring-blue-500"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-xs text-gray-500 mb-1">Sugar (g)</label>
                                        <input
                                          type="number"
                                          step="0.1"
                                          value={item.sugar || 0}
                                          onChange={(e) => updateEditingSavedMealItem(idx, 'sugar', e.target.value)}
                                          className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded text-center focus:ring-2 focus:ring-blue-500"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-xs text-gray-500 mb-1">Sodium (mg)</label>
                                        <input
                                          type="number"
                                          value={item.sodium || 0}
                                          onChange={(e) => updateEditingSavedMealItem(idx, 'sodium', e.target.value)}
                                          className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded text-center focus:ring-2 focus:ring-blue-500"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={() => saveEditedSavedMeal(meal.id)}
                              className="flex-1 px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
                            >
                              Save Changes
                            </button>
                            <button
                              onClick={cancelEditSavedMeal}
                              className="px-3 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900">{meal.meal_name}</div>
                            <div className="text-xs text-gray-500 mt-1">
                              {formatMealType(meal.meal_type)} · {meal.items.length} items · {totalCals} cal
                            </div>
                            {meal.notes && (
                              <div className="text-xs text-gray-600 mt-1">{meal.notes}</div>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => addSavedMeal(meal)}
                              className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap"
                            >
                              + Add to {selectedDate}
                            </button>
                            <button
                              onClick={() => startEditSavedMeal(meal)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => deleteSavedMeal(meal.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* SAVE MEAL MODAL */}
      {showSaveMealModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Save This Meal
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              Give this meal a name so you can quickly add it again in the future.
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Meal Name</label>
                <input
                  type="text"
                  value={saveMealName}
                  onChange={(e) => setSaveMealName(e.target.value)}
                  placeholder="e.g., Chicken Katsu Plate, Morning Smoothie"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes (optional)</label>
                <input
                  type="text"
                  value={saveMealNotes}
                  onChange={(e) => setSaveMealNotes(e.target.value)}
                  placeholder="e.g., Chipotle, meal prep, homemade"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={saveMealForLater}
                disabled={!saveMealName.trim()}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg transition-colors"
              >
                Save Meal
              </button>
              <button
                onClick={() => setShowSaveMealModal(false)}
                className="px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
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