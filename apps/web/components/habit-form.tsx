'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';

export function HabitForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [color, setColor] = useState('#6366f1');
  const [type, setType] = useState<'good' | 'bad'>('good');
  const [unit, setUnit] = useState('times');
  const [baseCost, setBaseCost] = useState('0');
  const [dailyLimit, setDailyLimit] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      await apiFetch('/habits', {
        method: 'POST',
        body: JSON.stringify({
          name,
          color,
          type,
          unit,
          base_cost: Number(baseCost),
          daily_limit: dailyLimit ? Number(dailyLimit) : null,
        }),
      });
      router.push('/habits');
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to create habit.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="card form-grid" onSubmit={handleSubmit}>
      <div>
        <h1>Create a habit</h1>
        <p className="muted">Set the rules once, then keep tapping to log progress.</p>
      </div>
      <label>
        Habit name
        <input required value={name} onChange={(event) => setName(event.target.value)} placeholder="Drink water" />
      </label>
      <label>
        Color
        <input type="color" value={color} onChange={(event) => setColor(event.target.value)} />
      </label>
      <label>
        Type
        <select value={type} onChange={(event) => setType(event.target.value as 'good' | 'bad')}>
          <option value="good">Good habit</option>
          <option value="bad">Bad habit</option>
        </select>
      </label>
      <label>
        Unit
        <input value={unit} onChange={(event) => setUnit(event.target.value)} placeholder="glasses" />
      </label>
      <label>
        Base cost
        <input type="number" step="0.01" value={baseCost} onChange={(event) => setBaseCost(event.target.value)} />
      </label>
      <label>
        Daily limit
        <input
          type="number"
          step="0.01"
          value={dailyLimit}
          onChange={(event) => setDailyLimit(event.target.value)}
          placeholder="Optional"
        />
      </label>
      <button type="submit" disabled={loading}>
        {loading ? 'Saving...' : 'Create habit'}
      </button>
      {message ? <p className="status">{message}</p> : null}
    </form>
  );
}
