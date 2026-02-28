'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from './components/Sidebar';
import AuthModal from './components/AuthModal';
import ThemeSwitcher from './components/ThemeSwitcher';
import { useAuth } from './components/AuthProvider';
import BrandMark from './components/BrandMark';

const quickLinks = [
  {
    title: 'Food Log',
    subtitle: 'Track your nutrition',
    path: '/wellbeing/fuel/food-log',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 4v16M16 4v16M6 7h12M6 12h12M6 17h12" />
    ),
  },
  {
    title: 'Goals',
    subtitle: 'Set and track your goals',
    path: '/wellbeing/goals',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 3l7 4v10l-7 4-7-4V7l7-4zm0 5v4m0 0l3 3m-3-3l-3 3" />
    ),
  },
  {
    title: 'Dashboard',
    subtitle: 'View your progress',
    path: '/wellbeing/dashboard',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 19h16M7 16V9m5 7V5m5 11v-6" />
    ),
  },
  {
    title: 'Journal',
    subtitle: 'Reflect on your day',
    path: '/growth/journal',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 4h8a3 3 0 013 3v13H10a3 3 0 00-3 3V4zm0 0H5v15" />
    ),
  },
  {
    title: 'Values',
    subtitle: 'Define what matters',
    path: '/growth/values',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 21l-6-6a4 4 0 115.66-5.66L12 9.67l.34-.33A4 4 0 1118 15l-6 6z" />
    ),
  },
  {
    title: 'About',
    subtitle: 'Learn about Home Base',
    path: '/about',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8h.01M11 12h2v5h-2zM4 12a8 8 0 1016 0 8 8 0 00-16 0z" />
    ),
  },
];

export default function Home() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { userId, userEmail, isReady, signOut } = useAuth();
  const router = useRouter();

  if (!isReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--app-bg)]">
        <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-0)] px-5 py-3 text-sm text-[var(--text-muted)]">
          Loading your session...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent flex">
      {userId && <Sidebar userEmail={userEmail} onSignOut={signOut} />}

      <main className={`flex-1 ${userId ? 'lg:ml-16' : ''}`}>
        {userId ? (
          <div className="p-6 pt-20 lg:pt-8">
            <div className="mx-auto max-w-6xl space-y-6">
              <div className="flex flex-col gap-4 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-0)] p-6 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <BrandMark className="h-10 w-10" />
                    <h1 className="text-3xl font-semibold tracking-tight text-[var(--text-primary)]">Home Base</h1>
                  </div>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">Build a home within yourself.</p>
                </div>
                <div className="w-full sm:w-52">
                  <ThemeSwitcher />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {quickLinks.map((item) => (
                  <button
                    key={item.path}
                    onClick={() => router.push(item.path)}
                    className="group rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-0)] p-5 text-left shadow-sm hover:border-[var(--accent-lavender)] hover:shadow-md"
                  >
                    <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--border-soft)] bg-[var(--surface-1)] text-[var(--accent-strong)]">
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {item.icon}
                      </svg>
                    </div>
                    <h3 className="text-base font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-strong)]">{item.title}</h3>
                    <p className="mt-1 text-sm text-[var(--text-muted)]">{item.subtitle}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex min-h-screen flex-col items-center justify-center p-6">
            <div className="w-full max-w-2xl rounded-3xl border border-[var(--border-soft)] bg-[var(--surface-0)] p-8 text-center shadow-sm">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-1)] text-[var(--accent-strong)]">
                <BrandMark className="h-9 w-9" />
              </div>
              <h1 className="text-4xl font-semibold tracking-tight text-[var(--text-primary)]">Home Base</h1>
              <p className="mt-2 text-lg text-[var(--text-muted)]">Build a home within yourself.</p>
              <p className="mx-auto mt-5 max-w-xl text-sm leading-6 text-[var(--text-muted)]">
                Keep nutrition, routines, and growth plans in one calm workspace. Pick the style you like best and keep moving.
              </p>
              <div className="mx-auto mt-6 w-52">
                <ThemeSwitcher />
              </div>
              <button
                onClick={() => setShowAuthModal(true)}
                className="mt-6 rounded-xl bg-[var(--accent-strong)] px-8 py-3 text-sm font-semibold text-white shadow-sm hover:brightness-95"
              >
                Get Started
              </button>
            </div>
          </div>
        )}
      </main>

      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
    </div>
  );
}
