'use client';

import { useState } from 'react';
import Sidebar from '@/app/components/Sidebar';
import { useRequireAuth } from '@/app/components/useRequireAuth';
import MealPlanningSection from './components/MealPlanningSection';
import GroceryListSection from './components/GrocerySection';
import PantrySection from './components/PantrySection';

export default function ProvisionsPage() {
  const { userId, userEmail, isLoading, isAuthenticated, signOut } = useRequireAuth();
  const [expandedSection, setExpandedSection] = useState<string | null>('grocery');

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

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
          <div className="max-w-7xl mx-auto space-y-4">
            <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-6">Provisions</h1>

            <div className="bg-[var(--surface-0)] border border-[var(--border-soft)] rounded-xl overflow-hidden">
              <button
                onClick={() => toggleSection('plan')}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-[var(--surface-1)]"
              >
                <div className="flex items-center gap-3">
                  <svg className="w-6 h-6 text-[var(--accent-strong)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                  <div className="text-left">
                    <h2 className="text-xl font-semibold text-[var(--text-primary)]">Meal Planning</h2>
                    <p className="text-sm text-[var(--text-muted)]">Plan meals and check ingredient availability</p>
                  </div>
                </div>
                <svg className={`w-5 h-5 text-[var(--text-muted)] transition-transform ${expandedSection === 'plan' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {expandedSection === 'plan' && (
                <div className="border-t border-[var(--border-soft)]">
                  <MealPlanningSection userId={userId} />
                </div>
              )}
            </div>

            <div className="bg-[var(--surface-0)] border border-[var(--border-soft)] rounded-xl overflow-hidden">
              <button
                onClick={() => toggleSection('grocery')}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-[var(--surface-1)]"
              >
                <div className="flex items-center gap-3">
                  <svg className="w-6 h-6 text-[var(--accent-lavender)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <div className="text-left">
                    <h2 className="text-xl font-semibold text-[var(--text-primary)]">Grocery List</h2>
                    <p className="text-sm text-[var(--text-muted)]">Track items to buy with nutritional info</p>
                  </div>
                </div>
                <svg className={`w-5 h-5 text-[var(--text-muted)] transition-transform ${expandedSection === 'grocery' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {expandedSection === 'grocery' && (
                <div className="border-t border-[var(--border-soft)]">
                  <GroceryListSection userId={userId} />
                </div>
              )}
            </div>

            <div className="bg-[var(--surface-0)] border border-[var(--border-soft)] rounded-xl overflow-hidden">
              <button
                onClick={() => toggleSection('pantry')}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-[var(--surface-1)]"
              >
                <div className="flex items-center gap-3">
                  <svg className="w-6 h-6 text-[var(--accent-strong)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  <div className="text-left">
                    <h2 className="text-xl font-semibold text-[var(--text-primary)]">Pantry</h2>
                    <p className="text-sm text-[var(--text-muted)]">Manage what you have in stock with expiration tracking</p>
                  </div>
                </div>
                <svg className={`w-5 h-5 text-[var(--text-muted)] transition-transform ${expandedSection === 'pantry' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {expandedSection === 'pantry' && (
                <div className="border-t border-[var(--border-soft)]">
                  <PantrySection userId={userId} />
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
