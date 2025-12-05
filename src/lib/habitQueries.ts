import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, eachDayOfInterval, format } from 'date-fns';

export interface Habit {
  id: string;
  name: string;
  description?: string;
  category?: string;
  start_time?: string;
  end_time?: string;
  created_at: string;
  archived_at?: string;
  display_order?: number;
}

export interface HabitLog {
  id: string;
  habit_id: string;
  date: string;
  completed: boolean;
}

// Fetch all active habits
export async function fetchHabits() {
  const { data, error } = await supabase
    .from('habits')
    .select('*')
    .is('archived_at', null)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data as Habit[];
}

// Fetch habit logs for a date range
export async function fetchHabitLogs(startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from('habit_logs')
    .select('*')
    .gte('date', startDate)
    .lte('date', endDate);

  if (error) throw error;
  return data as HabitLog[];
}

// Toggle habit completion for a specific date
export async function toggleHabitLog(habitId: string, date: string, completed: boolean) {
  const { data: existing } = await supabase
    .from('habit_logs')
    .select('*')
    .eq('habit_id', habitId)
    .eq('date', date)
    .single();

  if (existing) {
    const { error } = await supabase
      .from('habit_logs')
      .update({ completed })
      .eq('id', existing.id);
    
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('habit_logs')
      .insert({ habit_id: habitId, date, completed });
    
    if (error) throw error;
  }
}

// Create a new habit
export async function createHabit(habit: { 
  name: string; 
  description?: string; 
  category?: string;
  start_time?: string;
  end_time?: string;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('habits')
    .insert({ ...habit, user_id: user.id })
    .select()
    .single();

  if (error) throw error;
  return data as Habit;
}

// Update a habit
export async function updateHabit(id: string, updates: Partial<Habit>) {
  const { data, error } = await supabase
    .from('habits')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Habit;
}

// Archive a habit (soft delete)
export async function archiveHabit(id: string) {
  const { error } = await supabase
    .from('habits')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
}

// Delete a habit permanently
export async function deleteHabit(id: string) {
  const { error } = await supabase
    .from('habits')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// Calculate monthly progress for a habit
// For current month: calculates against days elapsed so far
// For past months: calculates against the full month
export function calculateMonthlyProgress(
  habitId: string,
  year: number,
  month: number,
  logs: HabitLog[]
): number {
  const today = new Date();
  const monthStart = startOfMonth(new Date(year, month));
  const monthEnd = endOfMonth(new Date(year, month));
  
  // Determine end date: today if current month, otherwise end of month
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
  const effectiveEnd = isCurrentMonth ? today : monthEnd;
  
  const daysToCount = eachDayOfInterval({ start: monthStart, end: effectiveEnd });
  
  const completedDays = logs.filter(log => 
    log.habit_id === habitId && 
    log.completed &&
    new Date(log.date) >= monthStart &&
    new Date(log.date) <= effectiveEnd
  ).length;

  return daysToCount.length > 0 ? Math.round((completedDays / daysToCount.length) * 100) : 0;
}

// Calculate yearly overview (average of all habits per month)
export function calculateYearlyOverview(
  habits: Habit[],
  year: number,
  logs: HabitLog[]
): { month: string; percentage: number }[] {
  const months = Array.from({ length: 12 }, (_, i) => i);
  
  return months.map(month => {
    const percentages = habits.map(habit => 
      calculateMonthlyProgress(habit.id, year, month, logs)
    );
    
    const average = percentages.length > 0
      ? percentages.reduce((sum, p) => sum + p, 0) / percentages.length
      : 0;

    return {
      month: format(new Date(year, month), 'MMM'),
      percentage: Math.round(average)
    };
  });
}
