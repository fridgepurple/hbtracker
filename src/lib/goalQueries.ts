import { supabase } from '@/integrations/supabase/client';

export type GoalType = 'daily' | 'weekly' | 'monthly';

export type GoalCategory = 'home' | 'finance' | 'work' | 'school' | 'personal' | 'travel';

export interface Goal {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  completed: boolean;
  progress: number;
  month: number;
  year: number;
  week: number | null;
  day: number | null;
  goal_type: GoalType;
  category: GoalCategory;
  recurrence_id: string | null;
  created_at: string;
}

export const fetchGoals = async (
  year: number, 
  month: number, 
  goalType: GoalType = 'monthly',
  week?: number,
  day?: number
): Promise<Goal[]> => {
  let query = supabase
    .from('goals')
    .select('*')
    .eq('year', year)
    .eq('month', month)
    .eq('goal_type', goalType)
    .order('created_at', { ascending: true });

  if (goalType === 'weekly' && week) {
    query = query.eq('week', week);
  }

  if (goalType === 'daily' && day) {
    query = query.eq('day', day);
  }

  const { data, error } = await query;

  if (error) throw error;
  return (data || []) as Goal[];
};

export const fetchAllGoalsForMonth = async (year: number, month: number): Promise<Goal[]> => {
  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .eq('year', year)
    .eq('month', month)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data || []) as Goal[];
};

export const createGoal = async (goal: {
  title: string;
  description?: string;
  month: number;
  year: number;
  goal_type: GoalType;
  category?: GoalCategory;
  week?: number;
  day?: number;
  recurrence_id?: string | null;
}) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('goals')
    .insert({
      user_id: user.id,
      title: goal.title,
      description: goal.description || null,
      month: goal.month,
      year: goal.year,
      goal_type: goal.goal_type,
      category: goal.category || 'personal',
      week: goal.week || null,
      day: goal.day || null,
      recurrence_id: goal.recurrence_id || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Create a recurring series of goals (weekly or monthly), returns all created rows.
 * `count` is the total number of occurrences (including the first).
 */
export const createRecurringGoals = async (params: {
  title: string;
  description?: string;
  goal_type: 'weekly' | 'monthly';
  category?: GoalCategory;
  startYear: number;
  startMonth: number;
  startWeek?: number; // ISO week number, required for weekly
  count: number;
}) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const recurrence_id = crypto.randomUUID();
  const rows: any[] = [];

  if (params.goal_type === 'monthly') {
    let y = params.startYear;
    let m = params.startMonth;
    for (let i = 0; i < params.count; i++) {
      rows.push({
        user_id: user.id,
        title: params.title,
        description: params.description || null,
        month: m,
        year: y,
        goal_type: 'monthly',
        category: params.category || 'personal',
        week: null,
        day: null,
        recurrence_id,
      });
      m += 1;
      if (m > 12) { m = 1; y += 1; }
    }
  } else {
    // Weekly recurrence: advance by 7 days, derive week / month / year from a date.
    // We need the date that corresponds to startYear/startMonth/startWeek.
    // Use the week's Monday as anchor.
    const anchor = mondayOfIsoWeek(params.startYear, params.startWeek || 1);
    for (let i = 0; i < params.count; i++) {
      const d = new Date(anchor);
      d.setDate(d.getDate() + i * 7);
      const { week, year } = isoWeekFor(d);
      rows.push({
        user_id: user.id,
        title: params.title,
        description: params.description || null,
        month: d.getMonth() + 1,
        year,
        goal_type: 'weekly',
        category: params.category || 'personal',
        week,
        day: null,
        recurrence_id,
      });
    }
  }

  const { data, error } = await supabase.from('goals').insert(rows).select();
  if (error) throw error;
  return data;
};

// Helpers for ISO week math (Mon=first day)
function mondayOfIsoWeek(year: number, week: number): Date {
  const simple = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7));
  const dow = simple.getUTCDay();
  const ISOweekStart = new Date(simple);
  if (dow <= 4) ISOweekStart.setUTCDate(simple.getUTCDate() - simple.getUTCDay() + 1);
  else ISOweekStart.setUTCDate(simple.getUTCDate() + 8 - simple.getUTCDay());
  return ISOweekStart;
}

function isoWeekFor(date: Date): { week: number; year: number } {
  const tmp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((tmp.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return { week, year: tmp.getUTCFullYear() };
}

export const updateGoal = async (
  id: string,
  updates: Partial<Omit<Goal, 'id' | 'user_id' | 'created_at'>>
) => {
  const { data, error } = await supabase
    .from('goals')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateRecurringGoals = async (
  recurrence_id: string,
  fromCreatedAt: string,
  updates: Partial<Pick<Goal, 'title' | 'description' | 'category'>>
) => {
  const { error } = await supabase
    .from('goals')
    .update(updates)
    .eq('recurrence_id', recurrence_id)
    .gte('created_at', fromCreatedAt);
  if (error) throw error;
};

export const deleteGoal = async (id: string) => {
  const { error } = await supabase
    .from('goals')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

export const deleteRecurringGoals = async (recurrence_id: string, fromCreatedAt: string) => {
  const { error } = await supabase
    .from('goals')
    .delete()
    .eq('recurrence_id', recurrence_id)
    .gte('created_at', fromCreatedAt);
  if (error) throw error;
};
