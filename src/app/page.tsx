'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Auth from '@/components/Auth';

export default function Home() {
  const { currentUser, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && currentUser) {
      router.push('/dashboard');
    }
  }, [currentUser, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-gray-600">Yükleniyor...</div>
      </div>
    );
  }

  if (!currentUser) {
    return <Auth />;
  }

  return null;
}
