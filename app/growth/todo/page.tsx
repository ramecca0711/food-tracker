'use client';

import { useEffect, useRef, useState } from 'react';
import PageLayout from '@/app/components/PageLayout';
import { readLocalJson, writeLocalJson } from '@/lib/localPersistence';

type SectionKey = 'today' | 'week' | 'later';

type Task = {
  id: string;
  title: string;
  category: string;
  section: SectionKey; // stored so history can show the original section
  completedAt?: string;
};

const defaultCategories = ['Personal', 'Work'];

const sectionLabels: Record<SectionKey, string> = {
  today: 'Today',
  week: 'This Week',
  later: 'Later',
};

// ── Date helpers (shared with journal page pattern) ───────────────────────────

const DOW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Return "Wednesday, Mar 5 2026" style label for a Date. */
function formatDayLabel(date: Date): string {
  return `${DOW[date.getDay()]}, ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
}

export default function GrowthTodoPage() {
  // Drag-and-drop works with both mouse (HTML5 drag API) and touch events.
  const [sections, setSections] = useState<Record<SectionKey, Task[]>>({
    today: [
      { id: 't1', title: 'Plan meals for tomorrow', category: 'Personal', section: 'today' },
      { id: 't2', title: 'Review dashboard updates', category: 'Work', section: 'today' },
    ],
    week: [{ id: 't3', title: 'Batch prep protein options', category: 'Personal', section: 'week' }],
    later: [],
  });
  const [history, setHistory] = useState<Task[]>([]);
  const [title, setTitle] = useState('');
  const [targetSection, setTargetSection] = useState<SectionKey>('today');
  const [categorySelect, setCategorySelect] = useState('Personal');
  const [customCategory, setCustomCategory] = useState('');

  // Desktop HTML5 drag state.
  const [dragging, setDragging] = useState<{ section: SectionKey; taskId: string } | null>(null);

  // Touch drag state — tracks which task is being long-pressed/dragged.
  const touchDragRef = useRef<{
    taskId: string;
    section: SectionKey;
    startY: number;
    startX: number;
    active: boolean;
    ghost: HTMLElement | null;
  } | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Expanded history day keys.
  const [expandedHistoryDays, setExpandedHistoryDays] = useState<Set<string>>(new Set());

  const STORAGE_KEY = 'growth:todo:state';

  // ── Persistence ──────────────────────────────────────────────────────────────

  useEffect(() => {
    const saved = readLocalJson<{
      sections: Record<SectionKey, Task[]>;
      history: Task[];
    }>(STORAGE_KEY, {
      sections: { today: [], week: [], later: [] },
      history: [],
    });

    if (saved.sections) setSections(saved.sections);
    setHistory(saved.history || []);
  }, []);

  useEffect(() => {
    writeLocalJson(STORAGE_KEY, { sections, history });
  }, [sections, history]);

  // ── Task operations ──────────────────────────────────────────────────────────

  const resolveCategory = () =>
    categorySelect === 'Custom' ? customCategory.trim() || 'Custom' : categorySelect;

  const addTask = () => {
    if (!title.trim()) return;
    const nextTask: Task = {
      id: crypto.randomUUID(),
      title: title.trim(),
      category: resolveCategory(),
      section: targetSection,
    };
    setSections((prev) => ({ ...prev, [targetSection]: [nextTask, ...prev[targetSection]] }));
    setTitle('');
  };

  const completeTask = (section: SectionKey, taskId: string) => {
    setSections((prev) => {
      const task = prev[section].find((item) => item.id === taskId);
      if (!task) return prev;
      setHistory((h) => [{ ...task, section, completedAt: new Date().toISOString() }, ...h]);
      return { ...prev, [section]: prev[section].filter((item) => item.id !== taskId) };
    });
  };

  const moveTask = (from: SectionKey, to: SectionKey, taskId: string, insertIndex?: number) => {
    setSections((prev) => {
      const sourceList = [...prev[from]];
      const taskIndex = sourceList.findIndex((item) => item.id === taskId);
      if (taskIndex === -1) return prev;
      const [task] = sourceList.splice(taskIndex, 1);
      const destList = from === to ? sourceList : [...prev[to]];
      const index =
        typeof insertIndex === 'number'
          ? Math.max(0, Math.min(insertIndex, destList.length))
          : destList.length;
      destList.splice(index, 0, { ...task, section: to });
      return from === to
        ? { ...prev, [to]: destList }
        : { ...prev, [from]: sourceList, [to]: destList };
    });
  };

  // ── Desktop drag handlers ────────────────────────────────────────────────────

  const handleDragStart = (section: SectionKey, taskId: string) =>
    setDragging({ section, taskId });
  const handleDragEnd = () => setDragging(null);

  const handleDropOnSection = (to: SectionKey) => {
    if (dragging) { moveTask(dragging.section, to, dragging.taskId); setDragging(null); }
  };
  const handleDropOnTask = (to: SectionKey, insertIdx: number) => {
    if (dragging) { moveTask(dragging.section, to, dragging.taskId, insertIdx); setDragging(null); }
  };

  // ── Touch drag (long-press to activate, then drag) ───────────────────────────
  // Long-press threshold: 500 ms. After that we create a visual ghost element and
  // track finger movement. On touchend we find the element under the finger and
  // drop into the nearest section or task slot.

  const createGhost = (el: HTMLElement, x: number, y: number) => {
    const ghost = el.cloneNode(true) as HTMLElement;
    ghost.style.position = 'fixed';
    ghost.style.width = `${el.offsetWidth}px`;
    ghost.style.opacity = '0.7';
    ghost.style.pointerEvents = 'none';
    ghost.style.zIndex = '9999';
    ghost.style.left = `${x - el.offsetWidth / 2}px`;
    ghost.style.top = `${y - 20}px`;
    ghost.style.borderRadius = '8px';
    ghost.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
    document.body.appendChild(ghost);
    return ghost;
  };

  const handleTouchStart = (
    e: React.TouchEvent,
    section: SectionKey,
    taskId: string,
    el: HTMLElement
  ) => {
    const touch = e.touches[0];
    longPressTimer.current = setTimeout(() => {
      touchDragRef.current = {
        taskId,
        section,
        startX: touch.clientX,
        startY: touch.clientY,
        active: true,
        ghost: createGhost(el, touch.clientX, touch.clientY),
      };
    }, 500);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchDragRef.current?.active) return;
    // Cancel long press if the finger moved significantly before the timer fires.
    const touch = e.touches[0];
    const dx = touch.clientX - (touchDragRef.current?.startX ?? 0);
    const dy = touch.clientY - (touchDragRef.current?.startY ?? 0);
    if (!touchDragRef.current.ghost && Math.hypot(dx, dy) > 10) {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
      return;
    }
    if (touchDragRef.current.ghost) {
      e.preventDefault(); // prevent scroll while dragging
      touchDragRef.current.ghost.style.left = `${touch.clientX - parseInt(touchDragRef.current.ghost.style.width) / 2}px`;
      touchDragRef.current.ghost.style.top = `${touch.clientY - 20}px`;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    const drag = touchDragRef.current;
    if (!drag?.active || !drag.ghost) { touchDragRef.current = null; return; }

    // Remove ghost.
    drag.ghost.remove();
    touchDragRef.current = null;

    // Find the element under the lifted finger.
    const touch = e.changedTouches[0];
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    if (!el) return;

    // Walk up the DOM to find a section container marked with data-section.
    let target: Element | null = el;
    while (target && !target.getAttribute('data-section')) target = target.parentElement;
    const toSection = target?.getAttribute('data-section') as SectionKey | null;
    if (toSection && drag.section !== undefined && drag.taskId) {
      moveTask(drag.section, toSection, drag.taskId);
    }
  };

  // ── History grouping ─────────────────────────────────────────────────────────
  // Group completed tasks by the calendar date of completion.

  const historyByDay = history.reduce<Map<string, Task[]>>((acc, task) => {
    if (!task.completedAt) return acc;
    const dayKey = new Date(task.completedAt).toDateString();
    if (!acc.has(dayKey)) acc.set(dayKey, []);
    acc.get(dayKey)!.push(task);
    return acc;
  }, new Map());

  const toggleHistoryDay = (dayKey: string) => {
    setExpandedHistoryDays((prev) => {
      const next = new Set(prev);
      if (next.has(dayKey)) next.delete(dayKey);
      else next.add(dayKey);
      return next;
    });
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <PageLayout>
      <div className="space-y-6">
        <header className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-0)] p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Growth</p>
          <h1 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">To Do</h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Drag (or hold on mobile) to reorder. Check off tasks to complete them.
          </p>
        </header>

        {/* Add task form */}
        <section className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-0)] p-5">
          <div className="grid gap-2 sm:grid-cols-[2fr_1fr_1fr_auto]">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTask()}
              placeholder="Add task..."
              className="rounded-lg border border-[var(--border-soft)] bg-white px-3 py-2 text-sm"
            />
            <select
              value={targetSection}
              onChange={(e) => setTargetSection(e.target.value as SectionKey)}
              className="rounded-lg border border-[var(--border-soft)] bg-white px-3 py-2 text-sm"
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="later">Later</option>
            </select>
            <select
              value={categorySelect}
              onChange={(e) => setCategorySelect(e.target.value)}
              className="rounded-lg border border-[var(--border-soft)] bg-white px-3 py-2 text-sm"
            >
              {[...defaultCategories, 'Custom'].map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={addTask}
              className="rounded-lg bg-[var(--accent-strong)] px-3 py-2 text-sm font-medium text-white"
            >
              Add
            </button>
          </div>
          {categorySelect === 'Custom' && (
            <input
              value={customCategory}
              onChange={(e) => setCustomCategory(e.target.value)}
              placeholder="Custom category"
              className="mt-2 w-full rounded-lg border border-[var(--border-soft)] bg-white px-3 py-2 text-sm"
            />
          )}
        </section>

        {/* Task columns */}
        <section className="grid gap-4 lg:grid-cols-3">
          {(Object.keys(sectionLabels) as SectionKey[]).map((sectionKey) => (
            <article
              key={sectionKey}
              // data-section is used by the touch-drop handler to identify destination.
              data-section={sectionKey}
              className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-0)] p-4"
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDropOnSection(sectionKey)}
            >
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">{sectionLabels[sectionKey]}</h2>
              <div className="mt-3 space-y-2">
                {sections[sectionKey].map((task, idx) => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={() => handleDragStart(sectionKey, task.id)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleDropOnTask(sectionKey, idx)}
                    // Touch events for mobile hold-to-drag.
                    onTouchStart={(e) => handleTouchStart(e, sectionKey, task.id, e.currentTarget)}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    className="rounded-lg border border-[var(--border-soft)] bg-white p-2 touch-pan-y select-none"
                  >
                    <div className="flex items-start gap-2">
                      {/* Checkbox — tapping completes the task, same as old "Mark as Complete" */}
                      <input
                        type="checkbox"
                        onChange={() => completeTask(sectionKey, task.id)}
                        className="mt-0.5 h-4 w-4 cursor-pointer"
                        aria-label={`Complete: ${task.title}`}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm text-[var(--text-primary)]">{task.title}</div>
                        <div className="text-xs text-[var(--text-muted)]">{task.category}</div>
                      </div>
                    </div>
                  </div>
                ))}
                {sections[sectionKey].length === 0 && (
                  <div className="text-xs text-[var(--text-muted)]">No tasks.</div>
                )}
              </div>
            </article>
          ))}
        </section>

        {/* ── Completed History — grouped by day ─────────────────────────────── */}
        <section className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-0)] p-5">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Completed History</h2>
          <div className="mt-3 space-y-2">
            {historyByDay.size === 0 ? (
              <div className="text-sm text-[var(--text-muted)]">No completed tasks yet.</div>
            ) : (
              Array.from(historyByDay.entries()).map(([dayKey, tasks]) => {
                const date = new Date(dayKey);
                const isExpanded = expandedHistoryDays.has(dayKey);
                return (
                  <div key={dayKey} className="rounded-lg border border-[var(--border-soft)] overflow-hidden">
                    {/* Day header — shows day name, date, and task count */}
                    <button
                      type="button"
                      onClick={() => toggleHistoryDay(dayKey)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50 text-left"
                    >
                      <div>
                        <div className="text-sm font-medium text-[var(--text-primary)]">
                          {formatDayLabel(date)}
                        </div>
                        <div className="text-xs text-[var(--text-muted)] mt-0.5">
                          {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'} completed
                        </div>
                      </div>
                      <svg
                        className={`w-4 h-4 text-[var(--text-muted)] transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none" stroke="currentColor" viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {isExpanded && (
                      <div className="divide-y divide-[var(--border-soft)] bg-gray-50">
                        {tasks.map((task) => (
                          <div key={task.id} className="px-4 py-2.5">
                            <div className="flex items-start justify-between gap-2">
                              <div className="text-sm text-[var(--text-primary)] line-through opacity-60">
                                {task.title}
                              </div>
                              <span className="text-xs text-[var(--text-muted)] whitespace-nowrap">
                                {task.completedAt
                                  ? new Date(task.completedAt).toLocaleTimeString('en-US', {
                                      hour: 'numeric',
                                      minute: '2-digit',
                                      hour12: true,
                                    })
                                  : ''}
                              </span>
                            </div>
                            <div className="flex gap-2 mt-0.5 text-xs text-[var(--text-muted)]">
                              <span>{task.category}</span>
                              <span>·</span>
                              <span className="capitalize">{sectionLabels[task.section] ?? task.section}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>
    </PageLayout>
  );
}
