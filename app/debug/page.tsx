'use client';

import { useState } from 'react';
import PageLayout from '@/app/components/PageLayout';
import { useAuth } from '@/app/components/AuthProvider';

// Dummy account ID for Jamie — pre-loaded with food data for testing/demo purposes.
// Switch to this account to view the app as a user with existing data without
// affecting your own food_items rows.
const JAMIE_USER_ID = 'jamie-demo-account';

export default function DebugPage() {
  const { userId: realUserId } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<unknown>(null);
  const [dryRun, setDryRun] = useState(false);

  // Account view toggle: 'mine' uses the authenticated user's data,
  // 'jamie' uses the shared demo account so devs can see seeded data.
  const [accountView, setAccountView] = useState<'mine' | 'jamie'>('mine');
  const activeUserId = accountView === 'jamie' ? JAMIE_USER_ID : realUserId;

  async function runBackfill() {
    if (!activeUserId) return;

    setIsProcessing(true);
    setResult(null);

    try {
      const response = await fetch('/api/backfill-biodiversity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: activeUserId,
          dryRun,
          limit: 500,
        }),
      });

      const data = await response.json();
      setResult(data);
    } catch (error: unknown) {
      setResult({
        error: 'Failed to run backfill',
        details: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    // PageLayout provides the Sidebar and auth guard — same as all other pages.
    <PageLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">Debug Tools</h1>

        <div className="bg-[var(--accent-soft)] border border-[var(--border-soft)] rounded-lg p-4">
          <p className="text-sm text-[var(--text-muted)]">Admin tool. This may modify database rows.</p>
        </div>

        {/* ── Account View Switcher ────────────────────────────────────────────
            Toggle between your real account and the Jamie demo account so you
            can test pages that show existing data without polluting your own. */}
        <div className="bg-[var(--surface-0)] border border-[var(--border-soft)] rounded-xl p-5 space-y-3">
          <h2 className="text-base font-semibold text-[var(--text-primary)]">Adjust View Context</h2>
          <p className="text-sm text-[var(--text-muted)]">
            Switch to the Jamie demo account to view pages with pre-loaded food data.
            Operations performed while in Jamie mode target Jamie&apos;s rows.
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setAccountView('mine')}
              className={`flex-1 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                accountView === 'mine'
                  ? 'border-[var(--accent-strong)] bg-[var(--accent-soft)] text-[var(--accent-strong)]'
                  : 'border-[var(--border-soft)] bg-white text-[var(--text-muted)]'
              }`}
            >
              My Account
            </button>
            <button
              type="button"
              onClick={() => setAccountView('jamie')}
              className={`flex-1 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                accountView === 'jamie'
                  ? 'border-[var(--accent-strong)] bg-[var(--accent-soft)] text-[var(--accent-strong)]'
                  : 'border-[var(--border-soft)] bg-white text-[var(--text-muted)]'
              }`}
            >
              Jamie (Demo)
            </button>
          </div>
          {accountView === 'jamie' && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-1.5">
              Viewing as Jamie demo account — backfill operations will run against Jamie&apos;s data.
            </p>
          )}
        </div>

        {/* ── Backfill Tool ─────────────────────────────────────────────────── */}
        <div className="bg-[var(--surface-0)] border border-[var(--border-soft)] rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">Backfill Biodiversity Data</h2>
          <p className="text-sm text-[var(--text-muted)]">Re-analyzes food items missing whole_food_ingredients.</p>

          <label className="flex items-center space-x-2 text-sm text-[var(--text-primary)]">
            <input
              type="checkbox"
              checked={dryRun}
              onChange={(e) => setDryRun(e.target.checked)}
            />
            <span>Dry run (no database updates)</span>
          </label>

          <button
            onClick={runBackfill}
            disabled={isProcessing}
            className="px-6 py-3 bg-[var(--accent-strong)] text-white font-medium rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isProcessing ? 'Processing...' : 'Run Backfill'}
          </button>

          {result !== null && (
            <div className="mt-4 p-4 rounded-lg bg-[var(--surface-1)] border border-[var(--border-soft)]">
              <pre className="text-sm overflow-auto whitespace-pre-wrap">{JSON.stringify(result, null, 2)}</pre>
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
