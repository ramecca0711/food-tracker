'use client';

import { useState } from 'react';
import PageLayout from '@/app/components/PageLayout';

type ResearchItem = { id: string; title: string; notes: string; url: string };

export default function ReportsResearchPage() {
  const [items, setItems] = useState<ResearchItem[]>([
    {
      id: 'r1',
      title: 'Protein timing and recovery',
      notes: 'Good summary of protein distribution strategies.',
      url: 'https://example.com/protein-review',
    },
  ]);
  const [draft, setDraft] = useState({ title: '', notes: '', url: '' });

  const addItem = () => {
    if (!draft.title.trim() || !draft.url.trim()) return;
    setItems((prev) => [
      { id: crypto.randomUUID(), title: draft.title.trim(), notes: draft.notes.trim(), url: draft.url.trim() },
      ...prev,
    ]);
    setDraft({ title: '', notes: '', url: '' });
  };

  return (
    <PageLayout>
      <div className="space-y-6">
        <header className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-0)] p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Reports</p>
          <h1 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">Research</h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Deep research topics with notes and links to websites/PDFs.
          </p>
        </header>

        <section className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-0)] p-5">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Add Research Entry</h2>
          <div className="mt-3 space-y-2">
            <input
              value={draft.title}
              onChange={(e) => setDraft((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Title"
              className="w-full rounded-lg border border-[var(--border-soft)] bg-white px-3 py-2 text-sm"
            />
            <textarea
              value={draft.notes}
              onChange={(e) => setDraft((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="Notes"
              className="w-full rounded-lg border border-[var(--border-soft)] bg-white p-2 text-sm"
              rows={3}
            />
            <input
              value={draft.url}
              onChange={(e) => setDraft((prev) => ({ ...prev, url: e.target.value }))}
              placeholder="https://..."
              className="w-full rounded-lg border border-[var(--border-soft)] bg-white px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={addItem}
              className="rounded-lg bg-[var(--accent-strong)] px-3 py-2 text-sm font-medium text-white"
            >
              Add Link
            </button>
          </div>
        </section>

        <section className="space-y-3">
          {items.map((item) => (
            <article key={item.id} className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-0)] p-5">
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">{item.title}</h2>
              {item.notes && <p className="mt-2 text-sm text-[var(--text-muted)]">{item.notes}</p>}
              <a href={item.url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm text-[var(--accent-strong)] underline">
                Open Source
              </a>
            </article>
          ))}
        </section>
      </div>
    </PageLayout>
  );
}
