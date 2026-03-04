'use client';

import PageLayout from '@/app/components/PageLayout';

const tiles = [
  'Meal Share Template',
  'Progress Snapshot Template',
  'Weekly Win Template',
  'Challenge Update Template',
  'Custom Widget Template Builder (Coming Soon)',
  'Story Carousel Template',
];

export default function ConnectionInstagramTemplatesPage() {
  // Tiles are placeholders for future widget-based share templates.
  return (
    <PageLayout>
      <div className="space-y-6">
        <header className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-0)] p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Connection</p>
          <h1 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">Story Templates</h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Template tiles for fun Instagram sharing from app data. Widget-based custom builder comes later.
          </p>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tiles.map((tile) => (
            <article key={tile} className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-0)] p-5">
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">{tile}</h2>
              <p className="mt-2 text-xs text-[var(--text-muted)]">Template scaffold placeholder.</p>
            </article>
          ))}
        </section>
      </div>
    </PageLayout>
  );
}
