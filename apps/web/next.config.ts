import { existsSync } from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import type { NextConfig } from 'next';

const envCandidates = [
  path.join(process.cwd(), '.env.local'),
  path.join(process.cwd(), '../../.env.local'),
];

for (const envPath of envCandidates) {
  if (existsSync(envPath)) {
    dotenv.config({ path: envPath, override: false });
  }
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
};

export default nextConfig;
