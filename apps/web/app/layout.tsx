import type { ReactNode } from 'react';
import './globals.css';
import type { Metadata } from 'next';
import { Shell } from '@/components/shell';

export const metadata: Metadata = {
  title: 'Habit Hopper',
  description: 'A simple habit tracking app with Supabase auth and stats.',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
