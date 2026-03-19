# Habit Hopper Monorepo

Habit Hopper is a full-stack habit tracking application built as a small monorepo. It contains:

- a **Next.js 15** frontend in `apps/web`
- an **Express + TypeScript** backend in `apps/api`
- **Supabase** for authentication and persistence

This README is intentionally detailed. It is meant to explain **what every important file does, how the frontend and backend talk to each other, what each route/component/function is responsible for, and how the overall app flow works**.

---

## 1. High-level purpose of the repository

The app helps a signed-in user:

- create habits
- classify habits as `good` or `bad`
- set optional metadata for habits such as color, unit, base cost, and daily limit
- quickly log daily entries for a habit
- inspect a single habit in more detail
- view aggregate/global stats across all of their habits
- manage authentication with email/password, forgot password, and reset password flows

The codebase is split into two applications because each side has a different responsibility:

- the **frontend** handles screens, forms, navigation, and Supabase client auth
- the **backend** protects data access, verifies Supabase bearer tokens, and performs the app's data queries and calculations

---

## 2. Repository structure

```text
.
├── .gitignore
├── README.md
├── package.json
└── apps
    ├── api
    │   ├── .env.example
    │   ├── package.json
    │   ├── tsconfig.json
    │   └── src
    │       └── index.ts
    └── web
        ├── .env.local.example
        ├── next-env.d.ts
        ├── next.config.ts
        ├── package.json
        ├── postcss.config.mjs
        ├── tsconfig.json
        ├── app
        │   ├── globals.css
        │   ├── layout.tsx
        │   ├── page.tsx
        │   ├── login/page.tsx
        │   ├── signup/page.tsx
        │   ├── forgot-password/page.tsx
        │   ├── reset-password/page.tsx
        │   ├── habits/page.tsx
        │   ├── habits/new/page.tsx
        │   ├── habits/[id]/page.tsx
        │   └── stats/page.tsx
        ├── components
        │   ├── auth-form.tsx
        │   ├── global-stats.tsx
        │   ├── habit-detail.tsx
        │   ├── habit-form.tsx
        │   ├── habit-list.tsx
        │   └── shell.tsx
        └── lib
            ├── api.ts
            ├── supabase.ts
            └── types.ts
```

---

## 3. Monorepo/workspace setup

The root `package.json` exists only to define the workspace and provide convenience commands. It does **not** contain the actual app logic.

### Root scripts

- `npm run dev:web` → starts the Next.js frontend workspace
- `npm run dev:api` → starts the Express backend workspace
- `npm run build` → builds the frontend, then builds the backend

### Why workspaces are used

Using npm workspaces lets the repo hold multiple apps under one version-controlled project while still giving each app its own `package.json`, dependencies, and build process.

---

## 4. Environment variables

### 4.1 Frontend env (`apps/web/.env.local` or repo-root `.env.local`)

The frontend expects:

- `NEXT_PUBLIC_API_URL`
  - base URL for the Express API, for example `http://localhost:5000/api`
- `NEXT_PUBLIC_SUPABASE_URL`
  - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - Supabase anon key for browser auth operations

### 4.2 Backend env (`apps/api/.env`)

The backend expects:

- `SUPABASE_URL`
  - Supabase project URL
- `SUPABASE_ANON_KEY`
  - used by the backend to validate incoming bearer tokens with `auth.getUser(token)`
- `SUPABASE_SERVICE_ROLE_KEY`
  - used by the backend for privileged database access
- `DATABASE_URL`
  - currently present in the example, but **not used directly by the code** yet
- `PORT`
  - API port, defaults to `5000`

### 4.3 Why the frontend can use repo-root `.env.local`

`apps/web/next.config.ts` manually loads env files from both:

- `apps/web/.env.local`
- the repo root `.env.local`

This was added to make monorepo local setup more forgiving.

### 4.4 Tracked env examples

The repo includes:

- `apps/web/.env.local.example`
- `apps/api/.env.example`

These are examples only. Real `.env` and `.env.local` files are ignored by Git via `.gitignore`.

---

## 5. Expected Supabase data model

The code is built around two tables:

### `habits`
Used to store the main habit definitions for a user.

Fields used by the app:

