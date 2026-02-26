'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function DebugPage() {
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [dryRun, setDryRun] = useState(false);

  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      router.push('/');
      return;
    }

    setUserId(session.user.id);
    setUserEmail(session.user.email ?? null);
    setIsLoading(false);
  }

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
          limit: 500, // adjust if needed
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

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/');
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-gray-500">Loading…</div>
      </div>
    );
  }

  if (!userId) return null;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">
          Debug Tools
        </h1>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800">
            ⚠️ Admin tool. This will modify your database.
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Backfill Biodiversity Data
          </h2>

          <p className="text-sm text-gray-600">
            Re-analyzes food items missing whole_food_ingredients.
          </p>

          <label className="flex items-center space-x-2 text-sm text-gray-700">
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
            className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {isProcessing ? 'Processing…' : 'Run Backfill'}
          </button>

          {result && (
            <div
              className={`mt-4 p-4 rounded-lg ${
                result.error
                  ? 'bg-red-50 border border-red-200'
                  : 'bg-green-50 border border-green-200'
              }`}
            >
              <pre className="text-sm overflow-auto whitespace-pre-wrap">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </div>

        <button
          onClick={handleSignOut}
          className="text-sm text-gray-500 hover:text-gray-700 underline"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
