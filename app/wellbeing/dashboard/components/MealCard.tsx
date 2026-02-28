'use client';

import { useEffect, useState } from 'react';
import FoodItemCard from './FoodItemCard';

interface MealCardProps {
  meal: any;
  mealType: string;
  dayDate: Date;
  isExpanded: boolean;
  onToggle: () => void;
  onEditItem: (itemId: string, updates: any) => void;
  onDeleteItem: (itemId: string) => void;
  onDeleteMeal: (dayDate: Date, mealType: string) => void;
  onMoveItemToMeal: (itemId: string, targetMealType: string) => void;
  onSearchFoods: (query: string) => Promise<any[]>;
  onAddFood: (food: any) => void;
  quickAddFoods: any[];
}

export default function MealCard({
  meal,
  mealType,
  dayDate,
  isExpanded,
  onToggle,
  onEditItem,
  onDeleteItem,
  onDeleteMeal,
  onMoveItemToMeal,
  onSearchFoods,
  onAddFood,
  quickAddFoods,
}: MealCardProps) {
  const [showAddFood, setShowAddFood] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  
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

  const getItemSummary = (items: any[]) => {
    const names = (items || [])
      .map((item) => String(item.food_name || '').trim())
      .filter(Boolean);

    if (names.length === 0) return 'No items';
    return names.join(', ');
  };

  useEffect(() => {
    if (!showAddFood) return;

    const query = searchText.trim();
    if (!query) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      const results = await onSearchFoods(query);
      setSearchResults(results);
      setSearching(false);
    }, 250);

    return () => clearTimeout(timer);
  }, [searchText, showAddFood, onSearchFoods]);

  return (
    <div
      className={`bg-white border rounded-lg overflow-hidden transition-colors ${
        isDragOver ? 'border-blue-400 bg-blue-50/40' : 'border-gray-200'
      }`}
      onDragOver={(e) => {
        const raw = e.dataTransfer.getData('text/plain');
        if (!raw) return;
        try {
          const parsed = JSON.parse(raw);
          if (parsed?.itemId && parsed?.sourceMealType !== mealType) {
            e.preventDefault();
            if (!isDragOver) setIsDragOver(true);
          }
        } catch {
          // Ignore non-item drags
        }
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOver(false);
        const raw = e.dataTransfer.getData('text/plain');
        if (!raw) return;
        try {
          const parsed = JSON.parse(raw);
          if (parsed?.itemId && parsed?.sourceMealType && parsed.sourceMealType !== mealType) {
            onMoveItemToMeal(parsed.itemId, mealType);
          }
        } catch {
          // Ignore malformed drop payloads
        }
      }}
    >
      <div
        onClick={onToggle}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && onToggle()}
        className="w-full p-3 text-left hover:bg-gray-50 transition-colors flex items-center justify-between"
      >
        <div className="flex-1">
          <div className="font-medium text-gray-900 text-sm">
            {formatMealType(meal.meal_type)}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">
            {formatTime(meal.earliest_time)} · {getItemSummary(meal.items)}
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
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteMeal(dayDate, mealType);
            }}
            className="text-sm px-2 py-1 rounded hover:bg-red-50"
            title="Delete whole meal"
            aria-label="Delete whole meal"
          >
            🗑️
          </button>
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${
              isExpanded ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {isExpanded && (
        <div className="px-3 pb-3 space-y-1.5 border-t border-gray-100">
          {meal.items.map((item: any, idx: number) => (
            <div
              key={item.id || `${meal.meal_type}-${idx}-${item.food_name || 'item'}`}
              draggable={Boolean(item.id)}
              onDragStart={(e) => {
                if (!item.id) return;
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData(
                  'text/plain',
                  JSON.stringify({ itemId: item.id, sourceMealType: mealType })
                );
              }}
              className={item.id ? 'cursor-grab active:cursor-grabbing' : ''}
              title={item.id ? 'Drag to move to another meal' : undefined}
            >
              <FoodItemCard
                item={item}
                onEdit={onEditItem}
                onDelete={onDeleteItem}
              />
            </div>
          ))}

          <div className="pt-2">
            <button
              type="button"
              onClick={() => setShowAddFood(!showAddFood)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              {showAddFood ? 'Hide Add Food' : 'Add Food to This Meal'}
            </button>

            {showAddFood && (
              <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-2">
                {quickAddFoods.length > 0 && (
                  <div>
                    <div className="text-xs font-medium text-gray-600 mb-1.5">Top 5 foods</div>
                    <div className="flex flex-wrap gap-1.5">
                      {quickAddFoods.slice(0, 5).map((food, idx) => (
                        <button
                          key={`quick-${meal.meal_type}-${idx}-${food.food_name}`}
                          type="button"
                          onClick={() => onAddFood(food)}
                          className="px-2 py-1 text-xs border border-gray-300 rounded-md bg-white hover:bg-gray-100 text-gray-700"
                        >
                          + {food.food_name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <input
                    type="text"
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    placeholder="Search your food history..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                  />
                </div>

                {searching && <div className="text-xs text-gray-500">Searching...</div>}

                {searchResults.length > 0 && (
                  <div className="space-y-1.5">
                    {searchResults.map((food, idx) => (
                      <div
                        key={`${food.food_name}-${idx}-${meal.meal_type}-${dayDate.toDateString()}`}
                        className="flex items-center justify-between gap-2 rounded-md border border-gray-200 bg-white px-2 py-1.5"
                      >
                        <div className="min-w-0">
                          <div className="text-sm text-gray-900 truncate">{food.food_name}</div>
                          <div className="text-xs text-gray-500 truncate">
                            {food.quantity || '1 serving'} · {food.calories || 0} cal
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => onAddFood(food)}
                          className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                        >
                          Add
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
