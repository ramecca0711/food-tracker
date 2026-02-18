'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Sidebar from '@/app/components/Sidebar';
import GroceryListSection from '../components/GrocerySection';

export default function GroceryPage() {
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
          <div className="max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">Grocery List</h1>
            
            <div className="bg-white border border-gray-200 rounded-xl">
              <GroceryListSection userId={userId} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}