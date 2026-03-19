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

type ProgressSnapshot = {
  current: number;
  limit: number | null;
  percentage: number | null;
  text: string | null;
  goalMet: boolean;
};

type CalendarDay = {
  date: string;
  day: number;
  quantity: number;
  cost: number;
  completionPercent: number;
  intensity: number;
  hasEntry: boolean;
  goalMet: boolean;
};

type HeatmapWeek = {
  label: string;
  days: CalendarDay[];
};

type AuthenticatedRequest = Request & { user: User };

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

function clamp(value: number, min = 0, max = 1) {
  return Math.min(Math.max(value, min), max);
}

function round(value: number, decimals = 2) {
  const power = 10 ** decimals;
  return Math.round(value * power) / power;
}

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function monthKeyFromDate(date = todayString()) {
  return date.slice(0, 7);
}

function monthLabelFromKey(monthKey: string) {
  const [year, month] = monthKey.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('en-US', {
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function startOfMonth(monthKey: string) {
  return `${monthKey}-01`;
}

function endOfMonth(monthKey: string) {
  const [year, month] = monthKey.split('-').map(Number);
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
}

function addDays(date: string, amount: number) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + amount);
  return value.toISOString().slice(0, 10);
}

function startOfWeekMonday(date: string) {
  const value = new Date(`${date}T00:00:00Z`);
  const day = value.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  value.setUTCDate(value.getUTCDate() + diff);
  return value.toISOString().slice(0, 10);
}

function enumerateDates(start: string, end: string) {
  const dates: string[] = [];
  for (let cursor = start; cursor <= end; cursor = addDays(cursor, 1)) {
    dates.push(cursor);
  }
  return dates;
}

function daysBetween(dateA: string, dateB: string) {
  const a = new Date(`${dateA}T00:00:00Z`).getTime();
  const b = new Date(`${dateB}T00:00:00Z`).getTime();
  return Math.round((a - b) / 86_400_000);
}

function toEntryMap(entries: HabitEntryRow[]) {
  const map = new Map<string, HabitEntryRow>();
  for (const entry of entries) {
    map.set(entry.entry_date, entry);
  }
  return map;
}

function completionRatio(habit: Pick<HabitRow, 'type' | 'daily_limit'>, quantity: number) {
  if (habit.daily_limit !== null && habit.daily_limit !== undefined && Number(habit.daily_limit) > 0) {
    const limit = Number(habit.daily_limit);
    if (habit.type === 'good') {
      return clamp(quantity / limit);
    }
    return clamp((limit - quantity) / limit);
  }

  return quantity > 0 ? 1 : 0;
}

function goalMet(habit: Pick<HabitRow, 'type' | 'daily_limit'>, quantity: number) {
  if (habit.daily_limit !== null && habit.daily_limit !== undefined && Number(habit.daily_limit) > 0) {
    const limit = Number(habit.daily_limit);
    return habit.type === 'good' ? quantity >= limit : quantity <= limit;
  }

  return quantity > 0;
}

function intensityFromPercent(percent: number) {
  if (percent <= 0) return 0;
  if (percent < 25) return 1;
  if (percent < 50) return 2;
  if (percent < 75) return 3;
  return 4;
}

function buildProgressSnapshot(habit: HabitRow, entry: HabitEntryRow | null): ProgressSnapshot {
  const current = Number(entry?.quantity ?? 0);
  const limit = habit.daily_limit === null || habit.daily_limit === undefined ? null : Number(habit.daily_limit);
  const percentage = limit && limit > 0 ? Math.min(round((current / limit) * 100), 999) : null;

  return {
    current,
    limit,
    percentage,
    text: limit && limit > 0 ? `${round(current, 2)}/${round(limit, 2)}` : null,
    goalMet: goalMet(habit, current),
  };
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

function buildCalendarDays(habit: HabitRow, entries: HabitEntryRow[], monthKey = monthKeyFromDate()) {
  const dates = enumerateDates(startOfMonth(monthKey), endOfMonth(monthKey));
  const entryMap = toEntryMap(entries);

  return dates.map((date) => {
    const entry = entryMap.get(date) ?? null;
    const quantity = Number(entry?.quantity ?? 0);
    const cost = Number(entry?.cost ?? 0);
    const percent = round(completionRatio(habit, quantity) * 100);

    return {
      date,
      day: Number(date.slice(-2)),
      quantity,
      cost,
      completionPercent: percent,
      intensity: intensityFromPercent(percent),
      hasEntry: Boolean(entry),
      goalMet: goalMet(habit, quantity),
    } satisfies CalendarDay;
  });
}

function buildHeatmapWeeks(habit: HabitRow, entries: HabitEntryRow[], numberOfWeeks = 10) {
  const end = todayString();
  const start = startOfWeekMonday(addDays(end, -(numberOfWeeks * 7 - 1)));
  const dates = enumerateDates(start, addDays(start, numberOfWeeks * 7 - 1));
  const entryMap = toEntryMap(entries);

  const days = dates.map((date) => {
    const entry = entryMap.get(date) ?? null;
    const quantity = Number(entry?.quantity ?? 0);
    const cost = Number(entry?.cost ?? 0);
    const percent = round(completionRatio(habit, quantity) * 100);

    return {
      date,
      day: Number(date.slice(-2)),
      quantity,
      cost,
      completionPercent: percent,
      intensity: intensityFromPercent(percent),
      hasEntry: Boolean(entry),
      goalMet: goalMet(habit, quantity),
    } satisfies CalendarDay;
  });

  const weeks: HeatmapWeek[] = [];
  for (let index = 0; index < days.length; index += 7) {
    const slice = days.slice(index, index + 7);
    weeks.push({
      label: slice[0]?.date ?? `week-${index / 7 + 1}`,
      days: slice,
    });
  }

  return weeks;
}

function buildHabitMonthlyBreakdown(habit: HabitRow, days: CalendarDay[]) {
  const totalDays = Math.max(days.length, 1);
  const totalEntries = days.filter((day) => day.hasEntry).length;
  const goalDays = days.filter((day) => day.goalMet).length;
  const completionRate = round(days.reduce((sum, day) => sum + day.completionPercent, 0) / totalDays);
  const averageQuantity = round(days.reduce((sum, day) => sum + day.quantity, 0) / totalDays);
  const totalCost = round(days.reduce((sum, day) => sum + day.cost, 0), 2);

  const rows = [
    {
      label: 'Completion rate',
      percentage: completionRate,
      value: `${completionRate}%`,
      tone: completionRate >= 75 ? 'good' : completionRate >= 40 ? 'warn' : 'danger',
    },
    {
      label: 'Goal days',
      percentage: round((goalDays / totalDays) * 100),
      value: `${goalDays}/${totalDays}`,
      tone: 'good',
    },
    {
      label: 'Days logged',
      percentage: round((totalEntries / totalDays) * 100),
      value: `${totalEntries} days`,
      tone: 'neutral',
    },
    {
      label: `Average ${habit.unit ?? 'quantity'}`,
      percentage:
        habit.daily_limit && Number(habit.daily_limit) > 0
          ? round(clamp(averageQuantity / Number(habit.daily_limit)) * 100)
          : Math.min(round(averageQuantity * 10), 100),
      value: `${round(averageQuantity, 2)} ${habit.unit ?? 'times'}`,
      tone: 'accent',
    },
    {
      label: 'Total cost',
      percentage: totalCost === 0 ? 0 : Math.min(round(totalCost), 100),
      value: `$${totalCost.toFixed(2)}`,
      tone: 'neutral',
    },
  ];

  return rows;
}

function buildHabitSummary(habit: HabitRow, entries: HabitEntryRow[], monthDays: CalendarDay[], todayEntry: HabitEntryRow | null) {
  const totalEntries = entries.length;
  const totalQuantity = round(entries.reduce((sum, entry) => sum + Number(entry.quantity ?? 0), 0));
  const totalCost = round(entries.reduce((sum, entry) => sum + Number(entry.cost ?? 0), 0), 2);
  const completionRate = round(
    monthDays.reduce((sum, day) => sum + day.completionPercent, 0) / Math.max(monthDays.length, 1),
  );
  const goalDays = monthDays.filter((day) => day.goalMet).length;

  return {
    currentStreak: habit.current_streak ?? 0,
    bestStreak: habit.best_streak ?? 0,
    lastEntryDate: habit.last_entry_date,
    totalEntries,
    totalQuantity,
    totalCost,
    completionRate,
    goalDays,
    activeDays: monthDays.filter((day) => day.hasEntry).length,
    currentCost: Number(todayEntry?.cost ?? 0),
    currentQuantity: Number(todayEntry?.quantity ?? 0),
  };
}

function deriveStreakStatus(habit: HabitRow) {
  if ((habit.current_streak ?? 0) > 0) {
    return 'active';
  }

  if (!habit.last_entry_date) {
    return 'idle';
  }

  const gap = daysBetween(todayString(), habit.last_entry_date);
  if (gap <= 2) {
    return 'at-risk';
  }

  return 'cooling';
}

function weekdayShortLabel(date: string) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', {
    weekday: 'short',
    timeZone: 'UTC',
  });
}

