# Habit Hopper Monorepo

A simple habit tracker built as a monorepo with:

- `apps/web`: Next.js frontend
- `apps/api`: Express backend
- Supabase for authentication and persistence

## Environment

Copy the provided examples into real env files if you are starting fresh:

- `apps/web/.env.local`
- `apps/api/.env`

## Scripts

```bash
npm install
npm run dev:web
npm run dev:api
npm run build
```

The frontend expects the API at `http://localhost:5000/api`.
