'use client';

import PageLayout from '@/app/components/PageLayout';

export default function ProgressPhotosPage() {
  return (
    <PageLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="bg-[var(--surface-0)] border border-[var(--border-soft)] rounded-xl p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">WellBeing / Body</p>
          <h1 className="mt-2 text-3xl font-bold text-[var(--text-primary)]">Progress Photos</h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            This page now defines the current requirements and acceptance criteria for the Progress Photos feature.
          </p>
        </header>

        <section className="bg-[var(--surface-0)] border border-[var(--border-soft)] rounded-xl p-6">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">MVP Requirements (Build First)</h2>
          <ul className="mt-3 space-y-2 text-sm text-[var(--text-muted)] list-disc list-inside">
            <li>User can create a dated progress entry.</li>
            <li>Each entry supports four angles: Front, Back, Left, Right.</li>
            <li>User can upload one photo per angle for the same entry date.</li>
            <li>User can add optional notes for each entry.</li>
            <li>Entries show in reverse-chronological order.</li>
            <li>User can delete an entry and all photos attached to it.</li>
            <li>Only the logged-in user can view/edit their photos.</li>
          </ul>
        </section>

        <section className="bg-[var(--surface-0)] border border-[var(--border-soft)] rounded-xl p-6">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Comparison Requirements</h2>
          <ul className="mt-3 space-y-2 text-sm text-[var(--text-muted)] list-disc list-inside">
            <li>User can pick two dates and view photos side-by-side by matching angle.</li>
            <li>Comparison view defaults to the same angle on both dates.</li>
            <li>User can quickly switch angle (Front/Back/Left/Right) in compare mode.</li>
            <li>If a photo is missing for a selected angle/date, show a clear placeholder state.</li>
          </ul>
        </section>

        <section className="bg-[var(--surface-0)] border border-[var(--border-soft)] rounded-xl p-6">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Future Scope (Not Required in MVP)</h2>
          <ul className="mt-3 space-y-2 text-sm text-[var(--text-muted)] list-disc list-inside">
            <li>Body metric overlays (weight/body fat trend tied to photo date).</li>
            <li>AI-assisted progress callouts and visual summaries.</li>
            <li>Monthly auto-generated progress recap.</li>
            <li>Optional mobile camera capture flow with framing guides.</li>
          </ul>
        </section>

        <section className="bg-[var(--surface-0)] border border-[var(--border-soft)] rounded-xl p-6">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Acceptance Checklist</h2>
          <ul className="mt-3 space-y-2 text-sm text-[var(--text-muted)] list-disc list-inside">
            <li>Creating, viewing, and deleting entries works on desktop and mobile.</li>
            <li>Uploads persist after refresh and across sessions.</li>
            <li>Compare view loads quickly and keeps angle/date selections stable.</li>
            <li>No 404/blank state from sidebar navigation to this page.</li>
          </ul>
        </section>
      </div>
    </PageLayout>
  );
}
