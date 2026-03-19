'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type Mode = 'login' | 'signup';

type AuthFormProps = {
  mode: Mode;
};

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage('');

    const redirectTo = `${window.location.origin}/reset-password`;
    const action =
      mode === 'login'
        ? supabase.auth.signInWithPassword({ email, password })
        : supabase.auth.signUp({ email, password, options: { emailRedirectTo: redirectTo } });

    const { error } = await action;

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    if (mode === 'login') {
      router.push('/habits');
      router.refresh();
      return;
    }

    setMessage('Account created. Check your email if confirmation is enabled, then log in.');
    setLoading(false);
  }

  return (
    <form className="card auth-card" onSubmit={handleSubmit}>
      <h1>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h1>
      <p className="muted">
        {mode === 'login'
          ? 'Log in to track wins, misses, and streaks.'
          : 'Sign up with email and password to start building habits.'}
      </p>
      <label>
        Email
        <input
          required
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </label>
      <label>
        Password
        <input
          required
          minLength={6}
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </label>
      <button type="submit" disabled={loading}>
        {loading ? 'Working...' : mode === 'login' ? 'Log in' : 'Sign up'}
      </button>
      {message ? <p className="status">{message}</p> : null}
      <div className="inline-links">
        {mode === 'login' ? (
          <>
            <Link href="/forgot-password">Forgot password?</Link>
            <Link href="/signup">Need an account?</Link>
          </>
        ) : (
          <Link href="/login">Already have an account?</Link>
        )}
      </div>
    </form>
  );
}
