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
    <div className="w-full rounded-[2rem] border border-white/5 bg-black px-5 py-10 text-[#f7efe5] shadow-[0_0_0_1px_rgba(255,255,255,0.02)] sm:px-8">
      <div className="mx-auto flex w-full max-w-[29rem] flex-col gap-8">
        <div className="space-y-3 px-1 text-center sm:text-left">
          <h1 className="font-serif text-4xl font-semibold tracking-[-0.02em] text-white sm:text-[3rem]">Reset password</h1>
          <p className="text-base text-[#c8b8a5] sm:text-xl">Choose a new password for your account.</p>
        </div>

        <form className="grid gap-6" onSubmit={handleSubmit}>
          <label className="grid gap-3 text-base font-semibold text-white sm:text-lg">
            <span>New Password</span>
            <input
              required
              minLength={6}
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter Your Password"
              className="h-14 rounded-2xl border border-white/10 bg-[#0d0d0d] px-4 text-lg text-[#f7efe5] outline-none transition placeholder:text-[#b49b85] focus:border-[#d0b18d]"
            />
          </label>
          <label className="grid gap-3 text-base font-semibold text-white sm:text-lg">
            <span>Confirm Password</span>
            <input
              required
              minLength={6}
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Confirm Your Password"
              className="h-14 rounded-2xl border border-white/10 bg-[#0d0d0d] px-4 text-lg text-[#f7efe5] outline-none transition placeholder:text-[#b49b85] focus:border-[#d0b18d]"
            />
          </label>
          <button
            type="submit"
            disabled={!ready || loading}
            className="h-14 rounded-2xl bg-[#f3f0ee] px-4 text-xl font-medium text-black transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? 'Updating...' : 'Update password'}
          </button>
          {message ? <p className="text-sm font-medium text-[#d0b18d]">{message}</p> : null}
        </form>
      </div>
    </div>
  );
}
