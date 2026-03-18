'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

type StatsResponse = {
  stats: {
    totalHabits: number;
    activeHabits: number;
    goodHabits: number;
    badHabits: number;
    totalEntries: number;
    totalLoggedQuantity: number;
    totalSpend: number;
    longestStreak: number;
  };
};

export function GlobalStats() {
  const [data, setData] = useState<StatsResponse['stats'] | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    apiFetch<StatsResponse>('/stats/global')
      .then((response) => setData(response.stats))
      .catch((error) => setMessage(error instanceof Error ? error.message : 'Unable to load stats.'));
  }, []);

  if (!data && !message) {
    return <div className="card">Loading global stats...</div>;
  }

  return (
    <section className="stack-lg">
      <div>
        <h1>Global stats</h1>
        <p className="muted">Everything your habits have been up to, all in one simple board.</p>
      </div>
      {message ? <p className="status">{message}</p> : null}
      {data ? (
        <div className="stats-grid">
          <div className="stat-card"><strong>{data.totalHabits}</strong><span>Total habits</span></div>
          <div className="stat-card"><strong>{data.activeHabits}</strong><span>Active habits</span></div>
          <div className="stat-card"><strong>{data.goodHabits}</strong><span>Good habits</span></div>
          <div className="stat-card"><strong>{data.badHabits}</strong><span>Bad habits</span></div>
          <div className="stat-card"><strong>{data.totalEntries}</strong><span>Total entries</span></div>
          <div className="stat-card"><strong>{data.totalLoggedQuantity}</strong><span>Quantity logged</span></div>
          <div className="stat-card"><strong>${data.totalSpend.toFixed(2)}</strong><span>Total cost</span></div>
          <div className="stat-card"><strong>{data.longestStreak}</strong><span>Longest streak</span></div>
        </div>
      ) : null}
    </section>
  );
}
