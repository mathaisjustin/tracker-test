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
    <div className="w-full rounded-[2rem] border border-white/5 bg-black px-5 py-10 text-[#f7efe5] shadow-[0_0_0_1px_rgba(255,255,255,0.02)] sm:px-8">
      <div className="mx-auto flex w-full max-w-[29rem] flex-col gap-8">
        <div className="space-y-3 px-1 text-center sm:text-left">
          <h1 className="font-serif text-4xl font-semibold tracking-[-0.02em] text-white sm:text-[3rem]">Forgot password</h1>
          <p className="text-base text-[#c8b8a5] sm:text-xl">Enter your email and we will send you a reset link.</p>
        </div>

        <form className="grid gap-6" onSubmit={handleSubmit}>
          <label className="grid gap-3 text-base font-semibold text-white sm:text-lg">
            <span>Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="m@example.com"
              className="h-14 rounded-2xl border border-white/10 bg-[#0d0d0d] px-4 text-lg text-[#f7efe5] outline-none transition placeholder:text-[#b49b85] focus:border-[#d0b18d]"
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="h-14 rounded-2xl bg-[#f3f0ee] px-4 text-xl font-medium text-black transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? 'Sending...' : 'Send reset link'}
          </button>
          {message ? <p className="text-sm font-medium text-[#d0b18d]">{message}</p> : null}
        </form>

        <p className="text-center text-lg text-[#c8b8a5]">
          Remembered it?{' '}
          <Link href="/login" className="font-medium text-[#f7efe5] underline decoration-[#85705f] underline-offset-4 transition hover:text-white">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
