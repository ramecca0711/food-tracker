'use client';

import Sidebar from './Sidebar';
import { useRequireAuth } from './useRequireAuth';

interface PageLayoutProps {
  children: React.ReactNode;
}

export default function PageLayout({ children }: PageLayoutProps) {
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

      <main className="flex-1 min-w-0">
        <div className="p-4 sm:p-8 pt-16 lg:pt-8">
          <div className="max-w-7xl mx-auto">{children}</div>
        </div>
      </main>
    </div>
  );
}
