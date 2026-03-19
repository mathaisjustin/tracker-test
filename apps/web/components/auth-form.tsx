'use client';

import Link from 'next/link';
import { FormEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type Mode = 'login' | 'signup';

type AuthFormProps = {
  mode: Mode;
};

function AuthField({
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  required = true,
}: {
  label: string;
  type?: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <label className="grid gap-3 text-base font-semibold text-white sm:text-lg">
      <span>{label}</span>
      <input
        required={required}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="h-14 rounded-2xl border border-white/10 bg-[#0d0d0d] px-4 text-lg text-[#f7efe5] outline-none transition placeholder:text-[#b49b85] focus:border-[#d0b18d]"
      />
    </label>
  );
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const isSignup = mode === 'signup';
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const ctaLabel = useMemo(() => (isSignup ? 'Create Account' : 'Login'), [isSignup]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage('');

    if (isSignup && password !== confirmPassword) {
      setMessage('Passwords do not match.');
      setLoading(false);
      return;
    }

    const redirectTo = `${window.location.origin}/reset-password`;
    const action = isSignup
      ? supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectTo,
            data: {
              full_name: fullName,
            },
          },
        })
      : supabase.auth.signInWithPassword({ email, password });

    const { error } = await action;

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    if (!isSignup) {
      router.push('/habits');
      router.refresh();
      return;
    }

    setMessage('Account created. Check your email if confirmation is enabled, then sign in.');
    setLoading(false);
  }

  return (
    <div className="w-full">
      <div className="mx-auto w-full rounded-[2rem] border border-white/5 bg-black px-5 py-10 text-[#f7efe5] shadow-[0_0_0_1px_rgba(255,255,255,0.02)] sm:px-8">
        <div className="mx-auto flex w-full max-w-[29rem] flex-col gap-8">
          <div className="space-y-3 px-1 text-center sm:text-left">
            <h1 className="font-serif text-4xl font-semibold tracking-[-0.02em] text-white sm:text-[3rem]">
              {isSignup ? 'Create your account' : 'Login to your account'}
            </h1>
            <p className="text-base text-[#c8b8a5] sm:text-xl">
              {isSignup
                ? 'Fill in the form below to create your account'
                : 'Enter your email below to login to your account'}
            </p>
          </div>

          <form className="grid gap-6" onSubmit={handleSubmit}>
            {isSignup ? (
              <AuthField
                label="Full Name"
                placeholder="Enter Your Full Name"
                value={fullName}
                onChange={setFullName}
              />
            ) : null}

            <AuthField
              label="Email"
              type="email"
              placeholder={isSignup ? 'Enter Your Email' : 'm@example.com'}
              value={email}
              onChange={setEmail}
            />

            <div className="grid gap-3">
              <div className="flex items-center justify-between gap-4">
                <span className="text-base font-semibold text-white sm:text-lg">Password</span>
                {!isSignup ? (
                  <Link href="/forgot-password" className="text-sm font-semibold text-[#f7efe5] underline decoration-[#85705f] underline-offset-4 transition hover:text-white">
                    Forgot your password?
                  </Link>
                ) : null}
              </div>
              <input
                required
                minLength={6}
                type="password"
                value={password}
                placeholder={isSignup ? 'Enter Your Password' : ''}
                onChange={(event) => setPassword(event.target.value)}
                className="h-14 rounded-2xl border border-white/10 bg-[#0d0d0d] px-4 text-lg text-[#f7efe5] outline-none transition placeholder:text-[#b49b85] focus:border-[#d0b18d]"
              />
            </div>

            {isSignup ? (
              <AuthField
                label="Confirm Password"
                type="password"
                placeholder="Confirm Your Password"
                value={confirmPassword}
                onChange={setConfirmPassword}
              />
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 h-14 rounded-2xl bg-[#f3f0ee] px-4 text-xl font-medium text-black transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? 'Working...' : ctaLabel}
            </button>

            {message ? <p className="text-sm font-medium text-[#d0b18d]">{message}</p> : null}
          </form>

          <p className="pt-2 text-center text-lg text-[#c8b8a5]">
            {isSignup ? 'Already have an account?' : "Don't have an account?"}{' '}
            <Link
              href={isSignup ? '/login' : '/signup'}
              className="font-medium text-[#f7efe5] underline decoration-[#85705f] underline-offset-4 transition hover:text-white"
            >
              {isSignup ? 'Sign in' : 'Sign up'}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
