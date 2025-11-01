'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/dashboard/navbar';
import { Sidebar } from '@/components/dashboard/sidebar';
import { useAuthStore, useDashboardStore } from '@/lib/store';
import { getCurrentUser } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, loading, setUser, setLoading } = useAuthStore();
  const { sidebarOpen } = useDashboardStore();

  useEffect(() => {
    const initAuth = async () => {
      try {
        const currentUser = await getCurrentUser();
        if (!currentUser || currentUser.role === 'farmer') {
          router.push('/login');
          return;
        }
        setUser(currentUser);
      } catch (error) {
        console.error('Auth error:', error);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange((async (event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        setUser(null);
        router.push('/login');
      } else if (event === 'SIGNED_IN' && session) {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
      }
    }));

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [router, setUser, setLoading]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <Sidebar />
      <main
        className={`pt-16 transition-all duration-300 ${
          sidebarOpen ? 'ml-64' : 'ml-0'
        }`}
      >
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
