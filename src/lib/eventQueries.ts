import { supabase } from '@/integrations/supabase/client';

export type EventCategory =
  | 'appointments'
  | 'home'
  | 'self_care'
  | 'school'
  | 'personal';

export type EventRecurrence = 'none' | 'weekly' | 'monthly';

export interface CalendarEvent {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  category: EventCategory;
  date: string; // YYYY-MM-DD
  start_time: string | null; // HH:MM:SS
  end_time: string | null;
  recurrence: EventRecurrence;
  recurrence_count: number | null;
  recurrence_id: string | null;
  created_at: string;
  updated_at: string;
}

const toIsoDate = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const fetchEventsInRange = async (
  startDate: Date,
  endDate: Date,
): Promise<CalendarEvent[]> => {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .gte('date', toIsoDate(startDate))
    .lte('date', toIsoDate(endDate))
    .order('date', { ascending: true });

  if (error) throw error;
  return (data || []) as CalendarEvent[];
};

export interface CreateEventInput {
  title: string;
  description?: string | null;
  category: EventCategory;
  date: Date;
  start_time?: string | null;
  end_time?: string | null;
  recurrence?: EventRecurrence;
  recurrence_count?: number | null;
}

export const createEvent = async (input: CreateEventInput) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Single
  if (!input.recurrence || input.recurrence === 'none' || !input.recurrence_count || input.recurrence_count <= 1) {
    const { data, error } = await supabase
      .from('events')
      .insert({
        user_id: user.id,
        title: input.title,
        description: input.description ?? null,
        category: input.category,
        date: toIsoDate(input.date),
        start_time: input.start_time ?? null,
        end_time: input.end_time ?? null,
        recurrence: 'none',
        recurrence_count: null,
        recurrence_id: null,
      })
      .select()
      .single();
    if (error) throw error;
    return [data];
  }

  // Recurring series
  const recurrence_id = crypto.randomUUID();
  const rows = [];
  for (let i = 0; i < input.recurrence_count; i++) {
    const d = new Date(input.date);
    if (input.recurrence === 'weekly') {
      d.setDate(d.getDate() + i * 7);
    } else {
      // monthly — same day-of-month, skip if month doesn't have it
      d.setMonth(d.getMonth() + i);
    }
    rows.push({
      user_id: user.id,
      title: input.title,
      description: input.description ?? null,
      category: input.category,
      date: toIsoDate(d),
      start_time: input.start_time ?? null,
      end_time: input.end_time ?? null,
      recurrence: input.recurrence,
      recurrence_count: input.recurrence_count,
      recurrence_id,
    });
  }
  const { data, error } = await supabase.from('events').insert(rows).select();
  if (error) throw error;
  return data;
};

export const updateEvent = async (
  id: string,
  updates: Partial<Pick<CalendarEvent, 'title' | 'description' | 'category' | 'date' | 'start_time' | 'end_time'>>,
) => {
  const { data, error } = await supabase
    .from('events')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const updateRecurringEvents = async (
  recurrence_id: string,
  fromDate: string,
  updates: Partial<Pick<CalendarEvent, 'title' | 'description' | 'category' | 'start_time' | 'end_time'>>,
) => {
  const { error } = await supabase
    .from('events')
    .update(updates)
    .eq('recurrence_id', recurrence_id)
    .gte('date', fromDate);
  if (error) throw error;
};

export const deleteEvent = async (id: string) => {
  const { error } = await supabase.from('events').delete().eq('id', id);
  if (error) throw error;
};

export const deleteRecurringEvents = async (recurrence_id: string, fromDate: string) => {
  const { error } = await supabase
    .from('events')
    .delete()
    .eq('recurrence_id', recurrence_id)
    .gte('date', fromDate);
  if (error) throw error;
};
