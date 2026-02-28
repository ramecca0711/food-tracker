'use client';

import { useMemo, useState } from 'react';
import PageLayout from '@/app/components/PageLayout';

type BodySnapshot = {
  id: string;
  loggedAt: string;
  weight: number;
  bodyFat: number;
  restingHr: number;
};

const initialSnapshots: BodySnapshot[] = [
  { id: '1', loggedAt: new Date().toISOString(), weight: 178, bodyFat: 18.6, restingHr: 59 },
  { id: '2', loggedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString(), weight: 180, bodyFat: 19.2, restingHr: 61 },
  { id: '3', loggedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 40).toISOString(), weight: 182, bodyFat: 19.8, restingHr: 62 },
];

export default function BodyDashboardPage() {
  // Manual entry stays available while HealthKit integration is pending.
  const [snapshots, setSnapshots] = useState<BodySnapshot[]>(initialSnapshots);
  const [form, setForm] = useState({ weight: '178', bodyFat: '18.6', restingHr: '59' });

  const mostRecent = useMemo(() => {
    return [...snapshots].sort((a, b) => +new Date(b.loggedAt) - +new Date(a.loggedAt))[0];
  }, [snapshots]);

  const ytd = useMemo(() => {
    const yearStart = new Date(new Date().getFullYear(), 0, 1);
    const rows = snapshots.filter((s) => new Date(s.loggedAt) >= yearStart);
    if (!rows.length) return null;
    const avg = (values: number[]) => values.reduce((sum, n) => sum + n, 0) / values.length;
    return {
      count: rows.length,
      weight: avg(rows.map((r) => r.weight)),
      bodyFat: avg(rows.map((r) => r.bodyFat)),
      restingHr: avg(rows.map((r) => r.restingHr)),
    };
  }, [snapshots]);

  const addManualEntry = () => {
    const weight = Number(form.weight);
    const bodyFat = Number(form.bodyFat);
    const restingHr = Number(form.restingHr);
    if (!Number.isFinite(weight) || !Number.isFinite(bodyFat) || !Number.isFinite(restingHr)) return;

    setSnapshots((prev) => [
      {
        id: crypto.randomUUID(),
        loggedAt: new Date().toISOString(),
        weight,
        bodyFat,
        restingHr,
      },
      ...prev,
    ]);
  };

  return (
    <PageLayout>
      <div className="space-y-6">
        <header className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-0)] p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">WellBeing / Body</p>
          <h1 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">Body Dashboard</h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Apple Health (with Oura) integration is planned. Manual input remains available now.
          </p>
          <div className="mt-4 inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
            Apple Health Status: Pending
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-0)] p-5">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Most Recent</h2>
            {mostRecent ? (
              <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                <div>
                  <div className="text-[var(--text-muted)]">Weight</div>
                  <div className="text-lg font-semibold text-[var(--text-primary)]">{mostRecent.weight} lb</div>
                </div>
                <div>
                  <div className="text-[var(--text-muted)]">Body Fat</div>
                  <div className="text-lg font-semibold text-[var(--text-primary)]">{mostRecent.bodyFat}%</div>
                </div>
                <div>
                  <div className="text-[var(--text-muted)]">Resting HR</div>
                  <div className="text-lg font-semibold text-[var(--text-primary)]">{mostRecent.restingHr} bpm</div>
                </div>
              </div>
            ) : (
              <p className="mt-3 text-sm text-[var(--text-muted)]">No entries yet.</p>
            )}
          </div>

          <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-0)] p-5">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Year to Date</h2>
            {ytd ? (
              <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                <div>
                  <div className="text-[var(--text-muted)]">Avg Weight</div>
                  <div className="text-lg font-semibold text-[var(--text-primary)]">{ytd.weight.toFixed(1)} lb</div>
                </div>
                <div>
                  <div className="text-[var(--text-muted)]">Avg Body Fat</div>
                  <div className="text-lg font-semibold text-[var(--text-primary)]">{ytd.bodyFat.toFixed(1)}%</div>
                </div>
                <div>
                  <div className="text-[var(--text-muted)]">Avg Resting HR</div>
                  <div className="text-lg font-semibold text-[var(--text-primary)]">{ytd.restingHr.toFixed(0)} bpm</div>
                </div>
              </div>
            ) : (
              <p className="mt-3 text-sm text-[var(--text-muted)]">No YTD entries yet.</p>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-0)] p-5">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Manual Entry</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-4">
            <input
              type="number"
              value={form.weight}
              onChange={(e) => setForm((prev) => ({ ...prev, weight: e.target.value }))}
              className="rounded-lg border border-[var(--border-soft)] bg-white px-3 py-2 text-sm"
              placeholder="Weight (lb)"
            />
            <input
              type="number"
              step="0.1"
              value={form.bodyFat}
              onChange={(e) => setForm((prev) => ({ ...prev, bodyFat: e.target.value }))}
              className="rounded-lg border border-[var(--border-soft)] bg-white px-3 py-2 text-sm"
              placeholder="Body fat %"
            />
            <input
              type="number"
              value={form.restingHr}
              onChange={(e) => setForm((prev) => ({ ...prev, restingHr: e.target.value }))}
              className="rounded-lg border border-[var(--border-soft)] bg-white px-3 py-2 text-sm"
              placeholder="Resting HR"
            />
            <button
              type="button"
              onClick={addManualEntry}
              className="rounded-lg bg-[var(--accent-strong)] px-3 py-2 text-sm font-medium text-white"
            >
              Save Entry
            </button>
          </div>
        </section>
      </div>
    </PageLayout>
  );
}
