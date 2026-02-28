'use client';

import { useMemo, useState } from 'react';

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

type CustomFood = {
  food_name: string;
  quantity: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber: number;
  sugar: number;
  sodium: number;
};

interface ManualAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedMeals: any[];
  onAddMeal: (meal: any) => void;
  onAddCustomMeal: (customMeal: any) => void;
  dateKey: string;
}

export default function ManualAddModal({
  isOpen,
  onClose,
  savedMeals,
  onAddMeal,
  onAddCustomMeal,
  dateKey,
}: ManualAddModalProps) {
  // Step flow: choose meal type -> choose source -> build/add foods.
  const [mode, setMode] = useState<'mealType' | 'select' | 'custom' | 'saved'>('mealType');
  const [selectedMealType, setSelectedMealType] = useState<MealType>('lunch');

  const [mealFoods, setMealFoods] = useState<CustomFood[]>([]);
  const [showAddFoodForm, setShowAddFoodForm] = useState(false);

  const [draftFoodName, setDraftFoodName] = useState('');
  const [draftQuantity, setDraftQuantity] = useState('');
  const [draftCalories, setDraftCalories] = useState('');
  const [draftProtein, setDraftProtein] = useState('0');
  const [draftFat, setDraftFat] = useState('0');
  const [draftCarbs, setDraftCarbs] = useState('0');
  const [draftFiber, setDraftFiber] = useState('0');
  const [draftSugar, setDraftSugar] = useState('0');
  const [draftSodium, setDraftSodium] = useState('0');

  const [customNotes, setCustomNotes] = useState('');
  const [customEatingOut, setCustomEatingOut] = useState(false);
  const [customRestaurant, setCustomRestaurant] = useState('');

  const formatMealType = (type: string) => {
    const emoji = {
      breakfast: '🌅',
      lunch: '🌞',
      dinner: '🌙',
      snack: '🍎',
    }[type] || '🍽️';
    return `${emoji} ${type.charAt(0).toUpperCase() + type.slice(1)}`;
  };

  const resetState = () => {
    setMode('mealType');
    setSelectedMealType('lunch');
    setMealFoods([]);
    setShowAddFoodForm(false);

    setDraftFoodName('');
    setDraftQuantity('');
    setDraftCalories('');
    setDraftProtein('0');
    setDraftFat('0');
    setDraftCarbs('0');
    setDraftFiber('0');
    setDraftSugar('0');
    setDraftSodium('0');

    setCustomNotes('');
    setCustomEatingOut(false);
    setCustomRestaurant('');
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const mealTotals = useMemo(
    () =>
      mealFoods.reduce(
        (sum, item) => ({
          calories: sum.calories + item.calories,
          protein: sum.protein + item.protein,
          fat: sum.fat + item.fat,
          carbs: sum.carbs + item.carbs,
        }),
        { calories: 0, protein: 0, fat: 0, carbs: 0 }
      ),
    [mealFoods]
  );

  if (!isOpen) return null;

  const addDraftFood = () => {
    if (!draftFoodName.trim() || !draftQuantity.trim() || !draftCalories.trim()) {
      alert('Please fill in at least food name, quantity, and calories');
      return;
    }

    const food: CustomFood = {
      food_name: draftFoodName.trim(),
      quantity: draftQuantity.trim(),
      calories: parseInt(draftCalories) || 0,
      protein: parseFloat(draftProtein) || 0,
      fat: parseFloat(draftFat) || 0,
      carbs: parseFloat(draftCarbs) || 0,
      fiber: parseFloat(draftFiber) || 0,
      sugar: parseFloat(draftSugar) || 0,
      sodium: parseInt(draftSodium) || 0,
    };

    setMealFoods((prev) => [...prev, food]);

    setDraftFoodName('');
    setDraftQuantity('');
    setDraftCalories('');
    setDraftProtein('0');
    setDraftFat('0');
    setDraftCarbs('0');
    setDraftFiber('0');
    setDraftSugar('0');
    setDraftSodium('0');
    setShowAddFoodForm(false);
  };

  const handleAddCustomMeal = () => {
    const notes = customEatingOut && customRestaurant
      ? `${customRestaurant}${customNotes ? ' - ' + customNotes : ''}`
      : customNotes;

    onAddCustomMeal({
      meal_type: selectedMealType,
      items: mealFoods,
      notes: notes || null,
      eating_out: customEatingOut,
    });

    handleClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-gray-900">Add Meal to {dateKey}</h3>
          <button onClick={handleClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {mode === 'mealType' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">Step 1: Select meal type</p>
            <div className="grid grid-cols-2 gap-3">
              {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    setSelectedMealType(type);
                    setMode('select');
                  }}
                  className="p-4 border-2 border-gray-300 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
                >
                  <div className="font-semibold text-gray-900">{formatMealType(type)}</div>
                  <div className="text-xs text-gray-600 mt-1">Use this meal type for all items you add</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {mode === 'select' && (
          <div className="space-y-4">
            <button
              onClick={() => setMode('mealType')}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Change Meal Type
            </button>

            <div className="text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
              Selected: {formatMealType(selectedMealType)}
            </div>

            <button
              onClick={() => setMode('custom')}
              className="w-full p-6 border-2 border-gray-300 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
            >
              <div className="text-lg font-semibold text-gray-900">Build Meal</div>
              <div className="text-sm text-gray-600">Step 2: Add food items to this meal</div>
            </button>

            <button
              onClick={() => setMode('saved')}
              className="w-full p-6 border-2 border-gray-300 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
            >
              <div className="text-lg font-semibold text-gray-900">Choose Saved Meal</div>
              <div className="text-sm text-gray-600">Apply selected meal type and add instantly</div>
            </button>
          </div>
        )}

        {mode === 'custom' && (
          <div className="space-y-4">
            <button
              onClick={() => setMode('select')}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>

            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
              Step 2: {formatMealType(selectedMealType)} · Add foods to this meal
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-3">
              <div className="text-sm font-medium text-gray-900">Meal Foods ({mealFoods.length})</div>
              {mealFoods.length === 0 ? (
                <div className="text-xs text-gray-500 mt-2">No foods added yet.</div>
              ) : (
                <div className="mt-2 space-y-2">
                  {mealFoods.map((food, idx) => (
                    <div key={`${food.food_name}-${idx}`} className="flex items-center justify-between rounded-md border border-gray-200 px-2 py-1.5">
                      <div>
                        <div className="text-sm text-gray-900">{food.food_name}</div>
                        <div className="text-xs text-gray-500">{food.quantity} · {food.calories} cal</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setMealFoods((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-xs text-red-600"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowAddFoodForm((prev) => !prev)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              {showAddFoodForm ? 'Hide Add Food' : 'Add Food'}
            </button>

            {showAddFoodForm && (
              <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={draftFoodName}
                    onChange={(e) => setDraftFoodName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    placeholder="Food name"
                  />
                  <input
                    type="text"
                    value={draftQuantity}
                    onChange={(e) => setDraftQuantity(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    placeholder="Quantity (e.g., 1 cup)"
                  />
                </div>

                <div className="grid grid-cols-4 gap-2">
                  <input type="number" value={draftCalories} onChange={(e) => setDraftCalories(e.target.value)} className="px-2 py-2 border border-gray-300 rounded-lg text-sm text-center" placeholder="Cal" />
                  <input type="number" step="0.1" value={draftProtein} onChange={(e) => setDraftProtein(e.target.value)} className="px-2 py-2 border border-gray-300 rounded-lg text-sm text-center" placeholder="P" />
                  <input type="number" step="0.1" value={draftFat} onChange={(e) => setDraftFat(e.target.value)} className="px-2 py-2 border border-gray-300 rounded-lg text-sm text-center" placeholder="F" />
                  <input type="number" step="0.1" value={draftCarbs} onChange={(e) => setDraftCarbs(e.target.value)} className="px-2 py-2 border border-gray-300 rounded-lg text-sm text-center" placeholder="C" />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <input type="number" step="0.1" value={draftFiber} onChange={(e) => setDraftFiber(e.target.value)} className="px-2 py-2 border border-gray-300 rounded-lg text-sm text-center" placeholder="Fiber" />
                  <input type="number" step="0.1" value={draftSugar} onChange={(e) => setDraftSugar(e.target.value)} className="px-2 py-2 border border-gray-300 rounded-lg text-sm text-center" placeholder="Sugar" />
                  <input type="number" value={draftSodium} onChange={(e) => setDraftSodium(e.target.value)} className="px-2 py-2 border border-gray-300 rounded-lg text-sm text-center" placeholder="Sodium" />
                </div>

                <button
                  type="button"
                  onClick={addDraftFood}
                  className="w-full bg-blue-600 text-white font-medium py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Add Food to Meal
                </button>
              </div>
            )}

            <div className="border-t border-gray-200 pt-3">
              <label className="flex items-center gap-2 cursor-pointer mb-2">
                <input
                  type="checkbox"
                  checked={customEatingOut}
                  onChange={(e) => setCustomEatingOut(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm font-medium text-gray-700">Eating out / Restaurant</span>
              </label>

              {customEatingOut && (
                <input
                  type="text"
                  value={customRestaurant}
                  onChange={(e) => setCustomRestaurant(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-2"
                  placeholder="Restaurant name"
                />
              )}

              <textarea
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none"
                rows={2}
                placeholder="Meal notes (optional)"
              />
            </div>

            <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">
              Meal total: {mealTotals.calories} cal · P {mealTotals.protein.toFixed(1)}g · F {mealTotals.fat.toFixed(1)}g · C {mealTotals.carbs.toFixed(1)}g
            </div>

            <button
              type="button"
              onClick={handleAddCustomMeal}
              className="w-full bg-blue-600 text-white font-medium py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Add Meal to {dateKey}
            </button>
          </div>
        )}

        {mode === 'saved' && (
          <div>
            <button
              onClick={() => setMode('select')}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>

            <div className="text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 mb-3">
              Selected: {formatMealType(selectedMealType)}
            </div>

            {savedMeals.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-sm font-medium text-gray-900 mb-1">No saved meals yet</div>
                <div className="text-xs text-gray-600">Go to Food Log to save meals for quick logging</div>
              </div>
            ) : (
              <div className="space-y-2">
                {savedMeals.map((meal) => {
                  const totalCals = meal.items.reduce((sum: number, item: any) => sum + (parseInt(item.calories) || 0), 0);
                  return (
                    <div
                      key={meal.id}
                      className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors cursor-pointer"
                      onClick={() => {
                        onAddMeal({ ...meal, meal_type: selectedMealType });
                        handleClose();
                      }}
                    >
                      <div className="font-semibold text-gray-900">{meal.meal_name}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {meal.items.length} items · {totalCals} cal
                      </div>
                      {meal.notes && <div className="text-xs text-gray-600 mt-1">{meal.notes}</div>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
