'use client';

import Link from 'next/link';
import { ReactNode, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

type ShellProps = {
  children: ReactNode;
};

const authRoutes = ['/login', '/signup', '/forgot-password', '/reset-password'];

export function Shell({ children }: ShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) {
        return;
      }
      setSession(data.session ?? null);
      setReady(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setReady(true);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const isAuthRoute = useMemo(() => authRoutes.includes(pathname), [pathname]);

  useEffect(() => {
    if (!ready) {
      return;
    }

    if (!session && !isAuthRoute) {
      router.push('/login');
      return;
    }

    if (session && (pathname === '/' || pathname === '/login' || pathname === '/signup')) {
      router.push('/habits');
    }
  }, [isAuthRoute, pathname, ready, router, session]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  if (isAuthRoute) {
    return (
      <div className="min-h-screen bg-[#050505] text-[#f6efe6]">
        <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-6 py-10 sm:px-8">
          {ready ? children : <div className="w-full rounded-3xl border border-white/10 bg-[#0d0d0d] p-8 text-center text-sm text-[#d2c1ab]">Loading...</div>}
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <Link href={session ? '/habits' : '/login'} className="brand">
            Habit Hopper
          </Link>
          <p className="muted small">Minimal habit tracking with a streak-loving sidekick.</p>
        </div>
        {session ? (
          <nav className="nav">
            <Link href="/habits">Habits</Link>
            <Link href="/habits/new">New habit</Link>
            <Link href="/stats">Global stats</Link>
            <button type="button" className="ghost" onClick={handleLogout}>
              Log out
            </button>
          </nav>
        ) : null}
      </header>
      <main>{ready ? children : <div className="card">Loading...</div>}</main>
    </div>
  );
}
