'use client';

interface MealPlanningSectionProps {
  userId: string;
}

export default function MealPlanningSection({ userId }: MealPlanningSectionProps) {
  return (
    <div className="p-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">🍽️ Coming Soon</h3>
        <p className="text-sm text-blue-800">
          Plan your meals and automatically check what you have vs what you need. Features include:
        </p>
        <ul className="text-sm text-blue-800 mt-2 space-y-1 list-disc list-inside">
          <li>Input meals via text, saved meals, or recipe URLs</li>
          <li>Automatic ingredient extraction and quantity calculation</li>
          <li>Fuzzy matching against your pantry inventory</li>
          <li>Side-by-side "Have" vs "Need" lists per meal</li>
          <li>One-click "Add to Grocery List" for missing ingredients</li>
          <li>"Adjust Pantry" to mark ingredients as used when you cook</li>
        </ul>
      </div>
    </div>
  );
}