'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const code = searchParams.get('code');

    if (!code) {
      setReady(true);
      return;
    }

    supabase.auth.exchangeCodeForSession(code).finally(() => setReady(true));
  }, [searchParams]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }
    setMessage('Password updated. Redirecting to your habits...');
    setTimeout(() => {
      router.push('/habits');
    }, 1200);
  }

  return (
    <form className="card auth-card" onSubmit={handleSubmit}>
      <h1>Reset password</h1>
      <p className="muted">Choose a new password for your account.</p>
      <label>
        New password
        <input
          required
          minLength={6}
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </label>
      <button type="submit" disabled={!ready || loading}>{loading ? 'Updating...' : 'Update password'}</button>
      {message ? <p className="status">{message}</p> : null}
    </form>
  );
}
