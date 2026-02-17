'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function GoalsView({ userId }: { userId: string | null }) {
  const [isEditing, setIsEditing] = useState(false);
  const [hasGoals, setHasGoals] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);

  const [age, setAge] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('male');
  const [activityLevel, setActivityLevel] = useState<'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'>('moderate');
  const [goalType, setGoalType] = useState<'maintain' | 'lose' | 'gain'>('maintain');
  const [timelineWeeks, setTimelineWeeks] = useState('12');

  const [calculatedGoals, setCalculatedGoals] = useState<any>(null);
  const [savedGoals, setSavedGoals] = useState<any>(null);

  const [overrideCalories, setOverrideCalories] = useState('');
  const [overrideProtein, setOverrideProtein] = useState('');
  const [overrideFat, setOverrideFat] = useState('');
  const [overrideCarbs, setOverrideCarbs] = useState('');
  const [overrideFiber, setOverrideFiber] = useState('');
  const [sugarLimit, setSugarLimit] = useState('50');
  const [sodiumLimit, setSodiumLimit] = useState('2300');
  const [biodiversityTarget, setBiodiversityTarget] = useState('5');

  useEffect(() => {
    loadGoals();
  }, [userId]);

  const loadGoals = async () => {
    if (!userId) return;

    const { data, error } = await supabase
      .from('user_goals')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (data) {
      setSavedGoals(data);
      setHasGoals(true);
      setAge(data.age?.toString() || '');
      setHeightCm(data.height_cm?.toString() || '');
      setWeightKg(data.weight_kg?.toString() || '');
      setGender(data.gender || 'male');
      setActivityLevel(data.activity_level || 'moderate');
      setGoalType(data.goal_type || 'maintain');
      setTimelineWeeks(data.timeline_weeks?.toString() || '12');
      
      setOverrideCalories((data.override_calories || data.target_calories)?.toString() || '');
      setOverrideProtein((data.override_protein || data.target_protein)?.toString() || '');
      setOverrideFat((data.override_fat || data.target_fat)?.toString() || '');
      setOverrideCarbs((data.override_carbs || data.target_carbs)?.toString() || '');
      setOverrideFiber((data.override_fiber || data.target_fiber)?.toString() || '');
      setSugarLimit((data.sugar_limit || 50).toString());
      setSodiumLimit((data.sodium_limit || 2300).toString());
      setBiodiversityTarget((data.biodiversity_target || 5).toString());
    } else {
      setIsEditing(true);
      setShowCalculator(true);
    }
  };

  const calculateGoals = () => {
    const ageNum = parseInt(age);
    const heightNum = parseFloat(heightCm);
    const weightNum = parseFloat(weightKg);
    const timelineNum = parseInt(timelineWeeks);

    if (!ageNum || !heightNum || !weightNum) {
      alert('Please fill in all required fields');
      return;
    }

    let bmr;
    if (gender === 'male') {
      bmr = 10 * weightNum + 6.25 * heightNum - 5 * ageNum + 5;
    } else {
      bmr = 10 * weightNum + 6.25 * heightNum - 5 * ageNum - 161;
    }

    const activityMultipliers = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      very_active: 1.9
    };

    const tdee = Math.round(bmr * activityMultipliers[activityLevel]);

    let targetCalories = tdee;
    let weeklyWeightChange = 0;

    if (goalType === 'lose') {
      weeklyWeightChange = -0.5;
      targetCalories = tdee - 500;
    } else if (goalType === 'gain') {
      weeklyWeightChange = 0.5;
      targetCalories = tdee + 300;
    }

    const proteinPerKg = goalType === 'maintain' ? 1.8 : 2.0;
    const targetProtein = Math.round(weightNum * proteinPerKg);
    const targetFat = Math.round((targetCalories * 0.28) / 9);
    const proteinCals = targetProtein * 4;
    const fatCals = targetFat * 9;
    const targetCarbs = Math.round((targetCalories - proteinCals - fatCals) / 4);
    const targetFiber = Math.round((targetCalories / 1000) * 14);

    setCalculatedGoals({
      tdee,
      targetCalories,
      targetProtein,
      targetFat,
      targetCarbs,
      targetFiber,
      weeklyWeightChange,
      totalWeightChange: (weeklyWeightChange * timelineNum).toFixed(1)
    });

    setOverrideCalories(targetCalories.toString());
    setOverrideProtein(targetProtein.toString());
    setOverrideFat(targetFat.toString());
    setOverrideCarbs(targetCarbs.toString());
    setOverrideFiber(targetFiber.toString());
  };

  const handleSave = async () => {
    if (!userId || !overrideCalories) return;

    setIsSaving(true);

    try {
      const goalsData = {
        user_id: userId,
        age: parseInt(age),
        height_cm: parseFloat(heightCm),
        weight_kg: parseFloat(weightKg),
        gender,
        activity_level: activityLevel,
        goal_type: goalType,
        timeline_weeks: parseInt(timelineWeeks),
        tdee: calculatedGoals?.tdee || savedGoals?.tdee,
        target_calories: calculatedGoals?.targetCalories || savedGoals?.target_calories,
        target_protein: calculatedGoals?.targetProtein || savedGoals?.target_protein,
        target_fat: calculatedGoals?.targetFat || savedGoals?.target_fat,
        target_carbs: calculatedGoals?.targetCarbs || savedGoals?.target_carbs,
        target_fiber: calculatedGoals?.targetFiber || savedGoals?.target_fiber,
        override_calories: parseInt(overrideCalories),
        override_protein: parseFloat(overrideProtein),
        override_fat: parseFloat(overrideFat),
        override_carbs: parseFloat(overrideCarbs),
        override_fiber: parseFloat(overrideFiber),
        sugar_limit: parseInt(sugarLimit),
        sodium_limit: parseInt(sodiumLimit),
        biodiversity_target: parseInt(biodiversityTarget),
      };

      const { error } = await supabase
        .from('user_goals')
        .upsert(goalsData, { onConflict: 'user_id' });

      if (error) throw error;

      await loadGoals();
      setIsEditing(false);
      setShowCalculator(false);
      setCalculatedGoals(null);

      alert('✅ Goals saved successfully!');
    } catch (error) {
      console.error('Error saving goals:', error);
      alert('Failed to save goals. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const getDisplayGoals = () => {
    if (!savedGoals) return null;
    return {
      calories: savedGoals.override_calories || savedGoals.target_calories,
      protein: savedGoals.override_protein || savedGoals.target_protein,
      fat: savedGoals.override_fat || savedGoals.target_fat,
      carbs: savedGoals.override_carbs || savedGoals.target_carbs,
      fiber: savedGoals.override_fiber || savedGoals.target_fiber,
    };
  };

  const displayGoals = getDisplayGoals();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Goals & Settings</h1>
        {hasGoals && !isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Edit Goals
          </button>
        )}
      </div>

      {!isEditing && hasGoals && displayGoals ? (
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Daily Goals</h2>
            
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              <div className="text-center p-4 bg-gray-50 rounded-xl">
                <div className="text-3xl font-bold text-gray-900">{displayGoals.calories}</div>
                <div className="text-sm text-gray-600 mt-1">Calories</div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-xl">
                <div className="text-3xl font-bold text-blue-900">{displayGoals.protein}g</div>
                <div className="text-sm text-blue-700 mt-1">Protein</div>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-xl">
                <div className="text-3xl font-bold text-yellow-900">{displayGoals.fat}g</div>
                <div className="text-sm text-yellow-700 mt-1">Fat</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-xl">
                <div className="text-3xl font-bold text-green-900">{displayGoals.carbs}g</div>
                <div className="text-sm text-green-700 mt-1">Carbs</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-xl">
                <div className="text-3xl font-bold text-purple-900">{displayGoals.fiber}g</div>
                <div className="text-sm text-purple-700 mt-1">Fiber</div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-100">
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <div className="text-xs text-orange-600 mb-1">Sugar Limit</div>
                <div className="text-2xl font-bold text-orange-900">&lt;{savedGoals.sugar_limit || 50}g</div>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <div className="text-xs text-red-600 mb-1">Sodium Limit</div>
                <div className="text-2xl font-bold text-red-900">&lt;{savedGoals.sodium_limit || 2300}mg</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-xs text-green-600 mb-1">Biodiversity</div>
                <div className="text-2xl font-bold text-green-900">{savedGoals.biodiversity_target || 5}+ foods</div>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200 mt-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Your Profile</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-600">Age:</span>
                  <span className="ml-2 font-medium text-gray-900">{savedGoals.age} years</span>
                </div>
                <div>
                  <span className="text-gray-600">Height:</span>
                  <span className="ml-2 font-medium text-gray-900">{savedGoals.height_cm} cm</span>
                </div>
                <div>
                  <span className="text-gray-600">Weight:</span>
                  <span className="ml-2 font-medium text-gray-900">{savedGoals.weight_kg} kg</span>
                </div>
                <div>
                  <span className="text-gray-600">Gender:</span>
                  <span className="ml-2 font-medium text-gray-900 capitalize">{savedGoals.gender}</span>
                </div>
                <div>
                  <span className="text-gray-600">Activity:</span>
                  <span className="ml-2 font-medium text-gray-900 capitalize">{savedGoals.activity_level.replace('_', ' ')}</span>
                </div>
                <div>
                  <span className="text-gray-600">Goal:</span>
                  <span className="ml-2 font-medium text-gray-900 capitalize">{savedGoals.goal_type} weight</span>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <div className="text-sm text-blue-900">
                  <span className="font-medium">TDEE:</span> {savedGoals.tdee} calories/day
                </div>
                <div className="text-xs text-blue-700 mt-1">
                  (Total Daily Energy Expenditure - maintenance calories)
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Edit Your Goals</h2>
            <p className="text-sm text-gray-600">
              Adjust your targets directly or recalculate based on updated stats
            </p>
          </div>

          <div className="p-4 bg-gray-50 rounded-xl">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Daily Targets</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-600 mb-1.5">Calories</label>
                <input
                  type="number"
                  value={overrideCalories}
                  onChange={(e) => setOverrideCalories(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  placeholder="2000"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1.5">Protein (g)</label>
                <input
                  type="number"
                  step="0.1"
                  value={overrideProtein}
                  onChange={(e) => setOverrideProtein(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  placeholder="150"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1.5">Fat (g)</label>
                <input
                  type="number"
                  step="0.1"
                  value={overrideFat}
                  onChange={(e) => setOverrideFat(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  placeholder="65"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1.5">Carbs (g)</label>
                <input
                  type="number"
                  step="0.1"
                  value={overrideCarbs}
                  onChange={(e) => setOverrideCarbs(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  placeholder="225"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-gray-600 mb-1.5">Fiber (g)</label>
                <input
                  type="number"
                  step="0.1"
                  value={overrideFiber}
                  onChange={(e) => setOverrideFiber(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  placeholder="30"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1.5">Sugar Limit (g/day)</label>
                <input
                  type="number"
                  value={sugarLimit}
                  onChange={(e) => setSugarLimit(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  placeholder="50"
                />
                <p className="text-xs text-gray-500 mt-1">FDA recommends &lt;50g/day</p>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1.5">Sodium Limit (mg/day)</label>
                <input
                  type="number"
                  value={sodiumLimit}
                  onChange={(e) => setSodiumLimit(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  placeholder="2300"
                />
                <p className="text-xs text-gray-500 mt-1">FDA recommends &lt;2300mg/day</p>
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-gray-600 mb-1.5">Daily Biodiversity Target</label>
                <input
                  type="number"
                  value={biodiversityTarget}
                  onChange={(e) => setBiodiversityTarget(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  placeholder="5"
                />
                <p className="text-xs text-gray-500 mt-1">Aim for 5+ unique whole foods daily (30+ per week)</p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <button
              onClick={() => setShowCalculator(!showCalculator)}
              className="w-full flex items-center justify-between p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-blue-900 font-medium text-sm">
                  🧮 Recalculate Goals from Stats
                </span>
              </div>
              <svg
                className={`w-4 h-4 text-blue-700 transition-transform ${
                  showCalculator ? 'rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showCalculator && (
              <div className="mt-4 p-4 bg-gray-50 rounded-xl space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Age</label>
                    <input
                      type="number"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      placeholder="25"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value as any)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Height (cm)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={heightCm}
                      onChange={(e) => setHeightCm(e.target.value)}
                      placeholder="175"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Weight (kg)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={weightKg}
                      onChange={(e) => setWeightKg(e.target.value)}
                      placeholder="70"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Activity Level</label>
                  <select
                    value={activityLevel}
                    onChange={(e) => setActivityLevel(e.target.value as any)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  >
                    <option value="sedentary">Sedentary (little or no exercise)</option>
                    <option value="light">Light (exercise 1-3 days/week)</option>
                    <option value="moderate">Moderate (exercise 3-5 days/week)</option>
                    <option value="active">Active (exercise 6-7 days/week)</option>
                    <option value="very_active">Very Active (intense exercise daily)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Goal</label>
                    <select
                      value={goalType}
                      onChange={(e) => setGoalType(e.target.value as any)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    >
                      <option value="lose">Lose Weight</option>
                      <option value="maintain">Maintain Weight</option>
                      <option value="gain">Gain Weight</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Timeline (weeks)</label>
                    <input
                      type="number"
                      value={timelineWeeks}
                      onChange={(e) => setTimelineWeeks(e.target.value)}
                      placeholder="12"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    />
                  </div>
                </div>

                <button
                  onClick={calculateGoals}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-6 rounded-lg transition-colors"
                >
                  Calculate & Update Goals
                </button>

                {calculatedGoals && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="text-sm text-green-900 font-medium mb-2">✓ Goals Updated</div>
                    <div className="text-xs text-green-700">
                      TDEE: {calculatedGoals.tdee} cal · Target: {calculatedGoals.targetCalories} cal
                      {calculatedGoals.weeklyWeightChange !== 0 && (
                        <> · Expected: {calculatedGoals.totalWeightChange}kg in {timelineWeeks} weeks</>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={handleSave}
              disabled={isSaving || !overrideCalories}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-medium py-3 px-6 rounded-xl transition-colors"
            >
              {isSaving ? 'Saving...' : 'Save Goals'}
            </button>
            {hasGoals && (
              <button
                onClick={() => {
                  setIsEditing(false);
                  setShowCalculator(false);
                  setCalculatedGoals(null);
                  loadGoals();
                }}
                className="px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}