- `id`
- `user_id`
- `name`
- `color`
- `type` (`good` or `bad`)
- `unit`
- `base_cost`
- `created_at`
- `is_archived`
- `archived_at`
- `daily_limit`
- `current_streak`
- `best_streak`
- `last_entry_date`

### `habit_entries`
Used to store daily logs for a habit.

Fields used by the app:

- `id`
- `habit_id`
- `user_id`
- `quantity`
- `cost`
- `note`
- `created_at`
- `entry_date`

### Important data assumptions in the code

- a habit belongs to one user
- a habit entry belongs to one user and one habit
- entries are unique per `habit_id + user_id + entry_date`
- streaks are derived from unique logged dates for a habit
- only non-archived habits are shown on the list page

---

## 6. Local development workflow

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

### From repo root

```bash
npm run dev:web
npm run dev:api
```

### Recommended startup order

1. start the backend on port `5000`
2. start the frontend
3. open the frontend URL shown by Next.js
4. create an account or log in
5. create habits and log entries

---

## 7. End-to-end application flow

This is the most important conceptual section in the repo.

### 7.1 Authentication flow

1. The user opens `/login` or `/signup`.
2. The frontend uses the browser Supabase client from `apps/web/lib/supabase.ts`.
3. On login, the frontend calls `supabase.auth.signInWithPassword`.
4. On signup, the frontend calls `supabase.auth.signUp` and stores `full_name` in the user metadata.
5. Once authenticated, Supabase stores a session in the browser.
6. Any frontend API call goes through `apiFetch`.
7. `apiFetch` asks Supabase for the current session.
8. `apiFetch` attaches `Authorization: Bearer <access_token>` to the backend request.
9. The backend middleware `requireAuth` validates that token with Supabase.
10. If valid, the backend extracts the user and uses the user id to scope database operations.

### 7.2 Protected app flow

1. The `Shell` component checks whether the user has a session.
2. If the user is not authenticated and tries to open a protected route, `Shell` redirects to `/login`.
3. If the user is authenticated and lands on `/`, `/login`, or `/signup`, `Shell` redirects to `/habits`.
4. Protected pages then fetch or mutate data through the Express API.

### 7.3 Habit creation flow

1. User opens `/habits/new`.
2. `HabitForm` collects name, color, type, unit, base cost, and daily limit.
3. `HabitForm` POSTs to `/api/habits`.
4. The backend validates the request, inserts the record, and returns the new habit.
5. The frontend redirects back to `/habits`.

### 7.4 Quick log flow from the list page

1. User presses `+1 entry` on a habit card.
2. `HabitList` POSTs `{ quantity: 1 }` to `/api/habits/:habitId/entries`.
3. The backend upserts today's entry for that user and habit.
4. The backend recalculates streaks with `refreshHabitStats`.
5. The frontend reloads the habit list.

### 7.5 Detailed habit logging flow

1. User opens `/habits/:id`.
2. `HabitDetail` fetches the habit, its recent entries, and server-computed stats.
3. User can submit quantity, optional cost override, optional note, and entry date.
4. Backend upserts the entry for that date.
5. Backend recomputes streak metadata and saves it back on the habit.
6. Frontend reloads the detail view.

### 7.6 Global stats flow

1. User opens `/stats`.
2. `GlobalStats` fetches `/api/stats/global`.
3. Backend reads all habits and entries for the current user.
4. Backend calculates totals such as total habits, good vs bad habits, quantity logged, spend, and longest streak.
5. Frontend renders a summary grid.

---

## 8. Backend deep dive (`apps/api`)

The backend is a single-file Express service right now. That means all startup logic, middleware, type declarations, helper functions, and routes live in `apps/api/src/index.ts`.

### 8.1 `apps/api/package.json`

Purpose:

- defines the backend package name `@habit-tracker/api`
- opts into ESM with `"type": "module"`
- provides three scripts:
  - `dev` → uses `tsx watch src/index.ts`
  - `build` → compiles TypeScript to `dist`
  - `start` → runs the compiled server

Dependencies:

- `express` for the API server
- `cors` to allow frontend requests
- `dotenv` to load env variables
- `@supabase/supabase-js` for auth verification and data access

Dev dependencies:

- TypeScript and typings
- `tsx` for local TypeScript execution in dev

### 8.2 `apps/api/tsconfig.json`

Purpose:

