'use client';

import Link from 'next/link';
import { ReactNode, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

type ShellProps = {
  children: ReactNode;
};

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

  useEffect(() => {
    if (!ready) {
      return;
    }

    const authRoute = ['/login', '/signup', '/forgot-password', '/reset-password'].includes(pathname);

    if (!session && !authRoute) {
      router.push('/login');
      return;
    }

    if (session && (pathname === '/' || pathname === '/login' || pathname === '/signup')) {
      router.push('/habits');
    }
  }, [pathname, ready, router, session]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  const showNav = Boolean(session);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <Link href={session ? '/habits' : '/login'} className="brand">
            Habit Hopper
          </Link>
          <p className="muted small">Minimal habit tracking with a streak-loving sidekick.</p>
        </div>
        {showNav ? (
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
