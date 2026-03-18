export type Habit = {
  id: string;
  user_id: string;
  name: string;
  color: string | null;
  type: 'good' | 'bad';
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

export type HabitEntry = {
  id: string;
  habit_id: string;
  user_id: string;
  quantity: number | null;
  cost: number | null;
  note: string | null;
  created_at: string | null;
  entry_date: string;
};
