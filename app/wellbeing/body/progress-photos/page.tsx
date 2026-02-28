'use client';

import Sidebar from '@/app/components/Sidebar';
import { useRequireAuth } from '@/app/components/useRequireAuth';

export default function ProgressPhotosPage() {
  const { userId, userEmail, isLoading, isAuthenticated, signOut } = useRequireAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[var(--app-bg)]">
        <div className="text-[var(--text-muted)]">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated || !userId) return null;

  return (
    <div className="min-h-screen bg-transparent flex">
      <Sidebar userEmail={userEmail} onSignOut={signOut} />

      <main className="flex-1">
        <div className="p-4 sm:p-8 pt-20 lg:pt-8">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-6">Progress Photos</h1>

            <div className="bg-[var(--surface-0)] border border-[var(--border-soft)] rounded-xl p-6 mb-6">
              <h3 className="text-sm font-semibold text-[var(--accent-strong)] mb-2">Coming Soon</h3>
              <p className="text-sm text-[var(--text-muted)]">
                Track your body transformation with dated progress photos. Features include:
              </p>
              <ul className="text-sm text-[var(--text-muted)] mt-2 space-y-1 list-disc list-inside">
                <li>Four-angle photo upload (Front, Back, Left, Right)</li>
                <li>Date-stamped entries with notes</li>
                <li>Side-by-side comparison view</li>
                <li>Progress timeline visualization</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
