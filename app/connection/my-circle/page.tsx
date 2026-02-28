'use client';

import { useMemo, useState } from 'react';
import PageLayout from '@/app/components/PageLayout';

type RingLevel = 1 | 2 | 3 | 4;
type CirclePerson = { id: string; name: string; ring: RingLevel; notes: string; angle: number };

const ringStyles: Record<RingLevel, string> = {
  1: 'w-36 h-36',
  2: 'w-56 h-56',
  3: 'w-80 h-80',
  4: 'w-[26rem] h-[26rem]',
};

export default function ConnectionMyCirclePage() {
  // People are positioned by ring + angle on a concentric circle layout.
  const [people, setPeople] = useState<CirclePerson[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', ring: '2', notes: '' });

  const selectedPerson = useMemo(() => people.find((person) => person.id === selectedId) || null, [people, selectedId]);

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

  const updateSelectedNotes = (value: string) => {
    if (!selectedId) return;
    setPeople((prev) => prev.map((person) => (person.id === selectedId ? { ...person, notes: value } : person)));
  };

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
            <div className="relative mx-auto h-[28rem] w-[28rem] rounded-full border border-dashed border-[var(--border-soft)]">
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
                    type="button"
                    onClick={() => setSelectedId(person.id)}
                    className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-[var(--border-soft)] bg-white px-2 py-1 text-[11px]"
                    style={{ left: `calc(50% + ${x}px)`, top: `calc(50% + ${y}px)` }}
                  >
                    {person.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-0)] p-5">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Person Notes</h2>
            {!selectedPerson ? (
              <p className="mt-2 text-sm text-[var(--text-muted)]">Select a person in the circle to view/edit notes.</p>
            ) : (
              <div className="mt-3 space-y-2">
                <div className="text-sm font-medium text-[var(--text-primary)]">{selectedPerson.name}</div>
                <div className="text-xs text-[var(--text-muted)]">Ring {selectedPerson.ring}</div>
                <textarea
                  value={selectedPerson.notes}
                  onChange={(e) => updateSelectedNotes(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border-soft)] bg-white p-2 text-sm"
                  rows={8}
                />
              </div>
            )}
          </div>
        </section>
      </div>
    </PageLayout>
  );
}
