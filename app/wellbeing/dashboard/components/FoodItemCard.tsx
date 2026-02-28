'use client';

import { useState } from 'react';
import SourceBadge from '@/app/components/SourceBadge';
import BarcodeScanner from '@/app/components/BarcodeScanner';
import NutritionLabelCapture from '@/app/components/NutritionLabelCapture';

interface FoodItemCardProps {
  item: any;
  // Updates now include source, categories, whole_food_ingredients so a scan
  // result fully replaces the item's provenance, not just the macro numbers.
  onEdit: (itemId: string, updates: any) => void;
  onDelete: (itemId: string) => void;
}

export default function FoodItemCard({ item, onEdit, onDelete }: FoodItemCardProps) {
  const [isEditing, setIsEditing] = useState(false);

  // Edit form values — initialised from the item and updated on every keystroke
  // or scan. Source / categories / whole_food_ingredients are carried through
  // so they are preserved on a plain manual edit and replaced on a scan.
  const [editValues, setEditValues] = useState({
    food_name:              item.food_name,
    quantity:               item.quantity,
    calories:               item.calories,
    protein:                item.protein,
    fat:                    item.fat,
    carbs:                  item.carbs,
    fiber:                  item.fiber,
    sugar:                  item.sugar,
    sodium:                 item.sodium,
    source:                 item.source               ?? null,
    categories:             item.categories            ?? [],
    whole_food_ingredients: item.whole_food_ingredients ?? [],
  });

  // Scanner modal visibility — only rendered while editing
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [showLabelCapture,   setShowLabelCapture]   = useState(false);

  // ── Scan result handler ─────────────────────────────────────────────────────
  // Called by BarcodeScanner or NutritionLabelCapture after the user confirms
  // the review step.  Autofills all edit fields with the scanned values and
  // ensures the edit panel is open so the user can see (and adjust) them.
  const handleScanResult = (scanData: any) => {
    setEditValues({
      food_name:              String(scanData.food_name  || editValues.food_name),
      quantity:               String(scanData.quantity   || editValues.quantity),
      calories:               Number(scanData.calories)  || 0,
      protein:                Number(scanData.protein)   || 0,
      fat:                    Number(scanData.fat)       || 0,
      carbs:                  Number(scanData.carbs)     || 0,
      fiber:                  Number(scanData.fiber)     || 0,
      sugar:                  Number(scanData.sugar)     || 0,
      sodium:                 Number(scanData.sodium)    || 0,
      source:                 scanData.source            ?? null,
      categories:             scanData.categories            ?? [],
      whole_food_ingredients: scanData.whole_food_ingredients ?? [],
    });
    // Make the edit panel visible so the user sees the autofilled values
    setIsEditing(true);
    setShowBarcodeScanner(false);
    setShowLabelCapture(false);
  };

  const handleSave = () => {
    // Pass the full editValues (including source, categories, whole_food_ingredients)
    // so the parent can write all fields back to the database.
    onEdit(item.id, editValues);
    setIsEditing(false);
  };

  const handleCancel = () => {
    // Reset all fields to the original item values, discarding any edits / scan
    setEditValues({
      food_name:              item.food_name,
      quantity:               item.quantity,
      calories:               item.calories,
      protein:                item.protein,
      fat:                    item.fat,
      carbs:                  item.carbs,
      fiber:                  item.fiber,
      sugar:                  item.sugar,
      sodium:                 item.sodium,
      source:                 item.source               ?? null,
      categories:             item.categories            ?? [],
      whole_food_ingredients: item.whole_food_ingredients ?? [],
    });
    setIsEditing(false);
  };

  return (
    <div className="py-2 px-3 bg-gray-50 rounded-lg border border-gray-100">
      {isEditing ? (
        <div className="space-y-3">
          {/* Food Name & Quantity */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Food Name</label>
              <input
                type="text"
                value={editValues.food_name}
                onChange={(e) => setEditValues({...editValues, food_name: e.target.value})}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Quantity</label>
              <input
                type="text"
                value={editValues.quantity}
                onChange={(e) => setEditValues({...editValues, quantity: e.target.value})}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
              />
            </div>
          </div>

          {/* Macros */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Macronutrients</label>
            <div className="grid grid-cols-4 gap-2">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Calories</label>
                <input
                  type="number"
                  value={editValues.calories}
                  onChange={(e) => setEditValues({...editValues, calories: e.target.value})}
                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded text-center"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Protein (g)</label>
                <input
                  type="number"
                  step="0.1"
                  value={editValues.protein}
                  onChange={(e) => setEditValues({...editValues, protein: e.target.value})}
                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded text-center"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Fat (g)</label>
                <input
                  type="number"
                  step="0.1"
                  value={editValues.fat}
                  onChange={(e) => setEditValues({...editValues, fat: e.target.value})}
                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded text-center"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Carbs (g)</label>
                <input
                  type="number"
                  step="0.1"
                  value={editValues.carbs}
                  onChange={(e) => setEditValues({...editValues, carbs: e.target.value})}
                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded text-center"
                />
              </div>
            </div>
          </div>

          {/* Micros */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Micronutrients</label>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Fiber (g)</label>
                <input
                  type="number"
                  step="0.1"
                  value={editValues.fiber}
                  onChange={(e) => setEditValues({...editValues, fiber: e.target.value})}
                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded text-center"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Sugar (g)</label>
                <input
                  type="number"
                  step="0.1"
                  value={editValues.sugar}
                  onChange={(e) => setEditValues({...editValues, sugar: e.target.value})}
                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded text-center"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Sodium (mg)</label>
                <input
                  type="number"
                  value={editValues.sodium}
                  onChange={(e) => setEditValues({...editValues, sodium: e.target.value})}
                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded text-center"
                />
              </div>
            </div>
          </div>

          {/* Scan shortcuts — autofill all macro fields from a barcode or label photo */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Autofill from scan (replaces all values)
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowBarcodeScanner(true)}
                className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 border border-gray-300 rounded text-xs text-gray-700 hover:bg-gray-100 transition-colors"
              >
                {/* Barcode icon */}
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 6h2v12H4V6zm3 0h1v12H7V6zm2 0h2v12H9V6zm3 0h1v12h-1V6zm2 0h2v12h-2V6zm3 0h1v12h-1V6z" />
                </svg>
                Scan Barcode
              </button>
              <button
                type="button"
                onClick={() => setShowLabelCapture(true)}
                className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 border border-gray-300 rounded text-xs text-gray-700 hover:bg-gray-100 transition-colors"
              >
                {/* Camera icon */}
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Scan Label
              </button>
            </div>
          </div>

          {/* Save / Cancel */}
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="flex-1 px-3 py-1.5 bg-green-600 text-white text-xs rounded hover:bg-green-700"
            >
              Save
            </button>
            <button
              onClick={handleCancel}
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
                onClick={() => setIsEditing(true)}
                className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                title="Edit"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
              <button
                onClick={() => onDelete(item.id)}
                className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                title="Delete"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-600">
            <span><span className="font-medium text-gray-700">P:</span> {item.protein}g</span>
            <span><span className="font-medium text-gray-700">F:</span> {item.fat}g</span>
            <span><span className="font-medium text-gray-700">C:</span> {item.carbs}g</span>
            {item.fiber > 0 && <span><span className="font-medium text-gray-700">Fiber:</span> {item.fiber}g</span>}
            {item.sugar > 0 && <span><span className="font-medium text-gray-700">Sugar:</span> {item.sugar}g</span>}
            {item.sodium > 0 && <span><span className="font-medium text-gray-700">Sodium:</span> {item.sodium}mg</span>}
          </div>

          {item.notes && (
            <div className="mt-2 text-xs text-gray-600">
              📝 {item.notes}
            </div>
          )}

          {/* Source badge — persisted from log time; shows data provenance */}
          <SourceBadge source={item.source} />

          {item.eating_out && (
            <div className="mt-2">
              <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded">
                🍽️ Eating Out
              </span>
            </div>
          )}

          {item.categories && item.categories.length > 0 && (
            <div className="flex gap-1.5 flex-wrap mt-2">
              {item.categories.map((cat: string, i: number) => (
                <span key={i} className="px-1.5 py-0.5 bg-white border border-gray-200 text-gray-600 text-xs rounded">
                  {cat}
                </span>
              ))}
            </div>
          )}
        </>
      )}

      {/* Scanner modals — rendered outside the edit form so they overlay the full page */}
      {showBarcodeScanner && (
        <BarcodeScanner
          onResult={handleScanResult}
          onClose={() => setShowBarcodeScanner(false)}
        />
      )}
      {showLabelCapture && (
        <NutritionLabelCapture
          onResult={handleScanResult}
          onClose={() => setShowLabelCapture(false)}
        />
      )}
    </div>
  );
}
