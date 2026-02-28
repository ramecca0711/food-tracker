'use client';

import { useState } from 'react';
import { useRequireAuth } from '@/app/components/useRequireAuth';

export default function DebugPage() {
  const { userId, isLoading, isAuthenticated, signOut } = useRequireAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [dryRun, setDryRun] = useState(false);

  async function runBackfill() {
    if (!userId) return;

    setIsProcessing(true);
    setResult(null);

    try {
      const response = await fetch('/api/backfill-biodiversity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          dryRun,
          limit: 500,
        }),
      });

      const data = await response.json();
      setResult(data);
    } catch (error: any) {
      setResult({
        error: 'Failed to run backfill',
        details: error?.message || String(error),
      });
    } finally {
      setIsProcessing(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[var(--app-bg)]">
        <div className="text-[var(--text-muted)]">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated || !userId) return null;

  return (
    <div className="min-h-screen bg-transparent p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">Debug Tools</h1>

        <div className="bg-[var(--accent-soft)] border border-[var(--border-soft)] rounded-lg p-4">
          <p className="text-sm text-[var(--text-muted)]">Admin tool. This will modify your database.</p>
        </div>

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

          {result && (
            <div className="mt-4 p-4 rounded-lg bg-[var(--surface-1)] border border-[var(--border-soft)]">
              <pre className="text-sm overflow-auto whitespace-pre-wrap">{JSON.stringify(result, null, 2)}</pre>
            </div>
          )}
        </div>

        <button onClick={signOut} className="text-sm text-[var(--accent-lavender)] hover:underline">
          Sign Out
        </button>
      </div>
    </div>
  );
}
