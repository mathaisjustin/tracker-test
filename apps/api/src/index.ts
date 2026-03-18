import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import { createClient, User } from '@supabase/supabase-js';

dotenv.config();

const {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY,
  PORT = '5000',
} = process.env;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing Supabase environment variables.');
}

type HabitType = 'good' | 'bad';

type HabitRow = {
  id: string;
  user_id: string;
  name: string;
  color: string | null;
  type: HabitType;
  unit: string | null;
  base_cost: number | null;
  created_at: string | null;
  is_archived: boolean | null;
  archived_at: string | null;
  daily_limit: number | null;
  current_streak: number | null;
  best_streak: number | null;
  last_entry_date: string | null;
};

type HabitEntryRow = {
  id: string;
  habit_id: string;
  user_id: string;
  quantity: number | null;
  cost: number | null;
  note: string | null;
  created_at: string | null;
  entry_date: string;
};

type HabitPayload = {
  name?: string;
  color?: string | null;
  type?: HabitType;
  unit?: string | null;
  base_cost?: number | null;
  daily_limit?: number | null;
};

type EntryPayload = {
  quantity?: number;
  cost?: number | null;
  note?: string | null;
  entryDate?: string;
};

const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const authSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const app = express();
app.use(cors());
app.use(express.json());

function normalizeNumber(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function daysBetween(dateA: string, dateB: string) {
  const a = new Date(`${dateA}T00:00:00Z`).getTime();
  const b = new Date(`${dateB}T00:00:00Z`).getTime();
  return Math.round((a - b) / 86_400_000);
}

function computeStreaks(entries: HabitEntryRow[]) {
  if (entries.length === 0) {
    return { currentStreak: 0, bestStreak: 0, lastEntryDate: null as string | null };
  }

  const orderedDates = [...new Set(entries.map((entry) => entry.entry_date))].sort();
  let bestStreak = 1;
  let rolling = 1;

  for (let index = 1; index < orderedDates.length; index += 1) {
    if (daysBetween(orderedDates[index], orderedDates[index - 1]) === 1) {
      rolling += 1;
      bestStreak = Math.max(bestStreak, rolling);
    } else {
      rolling = 1;
    }
  }

  let currentStreak = 1;
  for (let index = orderedDates.length - 1; index > 0; index -= 1) {
    if (daysBetween(orderedDates[index], orderedDates[index - 1]) === 1) {
      currentStreak += 1;
    } else {
      break;
    }
  }

  return {
    currentStreak,
    bestStreak,
    lastEntryDate: orderedDates[orderedDates.length - 1],
  };
}

async function refreshHabitStats(habitId: string) {
  const { data: entries, error } = await adminSupabase
    .from('habit_entries')
    .select('*')
    .eq('habit_id', habitId)
    .order('entry_date', { ascending: true });

  if (error) {
    throw error;
  }

  const stats = computeStreaks((entries ?? []) as HabitEntryRow[]);

  const { error: updateError } = await adminSupabase
    .from('habits')
    .update({
      current_streak: stats.currentStreak,
      best_streak: stats.bestStreak,
      last_entry_date: stats.lastEntryDate,
    })
    .eq('id', habitId);

  if (updateError) {
    throw updateError;
  }

  return stats;
}

type AuthenticatedRequest = Request & { user: User };

async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Missing bearer token.' });
  }

  const { data, error } = await authSupabase.auth.getUser(token);

  if (error || !data.user) {
    return res.status(401).json({ error: 'Invalid session token.' });
  }

  (req as AuthenticatedRequest).user = data.user;
  return next();
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/habits', requireAuth, async (req, res) => {
  const user = (req as AuthenticatedRequest).user;

  const { data, error } = await adminSupabase
    .from('habits')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_archived', false)
    .order('created_at', { ascending: false });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.json({ habits: data });
});

app.post('/api/habits', requireAuth, async (req, res) => {
  const user = (req as AuthenticatedRequest).user;
  const payload = req.body as HabitPayload;

  if (!payload.name?.trim()) {
    return res.status(400).json({ error: 'Habit name is required.' });
  }

  const habit = {
    user_id: user.id,
    name: payload.name.trim(),
    color: payload.color || '#6366f1',
    type: payload.type === 'bad' ? 'bad' : 'good',
    unit: payload.unit || 'times',
    base_cost: normalizeNumber(payload.base_cost, 0),
    daily_limit:
      payload.daily_limit === undefined || payload.daily_limit === null
        ? null
        : normalizeNumber(payload.daily_limit, 0),
  };

  const { data, error } = await adminSupabase
    .from('habits')
    .insert(habit)
    .select('*')
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(201).json({ habit: data });
});