function weekdayLongLabelFromIndex(index: number) {
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][index] ?? '—';
}

function buildGlobalCalendar(habits: HabitRow[], entriesByHabitId: Map<string, HabitEntryRow[]>, monthKey = monthKeyFromDate()) {
  const dates = enumerateDates(startOfMonth(monthKey), endOfMonth(monthKey));

  return dates.map((date) => {
    const quantities = habits.map((habit) => {
      const entry = (entriesByHabitId.get(habit.id) ?? []).find((value) => value.entry_date === date) ?? null;
      return {
        habit,
        quantity: Number(entry?.quantity ?? 0),
        cost: Number(entry?.cost ?? 0),
        hasEntry: Boolean(entry),
      };
    });

    const averageCompletion =
      habits.length === 0
        ? 0
        : round(
            quantities.reduce((sum, item) => sum + completionRatio(item.habit, item.quantity) * 100, 0) / habits.length,
          );

    return {
      date,
      day: Number(date.slice(-2)),
      quantity: round(quantities.reduce((sum, item) => sum + item.quantity, 0)),
      cost: round(quantities.reduce((sum, item) => sum + item.cost, 0), 2),
      completionPercent: averageCompletion,
      intensity: intensityFromPercent(averageCompletion),
      hasEntry: quantities.some((item) => item.hasEntry),
      goalMet: quantities.every((item) => goalMet(item.habit, item.quantity)),
    } satisfies CalendarDay;
  });
}

