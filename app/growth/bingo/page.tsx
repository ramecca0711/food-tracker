'use client';

import { useMemo, useState } from 'react';
import PageLayout from '@/app/components/PageLayout';

type Category = { id: string; label: string; color: string };
type Goal = { id: string; label: string; categoryId: string };
type BingoCell = { kind: 'goal'; goal: Goal } | { kind: 'free' };

const defaultCategories: Category[] = [
  { id: 'physical', label: 'Physical', color: '#2E7D32' },
  { id: 'spiritual', label: 'Spiritual', color: '#6A4C93' },
  { id: 'domestic', label: 'Domestic', color: '#00838F' },
  { id: 'intellectual', label: 'Intellectual', color: '#EF6C00' },
  { id: 'emotional', label: 'Emotional', color: '#AD1457' },
];

const makeInitialGoals = (): Goal[] =>
  Array.from({ length: 24 }).map((_, idx) => ({
    id: `goal-${idx + 1}`,
    label: '',
    categoryId: defaultCategories[idx % defaultCategories.length].id,
  }));

const shuffle = <T,>(list: T[]) => {
  const next = [...list];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
};

export default function GrowthBingoPage() {
  // Card generation fills 24 goals around a fixed free center tile.
  const [categories, setCategories] = useState<Category[]>(defaultCategories);
  const [goals, setGoals] = useState<Goal[]>(makeInitialGoals);
  const [customCategoryName, setCustomCategoryName] = useState('');
  const [grid, setGrid] = useState<BingoCell[] | null>(null);
  const [completedGoalIds, setCompletedGoalIds] = useState<Set<string>>(new Set());

  const categoryById = useMemo(() => {
    const map = new Map<string, Category>();
    categories.forEach((category) => map.set(category.id, category));
    return map;
  }, [categories]);

  const canGenerate = goals.every((goal) => goal.label.trim().length > 0);

  const addCategory = () => {
    const label = customCategoryName.trim();
    if (!label) return;
    const id = label.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    if (categories.some((category) => category.id === id)) return;
    setCategories((prev) => [...prev, { id, label, color: '#455A64' }]);
    setCustomCategoryName('');
  };

  const updateGoal = (goalId: string, updates: Partial<Goal>) => {
    setGoals((prev) => prev.map((goal) => (goal.id === goalId ? { ...goal, ...updates } : goal)));
  };

  const generateCard = () => {
    if (!canGenerate) return;

    const grouped = new Map<string, Goal[]>();
    goals.forEach((goal) => {
      if (!grouped.has(goal.categoryId)) grouped.set(goal.categoryId, []);
      grouped.get(goal.categoryId)!.push(goal);
    });

    const categoryIds = [...grouped.keys()].sort((a, b) => (grouped.get(b)?.length || 0) - (grouped.get(a)?.length || 0));
    const pools = new Map<string, Goal[]>();
    categoryIds.forEach((categoryId) => pools.set(categoryId, shuffle(grouped.get(categoryId) || [])));

    const orderedGoals: Goal[] = [];
    // Round-robin pull from category pools to distribute colors across the board.
    while (orderedGoals.length < 24) {
      let progressed = false;
      for (const categoryId of categoryIds) {
        const pool = pools.get(categoryId) || [];
        if (pool.length > 0) {
          orderedGoals.push(pool.shift()!);
          progressed = true;
        }
      }
      if (!progressed) break;
    }

    const cells: BingoCell[] = [];
    let goalIndex = 0;
    for (let i = 0; i < 25; i += 1) {
      if (i === 12) cells.push({ kind: 'free' });
      else cells.push({ kind: 'goal', goal: orderedGoals[goalIndex++] });
    }

    setCompletedGoalIds(new Set());
    setGrid(cells);
  };

  const toggleComplete = (goalId: string) => {
    setCompletedGoalIds((prev) => {
      const next = new Set(prev);
      if (next.has(goalId)) next.delete(goalId);
      else next.add(goalId);
      return next;
    });
  };

  return (
    <PageLayout>
      <div className="space-y-6">
        <header className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-0)] p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Growth</p>
          <h1 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">Bingo</h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Enter 24 goals, categorize/color them, then generate a color-balanced 5x5 card with a free center tile.
          </p>
        </header>

        <section className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-0)] p-5">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Categories</h2>
          <div className="mt-3 space-y-2">
            {categories.map((category) => (
              <div key={category.id} className="grid gap-2 sm:grid-cols-[1fr_auto]">
                <div className="rounded-lg border border-[var(--border-soft)] bg-white px-3 py-2 text-sm">{category.label}</div>
                <input
                  type="color"
                  value={category.color}
                  onChange={(e) =>
                    setCategories((prev) =>
                      prev.map((item) => (item.id === category.id ? { ...item, color: e.target.value } : item))
                    )
                  }
                  className="h-10 w-full rounded-lg border border-[var(--border-soft)] bg-white sm:w-16"
                />
              </div>
            ))}
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
            <input
              value={customCategoryName}
              onChange={(e) => setCustomCategoryName(e.target.value)}
              placeholder="Add custom category"
              className="rounded-lg border border-[var(--border-soft)] bg-white px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={addCategory}
              className="rounded-lg border border-[var(--border-soft)] bg-white px-3 py-2 text-sm"
            >
              Add Category
            </button>
          </div>
        </section>

        <section className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-0)] p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Your 24 Goals</h2>
            <button
              type="button"
              onClick={generateCard}
              disabled={!canGenerate}
              className="rounded-lg bg-[var(--accent-strong)] px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              Generate Card
            </button>
          </div>

          <div className="mt-3 space-y-2">
            {goals.map((goal, index) => (
              <div key={goal.id} className="grid gap-2 sm:grid-cols-[2fr_1fr]">
                <input
                  value={goal.label}
                  onChange={(e) => updateGoal(goal.id, { label: e.target.value })}
                  placeholder={`Goal ${index + 1}`}
                  className="rounded-lg border border-[var(--border-soft)] bg-white px-3 py-2 text-sm"
                />
                <select
                  value={goal.categoryId}
                  onChange={(e) => updateGoal(goal.id, { categoryId: e.target.value })}
                  className="rounded-lg border border-[var(--border-soft)] bg-white px-3 py-2 text-sm"
                >
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-0)] p-5">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">5x5 Card</h2>
          {!grid ? (
            <p className="mt-2 text-sm text-[var(--text-muted)]">Generate your card after filling all 24 goals.</p>
          ) : (
            <div className="mt-3 grid grid-cols-5 gap-2">
              {grid.map((cell, index) => {
                if (cell.kind === 'free') {
                  return (
                    <div key={`free-${index}`} className="rounded-lg border border-[var(--border-soft)] bg-gray-100 p-2 text-center text-xs font-semibold text-[var(--text-muted)]">
                      FREE
                    </div>
                  );
                }

                const category = categoryById.get(cell.goal.categoryId);
                const isComplete = completedGoalIds.has(cell.goal.id);
                const color = category?.color || '#607D8B';

                return (
                  <div
                    key={cell.goal.id}
                    className="relative min-h-[110px] rounded-lg border border-[var(--border-soft)] p-2"
                    style={{ backgroundColor: isComplete ? color : '#FFFFFF' }}
                  >
                    <div className="text-xs font-semibold" style={{ color: isComplete ? '#FFFFFF' : color }}>
                      {cell.goal.label}
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleComplete(cell.goal.id)}
                      className="absolute bottom-2 right-2 rounded border border-[var(--border-soft)] bg-white px-2 py-1 text-[10px] font-medium"
                    >
                      Mark as Complete
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </PageLayout>
  );
}
