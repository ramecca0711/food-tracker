'use client';

import { useEffect, useMemo, useState } from 'react';
import PageLayout from '@/app/components/PageLayout';
import { useAuth } from '@/app/components/AuthProvider';

type RingLevel = 1 | 2 | 3 | 4;
type CirclePerson = { id: string; name: string; ring: RingLevel; notes: string; angle: number };

const ringStyles: Record<RingLevel, string> = {
  1: 'w-36 h-36',
  2: 'w-56 h-56',
  3: 'w-80 h-80',
  4: 'w-[26rem] h-[26rem]',
};

export default function ConnectionMyCirclePage() {
  const { userId, isReady } = useAuth();
  // People are positioned by ring + angle on a concentric circle layout.
  const [people, setPeople] = useState<CirclePerson[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', ring: '2', notes: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const storageKey = useMemo(() => `my-circle:${userId ?? 'guest'}`, [userId]);

  const selectedPerson = useMemo(() => people.find((person) => person.id === selectedId) || null, [people, selectedId]);
  const editingPerson = useMemo(() => people.find((person) => person.id === editingId) || null, [people, editingId]);

  useEffect(() => {
    if (!isReady) return;
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as CirclePerson[];
      if (Array.isArray(parsed)) {
        setPeople(parsed);
      }
    } catch {
      setPeople([]);
    }
  }, [isReady, storageKey]);

  useEffect(() => {
    if (!isReady) return;
    localStorage.setItem(storageKey, JSON.stringify(people));
  }, [isReady, people, storageKey]);

  const addPerson = () => {
    const name = form.name.trim();
    if (!name) return;
    const ring = Number(form.ring) as RingLevel;
    const sameRingCount = people.filter((person) => person.ring === ring).length;
    const angle = sameRingCount * 55;
    const person: CirclePerson = { id: crypto.randomUUID(), name, ring, notes: form.notes.trim(), angle };
    setPeople((prev) => [...prev, person]);
    setForm({ name: '', ring: '2', notes: '' });
  };

  const updatePerson = (personId: string, updates: Partial<CirclePerson>) => {
    setPeople((prev) => prev.map((person) => (person.id === personId ? { ...person, ...updates } : person)));
  };

  const updateSelectedNotes = (value: string) => {
    if (!selectedId) return;
    updatePerson(selectedId, { notes: value });
  };

  const deletePerson = (personId: string) => {
    setPeople((prev) => prev.filter((person) => person.id !== personId));
    if (selectedId === personId) setSelectedId(null);
    if (editingId === personId) setEditingId(null);
  };

  const movePersonToRing = (personId: string, ring: RingLevel) => {
    const sameRingCount = people.filter((person) => person.ring === ring && person.id !== personId).length;
    updatePerson(personId, { ring, angle: sameRingCount * 55 });
  };

  const getRingFromDropPoint = (x: number, y: number, rect: DOMRect): RingLevel => {
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const distance = Math.hypot(x - centerX, y - centerY);
    const ringDistances: Array<{ ring: RingLevel; radius: number }> = [
      { ring: 1, radius: 72 },
      { ring: 2, radius: 112 },
      { ring: 3, radius: 160 },
      { ring: 4, radius: 208 },
    ];

    return ringDistances.reduce((closest, current) =>
      Math.abs(current.radius - distance) < Math.abs(closest.radius - distance) ? current : closest
    ).ring;
  };

  if (!isReady) {
    return (
      <PageLayout>
        <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-0)] p-4 text-sm text-[var(--text-muted)]">
          Loading...
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="space-y-6">
        <header className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-0)] p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Connection</p>
          <h1 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">My Circle</h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">Add people and place them by closeness ring. Keep notes for each person.</p>
        </header>

        <section className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-0)] p-5">
          <div className="grid gap-2 sm:grid-cols-[1.4fr_auto_auto]">
            <input
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Person name"
              className="rounded-lg border border-[var(--border-soft)] bg-white px-3 py-2 text-sm"
            />
            <select
              value={form.ring}
              onChange={(e) => setForm((prev) => ({ ...prev, ring: e.target.value }))}
              className="rounded-lg border border-[var(--border-soft)] bg-white px-3 py-2 text-sm"
            >
              <option value="1">Ring 1 (closest)</option>
              <option value="2">Ring 2</option>
              <option value="3">Ring 3</option>
              <option value="4">Ring 4</option>
            </select>
            <button type="button" onClick={addPerson} className="rounded-lg bg-[var(--accent-strong)] px-3 py-2 text-sm font-medium text-white">
              Add
            </button>
          </div>
          <textarea
            value={form.notes}
            onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
            placeholder="Optional notes"
            className="mt-2 w-full rounded-lg border border-[var(--border-soft)] bg-white p-2 text-sm"
            rows={3}
          />
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-0)] p-5">
            <div
              className="relative mx-auto h-[28rem] w-[28rem] rounded-full border border-dashed border-[var(--border-soft)]"
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                if (!draggingId) return;
                const ring = getRingFromDropPoint(event.clientX, event.clientY, event.currentTarget.getBoundingClientRect());
                movePersonToRing(draggingId, ring);
                setDraggingId(null);
              }}
            >
              {[4, 3, 2, 1].map((ring) => (
                <div
                  key={ring}
                  className={`pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[var(--border-soft)] ${ringStyles[ring as RingLevel]}`}
                />
              ))}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--accent-soft)] px-2 py-1 text-xs font-semibold text-[var(--accent-strong)]">
                You
              </div>

              {people.map((person) => {
                const radius = person.ring * 52;
                const x = Math.cos((person.angle * Math.PI) / 180) * radius;
                const y = Math.sin((person.angle * Math.PI) / 180) * radius;
                return (
                  <button
                    key={person.id}
                    draggable
                    onDragStart={() => setDraggingId(person.id)}
                    onDragEnd={() => setDraggingId(null)}
                    type="button"
                    onClick={() => setSelectedId(person.id)}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border bg-white px-2 py-1 text-[11px] ${
                      selectedId === person.id
                        ? 'border-[var(--accent-strong)] ring-2 ring-[var(--accent-soft)]'
                        : 'border-[var(--border-soft)]'
                    }`}
                    style={{ left: `calc(50% + ${x}px)`, top: `calc(50% + ${y}px)` }}
                  >
                    {person.name}
                  </button>
                );
              })}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {([1, 2, 3, 4] as RingLevel[]).map((ring) => (
                <button
                  key={ring}
                  type="button"
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    if (!draggingId) return;
                    movePersonToRing(draggingId, ring);
                    setDraggingId(null);
                  }}
                  className="rounded-full border border-[var(--border-soft)] bg-[var(--surface-1)] px-3 py-1 text-xs text-[var(--text-muted)]"
                >
                  Drop to Ring {ring}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-0)] p-5 space-y-4">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Person Notes</h2>
            {!selectedPerson ? (
              <p className="mt-2 text-sm text-[var(--text-muted)]">Select a person in the circle to view/edit notes.</p>
            ) : (
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-medium text-[var(--text-primary)]">{selectedPerson.name}</div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingId(selectedPerson.id)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border-soft)] bg-white text-[var(--text-muted)]"
                      title="Edit person"
                      aria-label="Edit person"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 11l7.768-7.768a2.5 2.5 0 113.536 3.536L12.536 14.536a2 2 0 01-.878.517L8 16l.947-3.658A2 2 0 019.464 11.464z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => deletePerson(selectedPerson.id)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border-soft)] bg-white text-[var(--text-muted)]"
                      title="Delete person"
                      aria-label="Delete person"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 7h12M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m-7 0l1 12h6l1-12M10 11v6M14 11v6" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="text-xs text-[var(--text-muted)]">Ring {selectedPerson.ring}</div>
                <textarea
                  value={selectedPerson.notes}
                  onChange={(e) => updateSelectedNotes(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border-soft)] bg-white p-2 text-sm"
                  rows={8}
                />
              </div>
            )}

            <div className="border-t border-[var(--border-soft)] pt-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">All People</h3>
              <div className="mt-2 space-y-2">
                {people.length === 0 ? (
                  <p className="text-xs text-[var(--text-muted)]">No people added yet.</p>
                ) : (
                  people.map((person) => (
                    <div key={person.id} className="flex items-center justify-between rounded-lg border border-[var(--border-soft)] bg-[var(--surface-1)] px-3 py-2">
                      <button
                        type="button"
                        onClick={() => setSelectedId(person.id)}
                        className="text-left text-sm text-[var(--text-primary)]"
                      >
                        {person.name} <span className="text-xs text-[var(--text-muted)]">· Ring {person.ring}</span>
                      </button>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingId(person.id)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[var(--border-soft)] bg-white text-[var(--text-muted)]"
                          title="Edit person"
                          aria-label="Edit person"
                        >
                          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 11l7.768-7.768a2.5 2.5 0 113.536 3.536L12.536 14.536a2 2 0 01-.878.517L8 16l.947-3.658A2 2 0 019.464 11.464z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => deletePerson(person.id)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[var(--border-soft)] bg-white text-[var(--text-muted)]"
                          title="Delete person"
                          aria-label="Delete person"
                        >
                          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 7h12M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m-7 0l1 12h6l1-12M10 11v6M14 11v6" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>
      </div>

      {editingPerson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
          <div className="w-full max-w-md rounded-xl border border-[var(--border-soft)] bg-[var(--surface-0)] p-5">
            <h3 className="text-base font-semibold text-[var(--text-primary)]">Edit Person</h3>
            <div className="mt-3 space-y-3">
              <label className="block text-sm text-[var(--text-muted)]">
                Name
                <input
                  value={editingPerson.name}
                  onChange={(e) => updatePerson(editingPerson.id, { name: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-[var(--border-soft)] bg-white px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-sm text-[var(--text-muted)]">
                Ring
                <select
                  value={String(editingPerson.ring)}
                  onChange={(e) => movePersonToRing(editingPerson.id, Number(e.target.value) as RingLevel)}
                  className="mt-1 w-full rounded-lg border border-[var(--border-soft)] bg-white px-3 py-2 text-sm"
                >
                  <option value="1">Ring 1 (closest)</option>
                  <option value="2">Ring 2</option>
                  <option value="3">Ring 3</option>
                  <option value="4">Ring 4</option>
                </select>
              </label>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingId(null)}
                className="rounded-lg border border-[var(--border-soft)] bg-white px-3 py-2 text-sm"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
