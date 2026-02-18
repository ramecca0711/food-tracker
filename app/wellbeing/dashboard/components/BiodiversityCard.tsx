'use client';

interface BiodiversityData {
  total: number;
  fruits: number;
  vegetables: number;
  nuts: number;
  legumes: number;
  wholeGrains: number;
  items: {
    fruits: string[];
    vegetables: string[];
    nuts: string[];
    legumes: string[];
    wholeGrains: string[];
  };
}

interface BiodiversityCardProps {
  biodiversity: BiodiversityData;
  isExpanded: boolean;
  onToggle: () => void;
  goal?: number;
  variant?: 'default' | '7day' | '30day';
}

export default function BiodiversityCard({ 
  biodiversity, 
  isExpanded, 
  onToggle, 
  goal,
  variant = 'default' 
}: BiodiversityCardProps) {
  
  const getProgressColor = (actual: number, target: number) => {
    if (!target) return 'text-gray-400';
    const percentage = (actual / target) * 100;
    if (percentage >= 100) return 'text-green-600';
    if (percentage >= 80) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatProgress = (actual: number, target: number) => {
    if (!target) return '';
    const percentage = (actual / target) * 100;
    return `${Math.round(percentage)}%`;
  };

  const colors = {
    default: {
      bg: 'bg-gray-50',
      border: 'border-gray-100',
      text: 'text-gray-700',
      textBold: 'text-gray-900',
      icon: '🌱',
    },
    '7day': {
      bg: 'bg-white/60 backdrop-blur',
      border: 'border-blue-200/50',
      text: 'text-blue-600',
      textBold: 'text-blue-700',
      icon: '🍃',
    },
    '30day': {
      bg: 'bg-white/60 backdrop-blur',
      border: 'border-purple-200/50',
      text: 'text-purple-600',
      textBold: 'text-purple-700',
      icon: '🌳',
    },
  };

  const style = colors[variant];

  return (
    <div className={`mt-4 pt-4 border-t ${style.border}`}>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{style.icon}</span>
          <span className={`text-xs font-medium ${style.textBold}`}>
            Biodiversity
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold ${style.textBold}`}>
            {biodiversity.total} unique foods
          </span>
          {goal && (
            <span className={`text-xs font-medium ${getProgressColor(biodiversity.total, goal)}`}>
              {formatProgress(biodiversity.total, goal)}
            </span>
          )}
          <svg
            className={`w-3 h-3 ${style.text} transition-transform ${
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
        <div className={`mt-3 p-3 ${style.bg} rounded-lg`}>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <div className={`${style.textBold} font-medium mb-0.5`}>
                🍎 Fruits: {biodiversity.fruits}
              </div>
              {biodiversity.items.fruits.length > 0 && (
                <div className={`${style.text} text-xs`}>
                  {biodiversity.items.fruits.slice(0, 2).join(', ')}
                  {biodiversity.items.fruits.length > 2 && '...'}
                </div>
              )}
            </div>
            
            <div>
              <div className={`${style.textBold} font-medium mb-0.5`}>
                🥦 Veg: {biodiversity.vegetables}
              </div>
              {biodiversity.items.vegetables.length > 0 && (
                <div className={`${style.text} text-xs`}>
                  {biodiversity.items.vegetables.slice(0, 2).join(', ')}
                  {biodiversity.items.vegetables.length > 2 && '...'}
                </div>
              )}
            </div>
            
            <div>
              <div className={`${style.textBold} font-medium mb-0.5`}>
                🥜 Nuts: {biodiversity.nuts}
              </div>
            </div>
            
            <div>
              <div className={`${style.textBold} font-medium mb-0.5`}>
                🫘 Legumes: {biodiversity.legumes}
              </div>
            </div>
            
            <div className="col-span-2">
              <div className={`${style.textBold} font-medium mb-0.5`}>
                🌾 Grains: {biodiversity.wholeGrains}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}