# Habit Hopper Monorepo

A simple habit tracker built as a monorepo with:

- `apps/web`: Next.js frontend
- `apps/api`: Express backend
- Supabase for authentication and persistence

## Environment

You can place env files in either the app folders or the repo root:

- frontend: `apps/web/.env.local` or repo-root `.env.local`
- backend: `apps/api/.env`

## Running locally

### Frontend

```bash
cd apps/web
npm install
npm run dev
```

### Backend

```bash
cd apps/api
npm install
npm run dev
```

If you want to run the backend directly with modern Node.js, `node src/index.ts` now works too, but `npm run dev` is still the recommended command during development.
