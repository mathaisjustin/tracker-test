'use client';

import { FormEvent, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { Habit, HabitEntry } from '@/lib/types';

type HabitDetailResponse = {
  habit: Habit;
  entries: HabitEntry[];
  stats: {
    totalEntries: number;
    totalQuantity: number;
    totalCost: number;
    currentStreak: number;
    bestStreak: number;
    lastEntryDate: string | null;
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
          <div className="stats-grid compact">
            <div className="stat-card">
              <strong>{data.stats.currentStreak}</strong>
              <span>Current streak</span>
            </div>
            <div className="stat-card">
              <strong>{data.stats.bestStreak}</strong>
              <span>Best streak</span>
            </div>
            <div className="stat-card">
              <strong>{data.stats.totalQuantity}</strong>
              <span>Total quantity</span>
            </div>
            <div className="stat-card">
              <strong>${data.stats.totalCost.toFixed(2)}</strong>
              <span>Total cost</span>
            </div>
          </div>
        </div>
      </div>

      <form className="card form-grid" onSubmit={handleSubmit}>
        <div>
          <h2>Log an entry</h2>
          <p className="muted">You can overwrite the same day if you want a cleaner daily record.</p>
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
    </section>
  );
}
