'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import BarcodeScanner from '@/app/components/BarcodeScanner';
import NutritionLabelCapture from '@/app/components/NutritionLabelCapture';
import SourceBadge from '@/app/components/SourceBadge';

type FoodTemplate = {
  food_name: string;
  serving_size: string;
  amount: number;
  quantity: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber: number;
  sugar: number;
  sodium: number;
  base_calories: number;
  base_protein: number;
  base_fat: number;
  base_carbs: number;
  base_fiber: number;
  base_sugar: number;
  base_sodium: number;
  categories: string[];
  whole_food_ingredients: string[];
  source?: string | null;
  usageCount?: number;
  lastLoggedAt?: string | null;
};

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
  const [savedFoods, setSavedFoods] = useState<FoodTemplate[]>([]);
  const [isLoadingSavedFoods, setIsLoadingSavedFoods] = useState(true);
  const [editingSavedMeal, setEditingSavedMeal] = useState<string | null>(null);
  const [editingSavedMealData, setEditingSavedMealData] = useState<any>(null);
  const [showSavedMeals, setShowSavedMeals] = useState(false);
  const [showSavedFoods, setShowSavedFoods] = useState(false);
  const [savedFoodSearch, setSavedFoodSearch] = useState('');
  const [savedFoodSearchResults, setSavedFoodSearchResults] = useState<FoodTemplate[]>([]);
  const [isSavedFoodSearching, setIsSavedFoodSearching] = useState(false);

  const [showSaveMealModal, setShowSaveMealModal] = useState(false);
  const [mealToSave, setMealToSave] = useState<any>(null);
  const [saveMealName, setSaveMealName] = useState('');
  const [saveMealNotes, setSaveMealNotes] = useState('');

  // ── Scanner modals ─────────────────────────────────────────────────────────
  // showBarcodeScanner / showLabelCapture toggle the respective modal overlays.
  // scanTargetMeal + scanTargetItem are set when the scan is triggered from an
  // expanded item edit panel; null means it's a fresh scan from the main form.
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [showLabelCapture, setShowLabelCapture]     = useState(false);
  const [scanTargetMeal, setScanTargetMeal]         = useState<number | null>(null);
  const [scanTargetItem, setScanTargetItem]         = useState<number | null>(null);
  const [mealAddFoodOpen, setMealAddFoodOpen]       = useState<Set<number>>(new Set());
  const [mealFoodSearch, setMealFoodSearch]         = useState<Map<number, string>>(new Map());
  const [mealFoodSearchResults, setMealFoodSearchResults] = useState<Map<number, FoodTemplate[]>>(new Map());
  const [mealFoodSearching, setMealFoodSearching]   = useState<Map<number, boolean>>(new Map());
  const [draggingItem, setDraggingItem] = useState<{ mealIndex: number; itemIndex: number } | null>(null);
  const [dragOverMeal, setDragOverMeal] = useState<number | null>(null);

  const toSafeAmount = (raw: any) => {
    const n = parseFloat(String(raw));
    return Number.isFinite(n) && n > 0 ? n : 1;
  };

  const parseQuantityComposite = (quantityRaw: any) => {
    const quantity = String(quantityRaw || '').trim();
    const matched = quantity.match(/^(\d*\.?\d+)\s*[x×]\s+(.+)$/i);
    if (matched) {
      return { amount: toSafeAmount(matched[1]), servingSize: matched[2].trim() || '1 serving' };
    }
    return { amount: 1, servingSize: quantity || '1 serving' };
  };

  const formatQuantity = (servingSizeRaw: any, amountRaw: any) => {
    const servingSize = String(servingSizeRaw || '1 serving').trim() || '1 serving';
    const amount = toSafeAmount(amountRaw);
    return amount === 1 ? servingSize : `${amount} x ${servingSize}`;
  };

  const normalizeItemForEditing = (item: any) => {
    const parsedQuantity = parseQuantityComposite(item.quantity);
    const amount = toSafeAmount(item.amount ?? parsedQuantity.amount);
    const servingSize = String(item.serving_size || parsedQuantity.servingSize || '1 serving').trim() || '1 serving';

    const calories = Number(item.calories) || 0;
    const protein = Number(item.protein) || 0;
    const fat = Number(item.fat) || 0;
    const carbs = Number(item.carbs) || 0;
    const fiber = Number(item.fiber) || 0;
    const sugar = Number(item.sugar) || 0;
    const sodium = Number(item.sodium) || 0;

    const baseCalories = Number.isFinite(Number(item.base_calories)) ? Number(item.base_calories) : calories / amount;
    const baseProtein = Number.isFinite(Number(item.base_protein)) ? Number(item.base_protein) : protein / amount;
    const baseFat = Number.isFinite(Number(item.base_fat)) ? Number(item.base_fat) : fat / amount;
    const baseCarbs = Number.isFinite(Number(item.base_carbs)) ? Number(item.base_carbs) : carbs / amount;
    const baseFiber = Number.isFinite(Number(item.base_fiber)) ? Number(item.base_fiber) : fiber / amount;
    const baseSugar = Number.isFinite(Number(item.base_sugar)) ? Number(item.base_sugar) : sugar / amount;
    const baseSodium = Number.isFinite(Number(item.base_sodium)) ? Number(item.base_sodium) : sodium / amount;

    return {
      ...item,
      serving_size: servingSize,
      amount,
      base_calories: baseCalories,
      base_protein: baseProtein,
      base_fat: baseFat,
      base_carbs: baseCarbs,
      base_fiber: baseFiber,
      base_sugar: baseSugar,
      base_sodium: baseSodium,
      quantity: formatQuantity(servingSize, amount),
      calories: Math.round(baseCalories * amount),
      protein: Math.round(baseProtein * amount * 10) / 10,
      fat: Math.round(baseFat * amount * 10) / 10,
      carbs: Math.round(baseCarbs * amount * 10) / 10,
      fiber: Math.round(baseFiber * amount * 10) / 10,
      sugar: Math.round(baseSugar * amount * 10) / 10,
      sodium: Math.round(baseSodium * amount),
    };
  };

  const normalizeMealsForEditing = (meals: any[]) =>
    (meals || []).map((meal: any) => ({
      ...meal,
      items: (meal.items || []).map((item: any) => normalizeItemForEditing(item)),
    }));

  const toFoodTemplate = (row: any): FoodTemplate =>
    normalizeItemForEditing({
      food_name: row.food_name,
      serving_size: row.serving_size ?? null,
      amount: row.amount ?? null,
      quantity: row.quantity,
      calories: row.calories,
      protein: row.protein,
      fat: row.fat,
      carbs: row.carbs,
      fiber: row.fiber,
      sugar: row.sugar,
      sodium: row.sodium,
      categories: row.categories || [],
      whole_food_ingredients: row.whole_food_ingredients || [],
      source: row.source ?? 'cache',
    });

  const inferMealTypeForNow = (): 'breakfast' | 'lunch' | 'dinner' | 'snack' => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 10) return 'breakfast';
    if (hour >= 11 && hour < 15) return 'lunch';
    if (hour >= 17 && hour < 21) return 'dinner';
    return 'snack';
  };

  const addFoodTemplateToMeal = (template: FoodTemplate, mealIndex?: number) => {
    const item = normalizeItemForEditing({ ...template, unverified: false, provided_by_user: true });
    const updatedMeals = [...editingMeals];
    const targetMealIndex = typeof mealIndex === 'number' ? mealIndex : 0;

    if (updatedMeals.length === 0) {
      const newMeal = { meal_type: inferMealTypeForNow(), confidence: 1.0, items: [item] };
      setEditingMeals([newMeal]);
      setParsedData({ meals: [newMeal], cache_candidates: [] });
      setExpandedItems(new Map([['0', new Set([0])]]));
      return;
    }

    if (!updatedMeals[targetMealIndex]) return;
    updatedMeals[targetMealIndex].items = [...(updatedMeals[targetMealIndex].items || []), item];
    setEditingMeals(updatedMeals);

    const newExpanded = new Map(expandedItems);
    const key = String(targetMealIndex);
    const newIndex = updatedMeals[targetMealIndex].items.length - 1;
    if (!newExpanded.has(key)) newExpanded.set(key, new Set());
    newExpanded.get(key)!.add(newIndex);
    setExpandedItems(newExpanded);
  };

  const searchFoodsInDb = async (query: string) => {
    if (!userId || !query.trim()) return [] as FoodTemplate[];

    const trimmedQuery = query.trim();
    const { data: personalData, error: personalError } = await supabase
      .from('food_items')
      .select('food_name, quantity, calories, protein, fat, carbs, fiber, sugar, sodium, categories, whole_food_ingredients, source, logged_at')
      .eq('user_id', userId)
      .ilike('food_name', `%${trimmedQuery}%`)
      .order('logged_at', { ascending: false })
      .limit(250);

    const { data: globalData } = await supabase
      .from('master_food_database')
      .select('food_name, serving_size_label, calories_per_100g, protein_per_100g, fat_per_100g, carbs_per_100g, fiber_per_100g, sugar_per_100g, sodium_mg_per_100g, times_used')
      .or(`food_name.ilike.%${trimmedQuery}%,normalized_name.ilike.%${trimmedQuery}%`)
      .order('times_used', { ascending: false })
      .limit(100);

    if (personalError && !globalData) return [] as FoodTemplate[];

    const deduped = new Map<string, any>();
    for (const row of personalData || []) {
      const key = String(row.food_name || '').trim().toLowerCase();
      if (!key || deduped.has(key)) continue;
      deduped.set(key, row);
    }

    for (const row of globalData || []) {
      const key = String(row.food_name || '').trim().toLowerCase();
      if (!key || deduped.has(key)) continue;
      deduped.set(key, {
        food_name: row.food_name,
        quantity: row.serving_size_label || '100g',
        calories: Number(row.calories_per_100g) || 0,
        protein: Number(row.protein_per_100g) || 0,
        fat: Number(row.fat_per_100g) || 0,
        carbs: Number(row.carbs_per_100g) || 0,
        fiber: Number(row.fiber_per_100g) || 0,
        sugar: Number(row.sugar_per_100g) || 0,
        sodium: Number(row.sodium_mg_per_100g) || 0,
        categories: [],
        whole_food_ingredients: [],
        source: 'cache',
        logged_at: null,
      });
    }

    return Array.from(deduped.values()).map(toFoodTemplate).slice(0, 10);
  };

  // ============================================================================
  // LOAD SAVED MEALS
  // ============================================================================

  useEffect(() => {
    loadSavedMeals();
    loadSavedFoods();
  }, [userId]);

  const loadSavedMeals = async () => {
    if (!userId) {
      setIsLoadingSavedMeals(false);
      return;
    }

    setIsLoadingSavedMeals(true);

    const { data } = await supabase
      .from('saved_meals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (data) setSavedMeals(data);
    setIsLoadingSavedMeals(false);
  };

  const loadSavedFoods = async () => {
    if (!userId) {
      setSavedFoods([]);
      setIsLoadingSavedFoods(false);
      return;
    }

    setIsLoadingSavedFoods(true);

    const { data, error } = await supabase
      .from('food_items')
      .select('food_name, quantity, calories, protein, fat, carbs, fiber, sugar, sodium, categories, whole_food_ingredients, source, logged_at')
      .eq('user_id', userId)
      .order('logged_at', { ascending: false })
      .limit(2000);

    if (error || !data) {
      setSavedFoods([]);
      setIsLoadingSavedFoods(false);
      return;
    }

    const grouped = new Map<string, { row: any; count: number; lastLoggedAt: string }>();
    data.forEach((row: any) => {
      const key = String(row.food_name || '').trim().toLowerCase();
      if (!key) return;
      if (!grouped.has(key)) {
        grouped.set(key, { row, count: 1, lastLoggedAt: row.logged_at });
      } else {
        const existing = grouped.get(key)!;
        existing.count += 1;
      }
    });

    const frequent = Array.from(grouped.values())
      .sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return new Date(b.lastLoggedAt).getTime() - new Date(a.lastLoggedAt).getTime();
      })
      .slice(0, 10)
      .map(({ row, count, lastLoggedAt }) => ({
        ...toFoodTemplate(row),
        usageCount: count,
        lastLoggedAt,
      }));

    setSavedFoods(frequent);
    setIsLoadingSavedFoods(false);
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

      console.log('RAW /api/parse-food response:', JSON.stringify(data, null, 2));
      console.table(
        (data.meals ?? []).flatMap((m: any, mi: number) =>
          (m.items ?? []).map((it: any, ii: number) => ({
            mi, ii,
            food_name: it.food_name,
            quantity: it.quantity,
            calories: it.calories,
            protein: it.protein,
            fat: it.fat,
            carbs: it.carbs,
            types: {
              calories: typeof it.calories,
              protein: typeof it.protein,
              fat: typeof it.fat,
              carbs: typeof it.carbs,
            }
          }))
        )
      );

      const normalizedMeals = normalizeMealsForEditing(data.meals || []);
      setParsedData({ ...data, meals: normalizedMeals });
      setEditingMeals(normalizedMeals);
      setExpandedItems(new Map());

      const notesMap = new Map<number, string>();
      const eatingOutMap = new Map<number, boolean>();
      (data.meals || []).forEach((meal: any, idx: number) => {
        if (meal?.notes) notesMap.set(idx, meal.notes);
        if (typeof meal?.eating_out === 'boolean') eatingOutMap.set(idx, meal.eating_out);
      });
      setMealNotes(notesMap);
      setMealEatingOut(eatingOutMap);

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

    if (!newExpanded.has(key)) newExpanded.set(key, new Set());

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

  const applyScaledItemEdit = (itemRaw: any, field: string, value: any) => {
    const currentItem = normalizeItemForEditing(itemRaw);

    if (field === 'amount') {
      const amount = toSafeAmount(value);
      return normalizeItemForEditing({ ...currentItem, amount });
    }

    if (field === 'serving_size') {
      return normalizeItemForEditing({
        ...currentItem,
        serving_size: String(value || ''),
      });
    }

    if (field === 'quantity') {
      const parsed = parseQuantityComposite(value);
      return normalizeItemForEditing({
        ...currentItem,
        amount: parsed.amount,
        serving_size: parsed.servingSize,
      });
    }

    if (
      field === 'calories' ||
      field === 'protein' ||
      field === 'fat' ||
      field === 'carbs' ||
      field === 'fiber' ||
      field === 'sugar' ||
      field === 'sodium'
    ) {
      const numericValue = Number(value) || 0;
      const amount = toSafeAmount(currentItem.amount);
      return normalizeItemForEditing({
        ...currentItem,
        [field]: numericValue,
        [`base_${field}`]: numericValue / amount,
      });
    }

    return {
      ...currentItem,
      [field]: value,
    };
  };

  const handleItemEdit = (mealIndex: number, itemIndex: number, field: string, value: any) => {
    const updated = [...editingMeals];
    updated[mealIndex].items[itemIndex] = applyScaledItemEdit(
      updated[mealIndex].items[itemIndex],
      field,
      value
    );
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

  const addEmptyMeal = () => {
    const newMeal = {
      meal_type: inferMealTypeForNow(),
      confidence: 1.0,
      items: [],
    };
    const newMealIndex = editingMeals.length;
    setEditingMeals([...editingMeals, newMeal]);
    setParsedData((prev: any) =>
      prev
        ? { ...prev, meals: [...(prev.meals || []), newMeal] }
        : { meals: [newMeal], cache_candidates: [] }
    );
    setMealAddFoodOpen((prev) => {
      const next = new Set(prev);
      next.add(newMealIndex);
      return next;
    });
  };

  const moveItemToMeal = (targetMealIndex: number) => {
    if (!draggingItem) return;
    const { mealIndex: sourceMealIndex, itemIndex: sourceItemIndex } = draggingItem;
    setDragOverMeal(null);

    if (sourceMealIndex === targetMealIndex) {
      setDraggingItem(null);
      return;
    }

    const sourceMeal = editingMeals[sourceMealIndex];
    const targetMeal = editingMeals[targetMealIndex];
    if (!sourceMeal || !targetMeal || !sourceMeal.items?.[sourceItemIndex]) {
      setDraggingItem(null);
      return;
    }

    const movedItem = sourceMeal.items[sourceItemIndex];
    const updatedMeals = editingMeals.map((meal) => ({
      ...meal,
      items: [...(meal.items || [])],
    }));

    updatedMeals[sourceMealIndex].items.splice(sourceItemIndex, 1);
    updatedMeals[targetMealIndex].items.push(movedItem);
    setEditingMeals(updatedMeals);

    const nextExpanded = new Map<string, Set<number>>();
    expandedItems.forEach((set, key) => {
      nextExpanded.set(key, new Set(set));
    });

    const sourceKey = String(sourceMealIndex);
    const sourceSet = new Set(nextExpanded.get(sourceKey) || []);
    sourceSet.delete(sourceItemIndex);
    const adjustedSourceSet = new Set<number>();
    sourceSet.forEach((index) => adjustedSourceSet.add(index > sourceItemIndex ? index - 1 : index));
    if (adjustedSourceSet.size > 0) nextExpanded.set(sourceKey, adjustedSourceSet);
    else nextExpanded.delete(sourceKey);

    const targetKey = String(targetMealIndex);
    const targetSet = new Set(nextExpanded.get(targetKey) || []);
    targetSet.add(updatedMeals[targetMealIndex].items.length - 1);
    nextExpanded.set(targetKey, targetSet);

    setExpandedItems(nextExpanded);
    setDraggingItem(null);
  };

  // Remove a single item from editingMeals. If it was the last item in its
  // meal group, the whole meal row is removed too.
  const handleDeleteItem = (mealIndex: number, itemIndex: number) => {
    const updated = editingMeals
      .map((meal, mi) => {
        if (mi !== mealIndex) return meal;
        return { ...meal, items: meal.items.filter((_: any, ii: number) => ii !== itemIndex) };
      })
      .filter((meal) => meal.items.length > 0); // drop now-empty meals
    setEditingMeals(updated);
  };

  // ============================================================================
  // SAVE TO DATABASE
  // ============================================================================

  const handleConfirm = async () => {
    if (!editingMeals.length || !userId) return;

    setIsSaving(true);

    try {
      // ── 1. Build food_items rows ────────────────────────────────────────────
      const allItemsToInsert = [];
      const selectedDateTime = new Date(selectedDate + 'T12:00:00');

      for (let i = 0; i < editingMeals.length; i++) {
        const meal = editingMeals[i];
        const mealGroupId = crypto.randomUUID();

        const mealItems = (meal.items || []).map((item: any) => ({
          user_id:                userId,
          food_name:              item.food_name,
          quantity:               formatQuantity(item.serving_size || item.quantity, item.amount || 1),
          calories:               parseInt(item.calories)   || 0,
          protein:                parseFloat(item.protein)  || 0,
          fat:                    parseFloat(item.fat)      || 0,
          carbs:                  parseFloat(item.carbs)    || 0,
          fiber:                  parseFloat(item.fiber)    || 0,
          sugar:                  parseFloat(item.sugar)    || 0,
          sodium:                 parseInt(item.sodium)     || 0,
          categories:             item.categories             || [],
          whole_food_ingredients: item.whole_food_ingredients || [],
          meal_type:              meal.meal_type,
          meal_group_id:          mealGroupId,
          notes:                  mealNotes.get(i)           || null,
          eating_out:             mealEatingOut.get(i)       || false,
          logged_at:              selectedDateTime.toISOString(),
          // Persist the macro source so we can display it on the dashboard
          // and audit data quality over time.
          source:                 item.source                || null,
        }));

        allItemsToInsert.push(...mealItems);
      }

      // ── 2. Insert food log entries ──────────────────────────────────────────
      const { error } = await supabase.from('food_items').insert(allItemsToInsert);
      if (error) throw error;

      console.log('✅ Saved all meals to database!');

      // ── 3. Write cache candidates to master_food_database ──────────────────
      // Two sources of candidates:
      //   a) parsedData.cache_candidates — foods from OpenFoodFacts or AI during
      //      text parsing (deferred write to avoid DB pollution on abandoned sessions).
      //   b) per-item cache_candidates embedded in barcode-scanned items — per-100g
      //      OFF data returned by /api/lookup-barcode so the same product hits the
      //      local cache on future lookups instead of querying OFF again.
      const parsesCandidates: any[] = parsedData?.cache_candidates ?? [];
      const scanCandidates: any[] = editingMeals
        .flatMap((m: any) => m.items as any[])
        .map((item: any) => item.cache_candidate)
        .filter(Boolean);

      const candidates = [...parsesCandidates, ...scanCandidates];
      if (candidates.length > 0) {
        const { error: cacheError } = await supabase
          .from('master_food_database')
          .upsert(candidates, {
            onConflict: 'normalized_name',
            ignoreDuplicates: false, // update stale rows with fresher data
          });

        if (cacheError) {
          // Non-fatal: the food log is already saved; don't block the user.
          console.warn('Cache write failed (non-fatal):', cacheError.message);
        } else {
          console.log(`✅ Cached ${candidates.length} food(s) to master_food_database`);
        }
      }

      // ── 4. Increment times_used for cache hits (helps ranking) ─────────────
      // Any item whose data came from the cache gets its hit-count bumped so that
      // popular foods surface higher in future lookups.
      const cacheHitNames: string[] = editingMeals
        .flatMap((m: any) => m.items as any[])
        .filter((item: any) => item.source === 'cache')
        .map((item: any) => item.food_name as string);

      if (cacheHitNames.length > 0) {
        // Fire-and-forget — updating hit counts is cosmetic, never worth blocking the UX
        supabase
          .rpc('increment_times_used', { food_names: cacheHitNames })
          .then(
            () => console.log('✅ Bumped times_used for', cacheHitNames.length, 'cached food(s)'),
            (e: any) => console.warn('times_used increment failed (non-fatal):', e)
          );
      }

      // ── 5. Reset form ───────────────────────────────────────────────────────
      setFoodInput('');
      setParsedData(null);
      setEditingMeals([]);
      setMealNotes(new Map());
      setMealEatingOut(new Map());

      // Notify other components (e.g. daily totals dashboard)
      setTimeout(() => window.dispatchEvent(new Event('foodLogged')), 100);

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
  // SCAN RESULT HANDLER
  // ============================================================================

  // Called by both BarcodeScanner and NutritionLabelCapture when they return data.
  //
  // Two modes:
  //   • Item-edit mode  (scanTargetMeal/Item are set): replaces the macros of a
  //     specific parsed item in editingMeals with the scanned facts.
  //   • New-item mode   (no target set): appends a new item to the current meal
  //     list, or creates a new single-item meal if nothing has been parsed yet.
  //
  // Scanned data is always treated as authoritative — source is 'barcode' or
  // 'label_photo', provided_by_user: true — so the lookup chain will never
  // override it when the item eventually reaches parse-food or get-food-macros.
  //
  // cache_candidate (barcode only): per-100g OFF data to write to
  // master_food_database on confirm, so the same product hits the local cache
  // on future lookups instead of querying OFF again.
  const handleScanResult = (scanData: any) => {
    const scannedServingSize = String(scanData.serving_size || scanData.quantity || '1 serving');
    const scannedItem = {
      food_name:              String(scanData.food_name  || 'Scanned item'),
      serving_size:           scannedServingSize,
      amount:                 toSafeAmount(scanData.amount ?? 1),
      quantity:               formatQuantity(scannedServingSize, scanData.amount ?? 1),
      calories:               Number(scanData.calories)  || 0,
      protein:                Number(scanData.protein)   || 0,
      fat:                    Number(scanData.fat)       || 0,
      carbs:                  Number(scanData.carbs)     || 0,
      fiber:                  Number(scanData.fiber)     || 0,
      sugar:                  Number(scanData.sugar)     || 0,
      sodium:                 Number(scanData.sodium)    || 0,
      base_calories:          Number(scanData.base_calories ?? scanData.calories) || 0,
      base_protein:           Number(scanData.base_protein  ?? scanData.protein)  || 0,
      base_fat:               Number(scanData.base_fat      ?? scanData.fat)      || 0,
      base_carbs:             Number(scanData.base_carbs    ?? scanData.carbs)    || 0,
      base_fiber:             Number(scanData.base_fiber    ?? scanData.fiber)    || 0,
      base_sugar:             Number(scanData.base_sugar    ?? scanData.sugar)    || 0,
      base_sodium:            Number(scanData.base_sodium   ?? scanData.sodium)   || 0,
      categories:             scanData.categories             || [],
      whole_food_ingredients: scanData.whole_food_ingredients || [],
      source:                 scanData.source, // 'barcode' or 'label_photo'
      provided_by_user:       true,            // treated as user-verified fact
      unverified:             false,
      // Carry the per-100g cache candidate so handleConfirm can write it to
      // master_food_database. Only present for barcode scans that had 100g data.
      cache_candidate:        scanData.cache_candidate ?? null,
    };

    if (scanTargetMeal !== null && scanTargetItem !== null) {
      // Replace macros on an existing parsed item, preserving the expanded state
      // so the user can immediately see the autofilled fields.
      const updated = [...editingMeals];
      updated[scanTargetMeal].items[scanTargetItem] = {
        ...updated[scanTargetMeal].items[scanTargetItem],
        ...normalizeItemForEditing(scannedItem),
      };
      setEditingMeals(updated);
      setScanTargetMeal(null);
      setScanTargetItem(null);
      // The item-edit panel was already expanded — no need to change expandedItems.
    } else {
      // New scan: auto-assign a meal type based on the current time of day
      const hour = new Date().getHours();
      let meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack' = 'snack';
      if (hour >= 5  && hour < 10) meal_type = 'breakfast';
      else if (hour >= 11 && hour < 15) meal_type = 'lunch';
      else if (hour >= 17 && hour < 21) meal_type = 'dinner';

      if (editingMeals.length > 0) {
        // Append to the first meal in the current parse session
        const updated = [...editingMeals];
        updated[0].items = [...(updated[0].items || []), normalizeItemForEditing(scannedItem)];
        setEditingMeals(updated);

        // Auto-expand the newly appended item so the user sees all fields filled in
        const newItemIndex = updated[0].items.length - 1;
        const newExpanded = new Map(expandedItems);
        if (!newExpanded.has('0')) newExpanded.set('0', new Set());
        newExpanded.get('0')!.add(newItemIndex);
        setExpandedItems(newExpanded);
      } else {
        // Nothing parsed yet — bootstrap a new meal from this scan alone
        const newMeal = { meal_type, confidence: 1.0, items: [normalizeItemForEditing(scannedItem)] };
        setEditingMeals([newMeal]);
        setParsedData({ meals: [newMeal], cache_candidates: [] });

        // Auto-expand the first (and only) item so all fields are immediately visible
        setExpandedItems(new Map([['0', new Set([0])]]));
      }
    }

    // Close whichever scanner modal was open
    setShowBarcodeScanner(false);
    setShowLabelCapture(false);
  };

  // Open the barcode scanner targeting a specific item (item-edit mode)
  const openBarcodeScannerForItem = (mealIndex: number, itemIndex: number) => {
    setScanTargetMeal(mealIndex);
    setScanTargetItem(itemIndex);
    setShowBarcodeScanner(true);
  };

  // Open the label capture targeting a specific item (item-edit mode)
  const openLabelCaptureForItem = (mealIndex: number, itemIndex: number) => {
    setScanTargetMeal(mealIndex);
    setScanTargetItem(itemIndex);
    setShowLabelCapture(true);
  };

  // Open the barcode scanner in new-item mode (from the main form)
  const openBarcodeScannerNew = () => {
    setScanTargetMeal(null);
    setScanTargetItem(null);
    setShowBarcodeScanner(true);
  };

  // Open the label capture in new-item mode (from the main form)
  const openLabelCaptureNew = () => {
    setScanTargetMeal(null);
    setScanTargetItem(null);
    setShowLabelCapture(true);
  };

  // ============================================================================
  // SAVE MEAL FOR REUSE
  // ============================================================================

  const openSaveMealModal = (meal: any, mealIndex: number) => {
    setMealToSave({ ...meal, mealIndex });
    setSaveMealName('');
    setSaveMealNotes(mealNotes.get(mealIndex) || '');
    setShowSaveMealModal(true);
  };

  const saveMealForLater = async () => {
    if (!userId || !mealToSave || !saveMealName.trim()) return;

    try {
      const { error } = await supabase.from('saved_meals').insert({
        user_id:   userId,
        meal_name: saveMealName,
        meal_type: mealToSave.meal_type,
        items:     mealToSave.items,
        notes:     saveMealNotes || null,
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
      items:     JSON.parse(JSON.stringify(meal.items)).map((item: any) => normalizeItemForEditing(item)),
      notes:     meal.notes || '',
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
          items:     editingSavedMealData.items.map((item: any) => ({
            ...normalizeItemForEditing(item),
            quantity: formatQuantity(item.serving_size || item.quantity, item.amount || 1),
          })),
          notes:     editingSavedMealData.notes,
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
    const updated = { ...editingSavedMealData };
    updated.items[itemIndex] = applyScaledItemEdit(updated.items[itemIndex], field, value);
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
        user_id:                userId,
        food_name:              item.food_name,
        quantity:               formatQuantity(item.serving_size || item.quantity, item.amount || 1),
        calories:               parseInt(item.calories)   || 0,
        protein:                parseFloat(item.protein)  || 0,
        fat:                    parseFloat(item.fat)      || 0,
        carbs:                  parseFloat(item.carbs)    || 0,
        fiber:                  parseFloat(item.fiber)    || 0,
        sugar:                  parseFloat(item.sugar)    || 0,
        sodium:                 parseInt(item.sodium)     || 0,
        categories:             item.categories             || [],
        whole_food_ingredients: item.whole_food_ingredients || [],
        meal_type:              savedMeal.meal_type,
        meal_group_id:          mealGroupId,
        notes:                  savedMeal.notes             || null,
        eating_out:             false,
        logged_at:              selectedDateTime.toISOString(),
      }));

      const { error } = await supabase.from('food_items').insert(itemsToInsert);
      if (error) throw error;

      alert(`✅ Added "${savedMeal.meal_name}" to ${selectedDate}!`);
      setTimeout(() => window.dispatchEvent(new Event('foodLogged')), 100);
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
    const emoji = { breakfast: '🌅', lunch: '🌞', dinner: '🌙', snack: '🍎' }[type] || '🍽️';
    return `${emoji} ${type.charAt(0).toUpperCase() + type.slice(1)}`;
  };

  const runSavedFoodsSearch = async () => {
    const query = savedFoodSearch.trim();
    if (!query) {
      setSavedFoodSearchResults([]);
      return;
    }
    setIsSavedFoodSearching(true);
    const results = await searchFoodsInDb(query);
    setSavedFoodSearchResults(results);
    setIsSavedFoodSearching(false);
  };

  useEffect(() => {
    const query = savedFoodSearch.trim();
    if (!query) {
      setSavedFoodSearchResults([]);
      setIsSavedFoodSearching(false);
      return;
    }

    const timer = setTimeout(() => {
      runSavedFoodsSearch();
    }, 250);

    return () => clearTimeout(timer);
  }, [savedFoodSearch]);

  const toggleMealAddFood = (mealIndex: number) => {
    const next = new Set(mealAddFoodOpen);
    if (next.has(mealIndex)) next.delete(mealIndex);
    else next.add(mealIndex);
    setMealAddFoodOpen(next);
  };

  const setMealSearchText = (mealIndex: number, value: string) => {
    const next = new Map(mealFoodSearch);
    next.set(mealIndex, value);
    setMealFoodSearch(next);
  };

  const runMealFoodSearch = async (mealIndex: number) => {
    const query = mealFoodSearch.get(mealIndex)?.trim() || '';
    if (!query) {
      const nextResults = new Map(mealFoodSearchResults);
      nextResults.set(mealIndex, []);
      setMealFoodSearchResults(nextResults);
      return;
    }
    const nextLoading = new Map(mealFoodSearching);
    nextLoading.set(mealIndex, true);
    setMealFoodSearching(nextLoading);

    const results = await searchFoodsInDb(query);
    const nextResults = new Map(mealFoodSearchResults);
    nextResults.set(mealIndex, results);
    setMealFoodSearchResults(nextResults);

    const loadingDone = new Map(mealFoodSearching);
    loadingDone.set(mealIndex, false);
    setMealFoodSearching(loadingDone);
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

          {/* Scan shortcuts — barcode or nutrition label photo — add item without typing */}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={openBarcodeScannerNew}
              disabled={isLoading}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              {/* Barcode icon */}
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 6h2v12H4V6zm3 0h1v12H7V6zm2 0h2v12H9V6zm3 0h1v12h-1V6zm2 0h2v12h-2V6zm3 0h1v12h-1V6z" />
              </svg>
              Scan Barcode
            </button>
            <button
              type="button"
              onClick={openLabelCaptureNew}
              disabled={isLoading}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              {/* Camera / label icon */}
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Scan Label
            </button>
          </div>

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
                {editingMeals.map((meal) => formatMealType(meal.meal_type)).join(' · ')}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={addEmptyMeal}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-blue-700 border border-blue-200 hover:bg-blue-100"
                >
                  + Add Meal
                </button>
                <span className="text-xs text-blue-700">Drag food items between meal cards to reorganize.</span>
              </div>
            </div>

            <div className="space-y-6">
              {editingMeals.map((meal, mealIndex) => {
                const mealTotals = (meal.items || []).reduce(
                  (acc: any, item: any) => ({
                    calories: acc.calories + (parseInt(item.calories) || 0),
                    protein:  acc.protein  + (parseFloat(item.protein) || 0),
                    fat:      acc.fat      + (parseFloat(item.fat) || 0),
                    carbs:    acc.carbs    + (parseFloat(item.carbs) || 0),
                  }),
                  { calories: 0, protein: 0, fat: 0, carbs: 0 }
                );

                return (
                  <div
                    key={mealIndex}
                    className={`border-2 rounded-xl overflow-hidden transition-colors ${
                      dragOverMeal === mealIndex ? 'border-blue-500 bg-blue-50/30' : 'border-gray-200'
                    }`}
                    onDragOver={(e) => {
                      if (!draggingItem || draggingItem.mealIndex === mealIndex) return;
                      e.preventDefault();
                      if (dragOverMeal !== mealIndex) setDragOverMeal(mealIndex);
                    }}
                    onDragLeave={() => {
                      if (dragOverMeal === mealIndex) setDragOverMeal(null);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      moveItemToMeal(mealIndex);
                    }}
                  >
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
                          <div
                            key={itemIndex}
                            className="border border-gray-200 rounded-lg overflow-hidden"
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.effectAllowed = 'move';
                              setDraggingItem({ mealIndex, itemIndex });
                            }}
                            onDragEnd={() => {
                              setDraggingItem(null);
                              setDragOverMeal(null);
                            }}
                          >
                            {/* Compact card header — click anywhere to expand, × to delete.
                                Using a div (not button) to allow the nested delete button
                                without violating the button-in-button HTML rule.          */}
                            <div
                              onClick={() => toggleExpand(mealIndex, itemIndex)}
                              className="w-full p-3 text-left hover:bg-gray-50 transition-colors flex items-center justify-between cursor-pointer"
                            >
                              <div className="flex-1">
                                <div className="font-medium text-gray-900">{item.food_name}</div>
                                <div className="text-sm text-gray-600 mt-0.5">
                                  {formatQuantity(item.serving_size || item.quantity, item.amount || 1)} · {item.calories} cal ·
                                  P: {item.protein}g · F: {item.fat}g · C: {item.carbs}g
                                </div>
                                {/* Source badge — shows where macros came from (database, barcode, AI, etc.) */}
                                <SourceBadge source={item.source} unverified={item.unverified} />
                                {item.match_description && typeof item.match_score === 'number' && (
                                  <div className="mt-1 text-[11px] text-gray-500">
                                    Matched: <span className="font-medium">{item.match_description}</span> ·
                                    Score: {(item.match_score * 100).toFixed(0)}%
                                  </div>
                                )}
                              </div>

                              {/* Right side: delete × and expand chevron */}
                              <div
                                className="flex items-center gap-1 ml-2 shrink-0"
                                onClick={(e) => e.stopPropagation()} // prevent expand toggle
                              >
                                <button
                                  type="button"
                                  onClick={() => handleDeleteItem(mealIndex, itemIndex)}
                                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Remove item"
                                  aria-label="Remove item"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                                {/* Chevron — still clickable via the parent div's onClick */}
                                <div
                                  onClick={() => toggleExpand(mealIndex, itemIndex)}
                                  className="cursor-pointer p-1"
                                >
                                  <svg
                                    className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                                  >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                  </svg>
                                </div>
                              </div>
                            </div>

                            {isExpanded && (
                              <div className="p-3 pt-0 border-t border-gray-200 bg-gray-50 space-y-3">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                                    <label className="text-xs text-gray-600 mb-1.5 block font-medium">Serving size</label>
                                    <input
                                      type="text"
                                      value={item.serving_size || item.quantity}
                                      onChange={(e) => handleItemEdit(mealIndex, itemIndex, 'serving_size', e.target.value)}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs text-gray-600 mb-1.5 block font-medium">Amount</label>
                                    <input
                                      type="number"
                                      step="0.1"
                                      min="0.1"
                                      value={item.amount ?? 1}
                                      onChange={(e) => handleItemEdit(mealIndex, itemIndex, 'amount', e.target.value)}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                                    />
                                  </div>
                                </div>

                                <div>
                                  <label className="text-xs text-gray-600 mb-1.5 block font-medium">Macronutrients</label>
                                  <div className="grid grid-cols-4 gap-2">
                                    {(['calories', 'protein', 'fat', 'carbs'] as const).map((field) => (
                                      <div key={field}>
                                        <label className="text-xs text-gray-500 block mb-1">
                                          {field.charAt(0).toUpperCase() + field.slice(1)}{field !== 'calories' ? ' (g)' : ''}
                                        </label>
                                        <input
                                          type="number"
                                          step={field === 'calories' ? '1' : '0.1'}
                                          value={item[field]}
                                          onChange={(e) => handleItemEdit(mealIndex, itemIndex, field, e.target.value)}
                                          className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm bg-white text-center"
                                        />
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                <div>
                                  <label className="text-xs text-gray-600 mb-1.5 block font-medium">Micronutrients</label>
                                  <div className="grid grid-cols-3 gap-2">
                                    <div>
                                      <label className="text-xs text-gray-500 block mb-1">Fiber (g)</label>
                                      <input
                                        type="number" step="0.1" value={item.fiber}
                                        onChange={(e) => handleItemEdit(mealIndex, itemIndex, 'fiber', e.target.value)}
                                        className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm bg-white text-center"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-xs text-gray-500 block mb-1">Sugar (g)</label>
                                      <input
                                        type="number" step="0.1" value={item.sugar}
                                        onChange={(e) => handleItemEdit(mealIndex, itemIndex, 'sugar', e.target.value)}
                                        className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm bg-white text-center"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-xs text-gray-500 block mb-1">Sodium (mg)</label>
                                      <input
                                        type="number" value={item.sodium}
                                        onChange={(e) => handleItemEdit(mealIndex, itemIndex, 'sodium', e.target.value)}
                                        className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm bg-white text-center"
                                      />
                                    </div>
                                  </div>
                                </div>

                                {/* Override with a verified scan — replaces macros for this item only */}
                                <div className="pt-1">
                                  <label className="text-xs text-gray-500 mb-1.5 block">
                                    Override with scan (takes priority over AI estimates)
                                  </label>
                                  <div className="flex gap-2">
                                    <button
                                      type="button"
                                      onClick={() => openBarcodeScannerForItem(mealIndex, itemIndex)}
                                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-xs text-gray-700 hover:bg-gray-100 transition-colors"
                                    >
                                      <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                          d="M4 6h2v12H4V6zm3 0h1v12H7V6zm2 0h2v12H9V6zm3 0h1v12h-1V6zm2 0h2v12h-2V6zm3 0h1v12h-1V6z" />
                                      </svg>
                                      Scan Barcode
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => openLabelCaptureForItem(mealIndex, itemIndex)}
                                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-xs text-gray-700 hover:bg-gray-100 transition-colors"
                                    >
                                      <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                          d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                      </svg>
                                      Scan Label
                                    </button>
                                  </div>
                                </div>

                                {item.categories && item.categories.length > 0 && (
                                  <div className="flex gap-2 flex-wrap">
                                    {item.categories.map((cat: string, i: number) => (
                                      <span key={i} className="px-2.5 py-1 bg-white border border-gray-200 text-gray-700 text-xs rounded-md font-medium">
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

                    <div className="px-4 pb-4 bg-white border-t border-gray-100">
                      <button
                        type="button"
                        onClick={() => toggleMealAddFood(mealIndex)}
                        className="mt-3 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        {mealAddFoodOpen.has(mealIndex) ? 'Hide Add Food' : 'Add Food'}
                      </button>
                      <button
                        type="button"
                        onClick={addEmptyMeal}
                        className="mt-2 w-full px-3 py-2 border border-blue-200 bg-blue-50 rounded-lg text-sm font-medium text-blue-700 hover:bg-blue-100"
                      >
                        + Add Meal
                      </button>

                      {mealAddFoodOpen.has(mealIndex) && (
                        <div className="mt-3 space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
                            <input
                              type="text"
                              value={mealFoodSearch.get(mealIndex) || ''}
                              onChange={(e) => setMealSearchText(mealIndex, e.target.value)}
                              placeholder="Search your food history..."
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                            />
                            <button
                              type="button"
                              onClick={() => runMealFoodSearch(mealIndex)}
                              className="px-3 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800"
                            >
                              Search
                            </button>
                          </div>

                          <div>
                            <div className="text-xs font-medium text-gray-600 mb-2">Frequent foods</div>
                            <div className="flex flex-wrap gap-1.5">
                              {savedFoods.slice(0, 6).map((food) => (
                                <button
                                  key={`meal-${mealIndex}-frequent-${food.food_name}`}
                                  type="button"
                                  onClick={() => addFoodTemplateToMeal(food, mealIndex)}
                                  className="px-2 py-1 text-xs border border-gray-300 rounded-md bg-white hover:bg-gray-100 text-gray-700"
                                >
                                  + {food.food_name}
                                </button>
                              ))}
                            </div>
                          </div>

                          {mealFoodSearching.get(mealIndex) ? (
                            <div className="text-xs text-gray-500">Searching...</div>
                          ) : (
                            (mealFoodSearchResults.get(mealIndex) || []).length > 0 && (
                              <div className="space-y-1.5">
                                {(mealFoodSearchResults.get(mealIndex) || []).map((food, idx) => (
                                  <div
                                    key={`meal-${mealIndex}-search-${food.food_name}-${idx}`}
                                    className="flex items-center justify-between gap-2 bg-white border border-gray-200 rounded-md px-2 py-1.5"
                                  >
                                    <div className="min-w-0">
                                      <div className="text-sm text-gray-900 truncate">{food.food_name}</div>
                                      <div className="text-xs text-gray-500 truncate">
                                        {formatQuantity(food.serving_size || food.quantity, food.amount || 1)} · {food.calories} cal
                                      </div>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => addFoodTemplateToMeal(food, mealIndex)}
                                      className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                                    >
                                      Add
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )
                          )}
                        </div>
                      )}
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

      {/* SAVED MEALS SECTION */}
      <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-2xl overflow-hidden">
        <button
          onClick={() => setShowSavedMeals(!showSavedMeals)}
          className="w-full p-5 sm:p-6 flex items-center justify-between hover:bg-blue-100/50 transition-colors"
        >
          <div>
            <h2 className="text-lg font-semibold text-blue-900 flex items-center gap-2">
              Saved Meals
              <span className="text-sm font-normal text-blue-600">({savedMeals.length})</span>
            </h2>
            <p className="text-sm text-blue-700 mt-1">Quick access to frequently eaten meals</p>
          </div>
          <svg
            className={`w-6 h-6 text-blue-700 transition-transform ${showSavedMeals ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showSavedMeals && (
          <div className="px-5 sm:px-6 pb-5 sm:pb-6 border-t border-blue-200">
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
                <div className="text-sm font-medium text-blue-900 mb-1">No saved meals yet</div>
                <div className="text-xs text-blue-600">Save meals you eat often for quick logging later</div>
              </div>
            ) : (
              <div className="space-y-2">
                {savedMeals.map((meal) => {
                  const isEditing = editingSavedMeal === meal.id;
                  const totalCals = meal.items.reduce(
                    (sum: number, item: any) => sum + (parseInt(item.calories) || 0), 0
                  );

                  return (
                    <div key={meal.id} className="bg-white p-4 rounded-xl border border-blue-200">
                      {isEditing ? (
                        <div className="space-y-4">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Meal Name</label>
                            <input
                              type="text"
                              value={editingSavedMealData.meal_name}
                              onChange={(e) => setEditingSavedMealData({ ...editingSavedMealData, meal_name: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                            <input
                              type="text"
                              value={editingSavedMealData.notes}
                              onChange={(e) => setEditingSavedMealData({ ...editingSavedMealData, notes: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                              placeholder="Restaurant, location, etc."
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-2">Food Items</label>
                            <div className="space-y-3">
                              {editingSavedMealData.items.map((item: any, idx: number) => (
                                <div key={idx} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
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
                                      <label className="block text-xs font-medium text-gray-600 mb-1">Serving size</label>
                                      <input
                                        type="text"
                                        value={item.serving_size || item.quantity}
                                        onChange={(e) => updateEditingSavedMealItem(idx, 'serving_size', e.target.value)}
                                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-xs font-medium text-gray-600 mb-1">Amount</label>
                                      <input
                                        type="number"
                                        step="0.1"
                                        min="0.1"
                                        value={item.amount ?? 1}
                                        onChange={(e) => updateEditingSavedMealItem(idx, 'amount', e.target.value)}
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
                                          type="number" value={item.calories}
                                          onChange={(e) => updateEditingSavedMealItem(idx, 'calories', e.target.value)}
                                          className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded text-center focus:ring-2 focus:ring-blue-500"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-xs text-gray-500 mb-1">Protein (g)</label>
                                        <input
                                          type="number" step="0.1" value={item.protein}
                                          onChange={(e) => updateEditingSavedMealItem(idx, 'protein', e.target.value)}
                                          className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded text-center focus:ring-2 focus:ring-blue-500"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-xs text-gray-500 mb-1">Fat (g)</label>
                                        <input
                                          type="number" step="0.1" value={item.fat}
                                          onChange={(e) => updateEditingSavedMealItem(idx, 'fat', e.target.value)}
                                          className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded text-center focus:ring-2 focus:ring-blue-500"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-xs text-gray-500 mb-1">Carbs (g)</label>
                                        <input
                                          type="number" step="0.1" value={item.carbs}
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
                                          type="number" step="0.1" value={item.fiber || 0}
                                          onChange={(e) => updateEditingSavedMealItem(idx, 'fiber', e.target.value)}
                                          className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded text-center focus:ring-2 focus:ring-blue-500"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-xs text-gray-500 mb-1">Sugar (g)</label>
                                        <input
                                          type="number" step="0.1" value={item.sugar || 0}
                                          onChange={(e) => updateEditingSavedMealItem(idx, 'sugar', e.target.value)}
                                          className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded text-center focus:ring-2 focus:ring-blue-500"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-xs text-gray-500 mb-1">Sodium (mg)</label>
                                        <input
                                          type="number" value={item.sodium || 0}
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

      {/* SAVED FOODS SECTION */}
      <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-2 border-emerald-200 rounded-2xl overflow-hidden">
        <button
          onClick={() => setShowSavedFoods(!showSavedFoods)}
          className="w-full p-5 sm:p-6 flex items-center justify-between hover:bg-emerald-100/50 transition-colors"
        >
          <div>
            <h2 className="text-lg font-semibold text-emerald-900 flex items-center gap-2">
              Saved Foods
              <span className="text-sm font-normal text-emerald-600">({savedFoods.length})</span>
            </h2>
            <p className="text-sm text-emerald-700 mt-1">Top 10 foods you use most often</p>
          </div>
          <svg
            className={`w-6 h-6 text-emerald-700 transition-transform ${showSavedFoods ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showSavedFoods && (
          <div className="px-5 sm:px-6 pb-5 sm:pb-6 border-t border-emerald-200">
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 mt-4 mb-4">
              <input
                type="text"
                value={savedFoodSearch}
                onChange={(e) => setSavedFoodSearch(e.target.value)}
                placeholder="Search foods in your database..."
                className="w-full px-3 py-2 border border-emerald-300 rounded-lg text-sm bg-white"
              />
              <button
                type="button"
                onClick={runSavedFoodsSearch}
                className="px-4 py-2 bg-emerald-700 text-white text-sm rounded-lg hover:bg-emerald-800"
              >
                Search
              </button>
            </div>

            {isSavedFoodSearching && (
              <div className="text-sm text-emerald-700 mb-3">Searching...</div>
            )}

            {savedFoodSearchResults.length > 0 && (
              <div className="space-y-2 mb-4">
                {savedFoodSearchResults.map((food, idx) => (
                  <div
                    key={`saved-food-search-${food.food_name}-${idx}`}
                    className="bg-white border border-emerald-200 rounded-lg p-3 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{food.food_name}</div>
                      <div className="text-xs text-gray-500 truncate">
                        {formatQuantity(food.serving_size || food.quantity, food.amount || 1)} · {food.calories} cal
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => addFoodTemplateToMeal(food)}
                      className="px-3 py-1.5 bg-green-600 text-white text-xs rounded-md hover:bg-green-700"
                    >
                      Add
                    </button>
                  </div>
                ))}
              </div>
            )}

            {isLoadingSavedFoods ? (
              <div className="text-sm text-emerald-700">Loading saved foods...</div>
            ) : savedFoods.length === 0 ? (
              <div className="text-sm text-emerald-700">No frequent foods yet. Log foods to build your list.</div>
            ) : (
              <div className="space-y-2">
                {savedFoods.map((food, idx) => (
                  <div
                    key={`saved-food-${food.food_name}-${idx}`}
                    className="bg-white border border-emerald-200 rounded-lg p-3 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{food.food_name}</div>
                      <div className="text-xs text-gray-500 truncate">
                        {formatQuantity(food.serving_size || food.quantity, food.amount || 1)} · {food.calories} cal
                        {typeof food.usageCount === 'number' ? ` · used ${food.usageCount}x` : ''}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => addFoodTemplateToMeal(food)}
                      className="px-3 py-1.5 bg-green-600 text-white text-xs rounded-md hover:bg-green-700"
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

      {/* BARCODE SCANNER MODAL */}
      {showBarcodeScanner && (
        <BarcodeScanner
          onResult={handleScanResult}
          onClose={() => {
            setShowBarcodeScanner(false);
            setScanTargetMeal(null);
            setScanTargetItem(null);
          }}
        />
      )}

      {/* NUTRITION LABEL CAPTURE MODAL */}
      {showLabelCapture && (
        <NutritionLabelCapture
          onResult={handleScanResult}
          onClose={() => {
            setShowLabelCapture(false);
            setScanTargetMeal(null);
            setScanTargetItem(null);
          }}
        />
      )}

      {/* SAVE MEAL MODAL */}
      {showSaveMealModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Save This Meal</h3>
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


// 'use client';

// import { useState, useEffect } from 'react';
// import { supabase } from '@/lib/supabase';

// export default function LogFoodView({ userId }: { userId: string | null }) {
//   // ============================================================================
//   // STATE MANAGEMENT
//   // ============================================================================
  
//   // Food input and parsing state
//   const [foodInput, setFoodInput] = useState('');
//   const [isLoading, setIsLoading] = useState(false);
//   const [parsedData, setParsedData] = useState<any>(null);
//   const [isSaving, setIsSaving] = useState(false);
//   const [editingMeals, setEditingMeals] = useState<any[]>([]);
//   const [expandedItems, setExpandedItems] = useState<Map<string, Set<number>>>(new Map());
  
//   // Saved meals state
//   const [savedMeals, setSavedMeals] = useState<any[]>([]);
//   const [isLoadingSavedMeals, setIsLoadingSavedMeals] = useState(true);
  
//   // Modal state for saving a meal
//   const [showSaveMealModal, setShowSaveMealModal] = useState(false);
//   const [mealToSave, setMealToSave] = useState<any>(null);
//   const [saveMealName, setSaveMealName] = useState('');

//   // ============================================================================
//   // LOAD SAVED MEALS ON MOUNT
//   // ============================================================================
  
//   useEffect(() => {
//     loadSavedMeals();
//   }, [userId]);

//   const loadSavedMeals = async () => {
//     if (!userId) {
//       setIsLoadingSavedMeals(false);
//       return;
//     }

//     setIsLoadingSavedMeals(true);
    
//     const { data, error } = await supabase
//       .from('saved_meals')
//       .select('*')
//       .eq('user_id', userId)
//       .order('created_at', { ascending: false });

//     if (data) {
//       setSavedMeals(data);
//     }
    
//     setIsLoadingSavedMeals(false);
//   };

//   // ============================================================================
//   // FOOD PARSING
//   // ============================================================================
  
//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
    
//     if (!foodInput.trim()) return;
    
//     setIsLoading(true);
//     setParsedData(null);
    
//     try {
//       const response = await fetch('/api/parse-food', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ foodDescription: foodInput }),
//       });

//       if (!response.ok) throw new Error('Failed to parse food');

//       const data = await response.json();
//       setParsedData(data);
//       setEditingMeals(data.meals || []);
//       setExpandedItems(new Map());
//       console.log('Parsed:', data);
//     } catch (error) {
//       console.error('Error:', error);
//       alert('Failed to parse food. Please try again.');
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   // ============================================================================
//   // MEAL EDITING
//   // ============================================================================
  
//   const toggleExpand = (mealIndex: number, itemIndex: number) => {
//     const newExpanded = new Map(expandedItems);
//     const key = `${mealIndex}`;
    
//     if (!newExpanded.has(key)) {
//       newExpanded.set(key, new Set());
//     }
    
//     const mealExpanded = newExpanded.get(key)!;
//     if (mealExpanded.has(itemIndex)) {
//       mealExpanded.delete(itemIndex);
//     } else {
//       mealExpanded.add(itemIndex);
//     }
    
//     setExpandedItems(newExpanded);
//   };

//   const handleMealTypeChange = (mealIndex: number, newType: 'breakfast' | 'lunch' | 'dinner' | 'snack') => {
//     const updated = [...editingMeals];
//     updated[mealIndex].meal_type = newType;
//     setEditingMeals(updated);
//   };

//   const handleItemEdit = (mealIndex: number, itemIndex: number, field: string, value: any) => {
//     const updated = [...editingMeals];
//     updated[mealIndex].items[itemIndex] = {
//       ...updated[mealIndex].items[itemIndex],
//       [field]: value
//     };
//     setEditingMeals(updated);
//   };

//   // ============================================================================
//   // SAVE PARSED MEALS TO DATABASE
//   // ============================================================================
  
//   const handleConfirm = async () => {
//     if (!editingMeals.length || !userId) return;
    
//     setIsSaving(true);
    
//     try {
//       const allItemsToInsert = [];
      
//       // Loop through each meal and prepare items for insertion
//       for (const meal of editingMeals) {
//         const mealGroupId = crypto.randomUUID();
        
//         const mealItems = (meal.items || []).map((item: any) => ({
//           user_id: userId,
//           food_name: item.food_name,
//           quantity: item.quantity,
//           calories: parseInt(item.calories) || 0,
//           protein: parseFloat(item.protein) || 0,
//           fat: parseFloat(item.fat) || 0,
//           carbs: parseFloat(item.carbs) || 0,
//           fiber: parseFloat(item.fiber) || 0,
//           sugar: parseFloat(item.sugar) || 0,
//           sodium: parseInt(item.sodium) || 0,
//           categories: item.categories || [],
//           whole_food_ingredients: item.whole_food_ingredients || [], // For biodiversity tracking
//           meal_type: meal.meal_type,
//           meal_group_id: mealGroupId,
//         }));
        
//         allItemsToInsert.push(...mealItems);
//       }

//       // Insert all items to database
//       const { error } = await supabase
//         .from('food_items')
//         .insert(allItemsToInsert);

//       if (error) throw error;

//       console.log('✅ Saved all meals to database!');
      
//       // Clear form and notify dashboard to refresh
//       setFoodInput('');
//       setParsedData(null);
//       setEditingMeals([]);
      
//       setTimeout(() => {
//         window.dispatchEvent(new Event('foodLogged'));
//       }, 100);
      
//     } catch (error) {
//       console.error('Error saving:', error);
//       alert('Failed to save. Please try again.');
//     } finally {
//       setIsSaving(false);
//     }
//   };

//   const handleCancel = () => {
//     setParsedData(null);
//     setFoodInput('');
//     setEditingMeals([]);
//   };

//   // ============================================================================
//   // SAVE MEAL FOR FUTURE REUSE
//   // ============================================================================
  
//   // Open the save meal modal
//   const openSaveMealModal = (meal: any) => {
//     setMealToSave(meal);
//     setSaveMealName('');
//     setShowSaveMealModal(true);
//   };

//   // Save the meal to saved_meals table
//   const saveMealForLater = async () => {
//     if (!userId || !mealToSave || !saveMealName.trim()) return;

//     try {
//       const { error } = await supabase
//         .from('saved_meals')
//         .insert({
//           user_id: userId,
//           meal_name: saveMealName,
//           meal_type: mealToSave.meal_type,
//           items: mealToSave.items,
//         });

//       if (error) throw error;

//       alert('✅ Meal saved! You can reuse it anytime.');
//       setShowSaveMealModal(false);
//       loadSavedMeals(); // Reload the saved meals list
//     } catch (error) {
//       console.error('Error saving meal:', error);
//       alert('Failed to save meal');
//     }
//   };

//   // ============================================================================
//   // ADD SAVED MEAL TO TODAY
//   // ============================================================================
  
//   const addSavedMeal = async (savedMeal: any) => {
//     if (!userId) return;

//     try {
//       const mealGroupId = crypto.randomUUID();
      
//       // Prepare items from saved meal for insertion
//       const itemsToInsert = savedMeal.items.map((item: any) => ({
//         user_id: userId,
//         food_name: item.food_name,
//         quantity: item.quantity,
//         calories: parseInt(item.calories) || 0,
//         protein: parseFloat(item.protein) || 0,
//         fat: parseFloat(item.fat) || 0,
//         carbs: parseFloat(item.carbs) || 0,
//         fiber: parseFloat(item.fiber) || 0,
//         sugar: parseFloat(item.sugar) || 0,
//         sodium: parseInt(item.sodium) || 0,
//         categories: item.categories || [],
//         whole_food_ingredients: item.whole_food_ingredients || [],
//         meal_type: savedMeal.meal_type,
//         meal_group_id: mealGroupId,
//       }));

//       const { error } = await supabase
//         .from('food_items')
//         .insert(itemsToInsert);

//       if (error) throw error;

//       alert(`✅ Added "${savedMeal.meal_name}" to today!`);
      
//       // Notify dashboard to refresh
//       setTimeout(() => {
//         window.dispatchEvent(new Event('foodLogged'));
//       }, 100);
//     } catch (error) {
//       console.error('Error adding saved meal:', error);
//       alert('Failed to add meal');
//     }
//   };

//   // ============================================================================
//   // DELETE SAVED MEAL
//   // ============================================================================
  
//   const deleteSavedMeal = async (mealId: string) => {
//     if (!confirm('Delete this saved meal?')) return;

//     try {
//       const { error } = await supabase
//         .from('saved_meals')
//         .delete()
//         .eq('id', mealId)
//         .eq('user_id', userId);

//       if (error) throw error;

//       loadSavedMeals(); // Reload the list
//     } catch (error) {
//       console.error('Error deleting meal:', error);
//       alert('Failed to delete meal');
//     }
//   };

//   // ============================================================================
//   // HELPER FUNCTIONS
//   // ============================================================================
  
//   const formatMealType = (type: string) => {
//     const emoji = {
//       breakfast: '🌅',
//       lunch: '🌞',
//       dinner: '🌙',
//       snack: '🍎'
//     }[type] || '🍽️';
//     return `${emoji} ${type.charAt(0).toUpperCase() + type.slice(1)}`;
//   };

//   // ============================================================================
//   // RENDER
//   // ============================================================================
  
//   return (
//     <div className="max-w-3xl mx-auto space-y-6">
      
//       {/* ========== SAVED MEALS SECTION (ALWAYS VISIBLE) ========== */}
//       <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-2xl p-5 sm:p-6">
//         <div className="flex items-center justify-between mb-4">
//           <h2 className="text-lg font-semibold text-blue-900 flex items-center gap-2">
//             📚 Saved Meals
//             <span className="text-sm font-normal text-blue-600">
//               ({savedMeals.length})
//             </span>
//           </h2>
//         </div>

//         {/* Loading state */}
//         {isLoadingSavedMeals ? (
//           <div className="text-sm text-blue-600">Loading saved meals...</div>
//         ) : savedMeals.length === 0 ? (
//           /* Empty state - no saved meals yet */
//           <div className="text-center py-8">
//             <div className="text-blue-400 mb-2">📖</div>
//             <div className="text-sm font-medium text-blue-900 mb-1">
//               No saved meals yet
//             </div>
//             <div className="text-xs text-blue-600">
//               Save meals you eat often for quick logging later
//             </div>
//           </div>
//         ) : (
//           /* List of saved meals */
//           <div className="space-y-2">
//             {savedMeals.map((meal) => {
//               const totalCals = meal.items.reduce((sum: number, item: any) => 
//                 sum + (parseInt(item.calories) || 0), 0
//               );
              
//               return (
//                 <div 
//                   key={meal.id} 
//                   className="bg-white p-4 rounded-xl border border-blue-200 flex items-center justify-between hover:shadow-md transition-shadow"
//                 >
//                   <div className="flex-1">
//                     <div className="font-semibold text-gray-900">{meal.meal_name}</div>
//                     <div className="text-xs text-gray-500 mt-1">
//                       {formatMealType(meal.meal_type)} · {meal.items.length} items · {totalCals} cal
//                     </div>
//                   </div>
//                   <div className="flex gap-2">
//                     {/* Add to today button */}
//                     <button
//                       onClick={() => addSavedMeal(meal)}
//                       className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
//                     >
//                       + Add to Today
//                     </button>
//                     {/* Delete button */}
//                     <button
//                       onClick={() => deleteSavedMeal(meal.id)}
//                       className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
//                       title="Delete saved meal"
//                     >
//                       <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
//                       </svg>
//                     </button>
//                   </div>
//                 </div>
//               );
//             })}
//           </div>
//         )}
//       </div>

//       {/* ========== FOOD INPUT FORM ========== */}
//       <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
//         <form onSubmit={handleSubmit}>
//           <label className="block text-sm font-medium text-gray-700 mb-3">
//             What did you eat today?
//           </label>
//           <textarea
//             value={foodInput}
//             onChange={(e) => setFoodInput(e.target.value)}
//             placeholder="Enter your entire day, or just one meal - I'll figure it out!

// Examples:
// - Single meal: Grilled chicken breast with broccoli and rice
// - Multiple meals: Breakfast: oatmeal with berries. Lunch: turkey sandwich. Dinner: pasta with marinara
// - With context: This morning I had eggs and toast. For lunch at Chipotle I got a burrito bowl. Dinner was homemade stir fry"
//             className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none text-gray-900 placeholder-gray-400 text-base"
//             rows={6}
//             disabled={isLoading || !!parsedData}
//           />
          
//           <button
//             type="submit"
//             disabled={isLoading || !foodInput.trim() || !!parsedData}
//             className="w-full mt-4 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-3 px-6 rounded-xl transition-colors"
//           >
//             {isLoading ? 'Analyzing...' : 'Analyze Food'}
//           </button>
//         </form>

//         {/* ========== PARSED MEALS (After Analysis) ========== */}
//         {parsedData && editingMeals.length > 0 && (
//           <div className="mt-8 pt-8 border-t border-gray-200">
            
//             {/* What you entered */}
//             <div className="mb-6 p-4 bg-gray-50 rounded-xl">
//               <div className="text-sm font-medium text-gray-700 mb-1">You entered:</div>
//               <div className="text-gray-900">{foodInput}</div>
//             </div>

//             {/* Detection summary */}
//             <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
//               <div className="text-sm font-medium text-blue-900 mb-1">
//                 🎯 Detected {editingMeals.length} {editingMeals.length === 1 ? 'meal' : 'meals'}
//               </div>
//               <div className="text-sm text-blue-700">
//                 {editingMeals.map((meal, idx) => formatMealType(meal.meal_type)).join(' · ')}
//               </div>
//             </div>

//             {/* Each meal card */}
//             <div className="space-y-6">
//               {editingMeals.map((meal, mealIndex) => {
//                 // Calculate meal totals
//                 const mealTotals = (meal.items || []).reduce(
//                   (acc: any, item: any) => ({
//                     calories: acc.calories + (parseInt(item.calories) || 0),
//                     protein: acc.protein + (parseFloat(item.protein) || 0),
//                     fat: acc.fat + (parseFloat(item.fat) || 0),
//                     carbs: acc.carbs + (parseFloat(item.carbs) || 0),
//                   }),
//                   { calories: 0, protein: 0, fat: 0, carbs: 0 }
//                 );

//                 return (
//                   <div key={mealIndex} className="border-2 border-gray-200 rounded-xl overflow-hidden">
//                     {/* Meal header */}
//                     <div className="bg-gray-50 px-5 py-4 border-b border-gray-200">
//                       <div className="flex items-start justify-between mb-4">
//                         <div>
//                           <div className="text-lg font-semibold text-gray-900 mb-1">
//                             Meal {mealIndex + 1}
//                           </div>
//                           <div className="text-right">
//                             <div className="text-2xl font-bold text-gray-900">
//                               {mealTotals.calories} cal
//                             </div>
//                             <div className="text-xs text-gray-500 mt-0.5">
//                               P: {mealTotals.protein.toFixed(0)}g · 
//                               F: {mealTotals.fat.toFixed(0)}g · 
//                               C: {mealTotals.carbs.toFixed(0)}g
//                             </div>
//                           </div>
//                         </div>
                        
//                         {/* SAVE MEAL BUTTON - Very prominent */}
//                         <button
//                           onClick={() => openSaveMealModal(meal)}
//                           className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
//                         >
//                           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
//                           </svg>
//                           <span className="hidden sm:inline">Save Meal</span>
//                         </button>
//                       </div>

//                       {/* Meal type selector */}
//                       <div className="grid grid-cols-4 gap-2">
//                         {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((type) => (
//                           <button
//                             key={type}
//                             type="button"
//                             onClick={() => handleMealTypeChange(mealIndex, type)}
//                             className={`py-2 px-3 rounded-lg text-xs font-medium transition-all ${
//                               meal.meal_type === type
//                                 ? 'bg-gray-900 text-white'
//                                 : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
//                             }`}
//                           >
//                             {formatMealType(type)}
//                           </button>
//                         ))}
//                       </div>
//                     </div>

//                     {/* Food items in this meal */}
//                     <div className="p-4 space-y-2 bg-white">
//                       {(meal.items || []).map((item: any, itemIndex: number) => {
//                         const isExpanded = expandedItems.get(`${mealIndex}`)?.has(itemIndex);
                        
//                         return (
//                           <div key={itemIndex} className="border border-gray-200 rounded-lg overflow-hidden">
//                             {/* Item header - click to expand */}
//                             <button
//                               type="button"
//                               onClick={() => toggleExpand(mealIndex, itemIndex)}
//                               className="w-full p-3 text-left hover:bg-gray-50 transition-colors flex items-center justify-between"
//                             >
//                               <div className="flex-1">
//                                 <div className="font-medium text-gray-900">{item.food_name}</div>
//                                 <div className="text-sm text-gray-600 mt-0.5">
//                                   {item.quantity} · {item.calories} cal · 
//                                   P: {item.protein}g · F: {item.fat}g · C: {item.carbs}g
//                                 </div>
//                               </div>
//                               <svg
//                                 className={`w-5 h-5 text-gray-400 transition-transform ${
//                                   isExpanded ? 'rotate-180' : ''
//                                 }`}
//                                 fill="none"
//                                 stroke="currentColor"
//                                 viewBox="0 0 24 24"
//                               >
//                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
//                               </svg>
//                             </button>

//                             {/* Item details (when expanded) - can edit here */}
//                             {isExpanded && (
//                               <div className="p-3 pt-0 border-t border-gray-200 bg-gray-50 space-y-3">
//                                 <div className="grid grid-cols-2 gap-3">
//                                   <div>
//                                     <label className="text-xs text-gray-600 mb-1.5 block font-medium">Food</label>
//                                     <input
//                                       type="text"
//                                       value={item.food_name}
//                                       onChange={(e) => handleItemEdit(mealIndex, itemIndex, 'food_name', e.target.value)}
//                                       className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
//                                     />
//                                   </div>
//                                   <div>
//                                     <label className="text-xs text-gray-600 mb-1.5 block font-medium">Quantity</label>
//                                     <input
//                                       type="text"
//                                       value={item.quantity}
//                                       onChange={(e) => handleItemEdit(mealIndex, itemIndex, 'quantity', e.target.value)}
//                                       className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
//                                     />
//                                   </div>
//                                 </div>

//                                 <div>
//                                   <label className="text-xs text-gray-600 mb-1.5 block font-medium">Macronutrients</label>
//                                   <div className="grid grid-cols-4 gap-2">
//                                     <div>
//                                       <input
//                                         type="number"
//                                         value={item.calories}
//                                         onChange={(e) => handleItemEdit(mealIndex, itemIndex, 'calories', e.target.value)}
//                                         className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm bg-white text-center"
//                                       />
//                                       <div className="text-xs text-gray-500 mt-1 text-center">cal</div>
//                                     </div>
//                                     <div>
//                                       <input
//                                         type="number"
//                                         step="0.1"
//                                         value={item.protein}
//                                         onChange={(e) => handleItemEdit(mealIndex, itemIndex, 'protein', e.target.value)}
//                                         className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm bg-white text-center"
//                                       />
//                                       <div className="text-xs text-gray-500 mt-1 text-center">protein</div>
//                                     </div>
//                                     <div>
//                                       <input
//                                         type="number"
//                                         step="0.1"
//                                         value={item.fat}
//                                         onChange={(e) => handleItemEdit(mealIndex, itemIndex, 'fat', e.target.value)}
//                                         className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm bg-white text-center"
//                                       />
//                                       <div className="text-xs text-gray-500 mt-1 text-center">fat</div>
//                                     </div>
//                                     <div>
//                                       <input
//                                         type="number"
//                                         step="0.1"
//                                         value={item.carbs}
//                                         onChange={(e) => handleItemEdit(mealIndex, itemIndex, 'carbs', e.target.value)}
//                                         className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm bg-white text-center"
//                                       />
//                                       <div className="text-xs text-gray-500 mt-1 text-center">carbs</div>
//                                     </div>
//                                   </div>
//                                 </div>

//                                 {/* Food categories */}
//                                 {item.categories && item.categories.length > 0 && (
//                                   <div className="flex gap-2 flex-wrap">
//                                     {item.categories.map((cat: string, i: number) => (
//                                       <span
//                                         key={i}
//                                         className="px-2.5 py-1 bg-white border border-gray-200 text-gray-700 text-xs rounded-md font-medium"
//                                       >
//                                         {cat}
//                                       </span>
//                                     ))}
//                                   </div>
//                                 )}
//                               </div>
//                             )}
//                           </div>
//                         );
//                       })}
//                     </div>
//                   </div>
//                 );
//               })}
//             </div>

//             {/* Total summary for all meals */}
//             <div className="mt-6 bg-gray-900 text-white rounded-xl p-5">
//               <div className="text-sm font-medium text-gray-300 mb-2">Total for All Meals</div>
//               <div className="text-3xl font-bold mb-3">
//                 {editingMeals.reduce((sum, meal) => 
//                   sum + (meal.items || []).reduce((s: number, item: any) => s + (parseInt(item.calories) || 0), 0), 0
//                 )} cal
//               </div>
//               <div className="grid grid-cols-3 gap-4 text-sm">
//                 <div>
//                   <div className="text-gray-300">Protein</div>
//                   <div className="text-lg font-semibold">
//                     {editingMeals.reduce((sum, meal) => 
//                       sum + (meal.items || []).reduce((s: number, item: any) => s + (parseFloat(item.protein) || 0), 0), 0
//                     ).toFixed(1)}g
//                   </div>
//                 </div>
//                 <div>
//                   <div className="text-gray-300">Fat</div>
//                   <div className="text-lg font-semibold">
//                     {editingMeals.reduce((sum, meal) => 
//                       sum + (meal.items || []).reduce((s: number, item: any) => s + (parseFloat(item.fat) || 0), 0), 0
//                     ).toFixed(1)}g
//                   </div>
//                 </div>
//                 <div>
//                   <div className="text-gray-300">Carbs</div>
//                   <div className="text-lg font-semibold">
//                     {editingMeals.reduce((sum, meal) => 
//                       sum + (meal.items || []).reduce((s: number, item: any) => s + (parseFloat(item.carbs) || 0), 0), 0
//                     ).toFixed(1)}g
//                   </div>
//                 </div>
//               </div>
//             </div>

//             {/* Action buttons */}
//             <div className="flex gap-3 mt-6">
//               <button
//                 onClick={handleConfirm}
//                 disabled={isSaving}
//                 className="flex-1 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300 text-white font-medium py-3.5 px-6 rounded-xl transition-colors"
//               >
//                 {isSaving ? 'Saving...' : `Save ${editingMeals.length} ${editingMeals.length === 1 ? 'Meal' : 'Meals'} to Log`}
//               </button>
//               <button
//                 onClick={handleCancel}
//                 disabled={isSaving}
//                 className="px-6 py-3.5 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
//               >
//                 Cancel
//               </button>
//             </div>
//           </div>
//         )}
//       </div>

//       {/* ========== SAVE MEAL MODAL ========== */}
//       {showSaveMealModal && (
//         <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
//           <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl">
//             <h3 className="text-xl font-semibold text-gray-900 mb-2">
//               Save This Meal
//             </h3>
//             <p className="text-sm text-gray-600 mb-6">
//               Give this meal a name so you can quickly add it again in the future.
//             </p>
            
//             <input
//               type="text"
//               value={saveMealName}
//               onChange={(e) => setSaveMealName(e.target.value)}
//               placeholder="e.g., Chicken Katsu Plate, Morning Smoothie"
//               className="w-full px-4 py-3 border border-gray-300 rounded-lg mb-6 text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent"
//               autoFocus
//               onKeyDown={(e) => {
//                 if (e.key === 'Enter' && saveMealName.trim()) {
//                   saveMealForLater();
//                 }
//               }}
//             />
            
//             <div className="flex gap-3">
//               <button
//                 onClick={saveMealForLater}
//                 disabled={!saveMealName.trim()}
//                 className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg transition-colors"
//               >
//                 💾 Save Meal
//               </button>
//               <button
//                 onClick={() => setShowSaveMealModal(false)}
//                 className="px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
//               >
//                 Cancel
//               </button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }
