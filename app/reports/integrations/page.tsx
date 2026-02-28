import PageLayout from '@/app/components/PageLayout';

export default function ReportsIntegrationsPage() {
  // Integration list starts with Apple Health/Oura status tracking.
  return (
    <PageLayout>
      <div className="space-y-6">
        <header className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-0)] p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Reports</p>
          <h1 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">Integrations</h1>
        </header>

        <section className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-0)] p-5">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Apple Health (includes Oura)</h2>
          <p className="mt-2 text-sm text-[var(--text-muted)]">Status: Pending</p>
        </section>
      </div>
    </PageLayout>
  );
}