app.get('/api/habits/:habitId', requireAuth, async (req, res) => {
  const user = (req as AuthenticatedRequest).user;
  const { habitId } = req.params;

  const { data: habit, error: habitError } = await adminSupabase
    .from('habits')
    .select('*')
    .eq('id', habitId)
    .eq('user_id', user.id)
    .single();

  if (habitError || !habit) {
    return res.status(404).json({ error: 'Habit not found.' });
  }

  const { data: entries, error: entriesError } = await adminSupabase
    .from('habit_entries')
    .select('*')
    .eq('habit_id', habitId)
    .eq('user_id', user.id)
    .order('entry_date', { ascending: false })
    .limit(30);

  if (entriesError) {
    return res.status(500).json({ error: entriesError.message });
  }

  const typedEntries = (entries ?? []) as HabitEntryRow[];
  const totalQuantity = typedEntries.reduce((sum, entry) => sum + Number(entry.quantity ?? 0), 0);
  const totalCost = typedEntries.reduce((sum, entry) => sum + Number(entry.cost ?? 0), 0);

  return res.json({
    habit,
    entries: typedEntries,
    stats: {
      totalEntries: typedEntries.length,
      totalQuantity,
      totalCost,
      currentStreak: habit.current_streak ?? 0,
      bestStreak: habit.best_streak ?? 0,
      lastEntryDate: habit.last_entry_date,
    },
  });
});

app.post('/api/habits/:habitId/entries', requireAuth, async (req, res) => {
  const user = (req as AuthenticatedRequest).user;
  const { habitId } = req.params;
  const payload = req.body as EntryPayload;

  const { data: habit, error: habitError } = await adminSupabase
    .from('habits')
    .select('*')
    .eq('id', habitId)
    .eq('user_id', user.id)
    .single();

  if (habitError || !habit) {
    return res.status(404).json({ error: 'Habit not found.' });
  }

  const quantity = normalizeNumber(payload.quantity, 1);
  const entryDate = payload.entryDate || new Date().toISOString().slice(0, 10);
  const computedCost =
    payload.cost === undefined || payload.cost === null
      ? Number(habit.base_cost ?? 0) * quantity
      : normalizeNumber(payload.cost, 0);

  const { data, error } = await adminSupabase
    .from('habit_entries')
    .upsert(
      {
        habit_id: habitId,
        user_id: user.id,
        quantity,
        cost: computedCost,
        note: payload.note?.trim() || null,
        entry_date: entryDate,
      },
      { onConflict: 'habit_id,user_id,entry_date' },
    )
    .select('*')
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  const stats = await refreshHabitStats(habitId);
  return res.status(201).json({ entry: data, stats });
});

app.delete('/api/habits/:habitId', requireAuth, async (req, res) => {
  const user = (req as AuthenticatedRequest).user;
  const { habitId } = req.params;

  const { error } = await adminSupabase
    .from('habits')
    .delete()
    .eq('id', habitId)
    .eq('user_id', user.id);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(204).send();
});

app.get('/api/stats/global', requireAuth, async (req, res) => {
  const user = (req as AuthenticatedRequest).user;

  const [{ data: habits, error: habitsError }, { data: entries, error: entriesError }] = await Promise.all([
    adminSupabase.from('habits').select('*').eq('user_id', user.id),
    adminSupabase.from('habit_entries').select('*').eq('user_id', user.id),
  ]);

  if (habitsError || entriesError) {
    return res.status(500).json({ error: habitsError?.message || entriesError?.message });
  }

  const typedHabits = (habits ?? []) as HabitRow[];
  const typedEntries = (entries ?? []) as HabitEntryRow[];
  const goodHabits = typedHabits.filter((habit) => habit.type === 'good').length;
  const badHabits = typedHabits.filter((habit) => habit.type === 'bad').length;
  const longestStreak = typedHabits.reduce((best, habit) => Math.max(best, habit.best_streak ?? 0), 0);
  const totalLoggedQuantity = typedEntries.reduce((sum, entry) => sum + Number(entry.quantity ?? 0), 0);
  const totalSpend = typedEntries.reduce((sum, entry) => sum + Number(entry.cost ?? 0), 0);

  return res.json({
    stats: {
      totalHabits: typedHabits.length,
      activeHabits: typedHabits.filter((habit) => !habit.is_archived).length,
      goodHabits,
      badHabits,
      totalEntries: typedEntries.length,
      totalLoggedQuantity,
      totalSpend,
      longestStreak,
    },
  });
});

app.listen(Number(PORT), () => {
  console.log(`Habit tracker API running on http://localhost:${PORT}`);
});
