import { HabitDetail } from '@/components/habit-detail';

export default async function HabitDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <HabitDetail habitId={id} />;
}
