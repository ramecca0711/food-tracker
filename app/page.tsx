'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import DashboardView from './components/DashboardView';
import LogFoodView from './components/LogFoodView';
import GoalsView from './components/GoalsView';

export default function Home() {
  const [view, setView] = useState<'dashboard' | 'log' | 'goals'>('dashboard');
  const [userId, setUserId] = useState<string | null>(null);
  
  useEffect(() => {
    async function signIn() {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        setUserId(session.user.id);
      } else {
        const { data, error } = await supabase.auth.signInAnonymously();
        if (data.user) {
          setUserId(data.user.id);
          console.log('✅ Signed in:', data.user.id);
        }
      }
    }
    signIn();
  }, []);

  return (
    <main className="min-h-screen bg-white">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">Food Log</h1>
          
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
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {view === 'dashboard' ? (
          <DashboardView userId={userId} />
        ) : view === 'log' ? (
          <LogFoodView userId={userId} />
        ) : (
          <GoalsView userId={userId} />
        )}
      </div>
    </main>
  );
}