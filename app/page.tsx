'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Sidebar from './components/Sidebar';
import AuthModal from './components/AuthModal';

export default function Home() {
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const router = useRouter();

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
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar - only show when logged in */}
      {userId && (
        <Sidebar userEmail={userEmail} onSignOut={handleSignOut} />
      )}

      {/* Main content */}
      <main className={`flex-1 ${userId ? 'lg:ml-16' : ''}`}>
        {userId ? (
          /* Home Dashboard - logged in view */
          <div className="p-8 pt-20 lg:pt-8">
            <div className="max-w-6xl mx-auto">
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Welcome to HomeBase</h1>
              <p className="text-xl text-gray-600 mb-8">Life's a piece of pie</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Quick access cards */}
                <button
                  onClick={() => router.push('/wellbeing/fuel/food-log')}
                  className="p-6 bg-white rounded-2xl border-2 border-gray-200 hover:border-blue-500 hover:shadow-lg transition-all text-left group"
                >
                  <div className="text-4xl mb-3">🍽️</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1 group-hover:text-blue-600">Food Log</h3>
                  <p className="text-sm text-gray-600">Track your nutrition</p>
                </button>

                <button
                  onClick={() => router.push('/wellbeing/goals')}
                  className="p-6 bg-white rounded-2xl border-2 border-gray-200 hover:border-blue-500 hover:shadow-lg transition-all text-left group"
                >
                  <div className="text-4xl mb-3">🎯</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1 group-hover:text-blue-600">Goals</h3>
                  <p className="text-sm text-gray-600">Set and track your goals</p>
                </button>

                <button
                  onClick={() => router.push('/wellbeing/dashboard')}
                  className="p-6 bg-white rounded-2xl border-2 border-gray-200 hover:border-blue-500 hover:shadow-lg transition-all text-left group"
                >
                  <div className="text-4xl mb-3">📊</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1 group-hover:text-blue-600">Dashboard</h3>
                  <p className="text-sm text-gray-600">View your progress</p>
                </button>

                <button
                  onClick={() => router.push('/growth/journal')}
                  className="p-6 bg-white rounded-2xl border-2 border-gray-200 hover:border-blue-500 hover:shadow-lg transition-all text-left group"
                >
                  <div className="text-4xl mb-3">📝</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1 group-hover:text-blue-600">Journal</h3>
                  <p className="text-sm text-gray-600">Reflect on your day</p>
                </button>

                <button
                  onClick={() => router.push('/growth/values')}
                  className="p-6 bg-white rounded-2xl border-2 border-gray-200 hover:border-blue-500 hover:shadow-lg transition-all text-left group"
                >
                  <div className="text-4xl mb-3">💎</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1 group-hover:text-blue-600">Values</h3>
                  <p className="text-sm text-gray-600">Define what matters</p>
                </button>

                <button
                  onClick={() => router.push('/about')}
                  className="p-6 bg-white rounded-2xl border-2 border-gray-200 hover:border-blue-500 hover:shadow-lg transition-all text-left group"
                >
                  <div className="text-4xl mb-3">ℹ️</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1 group-hover:text-blue-600">About</h3>
                  <p className="text-sm text-gray-600">Learn about HomeBase</p>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Landing page - not logged in */
          <div className="flex flex-col items-center justify-center min-h-screen p-8">
            <div className="text-center max-w-2xl">
              <div className="text-8xl mb-6">🏠</div>
              <h1 className="text-5xl font-bold text-gray-900 mb-4">HomeBase</h1>
              <p className="text-2xl text-gray-600 mb-8">Life's a piece of pie</p>
              <p className="text-lg text-gray-600 mb-8">
                Structure your wellbeing, growth, and connections. Track nutrition, set goals, 
                journal your journey, and celebrate life one slice at a time.
              </p>
              <button
                onClick={() => setShowAuthModal(true)}
                className="px-8 py-4 bg-blue-600 text-white text-lg font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-lg"
              >
                Get Started
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModal onClose={() => setShowAuthModal(false)} />
      )}
    </div>
  );
}