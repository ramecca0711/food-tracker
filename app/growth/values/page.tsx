'use client';

import { useMemo, useState } from 'react';
import PageLayout from '@/app/components/PageLayout';

type ValueOption = { id: string; name: string; description: string };

const valueOptions: ValueOption[] = [
  { id: 'integrity', name: 'Integrity', description: 'Doing the right thing even when it is inconvenient.' },
  { id: 'discipline', name: 'Discipline', description: 'Following through on commitments consistently.' },
  { id: 'health', name: 'Health', description: 'Protecting physical and mental wellbeing daily.' },
  { id: 'growth', name: 'Growth', description: 'Improving through learning and reflection.' },
  { id: 'family', name: 'Family', description: 'Prioritizing close relationships and support.' },
  { id: 'service', name: 'Service', description: 'Helping others in practical ways.' },
  { id: 'courage', name: 'Courage', description: 'Taking action despite uncertainty.' },
  { id: 'presence', name: 'Presence', description: 'Being fully engaged in the current moment.' },
  { id: 'creativity', name: 'Creativity', description: 'Expressing ideas and building meaningful work.' },
  { id: 'stability', name: 'Stability', description: 'Building consistency, structure, and reliability.' },
];

export default function GrowthValuesPage() {
  // Top 3 selection behavior mirrors a tap-based board interaction.
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const selectedValues = useMemo(
    () => selectedIds.map((id) => valueOptions.find((v) => v.id === id)).filter(Boolean) as ValueOption[],
    [selectedIds]
  );

  const toggleValue = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((valueId) => valueId !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  };

  return (
    <PageLayout>
      <div className="space-y-6">
        <header className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-0)] p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Growth</p>
          <h1 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">Values</h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Pick your top 3 values. Your selected values appear at the top with a notes box under each.
          </p>
        </header>

        <section className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-0)] p-5">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Your Values ({selectedValues.length}/3)</h2>
          {selectedValues.length === 0 ? (
            <p className="mt-2 text-sm text-[var(--text-muted)]">Select values from the board below.</p>
          ) : (
            <div className="mt-3 space-y-3">
              {selectedValues.map((value) => (
                <div key={value.id} className="rounded-lg border border-[var(--border-soft)] bg-white p-3">
                  <div className="font-medium text-[var(--text-primary)]">{value.name}</div>
                  <div className="mt-1 text-xs text-[var(--text-muted)]">{value.description}</div>
                  <textarea
                    value={notes[value.id] || ''}
                    onChange={(e) => setNotes((prev) => ({ ...prev, [value.id]: e.target.value }))}
                    placeholder="Add your notes..."
                    className="mt-2 w-full rounded-lg border border-[var(--border-soft)] bg-[var(--surface-0)] p-2 text-sm"
                    rows={3}
                  />
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-0)] p-5">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Values Board</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {valueOptions.map((value) => {
              const selected = selectedIds.includes(value.id);
              const disabled = !selected && selectedIds.length >= 3;
              return (
                <button
                  key={value.id}
                  type="button"
                  onClick={() => toggleValue(value.id)}
                  disabled={disabled}
                  className={`rounded-lg border p-3 text-left transition ${
                    selected
                      ? 'border-[var(--accent-strong)] bg-[var(--accent-soft)]'
                      : 'border-[var(--border-soft)] bg-white hover:border-[var(--accent-lavender)]'
                  } ${disabled ? 'opacity-50' : ''}`}
                >
                  <div className="font-medium text-[var(--text-primary)]">{value.name}</div>
                  <div className="mt-1 text-xs text-[var(--text-muted)]">{value.description}</div>
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </PageLayout>
  );
}
