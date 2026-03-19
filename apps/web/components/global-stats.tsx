'use client';

import {
  BestWorstDays,
  Heatmap,
  MetricCards,
  MonthCalendar,
  ProgressRows,
  StreakLeaderboard,
  TrendBars,
  type AnalyticsCalendarDay,
  type AnalyticsHeatmapWeek,
} from '@/components/analytics-widgets';
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
  analytics: {
    monthLabel: string;
    monthAtGlance: {
      overallCompletion: number;
      perfectDays: number;
      bestStreak: number;
      totalEntries: number;
      activeStreaks: number;
    };
    calendar: AnalyticsCalendarDay[];
    heatmap: AnalyticsHeatmapWeek[];
    completionRates: Array<{
      habitId: string;
      habitName: string;
      color: string | null;
      percentage: number;
      unit: string | null;
      tone: string;
    }>;
    streakLeaderboard: Array<{
      rank: number;
      habitId: string;
      habitName: string;
      color: string | null;
      currentStreak: number;
      bestStreak: number;
      status: string;
    }>;
    weekTrend: {
      labels: string[];
      series: Array<{
        habitId: string;
        habitName: string;
        color: string | null;
        values: number[];
      }>;
    };
    bestWorstDays: Array<{
      habitId: string;
      habitName: string;
      color: string | null;
      bestDay: string;
      bestValue: number;
      worstDay: string;
      worstValue: number;
    }>;
  };
};

export function GlobalStats() {
  const [data, setData] = useState<StatsResponse | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    apiFetch<StatsResponse>('/stats/global')
      .then((response) => setData(response))
      .catch((error) => setMessage(error instanceof Error ? error.message : 'Unable to load stats.'));
  }, []);

  if (!data && !message) {
    return <div className="card">Loading global stats...</div>;
  }

  if (!data) {
    return <div className="card">{message || 'Unable to load stats.'}</div>;
  }

  const glanceCards = [
    { label: 'Overall', value: `${data.analytics.monthAtGlance.overallCompletion}%`, note: 'this month' },
    { label: 'Perfect days', value: `${data.analytics.monthAtGlance.perfectDays}`, note: 'all habits on target' },
    { label: 'Best streak', value: `${data.analytics.monthAtGlance.bestStreak}`, note: 'across habits' },
    { label: 'Active streaks', value: `${data.analytics.monthAtGlance.activeStreaks}`, note: 'currently running' },
  ];

  return (
    <section className="stack-lg">
      <div>
        <h1>Global stats</h1>
        <p className="muted">Combined analytics across every habit, with monthly progress, streaks, trends, and heatmaps.</p>
      </div>
      {message ? <p className="status">{message}</p> : null}

      <MetricCards title="This month at a glance" cards={glanceCards} />

      <MonthCalendar
        title="Overall month progress"
        monthLabel={data.analytics.monthLabel}
        days={data.analytics.calendar}
        ringColor="#ec4899"
      />

      <ProgressRows
        title="Completion rate — per habit"
        rows={data.analytics.completionRates.map((row) => ({
          label: row.habitName,
          value: `${row.percentage}%`,
          percentage: row.percentage,
          tone: row.tone,
          color: row.color,
        }))}
      />

      <StreakLeaderboard items={data.analytics.streakLeaderboard} />

      <TrendBars title="7-day trend — all habits" labels={data.analytics.weekTrend.labels} series={data.analytics.weekTrend.series} />

      <BestWorstDays title="Best & worst day — per habit" items={data.analytics.bestWorstDays} />

      <Heatmap title="Overall activity heatmap" subtitle="Last 10 weeks" weeks={data.analytics.heatmap} />
    </section>
  );
}