function buildGlobalHeatmap(habits: HabitRow[], entriesByHabitId: Map<string, HabitEntryRow[]>, numberOfWeeks = 10) {
  const end = todayString();
  const start = startOfWeekMonday(addDays(end, -(numberOfWeeks * 7 - 1)));
  const dates = enumerateDates(start, addDays(start, numberOfWeeks * 7 - 1));

  const days = dates.map((date) => {
    const completionPercent =
      habits.length === 0
        ? 0
        : round(
            habits.reduce((sum, habit) => {
              const entry = (entriesByHabitId.get(habit.id) ?? []).find((value) => value.entry_date === date) ?? null;
              return sum + completionRatio(habit, Number(entry?.quantity ?? 0)) * 100;
            }, 0) / habits.length,
          );

    const quantity = round(
      habits.reduce((sum, habit) => {
        const entry = (entriesByHabitId.get(habit.id) ?? []).find((value) => value.entry_date === date) ?? null;
        return sum + Number(entry?.quantity ?? 0);
      }, 0),
    );

    const cost = round(
      habits.reduce((sum, habit) => {
        const entry = (entriesByHabitId.get(habit.id) ?? []).find((value) => value.entry_date === date) ?? null;
        return sum + Number(entry?.cost ?? 0);
      }, 0),
      2,
    );

    return {
      date,
      day: Number(date.slice(-2)),
      quantity,
      cost,
      completionPercent,
      intensity: intensityFromPercent(completionPercent),
      hasEntry: quantity > 0,
      goalMet:
        habits.length > 0 &&
        habits.every((habit) => {
          const entry = (entriesByHabitId.get(habit.id) ?? []).find((value) => value.entry_date === date) ?? null;
          return goalMet(habit, Number(entry?.quantity ?? 0));
        }),
    } satisfies CalendarDay;
  });

  const weeks: HeatmapWeek[] = [];
  for (let index = 0; index < days.length; index += 7) {
    weeks.push({
      label: days[index]?.date ?? `week-${index / 7 + 1}`,
      days: days.slice(index, index + 7),
    });
  }

  return weeks;
}

