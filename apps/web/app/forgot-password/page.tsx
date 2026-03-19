'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    const redirectTo = `${window.location.origin}/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    setMessage(error ? error.message : 'Password reset email sent.');
    setLoading(false);
  }

  return (
    <form className="card auth-card" onSubmit={handleSubmit}>
      <h1>Forgot password</h1>
      <p className="muted">Enter your email and we will send you a reset link.</p>
      <label>
        Email
        <input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
      </label>
      <button type="submit" disabled={loading}>{loading ? 'Sending...' : 'Send reset link'}</button>
      {message ? <p className="status">{message}</p> : null}
      <Link href="/login">Back to login</Link>
    </form>
  );
}
