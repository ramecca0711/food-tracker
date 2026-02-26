'use client';

// SourceBadge — renders a compact colored pill indicating where a food item's
// macro data came from. Used in both the editing view (LogFoodView) and the
// saved item view (FoodItemCard on the dashboard).
//
// Priority order (highest confidence → lowest):
//   label_photo  — user photographed the actual nutrition label
//   barcode      — scanned the product barcode → Open Food Facts exact data
//   cache        — found in master_food_database (Supabase), always checked first
//   off          — fetched from Open Food Facts at log time, now cached
//   ai           — GPT estimate; least reliable

interface SourceBadgeProps {
  // The source string stored on the food item.  Undefined/null = no badge shown.
  source?: string | null;
  // When true, adds an amber "unverified" pill alongside the source badge.
  unverified?: boolean;
}

// Map each source value to a human-readable label and Tailwind colour classes.
const SOURCE_CONFIG: Record<string, { label: string; classes: string }> = {
  label_photo: {
    label: '📷 Label Photo',
    classes: 'bg-amber-100 text-amber-800 border-amber-200',
  },
  barcode: {
    label: '▥ Barcode',
    classes: 'bg-violet-100 text-violet-800 border-violet-200',
  },
  cache: {
    label: '✓ Database',
    classes: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  },
  off: {
    label: 'Open Food Facts',
    classes: 'bg-sky-100 text-sky-800 border-sky-200',
  },
  ai: {
    label: 'AI Estimate',
    classes: 'bg-slate-100 text-slate-600 border-slate-200',
  },
  ai_estimated: {
    label: 'AI Estimate',
    classes: 'bg-slate-100 text-slate-600 border-slate-200',
  },
  ai_user_provided: {
    label: 'AI',
    classes: 'bg-slate-100 text-slate-600 border-slate-200',
  },
  ai_fixed_from_macros: {
    label: 'AI (Edited)',
    classes: 'bg-slate-100 text-slate-600 border-slate-200',
  },
};

export default function SourceBadge({ source, unverified }: SourceBadgeProps) {
  // Don't render anything if no source is recorded (e.g., older logged items).
  if (!source) return null;

  const config = SOURCE_CONFIG[source];

  // Fall back to a generic grey badge for any unknown future source values.
  const label  = config?.label  ?? source;
  const classes = config?.classes ?? 'bg-gray-100 text-gray-600 border-gray-200';

  return (
    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
      {/* Source pill */}
      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${classes}`}>
        {label}
      </span>

      {/* Unverified pill — shown when the macro values came from an AI estimate
          that has not been confirmed against a real database entry.             */}
      {unverified && (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border bg-amber-50 text-amber-700 border-amber-200">
          ⚠ unverified
        </span>
      )}
    </div>
  );
}
