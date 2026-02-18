'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Sidebar from '@/app/components/Sidebar';

export default function ProgressPhotosPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
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
          <div className="max-w-6xl mx-auto">
            
            <h1 className="text-3xl font-bold text-gray-900 mb-6">Progress Photos</h1>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6">
              <h3 className="text-sm font-semibold text-blue-900 mb-2">📸 Coming Soon</h3>
              <p className="text-sm text-blue-800">
                Track your body transformation with dated progress photos. Features include:
              </p>
              <ul className="text-sm text-blue-800 mt-2 space-y-1 list-disc list-inside">
                <li>Four-angle photo upload (Front, Back, Left, Right)</li>
                <li>Date-stamped entries with notes</li>
                <li>Side-by-side comparison view</li>
                <li>Progress timeline visualization</li>
              </ul>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}