function buildCompletionRates(habits: HabitRow[], entriesByHabitId: Map<string, HabitEntryRow[]>, monthKey = monthKeyFromDate()) {
  const totalDays = enumerateDates(startOfMonth(monthKey), endOfMonth(monthKey)).length;

  return habits.map((habit) => {
    const days = buildCalendarDays(habit, entriesByHabitId.get(habit.id) ?? [], monthKey);
    const percentage = round(days.filter((day) => day.goalMet).length / Math.max(totalDays, 1) * 100);

    return {
      habitId: habit.id,
      habitName: habit.name,
      color: habit.color,
      percentage,
      unit: habit.unit,
      tone: percentage >= 75 ? 'good' : percentage >= 40 ? 'warn' : 'danger',
    };
  });
}

function buildStreakLeaderboard(habits: HabitRow[]) {
  return [...habits]
    .sort((left, right) => (right.current_streak ?? 0) - (left.current_streak ?? 0) || (right.best_streak ?? 0) - (left.best_streak ?? 0))
    .map((habit, index) => ({
      rank: index + 1,
      habitId: habit.id,
      habitName: habit.name,
      color: habit.color,
      currentStreak: habit.current_streak ?? 0,
      bestStreak: habit.best_streak ?? 0,
      status: deriveStreakStatus(habit),
    }));
}

function buildWeekTrend(habits: HabitRow[], entriesByHabitId: Map<string, HabitEntryRow[]>) {
  const today = todayString();
  const dates = Array.from({ length: 7 }, (_value, index) => addDays(today, -(6 - index)));
  const labels = dates.map((date) => weekdayShortLabel(date));

  const rankedHabits = [...habits].sort((left, right) => {
    const leftTotal = (entriesByHabitId.get(left.id) ?? []).reduce((sum, entry) => sum + Number(entry.quantity ?? 0), 0);
    const rightTotal = (entriesByHabitId.get(right.id) ?? []).reduce((sum, entry) => sum + Number(entry.quantity ?? 0), 0);
    return rightTotal - leftTotal;
  });

  return {
    labels,
    series: rankedHabits.slice(0, 4).map((habit) => {
      const entries = entriesByHabitId.get(habit.id) ?? [];
      const entryMap = toEntryMap(entries);

      return {
        habitId: habit.id,
        habitName: habit.name,
        color: habit.color,
        values: dates.map((date) => round(completionRatio(habit, Number(entryMap.get(date)?.quantity ?? 0)) * 100)),
      };
    }),
  };
}

function buildBestWorstDays(habits: HabitRow[], entriesByHabitId: Map<string, HabitEntryRow[]>, monthKey = monthKeyFromDate()) {
  return habits.map((habit) => {
    const days = buildCalendarDays(habit, entriesByHabitId.get(habit.id) ?? [], monthKey);
    const buckets = new Map<number, number[]>();

    for (const day of days) {
      const weekday = new Date(`${day.date}T00:00:00Z`).getUTCDay();
      buckets.set(weekday, [...(buckets.get(weekday) ?? []), day.completionPercent]);
    }

    const averages = [...buckets.entries()].map(([weekday, values]) => ({
      weekday,
      average: round(values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1)),
    }));

    const best = averages.reduce((winner, candidate) => (candidate.average > winner.average ? candidate : winner), averages[0] ?? { weekday: 0, average: 0 });
    const worst = averages.reduce((loser, candidate) => (candidate.average < loser.average ? candidate : loser), averages[0] ?? { weekday: 0, average: 0 });

    return {
      habitId: habit.id,
      habitName: habit.name,
      color: habit.color,
      bestDay: weekdayLongLabelFromIndex(best.weekday),
      bestValue: best.average,
      worstDay: weekdayLongLabelFromIndex(worst.weekday),
      worstValue: worst.average,
    };
  });
}

