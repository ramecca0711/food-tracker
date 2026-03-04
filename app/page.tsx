'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from './components/Sidebar';
import AuthModal from './components/AuthModal';
import ThemeSwitcher from './components/ThemeSwitcher';
import { useAuth } from './components/AuthProvider';
import BrandMark from './components/BrandMark';

// All available quick-link tiles — every page that can be pinned to the home screen.
const ALL_QUICK_LINKS = [
  {
    id: 'food-log',
    title: 'Food Log',
    subtitle: 'Track your nutrition',
    path: '/wellbeing/fuel/food-log',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 4v16M16 4v16M6 7h12M6 12h12M6 17h12" />
    ),
  },
  {
    id: 'goals',
    title: 'Goals',
    subtitle: 'Set and track your goals',
    path: '/wellbeing/goals',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 3l7 4v10l-7 4-7-4V7l7-4zm0 5v4m0 0l3 3m-3-3l-3 3" />
    ),
  },
  {
    id: 'dashboard',
    title: 'Dashboard',
    subtitle: 'View your progress',
    path: '/wellbeing/dashboard',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 19h16M7 16V9m5 7V5m5 11v-6" />
    ),
  },
  {
    id: 'journal',
    title: 'Journal',
    subtitle: 'Reflect on your day',
    path: '/growth/journal',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 4h8a3 3 0 013 3v13H10a3 3 0 00-3 3V4zm0 0H5v15" />
    ),
  },
  {
    id: 'values',
    title: 'Values',
    subtitle: 'Define what matters',
    path: '/growth/values',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 21l-6-6a4 4 0 115.66-5.66L12 9.67l.34-.33A4 4 0 1118 15l-6 6z" />
    ),
  },
  {
    id: 'bingo',
    title: 'Bingo',
    subtitle: 'Goal bingo card',
    path: '/growth/bingo',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 4h4v4H4V4zm6 0h4v4h-4V4zm6 0h4v4h-4V4zM4 10h4v4H4v-4zm6 0h4v4h-4v-4zm6 0h4v4h-4v-4zM4 16h4v4H4v-4zm6 0h4v4h-4v-4zm6 0h4v4h-4v-4z" />
    ),
  },
  {
    id: 'todo',
    title: 'To Do',
    subtitle: 'Manage your tasks',
    path: '/growth/todo',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    ),
  },
  {
    id: 'vision-board',
    title: 'Vision Board',
    subtitle: 'Visualize your goals',
    path: '/growth/vision-board',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    ),
  },
  {
    id: 'my-circle',
    title: 'My Circle',
    subtitle: 'Map your relationships',
    path: '/connection/my-circle',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    ),
  },
  {
    id: 'about',
    title: 'About',
    subtitle: 'Learn about Home Base',
    path: '/about',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8h.01M11 12h2v5h-2zM4 12a8 8 0 1016 0 8 8 0 00-16 0z" />
    ),
  },
];

// Default pinned tile IDs — the original 6 quick links.
const DEFAULT_PINNED_IDS = ['food-log', 'goals', 'dashboard', 'journal', 'values', 'about'];
const PINNED_STORAGE_KEY_PREFIX = 'home:pinned-tiles';

export default function Home() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showTileSelector, setShowTileSelector] = useState(false);
  // IDs of tiles currently pinned to the home screen.
  const [pinnedIds, setPinnedIds] = useState<string[]>(DEFAULT_PINNED_IDS);
  const { userId, userEmail, isReady, signOut } = useAuth();
  const router = useRouter();

  // Load pinned tile preferences from local storage (per-user key).
  useEffect(() => {
    if (!userId) return;
    try {
      const raw = localStorage.getItem(`${PINNED_STORAGE_KEY_PREFIX}:${userId}`);
      if (raw) {
        const parsed = JSON.parse(raw) as string[];
        if (Array.isArray(parsed)) setPinnedIds(parsed);
      }
    } catch {
      /* Fall back to defaults on parse error */
    }
  }, [userId]);

  const savePinnedIds = (ids: string[]) => {
    setPinnedIds(ids);
    if (userId) {
      localStorage.setItem(`${PINNED_STORAGE_KEY_PREFIX}:${userId}`, JSON.stringify(ids));
    }
  };

  const toggleTile = (id: string) => {
    savePinnedIds(
      pinnedIds.includes(id) ? pinnedIds.filter((i) => i !== id) : [...pinnedIds, id]
    );
  };

  // Display tiles in the original ALL_QUICK_LINKS order, filtered to only pinned ones.
  const visibleLinks = ALL_QUICK_LINKS.filter((link) => pinnedIds.includes(link.id));

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

      <main className={`flex-1 ${userId ? '' : ''}`}>
        {userId ? (
          <div className="p-6 pt-20 lg:pt-8">
            <div className="mx-auto max-w-6xl space-y-6">
              {/* Header card */}
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

              {/* Quick link tiles */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {visibleLinks.map((item) => (
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
                    <h3 className="text-base font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-strong)]">
                      {item.title}
                    </h3>
                    <p className="mt-1 text-sm text-[var(--text-muted)]">{item.subtitle}</p>
                  </button>
                ))}
              </div>

              {/* Tile selector — collapsed by default to keep the home screen clean */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowTileSelector((prev) => !prev)}
                  className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-0)] px-4 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--accent-lavender)] transition-colors"
                >
                  {showTileSelector ? 'Hide Tile Selector ▲' : 'Customize Tiles ▼'}
                </button>

                {showTileSelector && (
                  <div className="mt-3 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-0)] p-5">
                    <h2 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">
                      Select pages to show as quick link tiles:
                    </h2>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {ALL_QUICK_LINKS.map((link) => (
                        <label
                          key={link.id}
                          className="flex items-center gap-3 rounded-lg border border-[var(--border-soft)] bg-white p-3 cursor-pointer hover:bg-[var(--surface-1)] transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={pinnedIds.includes(link.id)}
                            onChange={() => toggleTile(link.id)}
                            className="h-4 w-4 rounded"
                          />
                          <div>
                            <div className="text-sm font-medium text-[var(--text-primary)]">{link.title}</div>
                            <div className="text-xs text-[var(--text-muted)]">{link.subtitle}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Unauthenticated landing page */
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
