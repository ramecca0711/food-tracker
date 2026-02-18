'use client';

import { useState } from 'react';

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
  dateKey 
}: ManualAddModalProps) {
  const [mode, setMode] = useState<'select' | 'custom' | 'saved'>('select');
  
  // Custom meal state
  const [customFoodName, setCustomFoodName] = useState('');
  const [customQuantity, setCustomQuantity] = useState('');
  const [customCalories, setCustomCalories] = useState('');
  const [customProtein, setCustomProtein] = useState('');
  const [customFat, setCustomFat] = useState('');
  const [customCarbs, setCustomCarbs] = useState('');
  const [customFiber, setCustomFiber] = useState('0');
  const [customSugar, setCustomSugar] = useState('0');
  const [customSodium, setCustomSodium] = useState('0');
  const [customMealType, setCustomMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('lunch');
  const [customNotes, setCustomNotes] = useState('');
  const [customEatingOut, setCustomEatingOut] = useState(false);
  const [customRestaurant, setCustomRestaurant] = useState('');

  if (!isOpen) return null;

  const handleClose = () => {
    // Reset state
    setMode('select');
    setCustomFoodName('');
    setCustomQuantity('');
    setCustomCalories('');
    setCustomProtein('');
    setCustomFat('');
    setCustomCarbs('');
    setCustomFiber('0');
    setCustomSugar('0');
    setCustomSodium('0');
    setCustomMealType('lunch');
    setCustomNotes('');
    setCustomEatingOut(false);
    setCustomRestaurant('');
    onClose();
  };

  const handleAddCustom = () => {
    if (!customFoodName || !customQuantity || !customCalories) {
      alert('Please fill in at least food name, quantity, and calories');
      return;
    }

    const notes = customEatingOut && customRestaurant 
      ? `${customRestaurant}${customNotes ? ' - ' + customNotes : ''}`
      : customNotes;

    const customMeal = {
      food_name: customFoodName,
      quantity: customQuantity,
      calories: parseInt(customCalories) || 0,
      protein: parseFloat(customProtein) || 0,
      fat: parseFloat(customFat) || 0,
      carbs: parseFloat(customCarbs) || 0,
      fiber: parseFloat(customFiber) || 0,
      sugar: parseFloat(customSugar) || 0,
      sodium: parseInt(customSodium) || 0,
      meal_type: customMealType,
      notes: notes || null,
      eating_out: customEatingOut,
    };

    onAddCustomMeal(customMeal);
    handleClose();
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-gray-900">
            Add Meal to {dateKey}
          </h3>
          <button
            onClick={handleClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* MODE SELECTION */}
        {mode === 'select' && (
          <div className="space-y-4">
            <button
              onClick={() => setMode('custom')}
              className="w-full p-6 border-2 border-gray-300 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-colors text-left group"
            >
              <div className="flex items-center gap-4">
                <div className="text-4xl">✏️</div>
                <div>
                  <div className="text-lg font-semibold text-gray-900 group-hover:text-blue-700">
                    Custom Entry
                  </div>
                  <div className="text-sm text-gray-600">
                    Manually enter food details
                  </div>
                </div>
              </div>
            </button>

            <button
              onClick={() => setMode('saved')}
              className="w-full p-6 border-2 border-gray-300 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-colors text-left group"
            >
              <div className="flex items-center gap-4">
                <div className="text-4xl">📚</div>
                <div>
                  <div className="text-lg font-semibold text-gray-900 group-hover:text-blue-700">
                    Choose Saved Meal
                  </div>
                  <div className="text-sm text-gray-600">
                    Select from your saved meals
                  </div>
                </div>
              </div>
            </button>
          </div>
        )}

        {/* CUSTOM ENTRY MODE */}
        {mode === 'custom' && (
          <div className="space-y-4">
            <button
              onClick={() => setMode('select')}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <div className="text-sm text-blue-800">
                Enter the nutritional information for the food you want to add.
              </div>
            </div>

            {/* Meal Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Meal Type</label>
              <div className="grid grid-cols-4 gap-2">
                {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setCustomMealType(type)}
                    className={`py-2 px-3 rounded-lg text-xs font-medium transition-all ${
                      customMealType === type
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {formatMealType(type)}
                  </button>
                ))}
              </div>
            </div>

            {/* Food Name & Quantity */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Food Name *
                </label>
                <input
                  type="text"
                  value={customFoodName}
                  onChange={(e) => setCustomFoodName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Grilled chicken"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity *
                </label>
                <input
                  type="text"
                  value={customQuantity}
                  onChange={(e) => setCustomQuantity(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., 6 oz"
                />
              </div>
            </div>

            {/* Macros */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Macronutrients
              </label>
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Calories *</label>
                  <input
                    type="number"
                    value={customCalories}
                    onChange={(e) => setCustomCalories(e.target.value)}
                    className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm text-center focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Protein (g)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={customProtein}
                    onChange={(e) => setCustomProtein(e.target.value)}
                    className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm text-center focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Fat (g)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={customFat}
                    onChange={(e) => setCustomFat(e.target.value)}
                    className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm text-center focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Carbs (g)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={customCarbs}
                    onChange={(e) => setCustomCarbs(e.target.value)}
                    className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm text-center focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            {/* Micros */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Micronutrients (optional)
              </label>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Fiber (g)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={customFiber}
                    onChange={(e) => setCustomFiber(e.target.value)}
                    className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm text-center focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Sugar (g)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={customSugar}
                    onChange={(e) => setCustomSugar(e.target.value)}
                    className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm text-center focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Sodium (mg)</label>
                  <input
                    type="number"
                    value={customSodium}
                    onChange={(e) => setCustomSodium(e.target.value)}
                    className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm text-center focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            {/* Eating Out Checkbox */}
            <div className="border-t border-gray-200 pt-4">
              <label className="flex items-center gap-2 cursor-pointer mb-3">
                <input
                  type="checkbox"
                  checked={customEatingOut}
                  onChange={(e) => setCustomEatingOut(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm font-medium text-gray-700">Eating out?</span>
              </label>

              {customEatingOut && (
                <div className="ml-6 mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Restaurant Name (optional)
                  </label>
                  <input
                    type="text"
                    value={customRestaurant}
                    onChange={(e) => setCustomRestaurant(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Chipotle, McDonald's"
                  />
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes (optional)
              </label>
              <textarea
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                rows={2}
                placeholder="Any additional notes..."
              />
            </div>

            {/* Add Button */}
            <button
              onClick={handleAddCustom}
              className="w-full bg-blue-600 text-white font-medium py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Add to {dateKey}
            </button>
          </div>
        )}

        {/* SAVED MEALS MODE */}
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

            {savedMeals.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-400 mb-2">📖</div>
                <div className="text-sm font-medium text-gray-900 mb-1">
                  No saved meals yet
                </div>
                <div className="text-xs text-gray-600">
                  Go to Food Log to save meals for quick logging
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {savedMeals.map((meal) => {
                  const totalCals = meal.items.reduce((sum: number, item: any) => 
                    sum + (parseInt(item.calories) || 0), 0
                  );

                  return (
                    <div
                      key={meal.id}
                      className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors cursor-pointer"
                      onClick={() => {
                        onAddMeal(meal);
                        handleClose();
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900">{meal.meal_name}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {formatMealType(meal.meal_type)} · {meal.items.length} items · {totalCals} cal
                          </div>
                          {meal.notes && (
                            <div className="text-xs text-gray-600 mt-1">📝 {meal.notes}</div>
                          )}
                        </div>
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </div>
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