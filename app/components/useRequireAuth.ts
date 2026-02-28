'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthProvider';

export function useRequireAuth() {
  const { userId, userEmail, isReady, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isReady && !userId) {
      router.replace('/');
    }
  }, [isReady, userId, router]);

  return {
    userId,
    userEmail,
    isLoading: !isReady,
    isAuthenticated: Boolean(userId),
    signOut,
  };
}
