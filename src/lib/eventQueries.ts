import { supabase } from '@/integrations/supabase/client';

export type EventCategory =
  | 'appointments'
  | 'home'
  | 'self_care'
  | 'school'
  | 'personal'
  | 'work'
  | 'health'
  | 'fitness'
  | 'social'
  | 'finance'
  | 'travel'
  | 'hobbies'
  | 'family'
  | 'creative'
  | 'errands';

export type EventRecurrence = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';

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
  /** End mode for the series. Defaults to 'count'. */
  end_mode?: 'count' | 'until';
  /** Number of occurrences when end_mode === 'count'. */
  recurrence_count?: number | null;
  /** Inclusive end date (Date) when end_mode === 'until'. */
  until?: Date | null;
  /** For weekly recurrence: 0 = Sun, 1 = Mon, … 6 = Sat. If empty, uses the start date's weekday. */
  weekdays?: number[];
}

const MAX_OCCURRENCES = 366;

export const createEvent = async (input: CreateEventInput) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const recurrence = input.recurrence ?? 'none';
  const endMode = input.end_mode ?? 'count';
  const requestedCount = input.recurrence_count ?? 1;

  // Single event (no repeat)
  if (recurrence === 'none' || (endMode === 'count' && requestedCount <= 1 && (!input.weekdays || input.weekdays.length <= 1))) {
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

  // Build the list of dates to insert
  const start = new Date(input.date);
  start.setHours(0, 0, 0, 0);
  const untilDate = input.until ? new Date(input.until) : null;
  if (untilDate) untilDate.setHours(0, 0, 0, 0);

  const shouldStop = (d: Date, generated: number) => {
    if (generated >= MAX_OCCURRENCES) return true;
    if (endMode === 'until') return untilDate ? d.getTime() > untilDate.getTime() : false;
    return generated >= requestedCount;
  };

  const dates: Date[] = [];

  if (recurrence === 'daily') {
    const d = new Date(start);
    while (!shouldStop(d, dates.length)) {
      dates.push(new Date(d));
      d.setDate(d.getDate() + 1);
    }
  } else if (recurrence === 'weekly') {
    // Use selected weekdays or fall back to the start date's own weekday
    const weekdays = (input.weekdays && input.weekdays.length > 0)
      ? [...input.weekdays].sort((a, b) => a - b)
      : [start.getDay()];

    // Walk day-by-day from start, picking only matching weekdays
    const d = new Date(start);
    while (!shouldStop(d, dates.length)) {
      if (weekdays.includes(d.getDay())) {
        dates.push(new Date(d));
        if (shouldStop(new Date(d.getTime() + 86400000), dates.length)) break;
      }
      d.setDate(d.getDate() + 1);
      // Safety cap on the walking window so an empty weekdays array can't loop forever
      if (d.getTime() - start.getTime() > 366 * 86400000) break;
    }
  } else if (recurrence === 'monthly') {
    const d = new Date(start);
    let i = 0;
    while (!shouldStop(d, dates.length)) {
      dates.push(new Date(d));
      i += 1;
      const next = new Date(start);
      next.setMonth(start.getMonth() + i);
      d.setTime(next.getTime());
    }
  } else if (recurrence === 'yearly') {
    const d = new Date(start);
    let i = 0;
    while (!shouldStop(d, dates.length)) {
      dates.push(new Date(d));
      i += 1;
      const next = new Date(start);
      next.setFullYear(start.getFullYear() + i);
      d.setTime(next.getTime());
    }
  }

  if (dates.length === 0) {
    throw new Error('Recurrence produced no dates. Check your end date or weekday selection.');
  }

  const recurrence_id = crypto.randomUUID();
  const rows = dates.map(d => ({
    user_id: user.id,
    title: input.title,
    description: input.description ?? null,
    category: input.category,
    date: toIsoDate(d),
    start_time: input.start_time ?? null,
    end_time: input.end_time ?? null,
    recurrence,
    recurrence_count: dates.length,
    recurrence_id,
  }));
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
