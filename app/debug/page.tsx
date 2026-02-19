'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Sidebar from '@/app/components/Sidebar';

export default function DebugPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.user) {
      setUserId(session.user.id);
      setUserEmail(session.user.email || null);
    } else {
      router.push('/');
    }
    setIsLoading(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const runBackfill = async () => {
    if (!userId) return;

    setIsProcessing(true);
    setResult(null);

    try {
      const response = await fetch('/api/backfill-biodiversity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ error: 'Failed to run backfill', details: error });
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!userId) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar userEmail={userEmail} onSignOut={handleSignOut} />
      
      <main className="flex-1">
        <div className="p-4 sm:p-8 pt-20 lg:pt-8">
          <div className="max-w-4xl mx-auto space-y-6">
            
            <h1 className="text-3xl font-bold text-gray-900">Debug Tools</h1>

            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-yellow-900 mb-2">⚠️ Warning</h3>
              <p className="text-sm text-yellow-800">
                These are admin tools that can modify your data. Use with caution.
              </p>
            </div>

            {/* Backfill Biodiversity */}
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Backfill Biodiversity Data
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                This will re-analyze all your food items to extract whole food ingredients for biodiversity tracking. 
                It processes items that are missing biodiversity data.
              </p>
              
              <button
                onClick={runBackfill}
                disabled={isProcessing}
                className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {isProcessing ? 'Processing...' : 'Run Backfill'}
              </button>

              {result && (
                <div className={`mt-4 p-4 rounded-lg ${
                  result.error ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'
                }`}>
                  <pre className="text-sm overflow-auto">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </div>
              )}
            </div>

              {/* Backfill Food Macros */}
            <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Backfill Food Macros
            </h2>
            <p className="text-sm text-gray-600 mb-4">
                Update all your food items with accurate macros from the master database, OpenFoodFacts, and AI estimates.
                This will improve accuracy and consistency across your food log.
            </p>
            
            <button
                onClick={async () => {
                setIsProcessing(true);
                setResult(null);
                
                try {
                    const response = await fetch('/api/backfill-food-macros', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId }),
                    });
                    
                    const data = await response.json();
                    setResult(data);
                } catch (error) {
                    setResult({ error: 'Failed to run backfill', details: error });
                } finally {
                    setIsProcessing(false);
                }
                }}
                disabled={isProcessing}
                className="px-6 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
                {isProcessing ? 'Processing...' : 'Backfill Food Macros'}
            </button>

            {result && (
                <div className={`mt-4 p-4 rounded-lg ${
                result.error ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'
                }`}>
                <pre className="text-sm overflow-auto">
                    {JSON.stringify(result, null, 2)}
                </pre>
                </div>
            )}
            </div>

            {/* Database Stats */}
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Database Statistics
              </h2>
              <div className="text-sm text-gray-600">
                Coming soon: View your database statistics, item counts, and data health.
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}