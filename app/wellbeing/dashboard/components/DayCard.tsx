'use client';

import { useState } from 'react';
import MealCard from './MealCard';

interface DayCardProps {
  day: any;
  dayKey: string;
  isExpanded: boolean;
  onToggleDay: () => void;
  onEditItem: (itemId: string, updates: any) => void;
  onDeleteItem: (itemId: string) => void;
  onManualAdd: (dateKey: string) => void;
  expandedMeals: Set<string>;
  onToggleMeal: (mealType: string) => void;
  // Incomplete-day flagging — days below 500 cal are excluded from averages
  isIncomplete?:     boolean;
  isOverridden?:     boolean;   // user clicked "Count anyway" to include this day
  onToggleOverride?: () => void;
}

export default function DayCard({
  day,
  dayKey,
  isExpanded,
  onToggleDay,
  onEditItem,
  onDeleteItem,
  onManualAdd,
  expandedMeals,
  onToggleMeal,
  isIncomplete,
  isOverridden,
  onToggleOverride,
}: DayCardProps) {
  
  const [isBioExpanded, setIsBioExpanded] = useState(false);

  const formatDate = (date: Date) => {
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
      });
    }
  };

  const isToday = day.dateKey === new Date().toDateString();

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      {/* Converted from <button> to <div> to allow nested interactive elements
          (incomplete override button) without violating the button-in-button HTML rule */}
      <div
        onClick={onToggleDay}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && onToggleDay()}
        className="w-full px-5 py-4 text-left hover:bg-gray-50 transition-colors flex items-center justify-between cursor-pointer"
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

          {/* Incomplete-day badge + override toggle — only shown for low-calorie days.
              stopPropagation prevents the day expand/collapse from firing when clicked. */}
          {isIncomplete && (
            <div
              className="flex items-center gap-1.5 mt-1.5"
              onClick={(e) => e.stopPropagation()}
            >
              <span
                className={`px-1.5 py-0.5 text-[10px] font-medium rounded border ${
                  isOverridden
                    ? 'bg-gray-100 text-gray-500 border-gray-200'   // muted when user is counting it
                    : 'bg-amber-100 text-amber-700 border-amber-200' // amber warning when excluded
                }`}
              >
                {isOverridden ? '⚠ Low data (counting)' : '⚠ Low data'}
              </span>
              <button
                type="button"
                onClick={() => onToggleOverride?.()}
                className="text-[10px] text-blue-600 hover:underline"
              >
                {isOverridden ? 'Remove override' : 'Count anyway'}
              </button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-4">
          {/* Biodiversity Score */}
          {day.biodiversity && (
            <div className="text-right">
              <div className="text-xs text-gray-500">Biodiversity</div>
              <div className="text-sm font-semibold text-green-600">
                {day.biodiversity.total} foods
              </div>
            </div>
          )}
          <div className="text-right mr-4">
            <div className="font-semibold text-gray-900">
              {day.totals.calories} cal
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              {day.meals.length} {day.meals.length === 1 ? 'meal' : 'meals'}
            </div>
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
      </div>

      {isExpanded && (
        <div className="border-t border-gray-200 bg-gray-50 p-4">
          {/* Daily totals */}
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

          {/* Biodiversity - Expanded */}
          {day.biodiversity && (
            <div className="mb-4">
              <button
                onClick={() => setIsBioExpanded(!isBioExpanded)}
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
          )}

          {/* Manual Add Button */}
          <div className="mb-4">
            <button
              onClick={() => onManualAdd(day.dateKey)}
              className="w-full px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              + Add Meal to This Day
            </button>
          </div>

          {/* Meals */}
          <div className="space-y-2">
            {day.meals.map((meal: any) => (
              <MealCard
                key={meal.meal_type}
                meal={meal}
                isExpanded={expandedMeals.has(meal.meal_type)}
                onToggle={() => onToggleMeal(meal.meal_type)}
                onEditItem={onEditItem}
                onDeleteItem={onDeleteItem}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}