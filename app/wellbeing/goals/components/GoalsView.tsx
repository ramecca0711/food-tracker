'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function GoalsView({ userId }: { userId: string | null }) {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================
  
  const [useCalculator, setUseCalculator] = useState(true);
  const [unitSystem, setUnitSystem] = useState<'imperial' | 'metric'>('imperial');
  
  // Calculator inputs
  const [age, setAge] = useState('');
  const [heightFeet, setHeightFeet] = useState('');
  const [heightInches, setHeightInches] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [weightLbs, setWeightLbs] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [activityLevel, setActivityLevel] = useState('moderate');
  const [goalType, setGoalType] = useState('maintain');
  const [timelineWeeks, setTimelineWeeks] = useState('12');
  
  // Calculated/Override values
  const [tdee, setTdee] = useState(0);
  const [targetCalories, setTargetCalories] = useState(0);
  const [targetProtein, setTargetProtein] = useState(0);
  const [targetFat, setTargetFat] = useState(0);
  const [targetCarbs, setTargetCarbs] = useState(0);
  const [targetFiber, setTargetFiber] = useState(25);
  
  // Override toggles and values
  const [overrideCalories, setOverrideCalories] = useState(false);
  const [overrideProtein, setOverrideProtein] = useState(false);
  const [overrideFat, setOverrideFat] = useState(false);
  const [overrideCarbs, setOverrideCarbs] = useState(false);
  const [overrideFiber, setOverrideFiber] = useState(false);
  
  const [customCalories, setCustomCalories] = useState('');
  const [customProtein, setCustomProtein] = useState('');
  const [customFat, setCustomFat] = useState('');
  const [customCarbs, setCustomCarbs] = useState('');
  const [customFiber, setCustomFiber] = useState('');
  
  // Limits
  const [sugarLimit, setSugarLimit] = useState('50');
  const [sodiumLimit, setSodiumLimit] = useState('2300');
  const [biodiversityTarget, setBiodiversityTarget] = useState('5');
  
  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [existingGoals, setExistingGoals] = useState<any>(null);
  const [goalsHistory, setGoalsHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // ============================================================================
  // LOAD EXISTING GOALS & HISTORY
  // ============================================================================

  useEffect(() => {
    loadGoals();
    loadGoalsHistory();
  }, [userId]);

  const loadGoals = async () => {
    if (!userId) return;

    const { data } = await supabase
      .from('user_goals')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (data) {
      setExistingGoals(data);
      
      setAge(data.age?.toString() || '');
      setGender(data.gender || 'male');
      setActivityLevel(data.activity_level || 'moderate');
      setGoalType(data.goal_type || 'maintain');
      setTimelineWeeks(data.timeline_weeks?.toString() || '12');
      
      if (data.height_cm) {
        const cm = parseFloat(data.height_cm);
        const inches = cm / 2.54;
        const feet = Math.floor(inches / 12);
        const remainingInches = Math.round(inches % 12);
        
        setHeightCm(cm.toString());
        setHeightFeet(feet.toString());
        setHeightInches(remainingInches.toString());
      }
      
      if (data.weight_kg) {
        const kg = parseFloat(data.weight_kg);
        const lbs = kg * 2.20462;
        
        setWeightKg(kg.toString());
        setWeightLbs(Math.round(lbs).toString());
      }
      
      setTdee(data.tdee || 0);
      setTargetCalories(data.target_calories || 0);
      setTargetProtein(data.target_protein || 0);
      setTargetFat(data.target_fat || 0);
      setTargetCarbs(data.target_carbs || 0);
      setTargetFiber(data.target_fiber || 25);
      
      if (data.override_calories) {
        setOverrideCalories(true);
        setCustomCalories(data.override_calories.toString());
      }
      if (data.override_protein) {
        setOverrideProtein(true);
        setCustomProtein(data.override_protein.toString());
      }
      if (data.override_fat) {
        setOverrideFat(true);
        setCustomFat(data.override_fat.toString());
      }
      if (data.override_carbs) {
        setOverrideCarbs(true);
        setCustomCarbs(data.override_carbs.toString());
      }
      if (data.override_fiber) {
        setOverrideFiber(true);
        setCustomFiber(data.override_fiber.toString());
      }
      
      setSugarLimit(data.sugar_limit?.toString() || '50');
      setSodiumLimit(data.sodium_limit?.toString() || '2300');
      setBiodiversityTarget(data.biodiversity_target?.toString() || '5');
    }
  };

  const loadGoalsHistory = async () => {
    if (!userId) return;

    const { data } = await supabase
      .from('goals_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (data) {
      setGoalsHistory(data);
    }
  };

  // ============================================================================
  // CALCULATIONS
  // ============================================================================

  const calculateGoals = () => {
    let heightInCm: number;
    let weightInKg: number;

    if (unitSystem === 'imperial') {
      const totalInches = (parseInt(heightFeet) || 0) * 12 + (parseInt(heightInches) || 0);
      heightInCm = totalInches * 2.54;
      weightInKg = (parseInt(weightLbs) || 0) / 2.20462;
    } else {
      heightInCm = parseFloat(heightCm) || 0;
      weightInKg = parseFloat(weightKg) || 0;
    }

    const ageNum = parseInt(age) || 0;

    if (!heightInCm || !weightInKg || !ageNum) {
      alert('Please fill in age, height, and weight');
      return;
    }

    let bmr: number;
    if (gender === 'male') {
      bmr = 10 * weightInKg + 6.25 * heightInCm - 5 * ageNum + 5;
    } else {
      bmr = 10 * weightInKg + 6.25 * heightInCm - 5 * ageNum - 161;
    }

    const activityMultipliers: { [key: string]: number } = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      veryActive: 1.9
    };

    const calculatedTdee = Math.round(bmr * activityMultipliers[activityLevel]);
    setTdee(calculatedTdee);

    let calories = calculatedTdee;
    const weeksNum = parseInt(timelineWeeks) || 12;

    if (goalType === 'lose') {
      calories = calculatedTdee - 500;
    } else if (goalType === 'gain') {
      calories = calculatedTdee + 300;
    }

    setTargetCalories(calories);

    const protein = Math.round(weightInKg * 2.0);
    setTargetProtein(protein);

    const fatCals = calories * 0.275;
    const fat = Math.round(fatCals / 9);
    setTargetFat(fat);

    const proteinCals = protein * 4;
    const fatCalories = fat * 9;
    const carbCals = calories - proteinCals - fatCalories;
    const carbs = Math.round(carbCals / 4);
    setTargetCarbs(carbs);

    const fiber = Math.round((calories / 1000) * 14);
    setTargetFiber(fiber);
  };

  // ============================================================================
  // SAVE GOALS - FIXED ERROR
  // ============================================================================

  const saveGoals = async () => {
    if (!userId) return;

    setIsSaving(true);

    try {
      let heightInCm: number;
      let weightInKg: number;

      if (unitSystem === 'imperial') {
        const totalInches = (parseInt(heightFeet) || 0) * 12 + (parseInt(heightInches) || 0);
        heightInCm = totalInches * 2.54;
        weightInKg = (parseInt(weightLbs) || 0) / 2.20462;
      } else {
        heightInCm = parseFloat(heightCm) || 0;
        weightInKg = parseFloat(weightKg) || 0;
      }

      const goalsData = {
        user_id: userId,
        age: parseInt(age) || null,
        height_cm: heightInCm || null,
        weight_kg: weightInKg || null,
        gender: gender,
        activity_level: activityLevel,
        goal_type: goalType,
        timeline_weeks: parseInt(timelineWeeks) || null,
        tdee: tdee,
        target_calories: targetCalories,
        target_protein: targetProtein,
        target_fat: targetFat,
        target_carbs: targetCarbs,
        target_fiber: targetFiber,
        override_calories: overrideCalories ? parseInt(customCalories) : null,
        override_protein: overrideProtein ? parseFloat(customProtein) : null,
        override_fat: overrideFat ? parseFloat(customFat) : null,
        override_carbs: overrideCarbs ? parseFloat(customCarbs) : null,
        override_fiber: overrideFiber ? parseFloat(customFiber) : null,
        sugar_limit: parseInt(sugarLimit) || 50,
        sodium_limit: parseInt(sodiumLimit) || 2300,
        biodiversity_target: parseInt(biodiversityTarget) || 5,
      };

      // Upsert to user_goals
      const { error: goalsError } = await supabase
        .from('user_goals')
        .upsert(goalsData);

      if (goalsError) {
        console.error('Goals error:', goalsError);
        throw goalsError;
      }

      // Insert to goals_history (only fields that exist in the table)
      const historyData = {
        user_id: userId,
        target_calories: targetCalories,
        target_protein: targetProtein,
        target_fat: targetFat,
        target_carbs: targetCarbs,
        target_fiber: targetFiber,
        override_calories: overrideCalories ? parseInt(customCalories) : null,
        override_protein: overrideProtein ? parseFloat(customProtein) : null,
        override_fat: overrideFat ? parseFloat(customFat) : null,
        override_carbs: overrideCarbs ? parseFloat(customCarbs) : null,
        override_fiber: overrideFiber ? parseFloat(customFiber) : null,
        sugar_limit: parseInt(sugarLimit) || 50,
        sodium_limit: parseInt(sodiumLimit) || 2300,
        biodiversity_target: parseInt(biodiversityTarget) || 5,
        goal_type: goalType,
      };

      const { error: historyError } = await supabase
        .from('goals_history')
        .insert(historyData);

      if (historyError) {
        console.error('History error:', historyError);
        throw historyError;
      }

      alert('✅ Goals saved successfully!');
      loadGoals();
      loadGoalsHistory();
    } catch (error) {
      console.error('Error saving goals:', error);
      alert('Failed to save goals: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsSaving(false);
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      <h1 className="text-3xl font-bold text-gray-900">Goals</h1>

      {/* Intro Explanation */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-blue-900 mb-3">How Goals Are Calculated</h2>
        <div className="text-sm text-blue-800 space-y-2">
          <p>
            <strong>TDEE (Total Daily Energy Expenditure):</strong> Calculated using the Mifflin-St Jeor equation, 
            which considers your age, height, weight, gender, and activity level to estimate daily calorie burn.
          </p>
          <p>
            <strong>Calorie Target:</strong> For weight loss, we subtract 500 cal/day (~1 lb/week). For weight gain, 
            we add 300 cal/day (~0.5 lb/week). For maintenance, TDEE = target calories.
          </p>
          <p>
            <strong>Protein:</strong> Set at 2g per kg body weight (0.9g per lb), optimal for muscle maintenance and satiety.
          </p>
          <p>
            <strong>Fat:</strong> 27.5% of total calories (within the 25-30% recommended range).
          </p>
          <p>
            <strong>Carbs:</strong> Remaining calories after protein and fat are allocated.
          </p>
          <p>
            <strong>Fiber:</strong> 14g per 1000 calories (FDA guideline).
          </p>
        </div>
      </div>

      {/* Calculator vs Manual Toggle */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setUseCalculator(true)}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
              useCalculator
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Use Calculator
          </button>
          <button
            onClick={() => setUseCalculator(false)}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
              !useCalculator
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Set Manually
          </button>
        </div>

        {useCalculator ? (
          /* CALCULATOR MODE */
          <div className="space-y-6">
            
            {/* Unit System Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Unit System</label>
              <div className="flex gap-4">
                <button
                  onClick={() => setUnitSystem('imperial')}
                  className={`flex-1 py-2 px-4 rounded-lg border-2 font-medium transition-colors ${
                    unitSystem === 'imperial'
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-gray-300 text-gray-700 hover:border-gray-400'
                  }`}
                >
                  Imperial (lbs, ft/in)
                </button>
                <button
                  onClick={() => setUnitSystem('metric')}
                  className={`flex-1 py-2 px-4 rounded-lg border-2 font-medium transition-colors ${
                    unitSystem === 'metric'
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-gray-300 text-gray-700 hover:border-gray-400'
                  }`}
                >
                  Metric (kg, cm)
                </button>
              </div>
            </div>

            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Age</label>
                <input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="e.g., 30"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as 'male' | 'female')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
            </div>

            {/* Height */}
            {unitSystem === 'imperial' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Height</label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <input
                      type="number"
                      value={heightFeet}
                      onChange={(e) => setHeightFeet(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      placeholder="Feet"
                    />
                    <div className="text-xs text-gray-500 mt-1">feet</div>
                  </div>
                  <div>
                    <input
                      type="number"
                      value={heightInches}
                      onChange={(e) => setHeightInches(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      placeholder="Inches"
                    />
                    <div className="text-xs text-gray-500 mt-1">inches</div>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Height (cm)</label>
                <input
                  type="number"
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="e.g., 175"
                />
              </div>
            )}

            {/* Weight */}
            {unitSystem === 'imperial' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Weight (lbs)</label>
                <input
                  type="number"
                  value={weightLbs}
                  onChange={(e) => setWeightLbs(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="e.g., 180"
                />
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Weight (kg)</label>
                <input
                  type="number"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="e.g., 80"
                />
              </div>
            )}

            {/* Activity Level */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Activity Level</label>
              <select
                value={activityLevel}
                onChange={(e) => setActivityLevel(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="sedentary">Sedentary (little/no exercise)</option>
                <option value="light">Light (1-3 days/week)</option>
                <option value="moderate">Moderate (3-5 days/week)</option>
                <option value="active">Active (6-7 days/week)</option>
                <option value="veryActive">Very Active (athlete, 2x/day)</option>
              </select>
            </div>

            {/* Goal Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Goal</label>
              <select
                value={goalType}
                onChange={(e) => setGoalType(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="lose">Lose Weight</option>
                <option value="maintain">Maintain Weight</option>
                <option value="gain">Gain Weight</option>
              </select>
            </div>

            {/* Calculate Button */}
            <button
              onClick={calculateGoals}
              className="w-full bg-green-600 text-white font-medium py-3 rounded-lg hover:bg-green-700 transition-colors"
            >
              Calculate My Goals
            </button>

            {/* Calculated Results */}
            {tdee > 0 && (
              <div className="mt-6 p-6 bg-gray-50 rounded-xl border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-4">Calculated Targets</h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">TDEE (maintenance):</span>
                    <span className="font-semibold text-gray-900">{tdee} cal/day</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Target Calories:</span>
                    <span className="font-semibold text-gray-900">{targetCalories} cal/day</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Protein:</span>
                    <span className="font-semibold text-gray-900">{targetProtein}g/day</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Fat:</span>
                    <span className="font-semibold text-gray-900">{targetFat}g/day</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Carbs:</span>
                    <span className="font-semibold text-gray-900">{targetCarbs}g/day</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Fiber:</span>
                    <span className="font-semibold text-gray-900">{targetFiber}g/day</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* MANUAL MODE */
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Calories</label>
              <input
                type="number"
                value={targetCalories}
                onChange={(e) => setTargetCalories(parseInt(e.target.value) || 0)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                placeholder="e.g., 2000"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Protein (g)</label>
              <input
                type="number"
                value={targetProtein}
                onChange={(e) => setTargetProtein(parseFloat(e.target.value) || 0)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                placeholder="e.g., 150"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Fat (g)</label>
              <input
                type="number"
                value={targetFat}
                onChange={(e) => setTargetFat(parseFloat(e.target.value) || 0)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                placeholder="e.g., 60"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Carbs (g)</label>
              <input
                type="number"
                value={targetCarbs}
                onChange={(e) => setTargetCarbs(parseFloat(e.target.value) || 0)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                placeholder="e.g., 200"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Fiber (g)</label>
              <input
                type="number"
                value={targetFiber}
                onChange={(e) => setTargetFiber(parseFloat(e.target.value) || 0)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                placeholder="e.g., 30"
              />
            </div>
          </div>
        )}

        {/* Overrides Section */}
        {useCalculator && tdee > 0 && (
          <div className="mt-8 pt-8 border-t border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-4">Optional: Override Calculated Values</h3>
            
            <div className="space-y-4">
              {/* Calories Override */}
              <div className="flex items-center gap-4">
                <input
                  type="checkbox"
                  checked={overrideCalories}
                  onChange={(e) => setOverrideCalories(e.target.checked)}
                  className="w-4 h-4"
                />
                <label className="flex-1 text-sm font-medium text-gray-700">Override Calories</label>
                {overrideCalories && (
                  <input
                    type="number"
                    value={customCalories}
                    onChange={(e) => setCustomCalories(e.target.value)}
                    className="w-32 px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder={targetCalories.toString()}
                  />
                )}
              </div>

              {/* Protein Override */}
              <div className="flex items-center gap-4">
                <input
                  type="checkbox"
                  checked={overrideProtein}
                  onChange={(e) => setOverrideProtein(e.target.checked)}
                  className="w-4 h-4"
                />
                <label className="flex-1 text-sm font-medium text-gray-700">Override Protein</label>
                {overrideProtein && (
                  <input
                    type="number"
                    step="0.1"
                    value={customProtein}
                    onChange={(e) => setCustomProtein(e.target.value)}
                    className="w-32 px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder={targetProtein.toString()}
                  />
                )}
              </div>

              {/* Fat Override */}
              <div className="flex items-center gap-4">
                <input
                  type="checkbox"
                  checked={overrideFat}
                  onChange={(e) => setOverrideFat(e.target.checked)}
                  className="w-4 h-4"
                />
                <label className="flex-1 text-sm font-medium text-gray-700">Override Fat</label>
                {overrideFat && (
                  <input
                    type="number"
                    step="0.1"
                    value={customFat}
                    onChange={(e) => setCustomFat(e.target.value)}
                    className="w-32 px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder={targetFat.toString()}
                  />
                )}
              </div>

              {/* Carbs Override */}
              <div className="flex items-center gap-4">
                <input
                  type="checkbox"
                  checked={overrideCarbs}
                  onChange={(e) => setOverrideCarbs(e.target.checked)}
                  className="w-4 h-4"
                />
                <label className="flex-1 text-sm font-medium text-gray-700">Override Carbs</label>
                {overrideCarbs && (
                  <input
                    type="number"
                    step="0.1"
                    value={customCarbs}
                    onChange={(e) => setCustomCarbs(e.target.value)}
                    className="w-32 px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder={targetCarbs.toString()}
                  />
                )}
              </div>

              {/* Fiber Override */}
              <div className="flex items-center gap-4">
                <input
                  type="checkbox"
                  checked={overrideFiber}
                  onChange={(e) => setOverrideFiber(e.target.checked)}
                  className="w-4 h-4"
                />
                <label className="flex-1 text-sm font-medium text-gray-700">Override Fiber</label>
                {overrideFiber && (
                  <input
                    type="number"
                    step="0.1"
                    value={customFiber}
                    onChange={(e) => setCustomFiber(e.target.value)}
                    className="w-32 px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder={targetFiber.toString()}
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {/* Limits Section */}
        <div className="mt-8 pt-8 border-t border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-4">Limits & Targets</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sugar Limit (g/day)</label>
              <input
                type="number"
                value={sugarLimit}
                onChange={(e) => setSugarLimit(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sodium Limit (mg/day)</label>
              <input
                type="number"
                value={sodiumLimit}
                onChange={(e) => setSodiumLimit(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Biodiversity Target (foods/day)</label>
              <input
                type="number"
                value={biodiversityTarget}
                onChange={(e) => setBiodiversityTarget(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={saveGoals}
          disabled={isSaving}
          className="w-full mt-8 bg-blue-600 text-white font-medium py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 transition-colors"
        >
          {isSaving ? 'Saving...' : 'Save Goals'}
        </button>
      </div>

      {/* Goals History */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="w-full flex items-center justify-between"
        >
          <h2 className="text-lg font-semibold text-gray-900">Goals History</h2>
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform ${showHistory ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showHistory && (
          <div className="mt-4 space-y-3">
            {goalsHistory.length === 0 ? (
              <div className="text-sm text-gray-500 text-center py-4">
                No history yet. Save your first goals above.
              </div>
            ) : (
              goalsHistory.map((history) => (
                <div key={history.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex justify-between items-start mb-2">
                    <div className="text-sm font-medium text-gray-900">
                      {new Date(history.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit'
                      })}
                    </div>
                    <div className="text-xs text-gray-500">
                      {history.goal_type === 'lose' ? '📉 Lose Weight' : 
                       history.goal_type === 'gain' ? '📈 Gain Weight' : 
                       '➡️ Maintain'}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                    <div>
                      <div className="text-gray-500">Calories</div>
                      <div className="font-medium text-gray-900">
                        {history.override_calories || history.target_calories}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500">Protein</div>
                      <div className="font-medium text-gray-900">
                        {history.override_protein || history.target_protein}g
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500">Fat</div>
                      <div className="font-medium text-gray-900">
                        {history.override_fat || history.target_fat}g
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500">Carbs</div>
                      <div className="font-medium text-gray-900">
                        {history.override_carbs || history.target_carbs}g
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}