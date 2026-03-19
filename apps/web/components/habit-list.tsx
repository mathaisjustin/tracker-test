'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { Habit } from '@/lib/types';

type HabitsResponse = {
  habits: Habit[];
  today: string;
};

export function HabitList() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function loadHabits() {
    setLoading(true);
    try {
      const response = await apiFetch<HabitsResponse>('/habits');
      setHabits(response.habits);
      setMessage('');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to load habits.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadHabits();
  }, []);

  async function logHabit(habitId: string) {
    setBusyId(habitId);
    try {
      await apiFetch(`/habits/${habitId}/entries`, {
        method: 'POST',
        body: JSON.stringify({ quantity: 1 }),
      });
      await loadHabits();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to log habit.');
    } finally {
      setBusyId(null);
    }
  }

  async function deleteHabit(habitId: string) {
    setBusyId(habitId);
    try {
      await apiFetch(`/habits/${habitId}`, { method: 'DELETE' });
      setHabits((current) => current.filter((habit) => habit.id !== habitId));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to delete habit.');
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return <div className="card">Loading habits...</div>;
  }

  return (
    <section className="stack-lg">
      <div className="page-heading">
        <div>
          <h1>Your habits</h1>
          <p className="muted">Track today&apos;s progress, log quickly, and open any habit for deeper analytics.</p>
        </div>
        <Link href="/habits/new" className="button-link">
          Create habit
        </Link>
      </div>
      {message ? <p className="status">{message}</p> : null}
      <div className="stack-md">
        {habits.length === 0 ? (
          <div className="card empty-state">
            <p>No habits yet. Create one and start the streak party.</p>
          </div>
        ) : (
          habits.map((habit) => (
            <div className="card habit-card" key={habit.id}>
              <Link href={`/habits/${habit.id}`} className="habit-card__link">
                <div className="habit-card__title-row">
                  <div className="habit-card__title-row">
                    <span className="habit-dot" style={{ backgroundColor: habit.color ?? '#6366f1' }} />
                    <div>
                      <h2>{habit.name}</h2>
                      <p className="muted">
                        {habit.type === 'good' ? 'Build it up' : 'Keep it low'} · {habit.unit ?? 'times'}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="habit-metrics">
                  <span>Today: {habit.todayQuantity ?? 0} {habit.unit ?? 'times'}</span>
                  <span>Current streak: {habit.current_streak ?? 0}</span>
                  <span>Best streak: {habit.best_streak ?? 0}</span>
                  <span>Today cost: ${Number(habit.todayCost ?? 0).toFixed(2)}</span>
                  {habit.progress?.text ? <span>Progress: {habit.progress.text}</span> : null}
                </div>
              </Link>
              <div className="habit-actions">
                <button type="button" onClick={() => logHabit(habit.id)} disabled={busyId === habit.id}>
                  {busyId === habit.id ? 'Logging...' : '+1 entry'}
                </button>
                <button type="button" className="ghost danger" onClick={() => deleteHabit(habit.id)} disabled={busyId === habit.id}>
                  Delete forever
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
