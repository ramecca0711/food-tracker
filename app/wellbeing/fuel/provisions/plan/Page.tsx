'use client';

import Sidebar from '@/app/components/Sidebar';
import { useRequireAuth } from '@/app/components/useRequireAuth';
import MealPlanningSection from '../components/MealPlanningSection';

export default function MealPlanPage() {
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
          <div className="max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-6">Meal Planning</h1>

            <div className="bg-[var(--surface-0)] border border-[var(--border-soft)] rounded-xl">
              <MealPlanningSection userId={userId} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
