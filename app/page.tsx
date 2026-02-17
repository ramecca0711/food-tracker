'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import DashboardView from './components/DashboardView';
import LogFoodView from './components/LogFoodView';
import GoalsView from './components/GoalsView';
import AuthModal from './components/AuthModal';

export default function Home() {
  const [view, setView] = useState<'dashboard' | 'log' | 'goals'>('dashboard');
  const [userId, setUserId] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  
  useEffect(() => {
    checkUser();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session?.user) {
          setUserId(session.user.id);
          setUserEmail(session.user.email || null);
        }
      } else if (event === 'SIGNED_OUT') {
        setUserId(null);
        setUserEmail(null);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.user) {
      setUserId(session.user.id);
      setUserEmail(session.user.email || null);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUserId(null);
    setUserEmail(null);
  };

  return (
    <main className="min-h-screen bg-white">
      {/* HEADER - Different layouts for mobile vs desktop */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4">
          
          {/* ========== MOBILE HEADER (hidden on desktop) ========== */}
          <div className="lg:hidden py-3">
            {/* Top row: Logo + Sign Out/Sign In */}
            <div className="flex items-center justify-between mb-3">
              <h1 className="text-lg font-semibold text-gray-900">Food Log AI</h1>
              {userId ? (
                <button
                  onClick={handleSignOut}
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Sign Out
                </button>
              ) : (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800"
                >
                  Sign In
                </button>
              )}
            </div>

            {/* Bottom row: Nav tabs (only when logged in) */}
            {userId && (
              <div className="flex gap-2 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setView('dashboard')}
                  className={`flex-1 py-2.5 rounded-md text-xs font-medium transition-all ${
                    view === 'dashboard'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600'
                  }`}
                >
                  📊 Dashboard
                </button>
                <button
                  onClick={() => setView('log')}
                  className={`flex-1 py-2.5 rounded-md text-xs font-medium transition-all ${
                    view === 'log'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600'
                  }`}
                >
                  🍽️ Log
                </button>
                <button
                  onClick={() => setView('goals')}
                  className={`flex-1 py-2.5 rounded-md text-xs font-medium transition-all ${
                    view === 'goals'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600'
                  }`}
                >
                  🎯 Goals
                </button>
              </div>
            )}
          </div>

          {/* ========== DESKTOP HEADER (hidden on mobile) ========== */}
          <div className="hidden lg:flex items-center justify-between py-4">
            <h1 className="text-xl font-semibold text-gray-900">Food Log AI</h1>
            
            {userId ? (
              <div className="flex items-center gap-4">
                {/* Desktop nav tabs */}
                <div className="flex gap-2 bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setView('dashboard')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                      view === 'dashboard'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Dashboard
                  </button>
                  <button
                    onClick={() => setView('log')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                      view === 'log'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Log Food
                  </button>
                  <button
                    onClick={() => setView('goals')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                      view === 'goals'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Goals
                  </button>
                </div>
                
                {/* User email + Sign out */}
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-600">{userEmail}</span>
                  <button
                    onClick={handleSignOut}
                    className="text-sm text-gray-600 hover:text-gray-900"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      {/* MAIN CONTENT - Responsive padding */}
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
        {userId ? (
          <>
            {view === 'dashboard' ? (
              <DashboardView userId={userId} />
            ) : view === 'log' ? (
              <LogFoodView userId={userId} />
            ) : (
              <GoalsView userId={userId} />
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 sm:py-20">
            <div className="text-center max-w-md px-4">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
                Welcome to Food Log AI
              </h2>
              <p className="text-gray-600 mb-6 sm:mb-8 text-sm sm:text-base">
                Track your nutrition with AI-powered food logging, biodiversity insights, and personalized goals.
              </p>
              <button
                onClick={() => setShowAuthModal(true)}
                className="w-full sm:w-auto px-8 py-3 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors font-medium"
              >
                Get Started
              </button>
            </div>
          </div>
        )}
      </div>

      {/* AUTH MODAL */}
      {showAuthModal && (
        <AuthModal onClose={() => setShowAuthModal(false)} />
      )}
    </main>
  );
}