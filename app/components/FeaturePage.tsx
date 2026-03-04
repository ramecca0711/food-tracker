'use client';

import PageLayout from './PageLayout';

type FeaturePageProps = {
  section: string;
  title: string;
  description: string;
  focusItems: string[];
  nextActions: string[];
};

export default function FeaturePage({
  section,
  title,
  description,
  focusItems,
  nextActions,
}: FeaturePageProps) {
  return (
    <PageLayout>
      <div className="space-y-6">
        <header className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-0)] p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">{section}</p>
          <h1 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">{title}</h1>
          <p className="mt-2 max-w-3xl text-sm text-[var(--text-muted)]">{description}</p>
        </header>

        <section className="grid gap-4 md:grid-cols-2">
          <article className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-0)] p-5">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">What to track here</h2>
            <ul className="mt-3 space-y-2 text-sm text-[var(--text-muted)]">
              {focusItems.map((item) => (
                <li key={item}>- {item}</li>
              ))}
            </ul>
          </article>

          <article className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-0)] p-5">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Suggested next actions</h2>
            <ol className="mt-3 space-y-2 text-sm text-[var(--text-muted)]">
              {nextActions.map((step, index) => (
                <li key={step}>
                  {index + 1}. {step}
                </li>
              ))}
            </ol>
          </article>
        </section>
      </div>
    </PageLayout>
  );
}