function buildMonthAtGlance(habits: HabitRow[], calendarDays: CalendarDay[]) {
  const totalDays = Math.max(calendarDays.length, 1);
  const overallCompletion = round(
    calendarDays.reduce((sum, day) => sum + day.completionPercent, 0) / totalDays,
  );

  return {
    overallCompletion,
    perfectDays: calendarDays.filter((day) => day.goalMet).length,
    bestStreak: habits.reduce((best, habit) => Math.max(best, habit.best_streak ?? 0), 0),
    totalEntries: round(calendarDays.reduce((sum, day) => sum + day.quantity, 0)),
    activeStreaks: habits.filter((habit) => (habit.current_streak ?? 0) > 0).length,
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
  const today = todayString();

  const [{ data: habits, error: habitsError }, { data: todayEntries, error: entriesError }] = await Promise.all([
    adminSupabase
      .from('habits')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_archived', false)
      .order('created_at', { ascending: false }),
    adminSupabase.from('habit_entries').select('*').eq('user_id', user.id).eq('entry_date', today),
  ]);

  if (habitsError || entriesError) {
    return res.status(500).json({ error: habitsError?.message || entriesError?.message });
  }

  const entryMap = new Map<string, HabitEntryRow>();
  for (const entry of (todayEntries ?? []) as HabitEntryRow[]) {
    entryMap.set(entry.habit_id, entry);
  }

  const result = ((habits ?? []) as HabitRow[]).map((habit) => {
    const todayEntry = entryMap.get(habit.id) ?? null;
    const progress = buildProgressSnapshot(habit, todayEntry);

    return {
      ...habit,
      todayEntry,
      todayQuantity: progress.current,
      todayCost: Number(todayEntry?.cost ?? 0),
      progress,
    };
  });

  return res.json({ habits: result, today });
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
  const monthKey = monthKeyFromDate();

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
    .order('entry_date', { ascending: false });

  if (entriesError) {
    return res.status(500).json({ error: entriesError.message });
  }

  const typedEntries = (entries ?? []) as HabitEntryRow[];
  const monthDays = buildCalendarDays(habit as HabitRow, typedEntries, monthKey);
  const todayEntry = typedEntries.find((entry) => entry.entry_date === todayString()) ?? null;

  return res.json({
    habit,
    todayEntry,
    entries: typedEntries.slice(0, 30),
    stats: buildHabitSummary(habit as HabitRow, typedEntries, monthDays, todayEntry),
    analytics: {
      monthLabel: monthLabelFromKey(monthKey),
      progress: buildProgressSnapshot(habit as HabitRow, todayEntry),
      calendar: monthDays,
      monthlyBreakdown: buildHabitMonthlyBreakdown(habit as HabitRow, monthDays),
      heatmap: buildHeatmapWeeks(habit as HabitRow, typedEntries),
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
  const entryDate = payload.entryDate || todayString();
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
  const monthKey = monthKeyFromDate();

  const [{ data: habits, error: habitsError }, { data: entries, error: entriesError }] = await Promise.all([
    adminSupabase.from('habits').select('*').eq('user_id', user.id),
    adminSupabase.from('habit_entries').select('*').eq('user_id', user.id),
  ]);

  if (habitsError || entriesError) {
    return res.status(500).json({ error: habitsError?.message || entriesError?.message });
  }

  const typedHabits = (habits ?? []) as HabitRow[];
  const typedEntries = (entries ?? []) as HabitEntryRow[];
  const entriesByHabitId = new Map<string, HabitEntryRow[]>();

  for (const habit of typedHabits) {
    entriesByHabitId.set(
      habit.id,
      typedEntries.filter((entry) => entry.habit_id === habit.id),
    );
  }

  const calendar = buildGlobalCalendar(typedHabits, entriesByHabitId, monthKey);
  const monthAtGlance = buildMonthAtGlance(typedHabits, calendar);

  return res.json({
    stats: {
      totalHabits: typedHabits.length,
      activeHabits: typedHabits.filter((habit) => !habit.is_archived).length,
      goodHabits: typedHabits.filter((habit) => habit.type === 'good').length,
      badHabits: typedHabits.filter((habit) => habit.type === 'bad').length,
      totalEntries: typedEntries.length,
      totalLoggedQuantity: round(typedEntries.reduce((sum, entry) => sum + Number(entry.quantity ?? 0), 0)),
      totalSpend: round(typedEntries.reduce((sum, entry) => sum + Number(entry.cost ?? 0), 0), 2),
      longestStreak: typedHabits.reduce((best, habit) => Math.max(best, habit.best_streak ?? 0), 0),
    },
    analytics: {
      monthLabel: monthLabelFromKey(monthKey),
      monthAtGlance,
      calendar,
      heatmap: buildGlobalHeatmap(typedHabits, entriesByHabitId),
      completionRates: buildCompletionRates(typedHabits, entriesByHabitId, monthKey),
      streakLeaderboard: buildStreakLeaderboard(typedHabits),
      weekTrend: buildWeekTrend(typedHabits, entriesByHabitId),
      bestWorstDays: buildBestWorstDays(typedHabits, entriesByHabitId, monthKey),
    },
  });
});

app.listen(Number(PORT), () => {
  console.log(`Habit tracker API running on http://localhost:${PORT}`);
});
