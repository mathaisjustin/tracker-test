import React from 'react';

export type AnalyticsCalendarDay = {
  date: string;
  day: number;
  quantity: number;
  cost: number;
  completionPercent: number;
  intensity: number;
  hasEntry: boolean;
  goalMet: boolean;
};

export type AnalyticsHeatmapWeek = {
  label: string;
  days: AnalyticsCalendarDay[];
};

export function MetricCards({
  title,
  cards,
}: {
  title?: string;
  cards: Array<{ label: string; value: string; note?: string }>;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      {title ? <h2 className="mb-4 text-lg font-semibold text-slate-900">{title}</h2> : null}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-2xl border border-slate-200 bg-slate-950 p-4 text-white">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{card.label}</p>
            <p className="mt-3 text-4xl font-semibold">{card.value}</p>
            {card.note ? <p className="mt-2 text-sm text-slate-300">{card.note}</p> : null}
          </div>
        ))}
      </div>
    </section>
  );
}

function ringOffset(percent: number) {
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  return circumference - (Math.max(0, Math.min(percent, 100)) / 100) * circumference;
}

export function MonthCalendar({
  title,
  monthLabel,
  days,
  ringColor = '#6366f1',
}: {
  title: string;
  monthLabel: string;
  days: AnalyticsCalendarDay[];
  ringColor?: string;
}) {
  const weekdayHeaders = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const firstDate = days[0]?.date;
  const offset = firstDate
    ? (() => {
        const raw = new Date(`${firstDate}T00:00:00Z`).getUTCDay();
        return raw === 0 ? 6 : raw - 1;
      })()
    : 0;

  const slots: Array<AnalyticsCalendarDay | null> = Array.from({ length: offset }, () => null).concat(days);

  return (
    <section className="rounded-3xl border border-slate-200 bg-slate-950 p-5 text-white shadow-sm">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{title}</p>
          <h2 className="mt-2 text-2xl font-semibold">{monthLabel}</h2>
        </div>
      </div>
      <div className="mb-3 grid grid-cols-7 gap-2 text-center text-xs uppercase tracking-[0.25em] text-slate-500">
        {weekdayHeaders.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {slots.map((day, index) => (
          <div
            key={day?.date ?? `blank-${index}`}
            className="flex aspect-square items-center justify-center rounded-2xl bg-slate-900/80"
          >
            {day ? (
              <div className="relative flex h-12 w-12 items-center justify-center">
                <svg className="absolute inset-0 h-12 w-12 -rotate-90" viewBox="0 0 44 44">
                  <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(148,163,184,0.2)" strokeWidth="4" />
                  <circle
                    cx="22"
                    cy="22"
                    r="18"
                    fill="none"
                    stroke={ringColor}
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 18}
                    strokeDashoffset={ringOffset(day.completionPercent)}
                  />
                </svg>
                <span className="text-sm font-semibold text-white">{day.day}</span>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}

function heatColor(level: number) {
  return ['#111827', '#1e3a8a', '#2563eb', '#60a5fa', '#93c5fd'][level] ?? '#111827';
}

export function Heatmap({
  title,
  subtitle,
  weeks,
}: {
  title: string;
  subtitle?: string;
  weeks: AnalyticsHeatmapWeek[];
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-slate-950 p-5 text-white shadow-sm">
      <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{title}</p>
      {subtitle ? <h2 className="mt-2 text-xl font-semibold">{subtitle}</h2> : null}
      <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
        {weeks.map((week) => (
          <div key={week.label} className="grid gap-2">
            {week.days.map((day) => (
              <div
                key={day.date}
                title={`${day.date}: ${day.completionPercent}%`}
                className="h-5 w-5 rounded-md border border-white/5"
                style={{ backgroundColor: heatColor(day.intensity) }}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-2 text-sm text-slate-400">
        <span>Less</span>
        {[0, 1, 2, 3, 4].map((level) => (
          <span key={level} className="h-4 w-4 rounded-sm" style={{ backgroundColor: heatColor(level) }} />
        ))}
        <span>More</span>
      </div>
    </section>
  );
}

export function ProgressRows({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ label: string; value: string; percentage: number; tone?: string; color?: string | null }>;
}) {
  const toneColor = (row: { tone?: string; color?: string | null }) => {
    if (row.color) return row.color;
    if (row.tone === 'good') return '#22c55e';
    if (row.tone === 'warn') return '#facc15';
    if (row.tone === 'danger') return '#f87171';
    if (row.tone === 'accent') return '#6366f1';
    return '#e5e7eb';
  };

  return (
    <section className="rounded-3xl border border-slate-200 bg-slate-950 p-5 text-white shadow-sm">
      <p className="mb-5 text-xs uppercase tracking-[0.3em] text-slate-400">{title}</p>
      <div className="space-y-5">
        {rows.map((row) => (
          <div key={row.label} className="space-y-2">
            <div className="flex items-center justify-between gap-3 text-sm sm:text-base">
              <span>{row.label}</span>
              <span className="font-semibold" style={{ color: toneColor(row) }}>{row.value}</span>
            </div>
            <div className="h-3 rounded-full bg-white/10">
              <div
                className="h-3 rounded-full"
                style={{ width: `${Math.max(0, Math.min(row.percentage, 100))}%`, backgroundColor: toneColor(row) }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function StreakLeaderboard({
  items,
}: {
  items: Array<{ rank: number; habitName: string; currentStreak: number; bestStreak: number; status: string; color?: string | null }>;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-slate-950 p-5 text-white shadow-sm">
      <p className="mb-5 text-xs uppercase tracking-[0.3em] text-slate-400">Streak leaderboard</p>
      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.habitName} className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 p-4">
            <div className="flex items-center gap-4">
              <span className="text-slate-400">#{item.rank}</span>
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color ?? '#6366f1' }} />
              <div>
                <p className="text-lg font-semibold">{item.habitName}</p>
                <p className="text-sm text-slate-400">{item.status}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-semibold">{item.currentStreak}</p>
              <p className="text-sm text-slate-400">best {item.bestStreak}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function TrendBars({
  title,
  labels,
  series,
}: {
  title: string;
  labels: string[];
  series: Array<{ habitName: string; color?: string | null; values: number[] }>;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-slate-950 p-5 text-white shadow-sm">
      <p className="mb-5 text-xs uppercase tracking-[0.3em] text-slate-400">{title}</p>
      <div className="grid grid-cols-7 gap-3">
        {labels.map((label, index) => (
          <div key={label} className="flex flex-col items-center gap-3">
            <div className="flex h-44 items-end gap-1">
              {series.map((item) => (
                <div
                  key={`${item.habitName}-${label}`}
                  className="w-3 rounded-t-full sm:w-4"
                  style={{
                    height: `${Math.max(item.values[index] ?? 0, 6)}%`,
                    backgroundColor: item.color ?? '#e5e7eb',
                  }}
                  title={`${item.habitName}: ${item.values[index] ?? 0}%`}
                />
              ))}
            </div>
            <span className="text-sm text-slate-400">{label}</span>
          </div>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap gap-4 text-sm text-slate-300">
        {series.map((item) => (
          <div key={item.habitName} className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color ?? '#e5e7eb' }} />
            <span>{item.habitName}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export function BestWorstDays({
  title,
  items,
}: {
  title: string;
  items: Array<{ habitName: string; bestDay: string; worstDay: string; bestValue: number; worstValue: number; color?: string | null }>;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-slate-950 p-5 text-white shadow-sm">
      <p className="mb-5 text-xs uppercase tracking-[0.3em] text-slate-400">{title}</p>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => (
          <div key={item.habitName} className="rounded-2xl border border-white/10 p-4">
            <div className="mb-4 flex items-center gap-3">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color ?? '#6366f1' }} />
              <p className="text-lg font-semibold">{item.habitName}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-emerald-400">{item.bestDay}</p>
                <p className="mt-1 text-slate-400">best · {item.bestValue}%</p>
              </div>
              <div>
                <p className="text-rose-400">{item.worstDay}</p>
                <p className="mt-1 text-slate-400">worst · {item.worstValue}%</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
