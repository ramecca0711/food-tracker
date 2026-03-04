'use client';

import { useEffect, useMemo, useState } from 'react';
import PageLayout from '@/app/components/PageLayout';
import { readLocalJson, writeLocalJson } from '@/lib/localPersistence';

type JournalEntry = { id: string; text: string; createdAt: string };
type CompletedTask = { id: string; title: string; category: string; section: string; completedAt: string };

const JOURNAL_STORAGE_KEY = 'growth:journal:entries';
const TODO_STORAGE_KEY = 'growth:todo:state';

const DOW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// ── Text processing helpers ───────────────────────────────────────────────────

/**
 * Parse a journal entry text into a list of items by splitting on commas,
 * then strip common filler words from the start of each item so the
 * list view is clean and scannable.
 *
 * Filtered leading words (case-insensitive): and, today, i, also, then,
 * so, but, just, finally, additionally.
 */
function parseEntryItems(text: string): string[] {
  const FILLER_RE = /^(and|today|i|also|then|so|but|just|finally|additionally)\s+/i;

  return text
    .split(',')
    .map((part) => {
      let cleaned = part.trim();
      let prev = '';
      // Strip leading filler words iteratively (handles "and today I ...").
      while (cleaned !== prev) {
        prev = cleaned;
        cleaned = cleaned.replace(FILLER_RE, '').trim();
      }
      return cleaned;
    })
    .filter((part) => part.length > 0);
}

