import { supabase } from '@/integrations/supabase/client';

export type MoodEmotion = 'sad' | 'neutral' | 'happy' | 'angry';

export interface MoodEntry {
  id: string;
  user_id: string;
  date: string; // yyyy-mm-dd
  mood_emoji: string | null;
  emotion: MoodEmotion | null;
  intensity: number;
  energy: number;
  created_at: string;
  updated_at: string;
}

export async function fetchMoodEntries(startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from('mood_entries')
    .select('*')
    .gte('date', startDate)
    .lte('date', endDate);

  if (error) throw error;
  return (data ?? []) as MoodEntry[];
}

export async function upsertMoodEntry(input: {
  date: string; // yyyy-mm-dd
  mood_emoji?: string | null;
  emotion?: MoodEmotion | null;
  intensity: number;
  energy: number;
}) {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) throw new Error('Not authenticated');

  const intensity = Math.max(0, Math.min(10, Math.round(input.intensity)));
  const energy = Math.max(0, Math.min(10, Math.round(input.energy)));

  const payload = {
    user_id: user.id,
    date: input.date,
    mood_emoji: input.mood_emoji ?? null,
    emotion: input.emotion ?? null,
    intensity,
    energy,
  };

  const { data, error } = await supabase
    .from('mood_entries')
    .upsert(payload, { onConflict: 'user_id,date' })
    .select()
    .single();

  if (error) throw error;
  return data as MoodEntry;
}
