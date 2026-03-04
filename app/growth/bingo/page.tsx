'use client';

import { useEffect, useMemo, useState } from 'react';
import PageLayout from '@/app/components/PageLayout';
import { readLocalJson, writeLocalJson } from '@/lib/localPersistence';
import { optimizeColors, type ColorGrid } from '@/lib/bingoColorOptimizer';

type Category = { id: string; label: string; color: string };
type Goal = { id: string; label: string; categoryId: string };
type BingoCell = { kind: 'goal'; goal: Goal } | { kind: 'free' };
type GridSize = 3 | 5;

// ── Default categories ────────────────────────────────────────────────────────
const defaultCategories: Category[] = [
  { id: 'physical',     label: 'Physical',     color: '#2E7D32' },
  { id: 'spiritual',    label: 'Spiritual',    color: '#6A4C93' },
  { id: 'domestic',     label: 'Domestic',     color: '#00838F' },
  { id: 'intellectual', label: 'Intellectual', color: '#EF6C00' },
  { id: 'emotional',    label: 'Emotional',    color: '#AD1457' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Build initial blank goals for the given grid size (N²-1 for the free center). */
const makeInitialGoals = (size: GridSize): Goal[] => {
  const count = size * size - 1;
  return Array.from({ length: count }).map((_, idx) => ({
    id: `goal-${idx + 1}`,
    label: '',
    categoryId: defaultCategories[idx % defaultCategories.length].id,
  }));
};

const shuffle = <T,>(list: T[]): T[] => {
  const next = [...list];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function GrowthBingoPage() {
  const [gridSize, setGridSize] = useState<GridSize>(5);
  const [categories, setCategories] = useState<Category[]>(defaultCategories);
  const [goals, setGoals] = useState<Goal[]>(() => makeInitialGoals(5));
  const [customCategoryName, setCustomCategoryName] = useState('');
  const [grid, setGrid] = useState<BingoCell[] | null>(null);
  const [colorGrid, setColorGrid] = useState<ColorGrid | null>(null);
  const [completedGoalIds, setCompletedGoalIds] = useState<Set<string>>(new Set());
  const [showEditor, setShowEditor] = useState(false);
  // Track which cell is being inline-edited (by flat index).
  const [editingCellIdx, setEditingCellIdx] = useState<number | null>(null);

  const STORAGE_KEY = 'growth:bingo:state';

  // ── Persistence ─────────────────────────────────────────────────────────────

  useEffect(() => {
    const saved = readLocalJson<{
      gridSize?: GridSize;
      categories: Category[];
      goals: Goal[];
      grid: BingoCell[] | null;
      colorGrid: ColorGrid | null;
      completedGoalIds: string[];
    }>(STORAGE_KEY, {
      gridSize: 5,
      categories: defaultCategories,
      goals: makeInitialGoals(5),
      grid: null,
      colorGrid: null,
      completedGoalIds: [],
    });

    const savedSize: GridSize = saved.gridSize === 3 ? 3 : 5;
    setGridSize(savedSize);
    setCategories(saved.categories || defaultCategories);
    setGoals(saved.goals || makeInitialGoals(savedSize));
    setGrid(saved.grid || null);
    setColorGrid(saved.colorGrid || null);
    setCompletedGoalIds(new Set(saved.completedGoalIds || []));
  }, []);

  useEffect(() => {
    writeLocalJson(STORAGE_KEY, {
      gridSize,
      categories,
      goals,
      grid,
      colorGrid,
      completedGoalIds: Array.from(completedGoalIds),
    });
  }, [gridSize, categories, goals, grid, colorGrid, completedGoalIds]);

  // ── Derived state ────────────────────────────────────────────────────────────

  const categoryById = useMemo(() => {
    const map = new Map<string, Category>();
    categories.forEach((c) => map.set(c.id, c));
    return map;
  }, [categories]);

  const goalCount = gridSize * gridSize - 1;
  const canGenerate = goals.slice(0, goalCount).every((g) => g.label.trim().length > 0);

  // ── Handlers ─────────────────────────────────────────────────────────────────

  /** Change grid size and reset the goals array to the new slot count. */
  const handleSizeChange = (size: GridSize) => {
    setGridSize(size);
    // Resize goals array: keep existing entries, pad or trim as needed.
    const newCount = size * size - 1;
    setGoals((prev) => {
      if (prev.length === newCount) return prev;
      if (prev.length > newCount) return prev.slice(0, newCount);
      return [
        ...prev,
        ...Array.from({ length: newCount - prev.length }, (_, idx) => ({
          id: `goal-extra-${idx + prev.length}`,
          label: '',
          categoryId: defaultCategories[(idx + prev.length) % defaultCategories.length].id,
        })),
      ];
    });
    // Clear the card so the user regenerates it.
    setGrid(null);
    setColorGrid(null);
  };

  const addCategory = () => {
    const label = customCategoryName.trim();
    if (!label) return;
    const id = label.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    if (categories.some((c) => c.id === id)) return;
    setCategories((prev) => [...prev, { id, label, color: '#455A64' }]);
    setCustomCategoryName('');
  };

  const updateGoal = (goalId: string, updates: Partial<Goal>) => {
    setGoals((prev) =>
      prev.map((g) => (g.id === goalId ? { ...g, ...updates } : g))
    );
  };

  /** Generate the bingo card with color-optimized placement. */
  const generateCard = () => {
    if (!canGenerate) return;

    // Group goals by category, then round-robin pull to distribute colors.
    const grouped = new Map<string, Goal[]>();
    goals.slice(0, goalCount).forEach((goal) => {
      if (!grouped.has(goal.categoryId)) grouped.set(goal.categoryId, []);
      grouped.get(goal.categoryId)!.push(goal);
    });

    const categoryIds = [...grouped.keys()].sort(
      (a, b) => (grouped.get(b)?.length ?? 0) - (grouped.get(a)?.length ?? 0)
    );
    const pools = new Map<string, Goal[]>();
    categoryIds.forEach((id) => pools.set(id, shuffle(grouped.get(id) ?? [])));

    const orderedGoals: Goal[] = [];
    while (orderedGoals.length < goalCount) {
      let progressed = false;
      for (const id of categoryIds) {
        const pool = pools.get(id) ?? [];
        if (pool.length > 0) {
          orderedGoals.push(pool.shift()!);
          progressed = true;
        }
      }
      if (!progressed) break;
    }

    // Build flat cell array with free center.
    const cells: BingoCell[] = [];
    let goalIdx = 0;
    const freeCenter = Math.floor((gridSize * gridSize) / 2);
    for (let i = 0; i < gridSize * gridSize; i++) {
      if (i === freeCenter) {
        cells.push({ kind: 'free' });
      } else {
        cells.push({ kind: 'goal', goal: orderedGoals[goalIdx++] });
      }
    }

    // Run the constraint-solver color optimizer.
    const palette = categories.map((c) => c.color);
    const optimized = optimizeColors(cells, palette, gridSize);

    setGrid(cells);
    setColorGrid(optimized);
    setCompletedGoalIds(new Set());
    setShowEditor(false);
  };

  /** Update button — replaces only changed squares in their current positions. */
  const handleUpdate = () => {
    if (!grid) return;
    // Re-run the color optimizer with the current (potentially mutated) grid.
    const palette = categories.map((c) => c.color);
    const optimized = optimizeColors(grid, palette, gridSize);
    setColorGrid(optimized);
    setShowEditor(false);
  };

  const toggleComplete = (goalId: string) => {
    setCompletedGoalIds((prev) => {
      const next = new Set(prev);
      if (next.has(goalId)) next.delete(goalId);
      else next.add(goalId);
      return next;
    });
  };

  /** Inline-edit a specific cell in the rendered grid. */
  const updateCellGoal = (cellIdx: number, updates: Partial<Goal>) => {
    setGrid((prev) => {
      if (!prev) return prev;
      return prev.map((cell, idx) => {
        if (idx !== cellIdx || cell.kind !== 'goal') return cell;
        return { ...cell, goal: { ...cell.goal, ...updates } };
      });
    });
    // Also keep the goals panel in sync if the goal has a matching id.
    const cell = grid?.[cellIdx];
    if (cell?.kind === 'goal') {
      updateGoal(cell.goal.id, updates);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <PageLayout>
      <div className="space-y-6">
        {/* Header */}
        <header className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-0)] p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Growth</p>
          <h1 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">Bingo</h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Enter your goals, categorize them, then generate a color-balanced card.
          </p>
        </header>

        {/* ── Card display (shown first once generated) ─────────────────────── */}
        {grid && (
          <section className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-0)] p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                {gridSize}×{gridSize} Card
              </h2>
              <button
                type="button"
                onClick={() => setShowEditor((prev) => !prev)}
                className="rounded-lg border border-[var(--border-soft)] bg-white px-3 py-1.5 text-sm font-medium text-[var(--text-primary)]"
              >
                {showEditor ? 'Hide Editor' : 'Edit Card'}
              </button>
            </div>

            {/* Bingo grid */}
            <div
              className="grid gap-1.5"
              style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` }}
            >
              {grid.map((cell, idx) => {
                if (cell.kind === 'free') {
                  return (
                    <div
                      key={`free-${idx}`}
                      className="relative rounded-lg border border-[var(--border-soft)] bg-gray-100 flex items-center justify-center text-center text-xs font-semibold text-[var(--text-muted)]"
                      style={{ minHeight: gridSize === 3 ? 120 : 90 }}
                    >
                      FREE
                    </div>
                  );
                }

                const row = Math.floor(idx / gridSize);
                const col = idx % gridSize;
                const cellColor = colorGrid?.[row]?.[col] ?? null;
                const category = cellColor
                  ? categories.find((c) => c.color === cellColor) ?? null
                  : categoryById.get(cell.goal.categoryId) ?? null;
                const isComplete = completedGoalIds.has(cell.goal.id);
                const color = category?.color ?? '#607D8B';
                const isEditingThis = editingCellIdx === idx;

                return (
                  <div
                    key={cell.goal.id}
                    className="relative rounded-lg border border-[var(--border-soft)] p-1.5 flex flex-col"
                    style={{
                      backgroundColor: isComplete ? color : '#FFFFFF',
                      minHeight: gridSize === 3 ? 120 : 90,
                    }}
                  >
                    {/* ── Tiny edit pencil in top-right corner ── */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingCellIdx(isEditingThis ? null : idx);
                      }}
                      className="absolute top-1 right-1 h-5 w-5 flex items-center justify-center rounded bg-black/10 hover:bg-black/20 text-[var(--text-muted)]"
                      title="Edit this cell"
                      aria-label="Edit cell"
                    >
                      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>

                    {/* Cell label / inline editor */}
                    {isEditingThis ? (
                      <div className="space-y-1 mt-4">
                        <textarea
                          value={cell.goal.label}
                          onChange={(e) => updateCellGoal(idx, { label: e.target.value })}
                          className="w-full rounded border border-[var(--border-soft)] bg-white p-1 text-xs resize-none"
                          rows={3}
                          autoFocus
                        />
                        <select
                          value={cell.goal.categoryId}
                          onChange={(e) => updateCellGoal(idx, { categoryId: e.target.value })}
                          className="w-full rounded border border-[var(--border-soft)] bg-white p-1 text-xs"
                        >
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.label}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => setEditingCellIdx(null)}
                          className="w-full rounded bg-[var(--accent-strong)] py-0.5 text-xs text-white"
                        >
                          Done
                        </button>
                      </div>
                    ) : (
                      <div
                        className="text-xs font-medium flex-1 pr-4"
                        style={{ color: isComplete ? '#FFFFFF' : color }}
                      >
                        {cell.goal.label}
                      </div>
                    )}

                    {/* ── Checkbox replaces "Mark as Complete" button ── */}
                    {!isEditingThis && (
                      <label className="absolute bottom-1.5 right-1.5 flex items-center gap-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isComplete}
                          onChange={() => toggleComplete(cell.goal.id)}
                          className="h-3.5 w-3.5 rounded"
                        />
                      </label>
                    )}
                  </div>
                );
              })}
            </div>

            {/* ── Editor panel (below card, toggled by Edit button) ─────────── */}
            {showEditor && (
              <div className="mt-6 space-y-6 border-t border-[var(--border-soft)] pt-5">
                {/* Categories */}
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-[var(--text-primary)]">Categories</h3>
                  <div className="space-y-2">
                    {categories.map((category) => (
                      <div key={category.id} className="grid gap-2 grid-cols-[1fr_auto]">
                        <div className="rounded-lg border border-[var(--border-soft)] bg-white px-3 py-2 text-sm">
                          {category.label}
                        </div>
                        <input
                          type="color"
                          value={category.color}
                          onChange={(e) =>
                            setCategories((prev) =>
                              prev.map((item) =>
                                item.id === category.id ? { ...item, color: e.target.value } : item
                              )
                            )
                          }
                          className="h-10 w-16 rounded-lg border border-[var(--border-soft)] bg-white"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 grid gap-2 grid-cols-[1fr_auto]">
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
                      Add
                    </button>
                  </div>
                </div>

                {/* Goals list */}
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-[var(--text-primary)]">Your {goalCount} Goals</h3>
                  <div className="space-y-2">
                    {goals.slice(0, goalCount).map((goal, index) => (
                      <div key={goal.id} className="grid gap-2 grid-cols-[2fr_1fr]">
                        {/* Auto-expanding textarea — grows with content on mobile */}
                        <textarea
                          value={goal.label}
                          onChange={(e) => updateGoal(goal.id, { label: e.target.value })}
                          placeholder={`Goal ${index + 1}`}
                          rows={1}
                          className="rounded-lg border border-[var(--border-soft)] bg-white px-3 py-2 text-sm resize-none overflow-hidden"
                          style={{ fieldSizing: 'content' } as React.CSSProperties}
                          onInput={(e) => {
                            // Grow the textarea to fit its content.
                            const el = e.currentTarget;
                            el.style.height = 'auto';
                            el.style.height = `${el.scrollHeight}px`;
                          }}
                        />
                        <select
                          value={goal.categoryId}
                          onChange={(e) => updateGoal(goal.id, { categoryId: e.target.value })}
                          className="rounded-lg border border-[var(--border-soft)] bg-white px-3 py-2 text-sm"
                        >
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Update / Regenerate */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleUpdate}
                    className="flex-1 rounded-lg bg-[var(--accent-strong)] px-3 py-2 text-sm font-medium text-white"
                  >
                    Update
                  </button>
                  <button
                    type="button"
                    onClick={generateCard}
                    disabled={!canGenerate}
                    className="flex-1 rounded-lg border border-[var(--accent-strong)] px-3 py-2 text-sm font-medium text-[var(--accent-strong)] disabled:opacity-50"
                  >
                    Regenerate
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        {/* ── Entry panel (shown when no card yet or always accessible) ─────── */}
        {!grid && (
          <>
            {/* Grid size selector */}
            <section className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-0)] p-5">
              <h2 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">Card Size</h2>
              <div className="flex gap-3">
                {([3, 5] as GridSize[]).map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => handleSizeChange(size)}
                    className={`flex-1 rounded-lg border py-2 text-sm font-medium transition-colors ${
                      gridSize === size
                        ? 'border-[var(--accent-strong)] bg-[var(--accent-soft)] text-[var(--accent-strong)]'
                        : 'border-[var(--border-soft)] bg-white text-[var(--text-muted)]'
                    }`}
                  >
                    {size}×{size}
                    <span className="ml-1 text-xs opacity-70">({size * size - 1} goals)</span>
                  </button>
                ))}
              </div>
            </section>

            {/* Categories */}
            <section className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-0)] p-5">
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">Categories</h2>
              <div className="mt-3 space-y-2">
                {categories.map((category) => (
                  <div key={category.id} className="grid gap-2 grid-cols-[1fr_auto]">
                    <div className="rounded-lg border border-[var(--border-soft)] bg-white px-3 py-2 text-sm">
                      {category.label}
                    </div>
                    <input
                      type="color"
                      value={category.color}
                      onChange={(e) =>
                        setCategories((prev) =>
                          prev.map((item) =>
                            item.id === category.id ? { ...item, color: e.target.value } : item
                          )
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

            {/* Goals entry */}
            <section className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-0)] p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                  Your {goalCount} Goals
                </h2>
                <button
                  type="button"
                  onClick={generateCard}
                  disabled={!canGenerate}
                  className="rounded-lg bg-[var(--accent-strong)] px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  Generate Card
                </button>
              </div>

              <div className="space-y-2">
                {goals.slice(0, goalCount).map((goal, index) => (
                  <div key={goal.id} className="grid gap-2 grid-cols-[2fr_1fr]">
                    {/* Auto-expanding textarea stays side-by-side with category on all widths */}
                    <textarea
                      value={goal.label}
                      onChange={(e) => updateGoal(goal.id, { label: e.target.value })}
                      placeholder={`Goal ${index + 1}`}
                      rows={1}
                      className="rounded-lg border border-[var(--border-soft)] bg-white px-3 py-2 text-sm resize-none overflow-hidden"
                      style={{ fieldSizing: 'content' } as React.CSSProperties}
                      onInput={(e) => {
                        const el = e.currentTarget;
                        el.style.height = 'auto';
                        el.style.height = `${el.scrollHeight}px`;
                      }}
                    />
                    <select
                      value={goal.categoryId}
                      onChange={(e) => updateGoal(goal.id, { categoryId: e.target.value })}
                      className="rounded-lg border border-[var(--border-soft)] bg-white px-3 py-2 text-sm"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </PageLayout>
  );
}
