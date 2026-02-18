'use client';

import FoodItemCard from './FoodItemCard';

interface MealCardProps {
  meal: any;
  isExpanded: boolean;
  onToggle: () => void;
  onEditItem: (itemId: string, updates: any) => void;
  onDeleteItem: (itemId: string) => void;
}

export default function MealCard({ meal, isExpanded, onToggle, onEditItem, onDeleteItem }: MealCardProps) {
  
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

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
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
              isExpanded ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {isExpanded && (
        <div className="px-3 pb-3 space-y-1.5 border-t border-gray-100">
          {meal.items.map((item: any, idx: number) => (
            <FoodItemCard
              key={idx}
              item={item}
              onEdit={onEditItem}
              onDelete={onDeleteItem}
            />
          ))}
        </div>
      )}
    </div>
  );
}