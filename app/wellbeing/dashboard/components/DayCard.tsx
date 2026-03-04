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
  onDeleteMeal: (dayDate: Date, mealType: string) => void;
  onMoveItemToMeal: (itemId: string, targetMealType: string) => void;
  onManualAdd: (dateKey: string) => void;
  expandedMeals: Set<string>;
  onToggleMeal: (mealType: string) => void;
  onSearchFoods: (query: string) => Promise<any[]>;
  onAddFoodToMeal: (dayDate: Date, mealType: string, food: any) => void;
  quickAddFoods: any[];
  // Incomplete-day flagging — days below 500 cal are excluded from averages.
  isIncomplete?: boolean;
  isOverridden?: boolean; // user clicked "Count anyway" to include this day
  onToggleOverride?: () => void;
  emptyMealTypes?: string[];
  // Optional user goals for showing targets and % progress in daily totals.
  goals?: {
    target_calories?: number;
    override_calories?: number;
    target_protein?: number;
    override_protein?: number;
    target_fat?: number;
    override_fat?: number;
    target_carbs?: number;
    override_carbs?: number;
    target_fiber?: number;
    override_fiber?: number;
    sugar_limit?: number;
    sodium_limit?: number;
  } | null;
}

export default function DayCard({
  day,
  dayKey,
  isExpanded,
  onToggleDay,
  onEditItem,
  onDeleteItem,
  onDeleteMeal,
  onMoveItemToMeal,
  onManualAdd,
  expandedMeals,
  onToggleMeal,
  onSearchFoods,
  onAddFoodToMeal,
  quickAddFoods,
  isIncomplete,
  isOverridden,
  onToggleOverride,
  emptyMealTypes = [],
  goals,
}: DayCardProps) {

  const [isBioExpanded, setIsBioExpanded] = useState(false);
  // Meals collapsible — all meals wrapped in one accordion section.
  const [isMealsExpanded, setIsMealsExpanded] = useState(true);

  const mealOrder: Record<string, number> = { breakfast: 0, lunch: 1, dinner: 2, snack: 3 };
  const mealsByType = new Map<string, any>((day.meals || []).map((meal: any) => [meal.meal_type, meal]));
  const visibleMealTypes = Array.from(
    new Set<string>([...(day.meals || []).map((meal: any) => meal.meal_type), ...emptyMealTypes])
  ).sort((a, b) => (mealOrder[a] ?? 999) - (mealOrder[b] ?? 999));

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

  // Resolve effective targets — override_* values take precedence over target_* values.
  const effCal = goals?.override_calories ?? goals?.target_calories ?? 0;
  const effProtein = goals?.override_protein ?? goals?.target_protein ?? 0;
  const effFat = goals?.override_fat ?? goals?.target_fat ?? 0;
  const effCarbs = goals?.override_carbs ?? goals?.target_carbs ?? 0;
  const effFiber = goals?.override_fiber ?? goals?.target_fiber ?? 0;
  const effSugar = goals?.sugar_limit ?? 0;
  const effSodium = goals?.sodium_limit ?? 0;

  /** Return a "X / Y (Z%)" label for a macro, or just "X" if no target is set. */
  const macroLabel = (actual: number, target: number, suffix = '') => {
    if (!target) return `${Math.round(actual)}${suffix}`;
    const pct = Math.round((actual / target) * 100);
    return `${Math.round(actual)}${suffix} / ${Math.round(target)}${suffix} (${pct}%)`;
  };

  /** Color code: green ≤105%, amber ≤130%, red >130% vs target. */
  const pctColor = (actual: number, target: number): string => {
    if (!target) return 'text-gray-900';
    const r = actual / target;
    if (r <= 1.05) return 'text-green-700';
    if (r <= 1.30) return 'text-amber-700';
    return 'text-red-600';
  };

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

          {/* Incomplete-day badge + override toggle */}
          {isIncomplete && (
            <div
              className="flex items-center gap-1.5 mt-1.5"
              onClick={(e) => e.stopPropagation()}
            >
              <span
                className={`px-1.5 py-0.5 text-[10px] font-medium rounded border ${
                  isOverridden
                    ? 'bg-gray-100 text-gray-500 border-gray-200'
                    : 'bg-amber-100 text-amber-700 border-amber-200'
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
          {/* Biodiversity score chip */}
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
          className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {isExpanded && (
        <div className="border-t border-gray-200 bg-gray-50 p-4">
          {/* ── Daily totals — now includes targets and % progress when goals exist ─ */}
          <div className="mb-4 p-3 bg-white rounded-lg border border-gray-200">
            <div className="text-xs font-medium text-gray-500 mb-2">Daily Totals</div>
            <div className="grid grid-cols-2 gap-3 text-sm mb-2 sm:grid-cols-4">
              <div>
                <div className="text-gray-600">Calories</div>
                <div className={`font-semibold text-sm ${pctColor(day.totals.calories, effCal)}`}>
                  {macroLabel(day.totals.calories, effCal)}
                </div>
              </div>
              <div>
                <div className="text-gray-600">Protein</div>
                <div className={`font-semibold text-sm ${pctColor(day.totals.protein, effProtein)}`}>
                  {macroLabel(day.totals.protein, effProtein, 'g')}
                </div>
              </div>
              <div>
                <div className="text-gray-600">Fat</div>
                <div className={`font-semibold text-sm ${pctColor(day.totals.fat, effFat)}`}>
                  {macroLabel(day.totals.fat, effFat, 'g')}
                </div>
              </div>
              <div>
                <div className="text-gray-600">Carbs</div>
                <div className={`font-semibold text-sm ${pctColor(day.totals.carbs, effCarbs)}`}>
                  {macroLabel(day.totals.carbs, effCarbs, 'g')}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 text-xs pt-2 border-t border-gray-100">
              <div>
                <div className="text-gray-500">Fiber</div>
                <div className={`font-medium ${pctColor(day.totals.fiber, effFiber)}`}>
                  {macroLabel(day.totals.fiber, effFiber, 'g')}
                </div>
              </div>
              <div>
                <div className="text-gray-500">Sugar {effSugar ? `(limit ${effSugar}g)` : ''}</div>
                <div className={`font-medium ${pctColor(day.totals.sugar, effSugar)}`}>
                  {Math.round(day.totals.sugar)}g
                </div>
              </div>
              <div>
                <div className="text-gray-500">Sodium {effSodium ? `(limit ${effSodium}mg)` : ''}</div>
                <div className={`font-medium ${pctColor(day.totals.sodium, effSodium)}`}>
                  {day.totals.sodium}mg
                </div>
              </div>
            </div>
          </div>

          {/* ── Biodiversity ── */}
          {day.biodiversity && (
            <div className="mb-4">
              <button
                onClick={() => setIsBioExpanded(!isBioExpanded)}
                className="w-full p-3 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl">🌱</span>
                  <span className="text-sm font-medium text-green-900">Biodiversity Score</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-green-700">
                    {day.biodiversity.total} unique whole foods
                  </span>
                  <svg
                    className={`w-4 h-4 text-green-600 transition-transform ${isBioExpanded ? 'rotate-180' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
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
                        <div className="text-xs text-gray-500">{day.biodiversity.items.nuts.slice(0, 3).join(', ')}</div>
                      )}
                    </div>
                    <div>
                      <div className="text-gray-600 mb-1">🫘 Legumes</div>
                      <div className="font-semibold text-gray-900 mb-1">{day.biodiversity.legumes}</div>
                      {day.biodiversity.items.legumes.length > 0 && (
                        <div className="text-xs text-gray-500">{day.biodiversity.items.legumes.slice(0, 3).join(', ')}</div>
                      )}
                    </div>
                    <div className="col-span-2">
                      <div className="text-gray-600 mb-1">🌾 Whole Grains</div>
                      <div className="font-semibold text-gray-900 mb-1">{day.biodiversity.wholeGrains}</div>
                      {day.biodiversity.items.wholeGrains.length > 0 && (
                        <div className="text-xs text-gray-500">{day.biodiversity.items.wholeGrains.slice(0, 3).join(', ')}</div>
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

          {/* ── Meals — wrapped in a collapsible "Meals" section ──────────────── */}
          <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
            <button
              type="button"
              onClick={() => setIsMealsExpanded((prev) => !prev)}
              className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition-colors"
            >
              <span className="text-sm font-semibold text-gray-900">Meals</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">
                  {visibleMealTypes.length} {visibleMealTypes.length === 1 ? 'meal' : 'meals'}
                </span>
                <svg
                  className={`w-4 h-4 text-gray-400 transition-transform ${isMealsExpanded ? 'rotate-180' : ''}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>

            {isMealsExpanded && (
              <div className="px-3 pb-3 space-y-2 border-t border-gray-100">
                {visibleMealTypes.map((mealType) => {
                  const meal = mealsByType.get(mealType) || {
                    meal_type: mealType,
                    items: [],
                    totals: { calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0, sugar: 0, sodium: 0 },
                    earliest_time: day.date.toISOString(),
                  };

                  return (
                    <MealCard
                      key={mealType}
                      meal={meal}
                      mealType={mealType}
                      dayDate={day.date}
                      isExpanded={expandedMeals.has(mealType)}
                      onToggle={() => onToggleMeal(mealType)}
                      onEditItem={onEditItem}
                      onDeleteItem={onDeleteItem}
                      onDeleteMeal={onDeleteMeal}
                      onMoveItemToMeal={onMoveItemToMeal}
                      onSearchFoods={onSearchFoods}
                      onAddFood={(food) => onAddFoodToMeal(day.date, mealType, food)}
                      quickAddFoods={quickAddFoods}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
