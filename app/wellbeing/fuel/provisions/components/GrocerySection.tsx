'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import QuantityInput from '@/app/components/QuantityInput';

interface GroceryItem {
  id: string;
  item_name: string;
  quantity: number;
  unit: string;
  calories_per_serving: number;
  protein_per_serving: number;
  fat_per_serving: number;
  carbs_per_serving: number;
  fiber_per_serving: number;
  sugar_per_serving: number;
  sodium_per_serving: number;
  serving_size: string;
  servings_count: number;
  checked: boolean;
  checked_at: string | null;
  meal_group: string | null;
}

interface GroceryListSectionProps {
  userId: string;
}

export default function GroceryListSection({ userId }: GroceryListSectionProps) {
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [daysInput, setDaysInput] = useState('7');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQuantity, setEditQuantity] = useState('');
  const [editUnit, setEditUnit] = useState('');
  const [editServings, setEditServings] = useState('');
  const [lastCheckedId, setLastCheckedId] = useState<string | null>(null);

  useEffect(() => {
    loadGroceryList();
  }, [userId]);

  const loadGroceryList = async () => {
    const { data, error } = await supabase
      .from('grocery_list_items')
      .select('*')
      .eq('user_id', userId)
      .order('checked', { ascending: true })
      .order('created_at', { ascending: false });

    if (data) {
      setItems(data);
    }
  };

  const addItems = async () => {
    if (!inputText.trim()) return;

    setIsLoading(true);

    try {
      const itemsList = inputText.split(',').map(item => item.trim()).filter(item => item);

      for (const itemName of itemsList) {
        // Get macros for the item
        const macroResponse = await fetch('/api/get-food-macros', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ foodName: itemName })
        });

        if (!macroResponse.ok) continue;

        const macroData = await macroResponse.json();

        // Add to grocery list
        await supabase.from('grocery_list_items').insert({
          user_id: userId,
          item_name: itemName,
          quantity: 1,
          unit: 'piece',
          calories_per_serving: macroData.food.calories_per_100g || 0,
          protein_per_serving: macroData.food.protein_per_100g || 0,
          fat_per_serving: macroData.food.fat_per_100g || 0,
          carbs_per_serving: macroData.food.carbs_per_100g || 0,
          fiber_per_serving: macroData.food.fiber_per_100g || 0,
          sugar_per_serving: macroData.food.sugar_per_100g || 0,
          sodium_per_serving: macroData.food.sodium_per_100mg || 0,
          serving_size: '100g',
          servings_count: 1,
          checked: false,
        });
      }

      setInputText('');
      loadGroceryList();
    } catch (error) {
      console.error('Error adding items:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleChecked = async (item: GroceryItem) => {
    const newCheckedState = !item.checked;
    
    await supabase
      .from('grocery_list_items')
      .update({ 
        checked: newCheckedState,
        checked_at: newCheckedState ? new Date().toISOString() : null
      })
      .eq('id', item.id);

    if (newCheckedState) {
      setLastCheckedId(item.id);
    }

    loadGroceryList();
  };

  const undoCheck = async () => {
    if (!lastCheckedId) return;

    await supabase
      .from('grocery_list_items')
      .update({ checked: false, checked_at: null })
      .eq('id', lastCheckedId);

    setLastCheckedId(null);
    loadGroceryList();
  };

  const deleteItem = async (id: string) => {
    await supabase.from('grocery_list_items').delete().eq('id', id);
    
    if (lastCheckedId === id) {
      setLastCheckedId(null);
    }
    
    loadGroceryList();
  };

  const startEditing = (item: GroceryItem) => {
    setEditingId(item.id);
    setEditQuantity(item.quantity.toString());
    setEditUnit(item.unit);
    setEditServings(item.servings_count.toString());
  };

  const saveEdit = async (id: string) => {
    await supabase
      .from('grocery_list_items')
      .update({
        quantity: parseFloat(editQuantity) || 1,
        unit: editUnit,
        servings_count: parseFloat(editServings) || 1,
      })
      .eq('id', id);

    setEditingId(null);
    loadGroceryList();
  };

  const moveToPantry = async (item: GroceryItem) => {
    // Estimate expiration
    const expirationResponse = await fetch('/api/estimate-expiration', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        foodName: item.item_name,
        storageLocation: 'fridge',
        dateAdded: new Date().toISOString().split('T')[0]
      })
    });

    let expirationDate = null;
    if (expirationResponse.ok) {
      const expirationData = await expirationResponse.json();
      expirationDate = expirationData.expiration_date;
    }

    // Add to pantry
    await supabase.from('pantry_items').insert({
      user_id: userId,
      item_name: item.item_name,
      quantity: item.quantity,
      unit: item.unit,
      storage_location: 'fridge',
      total_quantity: item.quantity,
      allocated_quantity: 0,
      calories_per_serving: item.calories_per_serving,
      protein_per_serving: item.protein_per_serving,
      fat_per_serving: item.fat_per_serving,
      carbs_per_serving: item.carbs_per_serving,
      fiber_per_serving: item.fiber_per_serving,
      sugar_per_serving: item.sugar_per_serving,
      sodium_per_serving: item.sodium_per_serving,
      serving_size: item.serving_size,
      servings_count: item.servings_count,
      expiration_date: expirationDate,
      estimated_expiration: !!expirationDate,
    });

    // Mark as checked
    await supabase
      .from('grocery_list_items')
      .update({ checked: true, checked_at: new Date().toISOString() })
      .eq('id', item.id);

    setLastCheckedId(item.id);
    loadGroceryList();
  };

  // Calculate totals
  const cartTotalCalories = items
    .filter(item => !item.checked)
    .reduce((sum, item) => sum + (item.calories_per_serving * item.servings_count), 0);

  const days = parseInt(daysInput) || 7;
  const caloriesPerDay = Math.round(cartTotalCalories / days);

  return (
    <div className="p-6 space-y-6">
      
      {/* Cart Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="text-sm text-blue-700 font-medium">Cart Total</div>
            <div className="text-2xl font-bold text-blue-900">
              {cartTotalCalories.toLocaleString()} cal
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-blue-600 mb-1">Daily Average</div>
            <div className="flex items-baseline gap-2">
              <input
                type="number"
                value={daysInput}
                onChange={(e) => setDaysInput(e.target.value)}
                className="w-16 px-2 py-1 border border-blue-300 rounded text-sm text-center"
                min="1"
              />
              <span className="text-xs text-blue-600">days</span>
            </div>
            <div className="text-lg font-semibold text-blue-900 mt-1">
              {caloriesPerDay.toLocaleString()} cal/day
            </div>
          </div>
        </div>
      </div>

      {/* Undo Button */}
      {lastCheckedId && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-center justify-between">
          <span className="text-sm text-yellow-800">Item checked off</span>
          <button
            onClick={undoCheck}
            className="px-3 py-1 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700"
          >
            Undo
          </button>
        </div>
      )}

      {/* Input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Add Items (comma-separated)
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addItems()}
            placeholder="e.g., chicken breast, broccoli, rice"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={addItems}
            disabled={isLoading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
          >
            {isLoading ? 'Adding...' : 'Add'}
          </button>
        </div>
      </div>

      {/* Items List */}
      <div className="space-y-2">
        {items.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            No items in your grocery list yet
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className={`border rounded-lg p-4 ${
                item.checked ? 'bg-gray-50 opacity-60' : 'bg-white'
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Checkbox */}
                <input
                  type="checkbox"
                  checked={item.checked}
                  onChange={() => toggleChecked(item)}
                  className="mt-1 w-5 h-5 text-blue-600 rounded"
                />

                {/* Content */}
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className={`font-medium ${item.checked ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                        {item.item_name}
                      </h3>
                      
                      {editingId === item.id ? (
                        <div className="mt-2">
                          <QuantityInput
                            number={editQuantity}
                            unit={editUnit}
                            onNumberChange={setEditQuantity}
                            onUnitChange={setEditUnit}
                            label=""
                          />
                          <div className="mt-2">
                            <label className="block text-xs text-gray-600 mb-1">Servings</label>
                            <input
                              type="number"
                              step="0.1"
                              value={editServings}
                              onChange={(e) => setEditServings(e.target.value)}
                              className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                          </div>
                          <div className="flex gap-2 mt-2">
                            <button
                              onClick={() => saveEdit(item.id)}
                              className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="px-3 py-1 bg-gray-300 text-gray-700 text-sm rounded hover:bg-gray-400"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="text-sm text-gray-600 mt-1">
                            {item.quantity} {item.unit}
                          </div>
                          
                          {/* Macros */}
                          <div className="mt-2 text-xs text-gray-500 space-y-0.5">
                            <div>
                              <span className="font-medium">Per serving:</span> {Math.round(item.calories_per_serving)} cal, 
                              P: {Math.round(item.protein_per_serving)}g, 
                              F: {Math.round(item.fat_per_serving)}g, 
                              C: {Math.round(item.carbs_per_serving)}g
                            </div>
                            <div>
                              <span className="font-medium">Servings:</span>{' '}
                              {item.servings_count} ({Math.round(item.calories_per_serving * item.servings_count)} cal total)
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Actions */}
                    {!item.checked && editingId !== item.id && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => startEditing(item)}
                          className="text-blue-600 hover:text-blue-700 text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => moveToPantry(item)}
                          className="text-green-600 hover:text-green-700 text-sm"
                        >
                          → Pantry
                        </button>
                        <button
                          onClick={() => deleteItem(item.id)}
                          className="text-red-600 hover:text-red-700 text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>

                  {item.meal_group && (
                    <div className="mt-2 text-xs text-gray-500 italic">
                      From: {item.meal_group}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
}