import { supabase } from '@/integrations/supabase/client';

/* ======================== Types ======================== */

export interface MoodOption {
  id: string;
  user_id: string;
  emoji: string;
  label: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MoodEntry {
  id: string;
  user_id: string;
  date: string; // yyyy-mm-dd
  mood_option_id: string;
  intensity: number;
  energy: number;
  created_at: string;
  updated_at: string;
}

/* ======================== Mood Options ======================== */

const DEFAULT_MOODS: Array<{ emoji: string; label: string }> = [
  { emoji: '😀', label: 'Great' },
  { emoji: '🙂', label: 'Good' },
  { emoji: '😐', label: 'Neutral' },
  { emoji: '😕', label: 'Meh' },
  { emoji: '😔', label: 'Sad' },
  { emoji: '😢', label: 'Very sad' },
  { emoji: '😡', label: 'Angry' },
  { emoji: '😤', label: 'Frustrated' },
  { emoji: '😰', label: 'Anxious' },
  { emoji: '😴', label: 'Tired' },
  { emoji: '🤒', label: 'Sick' },
  { emoji: '🥺', label: 'Sensitive' },
  { emoji: '💔', label: 'Heart heavy' },
];

/** Fetch active mood options for the current user (sorted). */
export async function fetchMoodOptions(): Promise<MoodOption[]> {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('mood_options')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return (data ?? []) as MoodOption[];
}

/** Seed defaults if user has no mood options yet. Returns all active options. */
export async function ensureMoodOptionsSeeded(): Promise<MoodOption[]> {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) throw new Error('Not authenticated');

  // Check if options exist
  const { data: existing, error: fetchErr } = await supabase
    .from('mood_options')
    .select('id')
    .eq('user_id', user.id)
    .limit(1);

  if (fetchErr) throw fetchErr;

  if ((existing ?? []).length === 0) {
    const rows = DEFAULT_MOODS.map((m, idx) => ({
      user_id: user.id,
      emoji: m.emoji,
      label: m.label,
      sort_order: idx + 1,
      is_active: true,
    }));

    const { error: insertErr } = await supabase.from('mood_options').insert(rows);
    if (insertErr) throw insertErr;
  }

  return fetchMoodOptions();
}

/* ======================== Mood Entries ======================== */

/** Fetch mood entries (with emoji from mood_options) in a date range. */
export async function fetchMoodEntries(
  startDate: string,
  endDate: string
): Promise<(MoodEntry & { emoji: string; label: string })[]> {
  const { data, error } = await supabase
    .from('mood_entries')
    .select('*, mood_options:mood_option_id (emoji, label)')
    .gte('date', startDate)
    .lte('date', endDate);

  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    id: row.id,
    user_id: row.user_id,
    date: row.date,
    mood_option_id: row.mood_option_id,
    intensity: row.intensity,
    energy: row.energy,
    created_at: row.created_at,
    updated_at: row.updated_at,
    emoji: row.mood_options?.emoji ?? '',
    label: row.mood_options?.label ?? '',
  }));
}

/** Upsert a mood entry for the given date (requires mood_option_id). */
export async function upsertMoodEntry(input: {
  date: string;
  mood_option_id: string;
  intensity: number;
  energy: number;
}): Promise<MoodEntry> {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) throw new Error('Not authenticated');

  const intensity = Math.max(0, Math.min(10, Math.round(input.intensity)));
  const energy = Math.max(0, Math.min(10, Math.round(input.energy)));

  const payload = {
    user_id: user.id,
    date: input.date,
    mood_option_id: input.mood_option_id,
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