- compiles the backend as a Node-friendly ESM project
- emits compiled output into `dist`
- uses `src` as the source root
- keeps strict typing enabled

### 8.3 `apps/api/.env.example`

Purpose:

- documents the backend env variables required to run the server locally
- acts as a copy template for `apps/api/.env`

### 8.4 `apps/api/src/index.ts`

This is the actual backend application.

#### Imports and startup

- loads `cors`, `dotenv`, `express`, and Supabase
- calls `dotenv.config()` immediately
- reads env vars from `process.env`
- throws early if the required Supabase env vars are missing

#### Runtime types declared in the file

The file defines local TypeScript shapes for:

- `HabitType`
- `HabitRow`
- `HabitEntryRow`
- `HabitPayload`
- `EntryPayload`
- `AuthenticatedRequest`

These are not database migrations. They are local TypeScript contracts used by the server.

#### Supabase clients

Two different Supabase clients are created:

1. `adminSupabase`
   - created with the **service role key**
   - used for database reads/writes
   - does not persist session state

2. `authSupabase`
   - created with the **anon key**
   - used only to validate incoming access tokens
   - also does not persist session state

#### Express app setup

- `app.use(cors())`
- `app.use(express.json())`

This means:

- the API accepts cross-origin requests
- JSON request bodies are automatically parsed

### 8.5 Helper functions in the backend

#### `normalizeNumber(value, fallback)`

Purpose:

- safely converts unknown values into numbers
- falls back when a value is invalid

Used for:

- `base_cost`
- `daily_limit`
- `quantity`
- cost override normalization

#### `daysBetween(dateA, dateB)`

Purpose:

- compares two ISO date strings at midnight UTC
- returns the day difference between them

Used by:

- `computeStreaks`

#### `computeStreaks(entries)`

Purpose:

- calculates streak metadata from a habit's entry dates

What it does:

- extracts unique `entry_date` values
- sorts them chronologically
- computes:
  - `currentStreak`
  - `bestStreak`
  - `lastEntryDate`

Important behavior:

- if there are no entries, it returns zero streaks and `null` for the last entry date
- multiple entries on the same date do not inflate the streak because dates are deduplicated first

#### `refreshHabitStats(habitId)`

Purpose:

- recalculates the streak metadata for one habit
- saves the new values back into the `habits` table

What it does:

1. reads all entries for the habit
2. runs `computeStreaks`
3. updates the habit row with:
   - `current_streak`
   - `best_streak`
   - `last_entry_date`
4. returns the computed stats

### 8.6 Authentication middleware

#### `requireAuth(req, res, next)`

Purpose:

- protects all habit/stat routes
- verifies the Supabase access token from the browser session

What it expects:

- `Authorization: Bearer <token>`

What it does:

1. parses the bearer token
2. returns `401` if the token is missing
3. calls `authSupabase.auth.getUser(token)`
4. returns `401` if the token is invalid
5. stores the authenticated user on `req`
6. calls `next()`

This is the main security boundary for the API.

### 8.7 API routes

#### `GET /api/health`

Purpose:

- lightweight health endpoint
- returns `{ ok: true }`

No auth required.

#### `GET /api/habits`

Purpose:

- returns the current user's non-archived habits

Behavior:

- requires auth
- filters by `user_id`
- filters by `is_archived = false`
- orders by newest created first

Response shape:

```json
{ "habits": [...] }
```

#### `POST /api/habits`

Purpose:

- creates a new habit for the current user

Expected payload:

```json
{
  "name": "Drink water",
  "color": "#6366f1",
  "type": "good",
  "unit": "glasses",
  "base_cost": 0,
  "daily_limit": 8
}
```

Behavior:

- requires auth
- validates `name`
- normalizes numeric fields
- supplies defaults for missing optional values

Response shape:

```json
{ "habit": { ... } }
```

#### `GET /api/habits/:habitId`

Purpose:

- returns one habit plus recent entries plus summary stats for that habit

Behavior:

- requires auth
- verifies the habit belongs to the current user
- loads up to 30 recent entries ordered by date descending
- computes `totalEntries`, `totalQuantity`, and `totalCost`
- returns current streak metadata from the habit row

Response shape:

```json
{
  "habit": { ... },
  "entries": [...],
  "stats": {
    "totalEntries": 0,
    "totalQuantity": 0,
    "totalCost": 0,
    "currentStreak": 0,
    "bestStreak": 0,
    "lastEntryDate": null
  }
}
```

#### `POST /api/habits/:habitId/entries`

Purpose:

- creates or updates a daily log entry for a habit

Expected payload:

```json
{
  "quantity": 1,
  "cost": 2.5,
  "note": "Felt good",
  "entryDate": "2026-03-19"
}
```

Behavior:

- requires auth
- verifies the habit belongs to the current user
- defaults `quantity` to `1`
- defaults `entryDate` to today if not provided
- if `cost` is missing, derives cost as `base_cost * quantity`
- uses `upsert` with conflict target `habit_id,user_id,entry_date`
- recalculates streaks after the upsert

This is why logging the same habit/date again overwrites that day's row instead of creating duplicates.

#### `DELETE /api/habits/:habitId`

Purpose:

- deletes a habit owned by the current user

Behavior:

- requires auth
- deletes by `id` and `user_id`
- returns `204 No Content`

#### `GET /api/stats/global`

Purpose:

- returns aggregate stats across all habits and entries for the current user

Current metrics returned:

- `totalHabits`
- `activeHabits`
- `goodHabits`
- `badHabits`
- `totalEntries`
- `totalLoggedQuantity`
- `totalSpend`
- `longestStreak`

### 8.8 Backend design tradeoffs / current limitations

Important to know:

- the backend is currently a **single file**, which is simple but will become harder to maintain as the app grows
- there is no input schema validation library like Zod or Joi yet
- there is no explicit error logging/middleware beyond route-level handling
- there is no pagination yet for habits or entries
- archived habits are filtered on the list page, but there is no archive/unarchive route yet
- `DATABASE_URL` exists in env examples but is not used directly

---

## 9. Frontend deep dive (`apps/web`)

The frontend uses the Next.js App Router.

### 9.1 `apps/web/package.json`

Purpose:

- defines the frontend package `@habit-tracker/web`
- provides scripts:
  - `dev`
  - `build`
  - `start`

Dependencies:

- `next`
- `react`
- `react-dom`
- `@supabase/supabase-js`
- `dotenv`

Dev dependencies:

- Tailwind v4 + PostCSS integration
- TypeScript and React/Node type definitions

### 9.2 `apps/web/tsconfig.json`

Purpose:

- configures TypeScript for Next.js
- enables the `@/*` path alias relative to `apps/web`

Example alias:

- `@/components/auth-form`
- `@/lib/api`

### 9.3 `apps/web/next.config.ts`

Purpose:

- enables `reactStrictMode`
- loads `.env.local` from the frontend folder and optionally the repo root

### 9.4 `apps/web/postcss.config.mjs`

Purpose:

- enables Tailwind's PostCSS plugin for the frontend build

### 9.5 `apps/web/next-env.d.ts`

Purpose:

- standard Next.js generated TypeScript typing file

### 9.6 `apps/web/app/globals.css`

Purpose:

- imports Tailwind
- also contains the legacy/global class-based styling used by the non-auth pages

Important note:

The repo currently uses a **hybrid styling approach**:

- auth screens use Tailwind utility classes heavily
- habit pages still rely on global CSS classes such as `card`, `stack-lg`, `status`, `ghost`, and `stats-grid`

This is useful to know if you plan to continue migrating the rest of the UI to Tailwind later.

---

## 10. Frontend utility layer (`apps/web/lib`)

### 10.1 `apps/web/lib/supabase.ts`

Purpose:

- creates the browser-side Supabase client used throughout the frontend

Behavior:

- reads `NEXT_PUBLIC_SUPABASE_URL`
- reads `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- throws a helpful error if either one is missing

This file is the frontend entry point for all Supabase auth actions.

### 10.2 `apps/web/lib/api.ts`

Purpose:

- central helper for calling the backend API

What it does:

1. gets the current Supabase session
2. extracts the access token
3. sends requests to `NEXT_PUBLIC_API_URL + path`
4. attaches the `Authorization` header if a token exists
5. sets `Content-Type: application/json`
6. throws a JavaScript error for any non-OK response
7. returns `undefined` for `204` responses
8. otherwise returns parsed JSON

This function is why frontend components do not manually repeat token-fetching code.

### 10.3 `apps/web/lib/types.ts`

Purpose:

- defines frontend TypeScript types for:
  - `Habit`
  - `HabitEntry`

These types mirror the API/database shape used by the UI components.

---

## 11. Frontend layout and route shell

### 11.1 `apps/web/app/layout.tsx`

Purpose:

- global app layout for the entire frontend
- imports `globals.css`
- defines the app metadata
- wraps all pages inside `Shell`

### 11.2 `apps/web/components/shell.tsx`

This is the top-level client-side route guard and wrapper.

#### What `Shell` is responsible for

- checking the current Supabase session
- listening for auth state changes
- redirecting unauthenticated users away from protected routes
- redirecting authenticated users away from public auth pages
- rendering a special dark auth layout for auth pages
- rendering the normal app shell/header for authenticated app pages
- handling logout

#### Route groups in practice

Auth routes:

- `/login`
- `/signup`
- `/forgot-password`
- `/reset-password`

Protected routes:

- `/habits`
- `/habits/new`
- `/habits/[id]`
- `/stats`

#### Why this matters

Because the route protection is client-side inside `Shell`, there is **no server-side auth enforcement in Next.js itself**. The true data protection is still on the backend via `requireAuth`.

---

## 12. Frontend pages and what each one does

### 12.1 `apps/web/app/page.tsx`

Purpose:

- redirects the root route `/` to `/login`

### 12.2 `apps/web/app/login/page.tsx`

Purpose:

- renders `AuthForm` in login mode

### 12.3 `apps/web/app/signup/page.tsx`

Purpose:

- renders `AuthForm` in signup mode

### 12.4 `apps/web/app/forgot-password/page.tsx`

Purpose:

- lets a user request a Supabase password reset email

Flow:

1. user enters email
2. frontend calls `supabase.auth.resetPasswordForEmail`
3. uses `/reset-password` as the redirect target
4. displays success or error feedback inline

### 12.5 `apps/web/app/reset-password/page.tsx`

Purpose:

- lets a user set a new password after opening the reset link

Flow:

1. page reads the `code` query param from the URL
2. if present, it exchanges the code for a session
3. user enters new password + confirm password
4. frontend validates both passwords match
5. calls `supabase.auth.updateUser({ password })`
6. on success, redirects to `/habits`

### 12.6 `apps/web/app/habits/page.tsx`

Purpose:

- renders the habit list screen using `HabitList`

### 12.7 `apps/web/app/habits/new/page.tsx`

Purpose:

- renders the create-habit screen using `HabitForm`

### 12.8 `apps/web/app/habits/[id]/page.tsx`

Purpose:

- renders the detail page for one habit using `HabitDetail`

Important detail:

- because this is App Router in modern Next.js, `params` is handled asynchronously and then passed into the detail component

### 12.9 `apps/web/app/stats/page.tsx`

Purpose:

- renders the global stats screen using `GlobalStats`

---

## 13. Frontend components and what each one does

### 13.1 `apps/web/components/auth-form.tsx`

This is the main shared login/signup component.

#### Shared behavior

- supports two modes: `login` and `signup`
- shows a dark, mobile-first auth card
- collects form input with controlled React state
- shows inline status/error messages

#### Login mode

Fields:

- email
- password

Actions:

- calls `supabase.auth.signInWithPassword`
- on success redirects to `/habits`

#### Signup mode

Fields:

- full name
- email
- password
- confirm password

Actions:

- validates matching passwords client-side
- calls `supabase.auth.signUp`
- passes `full_name` into Supabase user metadata
- shows a success message telling the user to check email/sign in

#### Design note

Google and GitHub buttons were intentionally omitted from the current UI.

### 13.2 `apps/web/components/habit-list.tsx`

Purpose:

- fetches and displays the current user's habits
- supports two inline actions:
  - quick `+1 entry`
  - delete habit

Key functions:

- `loadHabits()` → GET `/habits`
- `logHabit(habitId)` → POST `/habits/:habitId/entries`
- `deleteHabit(habitId)` → DELETE `/habits/:habitId`

State it manages:

- `habits`
- `message`
- `loading`
- `busyId`

### 13.3 `apps/web/components/habit-form.tsx`

Purpose:

- renders the create habit form
- sends the create request to the backend

Fields it manages:

- name
- color
- type
- unit
- base cost
- daily limit

Behavior:

- POSTs to `/habits`
- redirects back to `/habits` on success

### 13.4 `apps/web/components/habit-detail.tsx`

Purpose:

- renders one habit's metadata, stats, logging form, and recent entries

Key functions:

- `loadHabit()` → GET `/habits/:habitId`
- `handleSubmit()` → POST `/habits/:habitId/entries`

State it manages:

- fetched habit data
- quantity
- cost override
- note
- entry date
- loading/submitting state
- feedback message

What it displays:

- habit name and type
- streak stats
- total quantity and total cost
- log entry form
- recent entry history

### 13.5 `apps/web/components/global-stats.tsx`

Purpose:

- loads and displays `/stats/global`

Behavior:

- fetches once on mount
- shows a loading state until data or error arrives
- displays aggregated summary cards

### 13.6 `apps/web/components/shell.tsx`

Already described in section 11, but from a component perspective it is the app-wide controller for:

- auth state
- redirects
- auth screen framing
- logged-in navigation
- logout

---

## 14. Current screens in the product

The current user-visible screens are:

1. **Login**
2. **Signup**
3. **Forgot password**
4. **Reset password**
5. **Habit list**
6. **Create habit**
7. **Habit detail**
8. **Global stats**

### What a user can currently do

- sign up with email + password
- log in with email + password
- request a password reset
- reset their password
- view a list of their habits
- create a habit
- delete a habit
- log a quick `+1` entry from the list page
- open a habit detail page
- submit detailed habit entries from the detail page
- view aggregate stats
- log out

### What a user cannot currently do yet

- edit an existing habit
- archive/unarchive habits via the UI
- browse archived habits
- use Google auth
- use GitHub auth
- view charts/graphs
- paginate large entry lists
- filter/sort habits beyond the built-in query order

---

## 15. API contract summary for the frontend

The frontend depends on these backend contracts.

### `GET /api/habits`
Returns:

```json
{ "habits": Habit[] }
```

### `POST /api/habits`
Returns:

```json
{ "habit": Habit }
```

### `GET /api/habits/:habitId`
Returns:

```json
{
  "habit": Habit,
  "entries": HabitEntry[],
  "stats": {
    "totalEntries": number,
    "totalQuantity": number,
    "totalCost": number,
    "currentStreak": number,
    "bestStreak": number,
    "lastEntryDate": string | null
  }
}
```

### `POST /api/habits/:habitId/entries`
Returns:

```json
{
  "entry": HabitEntry,
  "stats": {
    "currentStreak": number,
    "bestStreak": number,
    "lastEntryDate": string | null
  }
}
```

### `DELETE /api/habits/:habitId`
Returns:

- `204 No Content`

### `GET /api/stats/global`
Returns:

```json
{
  "stats": {
    "totalHabits": number,
    "activeHabits": number,
    "goodHabits": number,
    "badHabits": number,
    "totalEntries": number,
    "totalLoggedQuantity": number,
    "totalSpend": number,
    "longestStreak": number
  }
}
```

---

## 16. Styling approach

The styling is currently mixed:

### Tailwind-driven areas

- login
- signup
- forgot password
- reset password
- auth page wrapper in `Shell`

### Global CSS-driven areas

- habit list
- habit form
- habit detail
- global stats
- non-auth app shell layout

### Why this matters for future work

If you continue UI work, you will probably want to choose one of these paths:

1. fully migrate the non-auth screens to Tailwind
2. keep a hybrid approach
3. refactor shared reusable UI primitives like cards, buttons, headings, and inputs

---

## 17. Security and data-access model

### What protects the data

The main protection is on the backend:

- every data route uses `requireAuth`
- every query is scoped by `user.id`
- the service-role client is never exposed to the frontend

### What the frontend is allowed to know

The frontend only gets:

- public Supabase project URL
- anon key
- user session token stored by Supabase in the browser

### Why the service role stays on the backend

The service role key bypasses many normal restrictions. It must never be exposed in client-side code.

---

## 18. Important implementation details and caveats

These are subtle but important if you are maintaining the repo.

### 18.1 Streaks are persisted, not only derived in memory

After logging an entry, the backend writes streak fields back onto the habit row:

- `current_streak`
- `best_streak`
- `last_entry_date`

This makes the habit list fast to render because it can read those values directly.

### 18.2 Entry logging is an upsert, not a pure insert

Logging a habit for the same date again replaces that day's existing row for the same habit/user.

### 18.3 Reset password depends on Supabase redirect flow

The frontend expects Supabase to redirect back to `/reset-password`, optionally with a `code` query param that can be exchanged for a session.

### 18.4 Route protection is split across frontend and backend

- frontend `Shell` controls navigation UX
- backend `requireAuth` protects actual data access

### 18.5 Some fields are optional throughout the system

Optional values appear in both the DB model and UI:

- `color`
- `unit`
- `base_cost`
- `daily_limit`
- `cost`
- `note`
- `last_entry_date`

### 18.6 There is no dedicated state management library

The frontend relies on:

- local component state
- `useEffect`
- manual re-fetching after mutations

No Redux, Zustand, React Query, or server actions are used yet.

---

## 19. File-by-file quick reference

If you want a fast mental map of the repo, use this checklist.

### Root

- `.gitignore` → ignores runtime/build/env artifacts
- `package.json` → npm workspace root with convenience scripts
- `README.md` → this documentation file

### Backend

- `apps/api/.env.example` → backend env template
- `apps/api/package.json` → backend scripts + dependencies
- `apps/api/tsconfig.json` → backend TS config
- `apps/api/src/index.ts` → the entire API server

### Frontend config

- `apps/web/.env.local.example` → frontend env template
- `apps/web/next-env.d.ts` → Next.js TS helper file
- `apps/web/next.config.ts` → Next config + env loading
- `apps/web/package.json` → frontend scripts + dependencies
- `apps/web/postcss.config.mjs` → Tailwind PostCSS config
- `apps/web/tsconfig.json` → frontend TS config + path alias
- `apps/web/app/globals.css` → Tailwind import + global styles

### Frontend app routes

- `apps/web/app/layout.tsx` → global layout
- `apps/web/app/page.tsx` → redirects `/` to `/login`
- `apps/web/app/login/page.tsx` → login route
- `apps/web/app/signup/page.tsx` → signup route
- `apps/web/app/forgot-password/page.tsx` → forgot password route
- `apps/web/app/reset-password/page.tsx` → reset password route
- `apps/web/app/habits/page.tsx` → habit list page
- `apps/web/app/habits/new/page.tsx` → create habit page
- `apps/web/app/habits/[id]/page.tsx` → habit detail page
- `apps/web/app/stats/page.tsx` → global stats page

### Frontend components

- `apps/web/components/auth-form.tsx` → shared login/signup form
- `apps/web/components/global-stats.tsx` → global stats UI
- `apps/web/components/habit-detail.tsx` → habit detail UI
- `apps/web/components/habit-form.tsx` → create habit UI
- `apps/web/components/habit-list.tsx` → list + quick actions UI
- `apps/web/components/shell.tsx` → auth guard + top-level wrapper

### Frontend utilities

- `apps/web/lib/api.ts` → backend fetch helper with auth token forwarding
- `apps/web/lib/supabase.ts` → browser Supabase client
- `apps/web/lib/types.ts` → shared frontend types

---

## 20. Best next steps if you keep developing this repo

Recommended future improvements:

1. split backend routes/services into separate files
2. add validation with Zod or similar
3. add edit/archive endpoints and UI
4. migrate all remaining screens to Tailwind for consistency
5. add tests for:
   - backend helper functions
   - API routes
   - auth form behavior
6. add loading/error toasts or a reusable notification system
7. add charts and better analytics for the stats pages
8. add stronger form validation and field-specific errors
9. add optimistic UI or React Query/SWR for better data fetching patterns
10. document the actual SQL schema in a dedicated `docs/` folder if the repo grows further

---

## 21. Short mental model of the repo

If you want the shortest possible summary after reading everything above, it is this:

- **Next.js** handles screens and browser auth
- **Supabase browser auth** gives the frontend a session token
- **`apiFetch`** sends that token to the backend
- **Express** verifies the token and talks to Supabase tables using the service role key
- **habit creation and entry logging** happen through the backend API
- **streaks and aggregate stats** are computed on the backend
- **the frontend** renders the returned data into list/detail/stats screens

That is the core architecture of Habit Hopper.
