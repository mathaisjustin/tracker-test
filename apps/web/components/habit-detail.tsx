'use client';

import { FormEvent, useEffect, useState } from 'react';
import {
  BestWorstDays,
  Heatmap,
  MetricCards,
  MonthCalendar,
  ProgressRows,
  type AnalyticsCalendarDay,
  type AnalyticsHeatmapWeek,
} from '@/components/analytics-widgets';
import { apiFetch } from '@/lib/api';
import { Habit, HabitEntry } from '@/lib/types';

type HabitDetailResponse = {
  habit: Habit;
  todayEntry: HabitEntry | null;
  entries: HabitEntry[];
  stats: {
    totalEntries: number;
    totalQuantity: number;
    totalCost: number;
    currentStreak: number;
    bestStreak: number;
    lastEntryDate: string | null;
    completionRate: number;
    goalDays: number;
    activeDays: number;
    currentCost: number;
    currentQuantity: number;
  };
  analytics: {
    monthLabel: string;
    progress: {
      current: number;
      limit: number | null;
      percentage: number | null;
      text: string | null;
      goalMet: boolean;
    };
    calendar: AnalyticsCalendarDay[];
    monthlyBreakdown: Array<{ label: string; value: string; percentage: number; tone?: string }>;
    heatmap: AnalyticsHeatmapWeek[];
  };
};

export function HabitDetail({ habitId }: { habitId: string }) {
  const [data, setData] = useState<HabitDetailResponse | null>(null);
  const [quantity, setQuantity] = useState('1');
  const [cost, setCost] = useState('');
  const [note, setNote] = useState('');
  const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 10));
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  async function loadHabit() {
    setLoading(true);
    try {
      const response = await apiFetch<HabitDetailResponse>(`/habits/${habitId}`);
      setData(response);
      setMessage('');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to load habit.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadHabit();
  }, [habitId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await apiFetch(`/habits/${habitId}/entries`, {
        method: 'POST',
        body: JSON.stringify({
          quantity: Number(quantity),
          cost: cost ? Number(cost) : undefined,
          note,
          entryDate,
        }),
      });
      setNote('');
      setCost('');
      await loadHabit();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to save entry.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="card">Loading habit details...</div>;
  }

  if (!data) {
    return <div className="card">Habit not found.</div>;
  }

  const topCards = [
    { label: 'Best streak', value: `${data.stats.bestStreak}`, note: 'days' },
    { label: 'Current streak', value: `${data.stats.currentStreak}`, note: 'running now' },
    { label: 'Completion', value: `${data.stats.completionRate}%`, note: 'this month' },
    { label: 'Current cost', value: `$${data.stats.currentCost.toFixed(2)}`, note: 'today' },
  ];

  const calendarTitle = data.habit.daily_limit ? `Progress / goal (${data.analytics.progress.text ?? 'n/a'})` : 'Current month';

  return (
    <section className="stack-lg">
      <div className="card hero-card">
        <div>
          <div className="habit-card__title-row">
            <span className="habit-dot large" style={{ backgroundColor: data.habit.color ?? '#6366f1' }} />
            <div>
              <h1>{data.habit.name}</h1>
              <p className="muted">
                {data.habit.type === 'good' ? 'A positive habit' : 'A habit to reduce'} · Unit: {data.habit.unit ?? 'times'}
              </p>
            </div>
          </div>
          <div className="habit-metrics" style={{ marginTop: '1rem' }}>
            <span>Today quantity: {data.stats.currentQuantity} {data.habit.unit ?? 'times'}</span>
            {data.analytics.progress.text ? <span>Today progress: {data.analytics.progress.text}</span> : null}
            <span>Entries logged: {data.stats.totalEntries}</span>
            <span>Total cost: ${data.stats.totalCost.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <MetricCards title="Logging snapshot" cards={topCards} />

      <form className="card form-grid" onSubmit={handleSubmit}>
        <div>
          <h2>Log an entry</h2>
          <p className="muted">Cost override is per entry, so you can adjust individual logs without changing the habit defaults.</p>
        </div>
        <label>
          Quantity
          <input type="number" step="0.01" value={quantity} onChange={(event) => setQuantity(event.target.value)} />
        </label>
        <label>
          Cost override
          <input type="number" step="0.01" value={cost} onChange={(event) => setCost(event.target.value)} placeholder="Optional" />
        </label>
        <label>
          Entry date
          <input type="date" value={entryDate} onChange={(event) => setEntryDate(event.target.value)} />
        </label>
        <label>
          Note
          <textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Quick reflection" rows={4} />
        </label>
        <button type="submit" disabled={submitting}>{submitting ? 'Saving...' : 'Save entry'}</button>
      </form>

      {message ? <p className="status">{message}</p> : null}

      <div className="card">
        <h2>Recent entries</h2>
        <div className="table-like">
          {data.entries.length === 0 ? (
            <p className="muted">No entries yet. Your first tap is going to look great here.</p>
          ) : (
            data.entries.map((entry) => (
              <div className="table-row" key={entry.id}>
                <span>{entry.entry_date}</span>
                <span>{entry.quantity} {data.habit.unit ?? 'times'}</span>
                <span>${Number(entry.cost ?? 0).toFixed(2)}</span>
                <span>{entry.note || '—'}</span>
              </div>
            ))
          )}
        </div>
      </div>

      <MonthCalendar
        title={calendarTitle}
        monthLabel={data.analytics.monthLabel}
        days={data.analytics.calendar}
        ringColor={data.habit.color ?? '#6366f1'}
      />

      <ProgressRows
        title={`Habit completion — ${data.analytics.monthLabel}`}
        rows={data.analytics.monthlyBreakdown.map((row) => ({ ...row, color: data.habit.color }))}
      />

      <Heatmap title="Activity heatmap" subtitle="Last 10 weeks" weeks={data.analytics.heatmap} />

      <BestWorstDays
        title="Best & worst days"
        items={[
          {
            habitName: data.habit.name,
            bestDay: data.analytics.calendar.reduce((best, day) => (day.completionPercent > best.completionPercent ? day : best), data.analytics.calendar[0])?.date
              ? new Date(`${data.analytics.calendar.reduce((best, day) => (day.completionPercent > best.completionPercent ? day : best), data.analytics.calendar[0]).date}T00:00:00Z`).toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' })
              : '—',
            bestValue: data.analytics.calendar.reduce((best, day) => Math.max(best, day.completionPercent), 0),
            worstDay: data.analytics.calendar.reduce((worst, day) => (day.completionPercent < worst.completionPercent ? day : worst), data.analytics.calendar[0])?.date
              ? new Date(`${data.analytics.calendar.reduce((worst, day) => (day.completionPercent < worst.completionPercent ? day : worst), data.analytics.calendar[0]).date}T00:00:00Z`).toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' })
              : '—',
            worstValue: data.analytics.calendar.reduce((worst, day) => Math.min(worst, day.completionPercent), 100),
            color: data.habit.color,
          },
        ]}
      />
    </section>
  );
}