/** "Wednesday, Mar 5" */
function formatDayLabel(date: Date): string {
  return `${DOW[date.getDay()]}, ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}

/** "9:41 AM" */
function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function GrowthJournalPage() {
  const [draft, setDraft] = useState('');
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  // Which collapsible sub-section is open per entry: 'list' | 'full' | null.
  const [expandedSections, setExpandedSections] = useState<Map<string, 'list' | 'full' | null>>(
    new Map()
  );
  // ID of the entry currently being edited inline.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  // Completed tasks from the todo page, keyed by day for display under each entry.
  const [completedTasks, setCompletedTasks] = useState<CompletedTask[]>([]);

  useEffect(() => {
    setEntries(readLocalJson<JournalEntry[]>(JOURNAL_STORAGE_KEY, []));
    // Pull completed task history from the shared todo storage key.
    const todoState = readLocalJson<{ history?: CompletedTask[] }>(TODO_STORAGE_KEY, {});
    setCompletedTasks(todoState.history || []);
  }, []);

  useEffect(() => {
    writeLocalJson(JOURNAL_STORAGE_KEY, entries);
  }, [entries]);

  // ── Entry handlers ────────────────────────────────────────────────────────────

  const submitEntry = () => {
    if (!draft.trim()) return;
    setEntries((prev) => [
      { id: crypto.randomUUID(), text: draft.trim(), createdAt: new Date().toISOString() },
      ...prev,
    ]);
    setDraft('');
  };

  const saveEdit = (id: string) => {
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, text: editDraft.trim() } : e))
    );
    setEditingId(null);
    setEditDraft('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft('');
  };

  const startEdit = (entry: JournalEntry) => {
    setEditingId(entry.id);
    setEditDraft(entry.text);
  };

  const toggleSection = (entryId: string, section: 'list' | 'full') => {
    setExpandedSections((prev) => {
      const next = new Map(prev);
      next.set(entryId, next.get(entryId) === section ? null : section);
      return next;
    });
  };

  // ── Derived data ──────────────────────────────────────────────────────────────

  const todayCount = useMemo(
    () =>
      entries.filter(
        (e) => new Date(e.createdAt).toDateString() === new Date().toDateString()
      ).length,
    [entries]
  );

  // Group completed tasks by calendar day for O(1) lookup per entry.
  const completedByDay = useMemo(() => {
    const map = new Map<string, CompletedTask[]>();
    completedTasks.forEach((task) => {
      if (!task.completedAt) return;
      const key = new Date(task.completedAt).toDateString();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(task);
    });
    return map;
  }, [completedTasks]);

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <PageLayout>
      <div className="space-y-6">
        <header className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-0)] p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Growth</p>
          <h1 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">Journal</h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Jot down what you did today — comma-separated items get a clean list view in each entry card.
          </p>
        </header>

        {/* New entry form — no voice button per the design requirement */}
        <section className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-0)] p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">New Entry</h2>
            <span className="text-xs text-[var(--text-muted)]">Entries today: {todayCount}</span>
          </div>

          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Today I did..."
            className="mt-3 w-full rounded-lg border border-[var(--border-soft)] bg-white p-3 text-sm"
            rows={6}
          />

          <div className="mt-3">
            <button
              type="button"
              onClick={submitEntry}
              className="rounded-lg bg-[var(--accent-strong)] px-4 py-2 text-sm font-medium text-white"
            >
              Submit Entry
            </button>
          </div>
        </section>

        {/* Recent entries */}
        <section className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-0)] p-5">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Recent Entries</h2>
          {entries.length === 0 ? (
            <p className="mt-2 text-sm text-[var(--text-muted)]">No entries yet.</p>
          ) : (
            <div className="mt-3 space-y-3">
              {entries.map((entry) => {
                const entryDate = new Date(entry.createdAt);
                const dayKey = entryDate.toDateString();
                const items = parseEntryItems(entry.text);
                const openSection = expandedSections.get(entry.id) ?? null;
                const isEditingThis = editingId === entry.id;
                // Completed to-dos logged on the same calendar day.
                const dayTasks = completedByDay.get(dayKey) ?? [];

                return (
                  <article
                    key={entry.id}
                    className="rounded-lg border border-[var(--border-soft)] bg-white overflow-hidden"
                  >
                    {/* Entry header: day-of-week, time, edit pencil */}
                    <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[var(--border-soft)]">
                      <div>
                        <div className="text-xs font-semibold text-[var(--text-primary)]">
                          {formatDayLabel(entryDate)}
                        </div>
                        <div className="text-xs text-[var(--text-muted)]">
                          {formatTime(entry.createdAt)}
                        </div>
                      </div>
                      {!isEditingThis && (
                        <button
                          type="button"
                          onClick={() => startEdit(entry)}
                          className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--accent-strong)] hover:bg-[var(--accent-soft)] transition-colors"
                          aria-label="Edit entry"
                          title="Edit entry"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                      )}
                    </div>

                    {/* Inline edit mode */}
                    {isEditingThis ? (
                      <div className="p-4 space-y-2">
                        <textarea
                          value={editDraft}
                          onChange={(e) => setEditDraft(e.target.value)}
                          className="w-full rounded-lg border border-[var(--border-soft)] bg-white p-2 text-sm"
                          rows={5}
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => saveEdit(entry.id)}
                            className="rounded-lg bg-[var(--accent-strong)] px-3 py-1.5 text-xs font-medium text-white"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={cancelEdit}
                            className="rounded-lg border border-[var(--border-soft)] bg-white px-3 py-1.5 text-xs font-medium text-[var(--text-primary)]"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* ── Collapsible: List View ──────────────────────────── */}
                        <div>
                          <button
                            type="button"
                            onClick={() => toggleSection(entry.id, 'list')}
                            className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition-colors"
                          >
                            <span className="text-xs font-semibold text-[var(--text-primary)]">List View</span>
                            <svg
                              className={`h-3.5 w-3.5 text-[var(--text-muted)] transition-transform ${openSection === 'list' ? 'rotate-180' : ''}`}
                              fill="none" stroke="currentColor" viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                          {openSection === 'list' && (
                            <ul className="px-5 pb-3 space-y-1.5">
                              {items.length === 0 ? (
                                <li className="text-xs italic text-[var(--text-muted)]">
                                  No comma-separated items found.
                                </li>
                              ) : (
                                items.map((item, idx) => (
                                  <li key={idx} className="flex gap-2 text-sm text-[var(--text-primary)]">
                                    <span className="text-[var(--text-muted)] select-none shrink-0">-</span>
                                    {item}
                                  </li>
                                ))
                              )}
                            </ul>
                          )}
                        </div>

                        {/* ── Collapsible: Full Text ──────────────────────────── */}
                        <div className="border-t border-[var(--border-soft)]">
                          <button
                            type="button"
                            onClick={() => toggleSection(entry.id, 'full')}
                            className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition-colors"
                          >
                            <span className="text-xs font-semibold text-[var(--text-primary)]">Full Text</span>
                            <svg
                              className={`h-3.5 w-3.5 text-[var(--text-muted)] transition-transform ${openSection === 'full' ? 'rotate-180' : ''}`}
                              fill="none" stroke="currentColor" viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                          {openSection === 'full' && (
                            <p className="px-5 pb-3 whitespace-pre-wrap text-sm text-[var(--text-primary)]">
                              {entry.text}
                            </p>
                          )}
                        </div>

                        {/* ── Completed To Dos for this day ───────────────────── */}
                        <div className="border-t border-[var(--border-soft)] bg-gray-50 px-4 py-3">
                          <p className="text-xs font-semibold text-[var(--text-muted)] mb-1">
                            Completed To Dos:
                          </p>
                          {dayTasks.length === 0 ? (
                            <p className="text-xs italic text-[var(--text-muted)]">No data from To Do</p>
                          ) : (
                            <ul className="space-y-1">
                              {dayTasks.map((task) => (
                                <li key={task.id} className="flex gap-2 text-xs text-[var(--text-primary)]">
                                  <span className="text-[var(--text-muted)] select-none shrink-0">-</span>
                                  <span className="line-through opacity-60">{task.title}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </PageLayout>
  );
}
