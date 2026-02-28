'use client';

import { useState } from 'react';
import PageLayout from '@/app/components/PageLayout';

type SectionKey = 'today' | 'week' | 'later';

type Task = {
  id: string;
  title: string;
  category: string;
  completedAt?: string;
};

const defaultCategories = ['Personal', 'Work'];

export default function GrowthTodoPage() {
  // Drag-and-drop supports reorder and moving tasks between sections.
  const [sections, setSections] = useState<Record<SectionKey, Task[]>>({
    today: [
      { id: 't1', title: 'Plan meals for tomorrow', category: 'Personal' },
      { id: 't2', title: 'Review dashboard updates', category: 'Work' },
    ],
    week: [{ id: 't3', title: 'Batch prep protein options', category: 'Personal' }],
    later: [],
  });
  const [history, setHistory] = useState<Task[]>([]);
  const [title, setTitle] = useState('');
  const [targetSection, setTargetSection] = useState<SectionKey>('today');
  const [categorySelect, setCategorySelect] = useState('Personal');
  const [customCategory, setCustomCategory] = useState('');
  const [dragging, setDragging] = useState<{ section: SectionKey; taskId: string } | null>(null);

  const resolveCategory = () => (categorySelect === 'Custom' ? customCategory.trim() || 'Custom' : categorySelect);

  const addTask = () => {
    if (!title.trim()) return;
    const nextTask: Task = {
      id: crypto.randomUUID(),
      title: title.trim(),
      category: resolveCategory(),
    };
    setSections((prev) => ({ ...prev, [targetSection]: [nextTask, ...prev[targetSection]] }));
    setTitle('');
  };

  const completeTask = (section: SectionKey, taskId: string) => {
    setSections((prev) => {
      const task = prev[section].find((item) => item.id === taskId);
      if (!task) return prev;
      setHistory((historyPrev) => [{ ...task, completedAt: new Date().toISOString() }, ...historyPrev]);
      return {
        ...prev,
        [section]: prev[section].filter((item) => item.id !== taskId),
      };
    });
  };

  const moveTask = (from: SectionKey, to: SectionKey, taskId: string, insertIndex?: number) => {
    setSections((prev) => {
      const sourceList = [...prev[from]];
      const taskIndex = sourceList.findIndex((item) => item.id === taskId);
      if (taskIndex === -1) return prev;
      const [task] = sourceList.splice(taskIndex, 1);

      const destList = from === to ? sourceList : [...prev[to]];
      const index = typeof insertIndex === 'number' ? Math.max(0, Math.min(insertIndex, destList.length)) : destList.length;
      destList.splice(index, 0, task);

      if (from === to) {
        return { ...prev, [to]: destList };
      }
      return { ...prev, [from]: sourceList, [to]: destList };
    });
  };

  const sectionLabels: Record<SectionKey, string> = {
    today: 'Today',
    week: 'This Week',
    later: 'Later',
  };

  return (
    <PageLayout>
      <div className="space-y-6">
        <header className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-0)] p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Growth</p>
          <h1 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">To Do</h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">Checkbox tasks with drag-and-drop ordering and section moves.</p>
        </header>

        <section className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-0)] p-5">
          <div className="grid gap-2 sm:grid-cols-[2fr_1fr_1fr_auto]">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
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
              {[...defaultCategories, 'Custom'].map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
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

        <section className="grid gap-4 lg:grid-cols-3">
          {(Object.keys(sectionLabels) as SectionKey[]).map((sectionKey) => (
            <article
              key={sectionKey}
              className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-0)] p-4"
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragging) {
                  moveTask(dragging.section, sectionKey, dragging.taskId);
                  setDragging(null);
                }
              }}
            >
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">{sectionLabels[sectionKey]}</h2>
              <div className="mt-3 space-y-2">
                {sections[sectionKey].map((task, idx) => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={() => setDragging({ section: sectionKey, taskId: task.id })}
                    onDragEnd={() => setDragging(null)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (dragging) {
                        moveTask(dragging.section, sectionKey, dragging.taskId, idx);
                        setDragging(null);
                      }
                    }}
                    className="rounded-lg border border-[var(--border-soft)] bg-white p-2"
                  >
                    <div className="flex items-start gap-2">
                      <input type="checkbox" onChange={() => completeTask(sectionKey, task.id)} className="mt-1" />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm text-[var(--text-primary)]">{task.title}</div>
                        <div className="text-xs text-[var(--text-muted)]">{task.category}</div>
                      </div>
                    </div>
                  </div>
                ))}
                {sections[sectionKey].length === 0 && <div className="text-xs text-[var(--text-muted)]">No tasks.</div>}
              </div>
            </article>
          ))}
        </section>

        <section className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-0)] p-5">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Completed History</h2>
          <div className="mt-3 space-y-2">
            {history.length === 0 ? (
              <div className="text-sm text-[var(--text-muted)]">No completed tasks yet.</div>
            ) : (
              history.map((task) => (
                <div key={task.id} className="rounded-lg border border-[var(--border-soft)] bg-white px-3 py-2 text-sm">
                  <div>{task.title}</div>
                  <div className="text-xs text-[var(--text-muted)]">
                    {task.category} · {task.completedAt ? new Date(task.completedAt).toLocaleString() : ''}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </PageLayout>
  );
}
