'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import QuantityInput from '@/app/components/QuantityInput';

interface PantryItem {
  id: string;
  item_name: string;
  quantity: number;
  unit: string;
  storage_location: 'fridge' | 'freezer' | 'pantry';
  total_quantity: number;
  allocated_quantity: number;
  available_quantity: number;
  calories_per_serving: number;
  protein_per_serving: number;
  fat_per_serving: number;
  carbs_per_serving: number;
  fiber_per_serving: number;
  sugar_per_serving: number;
  sodium_per_serving: number;
  serving_size: string;
  servings_count: number;
  expiration_date: string | null;
  date_added: string;
  estimated_expiration: boolean;
}

interface PantrySectionProps {
  userId: string;
}

export default function PantrySection({ userId }: PantrySectionProps) {
  const [items, setItems] = useState<PantryItem[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQuantity, setEditQuantity] = useState('');
  const [editUnit, setEditUnit] = useState('');
  const [editServings, setEditServings] = useState('');
  const [editStorage, setEditStorage] = useState<'fridge' | 'freezer' | 'pantry'>('fridge');
  const [editExpiration, setEditExpiration] = useState('');
  const [showExpiring, setShowExpiring] = useState(false);

  useEffect(() => {
    loadPantry();
  }, [userId]);

  const loadPantry = async () => {
    const { data, error } = await supabase
      .from('pantry_items')
      .select('*')
      .eq('user_id', userId)
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
        // Get macros
        const macroResponse = await fetch('/api/get-food-macros', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ foodName: itemName })
        });

        if (!macroResponse.ok) continue;

        const macroData = await macroResponse.json();

        // Estimate expiration
        const expirationResponse = await fetch('/api/estimate-expiration', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            foodName: itemName,
            storageLocation: 'fridge',
            dateAdded: new Date().toISOString().split('T')[0]
          })
        });

        let expirationDate = null;
        let estimatedExpiration = false;
        if (expirationResponse.ok) {
          const expirationData = await expirationResponse.json();
          expirationDate = expirationData.expiration_date;
          estimatedExpiration = expirationData.estimated;
        }

        // Add to pantry
        await supabase.from('pantry_items').insert({
          user_id: userId,
          item_name: itemName,
          quantity: 1,
          unit: 'piece',
          storage_location: 'fridge',
          total_quantity: 1,
          allocated_quantity: 0,
          calories_per_serving: macroData.food.calories_per_100g || 0,
          protein_per_serving: macroData.food.protein_per_100g || 0,
          fat_per_serving: macroData.food.fat_per_100g || 0,
          carbs_per_serving: macroData.food.carbs_per_100g || 0,
          fiber_per_serving: macroData.food.fiber_per_100g || 0,
          sugar_per_serving: macroData.food.sugar_per_100g || 0,
          sodium_per_serving: macroData.food.sodium_per_100mg || 0,
          serving_size: '100g',
          servings_count: 1,
          expiration_date: expirationDate,
          estimated_expiration: estimatedExpiration,
        });
      }

      setInputText('');
      loadPantry();
    } catch (error) {
      console.error('Error adding items:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteItem = async (id: string) => {
    await supabase.from('pantry_items').delete().eq('id', id);
    loadPantry();
  };

  const startEditing = (item: PantryItem) => {
    setEditingId(item.id);
    setEditQuantity(item.quantity.toString());
    setEditUnit(item.unit);
    setEditServings(item.servings_count.toString());
    setEditStorage(item.storage_location);
    setEditExpiration(item.expiration_date || '');
  };

  const saveEdit = async (id: string) => {
    await supabase
      .from('pantry_items')
      .update({
        quantity: parseFloat(editQuantity) || 1,
        total_quantity: parseFloat(editQuantity) || 1,
        unit: editUnit,
        servings_count: parseFloat(editServings) || 1,
        storage_location: editStorage,
        expiration_date: editExpiration || null,
        estimated_expiration: false,
      })
      .eq('id', id);

    setEditingId(null);
    loadPantry();
  };

  const moveToGrocery = async (item: PantryItem) => {
    // Add to grocery list
    await supabase.from('grocery_list_items').insert({
      user_id: userId,
      item_name: item.item_name,
      quantity: item.quantity,
      unit: item.unit,
      calories_per_serving: item.calories_per_serving,
      protein_per_serving: item.protein_per_serving,
      fat_per_serving: item.fat_per_serving,
      carbs_per_serving: item.carbs_per_serving,
      fiber_per_serving: item.fiber_per_serving,
      sugar_per_serving: item.sugar_per_serving,
      sodium_per_serving: item.sodium_per_serving,
      serving_size: item.serving_size,
      servings_count: item.servings_count,
      checked: false,
    });

    // Delete from pantry
    await deleteItem(item.id);
  };

  // Calculate days until expiration
  const getDaysUntilExpiry = (expirationDate: string | null) => {
    if (!expirationDate) return null;
    const today = new Date();
    const expiry = new Date(expirationDate);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Get items expiring soon
  const expiringItems = items
    .filter(item => {
      const days = getDaysUntilExpiry(item.expiration_date);
      return days !== null && days <= 7;
    })
    .sort((a, b) => {
      const daysA = getDaysUntilExpiry(a.expiration_date) || 999;
      const daysB = getDaysUntilExpiry(b.expiration_date) || 999;
      return daysA - daysB;
    })
    .slice(0, 10);

  return (
    <div className="p-6 space-y-6">
      
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
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
          />
          <button
            onClick={addItems}
            disabled={isLoading}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300"
          >
            {isLoading ? 'Adding...' : 'Add'}
          </button>
        </div>
      </div>

      {/* Items List */}
      <div className="space-y-2">
        {items.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            No items in your pantry yet
          </div>
        ) : (
          items.map((item) => {
            const daysUntilExpiry = getDaysUntilExpiry(item.expiration_date);
            const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry <= 7;
            const isExpired = daysUntilExpiry !== null && daysUntilExpiry < 0;

            return (
              <div
                key={item.id}
                className={`border rounded-lg p-4 bg-white ${
                  isExpired ? 'border-red-300' : isExpiringSoon ? 'border-yellow-300' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className={`font-medium ${isExpired ? 'text-red-700' : 'text-gray-900'}`}>
                        {item.item_name}
                      </h3>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        item.storage_location === 'fridge' ? 'bg-blue-100 text-blue-700' :
                        item.storage_location === 'freezer' ? 'bg-cyan-100 text-cyan-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {item.storage_location}
                      </span>
                    </div>
                    
                    {editingId === item.id ? (
                      <div className="mt-3 space-y-3">
                        <QuantityInput
                          number={editQuantity}
                          unit={editUnit}
                          onNumberChange={setEditQuantity}
                          onUnitChange={setEditUnit}
                          label="Quantity"
                        />
                        
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Storage Location</label>
                          <select
                            value={editStorage}
                            onChange={(e) => setEditStorage(e.target.value as any)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          >
                            <option value="fridge">Fridge</option>
                            <option value="freezer">Freezer</option>
                            <option value="pantry">Pantry</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Servings</label>
                          <input
                            type="number"
                            step="0.1"
                            value={editServings}
                            onChange={(e) => setEditServings(e.target.value)}
                            className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                        </div>

                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Expiration Date</label>
                          <input
                            type="date"
                            value={editExpiration}
                            onChange={(e) => setEditExpiration(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          />
                        </div>

                        <div className="flex gap-2">
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
                          Available: {item.available_quantity} {item.unit}
                          {item.allocated_quantity > 0 && (
                            <span className="text-orange-600 ml-2">
                              ({item.allocated_quantity} allocated)
                            </span>
                          )}
                        </div>

                        {item.expiration_date && (
                          <div className={`text-xs mt-1 ${
                            isExpired ? 'text-red-600 font-semibold' :
                            isExpiringSoon ? 'text-yellow-700 font-semibold' :
                            'text-gray-500'
                          }`}>
                            {isExpired ? (
                              `⚠️ Expired ${Math.abs(daysUntilExpiry!)} days ago`
                            ) : isExpiringSoon ? (
                              `⚠️ Expires in ${daysUntilExpiry} days`
                            ) : (
                              `Expires: ${new Date(item.expiration_date).toLocaleDateString()}`
                            )}
                            {item.estimated_expiration && ' (estimated)'}
                          </div>
                        )}
                        
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
                  {editingId !== item.id && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEditing(item)}
                        className="text-purple-600 hover:text-purple-700 text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => moveToGrocery(item)}
                        className="text-blue-600 hover:text-blue-700 text-sm"
                      >
                        → Grocery
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
              </div>
            );
          })
        )}
      </div>

      {/* Close to Expiry Section */}
      {expiringItems.length > 0 && (
        <div className="border-t pt-6">
          <button
            onClick={() => setShowExpiring(!showExpiring)}
            className="w-full flex items-center justify-between px-4 py-3 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">⚠️</span>
              <span className="font-medium text-red-900">
                Close to Expiry ({expiringItems.length} items)
              </span>
            </div>
            <svg
              className={`w-5 h-5 text-red-600 transition-transform ${showExpiring ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showExpiring && (
            <div className="mt-2 space-y-2">
              {expiringItems.map(item => {
                const days = getDaysUntilExpiry(item.expiration_date);
                const isExpired = days !== null && days < 0;
                
                return (
                  <div key={item.id} className="px-4 py-2 bg-white border border-red-200 rounded">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900">{item.item_name}</div>
                        <div className={`text-xs ${isExpired ? 'text-red-600 font-semibold' : 'text-red-700'}`}>
                          {isExpired ? `Expired ${Math.abs(days!)} days ago` : `Expires in ${days} days`}
                        </div>
                      </div>
                      <span className="text-xs text-gray-500">
                        {item.available_quantity} {item.unit}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

    </div>
  );
}