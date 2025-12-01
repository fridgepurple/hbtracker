import { supabase } from '@/integrations/supabase/client';

export interface Goal {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  completed: boolean;
  progress: number;
  month: number;
  year: number;
  created_at: string;
}

export const fetchGoals = async (year: number, month: number): Promise<Goal[]> => {
  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .eq('year', year)
    .eq('month', month)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
};

export const createGoal = async (goal: {
  title: string;
  description?: string;
  month: number;
  year: number;
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
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

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

export const deleteGoal = async (id: string) => {
  const { error } = await supabase
    .from('goals')
    .delete()
    .eq('id', id);

  if (error) throw error;
};
