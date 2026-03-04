'use client';

import BiodiversityCard from './BiodiversityCard';

interface SummaryCardsProps {
  todayStats: any;
  sevenDayAvg: any;
  thirtyDayAvg: any;
  todayBiodiversity: any;
  sevenDayBiodiversity: any;
  thirtyDayBiodiversity: any;
  goals: any;
  expandedBioPeriods: Set<string>;
  onToggleBioPeriod: (period: string) => void;
  // How many days passed the completeness check in each window
  sevenDayValidCount?:  number;
  thirtyDayValidCount?: number;
}

export default function SummaryCards({
  todayStats,
  sevenDayAvg,
  thirtyDayAvg,
  todayBiodiversity,
  sevenDayBiodiversity,
  thirtyDayBiodiversity,
  goals,
  expandedBioPeriods,
  onToggleBioPeriod,
  sevenDayValidCount,
  thirtyDayValidCount,
}: SummaryCardsProps) {

  const getProgressColor = (actual: number, target: number, metric: 'calories' | 'macro' | 'fiber') => {
    if (!target) return 'text-gray-400';
    const percentage = (actual / target) * 100;
    
    if (metric === 'fiber') {
      if (percentage >= 100) return 'text-green-600';
      if (percentage >= 80) return 'text-yellow-600';
      return 'text-red-600';
    }
    
    if (percentage >= 90 && percentage <= 110) return 'text-green-600';
    if (percentage >= 80 && percentage <= 120) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getProgressColorInverse = (actual: number, target: number) => {
    if (!target) return 'text-gray-400';
    const percentage = (actual / target) * 100;
    
    if (percentage <= 100) return 'text-green-600';
    if (percentage <= 120) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatProgress = (actual: number, target: number) => {
    if (!target) return '';
    const percentage = (actual / target) * 100;
    return `${Math.round(percentage)}%`;
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
      
      {/* TODAY CARD */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-6">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-medium text-gray-500">Today</div>
        </div>
        
        <div className="mb-1">
          <span className="text-4xl sm:text-5xl font-bold text-gray-900">
            {todayStats.calories.toLocaleString()}
          </span>
          {goals && (
            <span className="text-lg text-gray-400 ml-2">
              /{goals.calories}
            </span>
          )}
        </div>
        {goals && (
          <div className={`text-sm font-semibold mb-2 ${getProgressColor(todayStats.calories, goals.calories, 'calories')}`}>
            {formatProgress(todayStats.calories, goals.calories)}
          </div>
        )}
        {!goals && <div className="text-gray-500 mb-4">calories</div>}
        
        <div className="grid grid-cols-3 gap-3 sm:gap-4 pt-4 border-t border-gray-100">
          <div>
            <div className="text-xs text-gray-500 mb-1">Protein</div>
            <div className="flex items-baseline gap-1">
              <span className="text-lg sm:text-xl font-semibold text-gray-900">
                {Math.round(todayStats.protein)}
              </span>
              <span className="text-lg font-semibold text-gray-700">g</span>
              {goals && (
                <span className="text-xs text-gray-400">
                  /{goals.protein}
                </span>
              )}
            </div>
            {goals && (
              <div className={`text-xs font-medium mt-1 ${getProgressColor(todayStats.protein, goals.protein, 'macro')}`}>
                {formatProgress(todayStats.protein, goals.protein)}
              </div>
            )}
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">Fat</div>
            <div className="flex items-baseline gap-1">
              <span className="text-lg sm:text-xl font-semibold text-gray-900">
                {Math.round(todayStats.fat)}
              </span>
              <span className="text-lg font-semibold text-gray-700">g</span>
              {goals && (
                <span className="text-xs text-gray-400">
                  /{goals.fat}
                </span>
              )}
            </div>
            {goals && (
              <div className={`text-xs font-medium mt-1 ${getProgressColor(todayStats.fat, goals.fat, 'macro')}`}>
                {formatProgress(todayStats.fat, goals.fat)}
              </div>
            )}
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">Carbs</div>
            <div className="flex items-baseline gap-1">
              <span className="text-lg sm:text-xl font-semibold text-gray-900">
                {Math.round(todayStats.carbs)}
              </span>
              <span className="text-lg font-semibold text-gray-700">g</span>
              {goals && (
                <span className="text-xs text-gray-400">
                  /{goals.carbs}
                </span>
              )}
            </div>
            {goals && (
              <div className={`text-xs font-medium mt-1 ${getProgressColor(todayStats.carbs, goals.carbs, 'macro')}`}>
                {formatProgress(todayStats.carbs, goals.carbs)}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 sm:gap-4 pt-3 text-sm">
          <div>
            <div className="text-xs text-gray-500 mb-0.5">Fiber</div>
            <div className="flex items-baseline gap-1">
              <span className="font-semibold text-gray-700">
                {Math.round(todayStats.fiber)}
              </span>
              <span className="text-sm font-semibold text-gray-600">g</span>
              {goals && (
                <span className="text-xs text-gray-400">
                  /{goals.fiber}
                </span>
              )}
            </div>
            {goals && (
              <div className={`text-xs font-medium mt-0.5 ${getProgressColor(todayStats.fiber, goals.fiber, 'fiber')}`}>
                {formatProgress(todayStats.fiber, goals.fiber)}
              </div>
            )}
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-0.5">Sugar</div>
            <div className="flex items-baseline gap-1">
              <span className="font-semibold text-gray-700">
                {Math.round(todayStats.sugar)}
              </span>
              <span className="text-sm font-semibold text-gray-600">g</span>
              {goals && (
                <span className="text-xs text-gray-400">
                  /{goals.sugar}
                </span>
              )}
            </div>
            {goals && (
              <div className={`text-xs font-medium mt-0.5 ${getProgressColorInverse(todayStats.sugar, goals.sugar)}`}>
                {formatProgress(todayStats.sugar, goals.sugar)}
              </div>
            )}
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-0.5">Sodium</div>
            <div className="flex items-baseline gap-1">
              <span className="font-semibold text-gray-700">
                {todayStats.sodium}
              </span>
              <span className="text-xs font-semibold text-gray-600">mg</span>
              {goals && (
                <span className="text-xs text-gray-400">
                  /{goals.sodium}
                </span>
              )}
            </div>
            {goals && (
              <div className={`text-xs font-medium mt-0.5 ${getProgressColorInverse(todayStats.sodium, goals.sodium)}`}>
                {formatProgress(todayStats.sodium, goals.sodium)}
              </div>
            )}
          </div>
        </div>

        {/* Biodiversity inline */}
        {todayBiodiversity && (
          <div className="pt-3 mt-3 border-t border-gray-100">
            <div className="text-xs text-gray-500 mb-1">🌱 Biodiversity</div>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-semibold text-green-600">
                {todayBiodiversity.total}
              </span>
              <span className="text-sm text-gray-600">foods</span>
              {goals?.biodiversity && (
                <span className="text-xs text-gray-400">
                  /{goals.biodiversity}
                </span>
              )}
            </div>
          </div>
        )}

        {todayBiodiversity && (
          <BiodiversityCard
            biodiversity={todayBiodiversity}
            isExpanded={expandedBioPeriods.has('today')}
            onToggle={() => onToggleBioPeriod('today')}
            goal={goals?.biodiversity}
            variant="default"
          />
        )}
      </div>

      {/* 7-DAY AVERAGE CARD */}
      <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-2xl p-4 sm:p-6">
        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
          <div className="text-sm font-medium text-blue-600">7-Day Average</div>
          {/* Shows how many valid (complete) days contributed to this average */}
          {sevenDayValidCount !== undefined && (
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-200 text-blue-800 border border-blue-300">
              {sevenDayValidCount}/7 days logged
            </span>
          )}
        </div>
        
        <div className="mb-1">
          <span className="text-4xl sm:text-5xl font-bold text-blue-900">
            {sevenDayAvg.calories.toLocaleString()}
          </span>
          {goals && (
            <span className="text-lg text-blue-400 ml-2">
              /{goals.calories}
            </span>
          )}
        </div>
        {goals && (
          <div className={`text-sm font-semibold mb-2 ${getProgressColor(sevenDayAvg.calories, goals.calories, 'calories').replace('text-', 'text-blue-').replace('600', '700')}`}>
            {formatProgress(sevenDayAvg.calories, goals.calories)}
          </div>
        )}
        {!goals && <div className="text-blue-600 mb-4">calories/day</div>}
        
        <div className="grid grid-cols-3 gap-3 sm:gap-4 pt-4 border-t border-blue-200/50">
          <div>
            <div className="text-xs text-blue-600 mb-1">Protein</div>
            <div className="flex items-baseline gap-1">
              <span className="text-lg sm:text-xl font-semibold text-blue-900">
                {sevenDayAvg.protein}
              </span>
              <span className="text-lg font-semibold text-blue-700">g</span>
              {goals && (
                <span className="text-xs text-blue-400">
                  /{goals.protein}
                </span>
              )}
            </div>
            {goals && (
              <div className={`text-xs font-medium mt-1 ${getProgressColor(sevenDayAvg.protein, goals.protein, 'macro').replace('text-', 'text-blue-').replace('600', '700')}`}>
                {formatProgress(sevenDayAvg.protein, goals.protein)}
              </div>
            )}
          </div>
          <div>
            <div className="text-xs text-blue-600 mb-1">Fat</div>
            <div className="flex items-baseline gap-1">
              <span className="text-lg sm:text-xl font-semibold text-blue-900">
                {sevenDayAvg.fat}
              </span>
              <span className="text-lg font-semibold text-blue-700">g</span>
              {goals && (
                <span className="text-xs text-blue-400">
                  /{goals.fat}
                </span>
              )}
            </div>
            {goals && (
              <div className={`text-xs font-medium mt-1 ${getProgressColor(sevenDayAvg.fat, goals.fat, 'macro').replace('text-', 'text-blue-').replace('600', '700')}`}>
                {formatProgress(sevenDayAvg.fat, goals.fat)}
              </div>
            )}
          </div>
          <div>
            <div className="text-xs text-blue-600 mb-1">Carbs</div>
            <div className="flex items-baseline gap-1">
              <span className="text-lg sm:text-xl font-semibold text-blue-900">
                {sevenDayAvg.carbs}
              </span>
              <span className="text-lg font-semibold text-blue-700">g</span>
              {goals && (
                <span className="text-xs text-blue-400">
                  /{goals.carbs}
                </span>
              )}
            </div>
            {goals && (
              <div className={`text-xs font-medium mt-1 ${getProgressColor(sevenDayAvg.carbs, goals.carbs, 'macro').replace('text-', 'text-blue-').replace('600', '700')}`}>
                {formatProgress(sevenDayAvg.carbs, goals.carbs)}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 sm:gap-4 pt-3 text-sm">
          <div>
            <div className="text-xs text-blue-600 mb-0.5">Fiber</div>
            <div className="flex items-baseline gap-1">
              <span className="font-semibold text-blue-800">
                {sevenDayAvg.fiber}
              </span>
              <span className="text-sm font-semibold text-blue-700">g</span>
              {goals && (
                <span className="text-xs text-blue-400">
                  /{goals.fiber}
                </span>
              )}
            </div>
            {goals && (
              <div className={`text-xs font-medium mt-0.5 ${getProgressColor(sevenDayAvg.fiber, goals.fiber, 'fiber').replace('text-', 'text-blue-').replace('600', '700')}`}>
                {formatProgress(sevenDayAvg.fiber, goals.fiber)}
              </div>
            )}
          </div>
          <div>
            <div className="text-xs text-blue-600 mb-0.5">Sugar</div>
            <div className="flex items-baseline gap-1">
              <span className="font-semibold text-blue-800">
                {sevenDayAvg.sugar}
              </span>
              <span className="text-sm font-semibold text-blue-700">g</span>
              {goals && (
                <span className="text-xs text-blue-400">
                  /{goals.sugar}
                </span>
              )}
            </div>
            {goals && (
              <div className={`text-xs font-medium mt-0.5 ${getProgressColorInverse(sevenDayAvg.sugar, goals.sugar).replace('text-', 'text-blue-').replace('600', '700')}`}>
                {formatProgress(sevenDayAvg.sugar, goals.sugar)}
              </div>
            )}
          </div>
          <div>
            <div className="text-xs text-blue-600 mb-0.5">Sodium</div>
            <div className="flex items-baseline gap-1">
              <span className="font-semibold text-blue-800">
                {sevenDayAvg.sodium}
              </span>
              <span className="text-xs font-semibold text-blue-700">mg</span>
              {goals && (
                <span className="text-xs text-blue-400">
                  /{goals.sodium}
                </span>
              )}
            </div>
            {goals && (
              <div className={`text-xs font-medium mt-0.5 ${getProgressColorInverse(sevenDayAvg.sodium, goals.sodium).replace('text-', 'text-blue-').replace('600', '700')}`}>
                {formatProgress(sevenDayAvg.sodium, goals.sodium)}
              </div>
            )}
          </div>
        </div>

        {sevenDayBiodiversity && (
          <BiodiversityCard
            biodiversity={sevenDayBiodiversity}
            isExpanded={expandedBioPeriods.has('7day')}
            onToggle={() => onToggleBioPeriod('7day')}
            variant="7day"
          />
        )}
      </div>

      {/* 30-DAY AVERAGE CARD */}
      <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-2xl p-4 sm:p-6">
        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
          <div className="text-sm font-medium text-purple-600">30-Day Average</div>
          {/* Shows how many valid (complete) days contributed to this average */}
          {thirtyDayValidCount !== undefined && (
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-purple-200 text-purple-800 border border-purple-300">
              {thirtyDayValidCount}/30 days logged
            </span>
          )}
        </div>
        
        <div className="mb-1">
          <span className="text-4xl sm:text-5xl font-bold text-purple-900">
            {thirtyDayAvg.calories.toLocaleString()}
          </span>
          {goals && (
            <span className="text-lg text-purple-400 ml-2">
              /{goals.calories}
            </span>
          )}
        </div>
        {goals && (
          <div className={`text-sm font-semibold mb-2 ${getProgressColor(thirtyDayAvg.calories, goals.calories, 'calories').replace('text-', 'text-purple-').replace('600', '700')}`}>
            {formatProgress(thirtyDayAvg.calories, goals.calories)}
          </div>
        )}
        {!goals && <div className="text-purple-600 mb-4">calories/day</div>}
        
        <div className="grid grid-cols-3 gap-3 sm:gap-4 pt-4 border-t border-purple-200/50">
          <div>
            <div className="text-xs text-purple-600 mb-1">Protein</div>
            <div className="flex items-baseline gap-1">
              <span className="text-lg sm:text-xl font-semibold text-purple-900">
                {thirtyDayAvg.protein}
              </span>
              <span className="text-lg font-semibold text-purple-700">g</span>
              {goals && (
                <span className="text-xs text-purple-400">
                  /{goals.protein}
                </span>
              )}
            </div>
            {goals && (
              <div className={`text-xs font-medium mt-1 ${getProgressColor(thirtyDayAvg.protein, goals.protein, 'macro').replace('text-', 'text-purple-').replace('600', '700')}`}>
                {formatProgress(thirtyDayAvg.protein, goals.protein)}
              </div>
            )}
          </div>
          <div>
            <div className="text-xs text-purple-600 mb-1">Fat</div>
            <div className="flex items-baseline gap-1">
              <span className="text-lg sm:text-xl font-semibold text-purple-900">
                {thirtyDayAvg.fat}
              </span>
              <span className="text-lg font-semibold text-purple-700">g</span>
              {goals && (
                <span className="text-xs text-purple-400">
                  /{goals.fat}
                </span>
              )}
            </div>
            {goals && (
              <div className={`text-xs font-medium mt-1 ${getProgressColor(thirtyDayAvg.fat, goals.fat, 'macro').replace('text-', 'text-purple-').replace('600', '700')}`}>
                {formatProgress(thirtyDayAvg.fat, goals.fat)}
              </div>
            )}
          </div>
          <div>
            <div className="text-xs text-purple-600 mb-1">Carbs</div>
            <div className="flex items-baseline gap-1">
              <span className="text-lg sm:text-xl font-semibold text-purple-900">
                {thirtyDayAvg.carbs}
              </span>
              <span className="text-lg font-semibold text-purple-700">g</span>
              {goals && (
                <span className="text-xs text-purple-400">
                  /{goals.carbs}
                </span>
              )}
            </div>
            {goals && (
              <div className={`text-xs font-medium mt-1 ${getProgressColor(thirtyDayAvg.carbs, goals.carbs, 'macro').replace('text-', 'text-purple-').replace('600', '700')}`}>
                {formatProgress(thirtyDayAvg.carbs, goals.carbs)}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 sm:gap-4 pt-3 text-sm">
          <div>
            <div className="text-xs text-purple-600 mb-0.5">Fiber</div>
            <div className="flex items-baseline gap-1">
              <span className="font-semibold text-purple-800">
                {thirtyDayAvg.fiber}
              </span>
              <span className="text-sm font-semibold text-purple-700">g</span>
              {goals && (
                <span className="text-xs text-purple-400">
                  /{goals.fiber}
                </span>
              )}
            </div>
            {goals && (
              <div className={`text-xs font-medium mt-0.5 ${getProgressColor(thirtyDayAvg.fiber, goals.fiber, 'fiber').replace('text-', 'text-purple-').replace('600', '700')}`}>
                {formatProgress(thirtyDayAvg.fiber, goals.fiber)}
              </div>
            )}
          </div>
          <div>
            <div className="text-xs text-purple-600 mb-0.5">Sugar</div>
            <div className="flex items-baseline gap-1">
              <span className="font-semibold text-purple-800">
                {thirtyDayAvg.sugar}
              </span>
              <span className="text-sm font-semibold text-purple-700">g</span>
              {goals && (
                <span className="text-xs text-purple-400">
                  /{goals.sugar}
                </span>
              )}
            </div>
            {goals && (
              <div className={`text-xs font-medium mt-0.5 ${getProgressColorInverse(thirtyDayAvg.sugar, goals.sugar).replace('text-', 'text-purple-').replace('600', '700')}`}>
                {formatProgress(thirtyDayAvg.sugar, goals.sugar)}
              </div>
            )}
          </div>
          <div>
            <div className="text-xs text-purple-600 mb-0.5">Sodium</div>
            <div className="flex items-baseline gap-1">
              <span className="font-semibold text-purple-800">
                {thirtyDayAvg.sodium}
              </span>
              <span className="text-xs font-semibold text-purple-700">mg</span>
              {goals && (
                <span className="text-xs text-purple-400">
                  /{goals.sodium}
                </span>
              )}
            </div>
            {goals && (
              <div className={`text-xs font-medium mt-0.5 ${getProgressColorInverse(thirtyDayAvg.sodium, goals.sodium).replace('text-', 'text-purple-').replace('600', '700')}`}>
                {formatProgress(thirtyDayAvg.sodium, goals.sodium)}
              </div>
            )}
          </div>
        </div>

        {thirtyDayBiodiversity && (
          <BiodiversityCard
            biodiversity={thirtyDayBiodiversity}
            isExpanded={expandedBioPeriods.has('30day')}
            onToggle={() => onToggleBioPeriod('30day')}
            variant="30day"
          />
        )}
      </div>
    </div>
  );
}