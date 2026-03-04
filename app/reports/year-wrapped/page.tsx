import PageLayout from '@/app/components/PageLayout';

export default function ReportsYearWrappedPage() {
  // Placeholder copy until annual AI insight generation is implemented.
  return (
    <PageLayout>
      <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-0)] p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Reports</p>
        <h1 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">Year Wrapped</h1>
        <p className="mt-3 text-sm text-[var(--text-muted)]">
          AI will give you insights at the end of the year on your data and trends.
        </p>
      </div>
    </PageLayout>
  );
}
