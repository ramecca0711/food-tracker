'use client';

import Sidebar from '@/app/components/Sidebar';
import { useRequireAuth } from '@/app/components/useRequireAuth';
import { DashboardView } from './components';

export default function WellBeingDashboard() {
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
          <DashboardView userId={userId} />
        </div>
      </main>
    </div>
  );
}
