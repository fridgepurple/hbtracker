import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Briefcase,
  Home as HomeIcon,
  Sparkles,
  GraduationCap,
  Stethoscope,
  User as UserIcon,
  Heart,
  Dumbbell,
  Users,
  DollarSign,
  Plane,
  Palette,
  Baby,
  Music,
  ShoppingCart,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  CalendarEvent,
  EventCategory,
  EventRecurrence,
  fetchEventsInRange,
  createEvent,
  updateEvent,
  deleteEvent,
  deleteRecurringEvents,
} from '@/lib/eventQueries';

// ─── Time grid config ───────────────────────────────────────────────
const HOUR_START = 4;
const HOUR_END = 23;
const HOUR_HEIGHT = 36;
const TOTAL_HOURS = HOUR_END - HOUR_START;

// ─── Categories ─────────────────────────────────────────────────────
export const CATEGORY_OPTIONS: {
  value: EventCategory;
  label: string;
  icon: typeof Briefcase;
  swatch: string;
  bar: string;
  border: string;
  text: string;
}[] = [
  {
    value: 'appointments',
    label: 'Appointments',
    icon: Stethoscope,
    swatch: 'bg-pink-500',
    bar: 'bg-pink-500/15 dark:bg-pink-500/25',
    border: 'border-pink-500/50',
    text: 'text-pink-700 dark:text-pink-200',
  },
  {
    value: 'work',
    label: 'Work',
    icon: Briefcase,
    swatch: 'bg-indigo-500',
    bar: 'bg-indigo-500/15 dark:bg-indigo-500/25',
    border: 'border-indigo-500/50',
    text: 'text-indigo-700 dark:text-indigo-200',
  },
  {
    value: 'errands',
    label: 'Errands',
    icon: ShoppingCart,
    swatch: 'bg-orange-500',
    bar: 'bg-orange-500/15 dark:bg-orange-500/25',
    border: 'border-orange-500/50',
    text: 'text-orange-700 dark:text-orange-200',
  },
  {
    value: 'home',
    label: 'Home & cleaning',
    icon: HomeIcon,
    swatch: 'bg-amber-500',
    bar: 'bg-amber-500/15 dark:bg-amber-500/25',
    border: 'border-amber-500/50',
    text: 'text-amber-700 dark:text-amber-200',
  },
  {
    value: 'personal',
    label: 'Personal',
    icon: UserIcon,
    swatch: 'bg-yellow-500',
    bar: 'bg-yellow-500/15 dark:bg-yellow-500/25',
    border: 'border-yellow-500/50',
    text: 'text-yellow-700 dark:text-yellow-200',
  },
  {
    value: 'finance',
    label: 'Finance',
    icon: DollarSign,
    swatch: 'bg-lime-500',
    bar: 'bg-lime-500/15 dark:bg-lime-500/25',
    border: 'border-lime-500/50',
    text: 'text-lime-700 dark:text-lime-200',
  },
  {
    value: 'fitness',
    label: 'Fitness',
    icon: Dumbbell,
    swatch: 'bg-green-500',
    bar: 'bg-green-500/15 dark:bg-green-500/25',
    border: 'border-green-500/50',
    text: 'text-green-700 dark:text-green-200',
  },
  {
    value: 'health',
    label: 'Health',
    icon: Heart,
    swatch: 'bg-emerald-500',
    bar: 'bg-emerald-500/15 dark:bg-emerald-500/25',
    border: 'border-emerald-500/50',
    text: 'text-emerald-700 dark:text-emerald-200',
  },
  {
    value: 'travel',
    label: 'Travel',
    icon: Plane,
    swatch: 'bg-teal-500',
    bar: 'bg-teal-500/15 dark:bg-teal-500/25',
    border: 'border-teal-500/50',
    text: 'text-teal-700 dark:text-teal-200',
  },
  {
    value: 'hobbies',
    label: 'Hobbies',
    icon: Music,
    swatch: 'bg-cyan-500',
    bar: 'bg-cyan-500/15 dark:bg-cyan-500/25',
    border: 'border-cyan-500/50',
    text: 'text-cyan-700 dark:text-cyan-200',
  },
  {
    value: 'school',
    label: 'School',
    icon: GraduationCap,
    swatch: 'bg-sky-500',
    bar: 'bg-sky-500/15 dark:bg-sky-500/25',
    border: 'border-sky-500/50',
    text: 'text-sky-700 dark:text-sky-200',
  },
  {
    value: 'social',
    label: 'Social',
    icon: Users,
    swatch: 'bg-blue-500',
    bar: 'bg-blue-500/15 dark:bg-blue-500/25',
    border: 'border-blue-500/50',
    text: 'text-blue-700 dark:text-blue-200',
  },
  {
    value: 'self_care',
    label: 'Self-care & rituals',
    icon: Sparkles,
    swatch: 'bg-violet-500',
    bar: 'bg-violet-500/15 dark:bg-violet-500/25',
    border: 'border-violet-500/50',
    text: 'text-violet-700 dark:text-violet-200',
  },
  {
    value: 'creative',
    label: 'Creative',
    icon: Palette,
    swatch: 'bg-purple-500',
    bar: 'bg-purple-500/15 dark:bg-purple-500/25',
    border: 'border-purple-500/50',
    text: 'text-purple-700 dark:text-purple-200',
  },
  {
    value: 'family',
    label: 'Family',
    icon: Baby,
    swatch: 'bg-fuchsia-500',
    bar: 'bg-fuchsia-500/15 dark:bg-fuchsia-500/25',
    border: 'border-fuchsia-500/50',
    text: 'text-fuchsia-700 dark:text-fuchsia-200',
  },
];

const getCatStyle = (c: EventCategory) =>
  CATEGORY_OPTIONS.find(o => o.value === c) ?? CATEGORY_OPTIONS[CATEGORY_OPTIONS.length - 1];

// ─── Date helpers ───────────────────────────────────────────────────
const isoDate = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const startOfWeekMonday = (d: Date) => {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  const dow = r.getDay();
  const diff = (dow + 6) % 7;
  r.setDate(r.getDate() - diff);
  return r;
};

const addDays = (d: Date, n: number) => {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
};

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const fmtTime = (t: string | null) => {
  if (!t) return '';
  const [h, m] = t.split(':');
  return `${parseInt(h, 10)}:${m}`;
};

const minutesFromTime = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// ─── Hover popup for an event ───────────────────────────────────────
function EventHoverPopup({ event }: { event: CalendarEvent }) {
  const cs = getCatStyle(event.category);
  const Icon = cs.icon;
  const recurrenceLabel =
    event.recurrence === 'daily' ? 'Daily'
    : event.recurrence === 'weekly' ? 'Weekly'
    : event.recurrence === 'monthly' ? 'Monthly'
    : event.recurrence === 'yearly' ? 'Yearly'
    : null;
  return (
    <HoverCardContent side="top" align="start" className="w-72 p-3">
      <div className="space-y-2">
        <div className="flex items-start gap-2">
          <span className={cn('mt-0.5 h-2.5 w-2.5 rounded-full shrink-0', cs.swatch)} />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm leading-snug">{event.title}</p>
            <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Icon className="h-3 w-3" />
              <span>{cs.label}</span>
              {recurrenceLabel && (
                <Badge variant="outline" className="ml-1 text-[9px] px-1 py-0 h-3.5">
                  ↻ {recurrenceLabel}
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="text-xs text-muted-foreground">
          {event.start_time
            ? `${fmtTime(event.start_time)}${event.end_time ? ` – ${fmtTime(event.end_time)}` : ''}`
            : 'All day'}
        </div>
        {event.description && (
          <p className="text-xs leading-relaxed pt-1 border-t border-border whitespace-pre-wrap">
            {event.description}
          </p>
        )}
      </div>
    </HoverCardContent>
  );
}

// ─── WeekCalendar ───────────────────────────────────────────────────
export default function WeekCalendar() {
  const queryClient = useQueryClient();
  const [view, setView] = useState<'week' | 'month'>('week');
  const [anchor, setAnchor] = useState<Date>(new Date());
  const weekStart = useMemo(() => startOfWeekMonday(anchor), [anchor]);
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );
  const weekEnd = useMemo(() => addDays(weekStart, 6), [weekStart]);

  // Month view: build a 6-week grid that contains the anchor's month
  const monthInfo = useMemo(() => {
    const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const last = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
    const gridStart = startOfWeekMonday(first);
    const gridEnd = addDays(gridStart, 41); // 6 weeks
    const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
    return { first, last, gridStart, gridEnd, days };
  }, [anchor]);

  const rangeStart = view === 'week' ? weekStart : monthInfo.gridStart;
  const rangeEnd = view === 'week' ? weekEnd : monthInfo.gridEnd;

  const [activeCats, setActiveCats] = useState<Set<EventCategory>>(
    new Set(CATEGORY_OPTIONS.map(c => c.value)),
  );

  const { data: events = [] } = useQuery({
    queryKey: ['events', isoDate(rangeStart), isoDate(rangeEnd)],
    queryFn: () => fetchEventsInRange(rangeStart, rangeEnd),
  });

  const visibleEvents = useMemo(
    () => events.filter(e => activeCats.has(e.category)),
    [events, activeCats],
  );

  const eventsByDay = useMemo(() => {
    const map: CalendarEvent[][] = Array.from({ length: 7 }, () => []);
    visibleEvents.forEach(e => {
      const [y, m, d] = e.date.split('-').map(Number);
      const dt = new Date(y, m - 1, d);
      const idx = weekDays.findIndex(w => sameDay(w, dt));
      if (idx >= 0) map[idx].push(e);
    });
    return map;
  }, [visibleEvents, weekDays]);

  // For month view: group by ISO date string
  const eventsByIsoDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    visibleEvents.forEach(e => {
      const arr = map.get(e.date) ?? [];
      arr.push(e);
      map.set(e.date, arr);
    });
    // Sort each day's events by start_time (untimed first)
    map.forEach(arr =>
      arr.sort((a, b) => (a.start_time ?? '').localeCompare(b.start_time ?? '')),
    );
    return map;
  }, [visibleEvents]);


  // ─── Dialog state ─────────────────────────────────────────────────
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CalendarEvent | null>(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'personal' as EventCategory,
    date: isoDate(new Date()),
    start_time: '09:00',
    end_time: '10:00',
    recurrence: 'none' as EventRecurrence,
    end_mode: 'count' as 'count' | 'until',
    recurrence_count: 10,
    until: isoDate(new Date(Date.now() + 30 * 86400000)),
    weekdays: [] as number[],
  });

  const [pendingDelete, setPendingDelete] = useState<CalendarEvent | null>(null);

  const openCreate = (date: Date, hour?: number) => {
    setEditing(null);
    const defaultStart = hour !== undefined ? `${String(hour).padStart(2, '0')}:00` : '09:00';
    const defaultEnd =
      hour !== undefined ? `${String(Math.min(hour + 1, 23)).padStart(2, '0')}:00` : '10:00';
    setForm({
      title: '',
      description: '',
      category: 'personal',
      date: isoDate(date),
      start_time: defaultStart,
      end_time: defaultEnd,
      recurrence: 'none',
      end_mode: 'count',
      recurrence_count: 10,
      until: isoDate(new Date(date.getTime() + 30 * 86400000)),
      weekdays: [date.getDay()],
    });
    setDialogOpen(true);
  };

  const openEdit = (e: CalendarEvent) => {
    setEditing(e);
    const [yy, mm, dd] = e.date.split('-').map(Number);
    setForm({
      title: e.title,
      description: e.description ?? '',
      category: e.category,
      date: e.date,
      start_time: e.start_time?.slice(0, 5) ?? '09:00',
      end_time: e.end_time?.slice(0, 5) ?? '10:00',
      recurrence: e.recurrence,
      end_mode: 'count',
      recurrence_count: e.recurrence_count ?? 1,
      until: e.date,
      weekdays: [new Date(yy, mm - 1, dd).getDay()],
    });
    setDialogOpen(true);
  };

  const createMutation = useMutation({
    mutationFn: createEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Event created');
      setDialogOpen(false);
    },
    onError: (e: Error) => toast.error(e.message ?? 'Could not create event'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<CalendarEvent> }) =>
      updateEvent(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Event updated');
      setDialogOpen(false);
    },
    onError: (e: Error) => toast.error(e.message ?? 'Could not update event'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteEvent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Event deleted');
    },
  });

  // Drag-to-move
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const moveEvent = (
    eventId: string,
    newDate: string,
    newStart: string | null,
    newEnd: string | null,
  ) => {
    const ev = events.find(e => e.id === eventId);
    if (!ev) return;
    if (ev.date === newDate && ev.start_time === newStart && ev.end_time === newEnd) return;
    updateMutation.mutate({
      id: eventId,
      updates: { date: newDate, start_time: newStart, end_time: newEnd },
    });
  };

  const handleDropOnHour = (
    e: React.DragEvent<HTMLDivElement>,
    day: Date,
  ) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/event-id');
    if (!id) return;
    const ev = events.find(x => x.id === id);
    if (!ev) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    const totalMin = (offsetY / HOUR_HEIGHT) * 60 + HOUR_START * 60;
    // Snap to 15 min
    const snapped = Math.max(HOUR_START * 60, Math.round(totalMin / 15) * 15);
    const newStartMin = snapped;
    const wasAllDay = !ev.start_time;
    const duration = ev.start_time && ev.end_time
      ? minutesFromTime(ev.end_time) - minutesFromTime(ev.start_time)
      : 60;
    const newEndMin = Math.min(HOUR_END * 60, newStartMin + duration);
    const toHHMM = (m: number) => {
      const h = Math.floor(m / 60);
      const mm = m % 60;
      return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00`;
    };
    moveEvent(
      id,
      isoDate(day),
      wasAllDay ? toHHMM(newStartMin) : toHHMM(newStartMin),
      wasAllDay ? toHHMM(newEndMin) : toHHMM(newEndMin),
    );
    setDraggingId(null);
  };

  const handleDropOnAllDay = (
    e: React.DragEvent<HTMLDivElement>,
    day: Date,
  ) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/event-id');
    if (!id) return;
    moveEvent(id, isoDate(day), null, null);
    setDraggingId(null);
  };

  const deleteSeriesMutation = useMutation({
    mutationFn: ({ recurrence_id, fromDate }: { recurrence_id: string; fromDate: string }) =>
      deleteRecurringEvents(recurrence_id, fromDate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Series deleted');
    },
  });

  const handleSubmit = () => {
    if (!form.title.trim()) {
      toast.error('Title is required');
      return;
    }
    const [y, m, d] = form.date.split('-').map(Number);
    const date = new Date(y, m - 1, d);

    const start_time = `${form.start_time}:00`;
    const end_time = `${form.end_time}:00`;

    if (editing) {
      updateMutation.mutate({
        id: editing.id,
        updates: {
          title: form.title.trim(),
          description: form.description.trim() || null,
          category: form.category,
          date: form.date,
          start_time,
          end_time,
        },
      });
    } else {
      const maxOcc = form.recurrence === 'daily' ? 366 : 366;
      const [uy, um, ud] = form.until.split('-').map(Number);
      const untilDate = form.end_mode === 'until' ? new Date(uy, um - 1, ud) : null;
      createMutation.mutate({
        title: form.title.trim(),
        description: form.description.trim() || null,
        category: form.category,
        date,
        start_time,
        end_time,
        recurrence: form.recurrence,
        end_mode: form.end_mode,
        recurrence_count:
          form.recurrence === 'none' ? 1 : Math.max(1, Math.min(maxOcc, form.recurrence_count)),
        until: untilDate,
        weekdays: form.recurrence === 'weekly' ? form.weekdays : undefined,
      });
    }
  };

  const handleDeleteRequest = (e: CalendarEvent) => {
    if (e.recurrence_id) {
      setPendingDelete(e);
    } else {
      deleteMutation.mutate(e.id);
      setDialogOpen(false);
    }
  };

  const today = new Date();

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="text-sm font-semibold">
          {view === 'week' ? (
            <>
              {weekStart.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}{' '}
              –{' '}
              {weekEnd.toLocaleDateString(undefined, {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </>
          ) : (
            anchor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {/* View toggle */}
          <div className="inline-flex rounded-md border bg-background p-0.5">
            <button
              onClick={() => setView('week')}
              className={cn(
                'px-2.5 py-1 text-xs font-medium rounded-sm transition-colors',
                view === 'week' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent',
              )}
            >
              Week
            </button>
            <button
              onClick={() => setView('month')}
              className={cn(
                'px-2.5 py-1 text-xs font-medium rounded-sm transition-colors',
                view === 'month' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent',
              )}
            >
              Month
            </button>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (view === 'week') setAnchor(addDays(weekStart, -7));
              else setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1));
            }}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setAnchor(new Date())}>
            Today
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (view === 'week') setAnchor(addDays(weekStart, 7));
              else setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1));
            }}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button size="sm" onClick={() => openCreate(new Date())}>
            <Plus className="h-4 w-4 mr-1" /> New event
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[180px_1fr] gap-4">
        {/* Categories sidebar */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Categories</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {CATEGORY_OPTIONS.map(c => {
              const active = activeCats.has(c.value);
              return (
                <button
                  key={c.value}
                  onClick={() => {
                    const next = new Set(activeCats);
                    if (active) next.delete(c.value);
                    else next.add(c.value);
                    setActiveCats(next);
                  }}
                  className={cn(
                    'w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors',
                    active ? 'bg-accent' : 'opacity-50 hover:opacity-80',
                  )}
                >
                  <span className={cn('h-2.5 w-2.5 rounded-full', c.swatch)} />
                  <c.icon className="h-3.5 w-3.5" />
                  <span className="flex-1 text-left">{c.label}</span>
                </button>
              );
            })}
          </CardContent>
        </Card>

        {/* Calendar grid */}
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            {view === 'week' ? (
              <>
                {/* Day header row */}
                <div className="grid grid-cols-[48px_repeat(7,1fr)] border-b bg-muted/30">
                  <div className="border-r" />
                  {weekDays.map((d, i) => {
                    const isToday = sameDay(d, today);
                    return (
                      <div
                        key={i}
                        className={cn(
                          'px-1 py-1.5 text-center border-r last:border-r-0',
                          isToday && 'bg-primary/10',
                        )}
                      >
                        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          {WEEKDAY_LABELS[i]}
                        </div>
                        <div
                          className={cn(
                            'mt-0.5 inline-flex items-center justify-center h-6 w-6 rounded-full text-[13px] font-semibold',
                            isToday && 'bg-primary text-primary-foreground',
                          )}
                        >
                          {d.getDate()}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Hourly grid */}
                <div className="grid grid-cols-[48px_repeat(7,1fr)] relative">
                  {/* Hour labels */}
                  <div className="border-r">
                    {Array.from({ length: TOTAL_HOURS }, (_, i) => HOUR_START + i).map(h => (
                      <div
                        key={h}
                        className="text-[10px] text-muted-foreground text-right pr-1 leading-none pt-0.5"
                        style={{ height: HOUR_HEIGHT }}
                      >
                        {h}:00
                      </div>
                    ))}
                  </div>

                  {/* Day columns */}
                  {weekDays.map((d, dayIdx) => {
                    const dayEvents = eventsByDay[dayIdx];
                    const isToday = sameDay(d, today);
                    return (
                      <div
                        key={dayIdx}
                        className={cn(
                          'relative border-r last:border-r-0',
                          isToday && 'bg-primary/[0.03]',
                        )}
                        style={{ height: TOTAL_HOURS * HOUR_HEIGHT }}
                        onDragOver={ev => { ev.preventDefault(); ev.dataTransfer.dropEffect = 'move'; }}
                        onDrop={ev => handleDropOnHour(ev, d)}
                      >
                        {Array.from({ length: TOTAL_HOURS }, (_, i) => HOUR_START + i).map(h => (
                          <div
                            key={h}
                            onClick={() => openCreate(d, h)}
                            className="border-b border-border/40 cursor-pointer hover:bg-accent/30 transition-colors"
                            style={{ height: HOUR_HEIGHT }}
                          />
                        ))}

                        {dayEvents.map(e => {
                          // Untimed events span full visible day
                          const isUntimed = !e.start_time;
                          const startMin = isUntimed ? HOUR_START * 60 : minutesFromTime(e.start_time!);
                          const endMin = isUntimed
                            ? HOUR_END * 60
                            : e.end_time ? minutesFromTime(e.end_time) : startMin + 60;
                          const top = ((startMin - HOUR_START * 60) / 60) * HOUR_HEIGHT;
                          const height = Math.max(
                            16,
                            ((endMin - startMin) / 60) * HOUR_HEIGHT - 2,
                          );
                          if (top + height < 0 || top > TOTAL_HOURS * HOUR_HEIGHT) return null;
                          const cs = getCatStyle(e.category);
                          return (
                            <HoverCard key={e.id} openDelay={150} closeDelay={50}>
                              <HoverCardTrigger asChild>
                                <button
                                  onClick={ev => {
                                    ev.stopPropagation();
                                    openEdit(e);
                                  }}
                                  draggable
                                  onDragStart={ev => {
                                    ev.dataTransfer.setData('text/event-id', e.id);
                                    ev.dataTransfer.effectAllowed = 'move';
                                    setDraggingId(e.id);
                                  }}
                                  onDragEnd={() => setDraggingId(null)}
                                  className={cn(
                                    'absolute left-0.5 right-0.5 rounded-sm border-l-2 px-1 py-0.5 text-left text-[10px] overflow-hidden shadow-sm cursor-grab active:cursor-grabbing leading-tight',
                                    cs.bar,
                                    cs.border,
                                    cs.text,
                                    draggingId === e.id && 'opacity-50',
                                  )}
                                  style={{ top: Math.max(0, top), height }}
                                >
                                  <div className="font-medium truncate">{e.title}</div>
                                  {!isUntimed && (
                                    <div className="opacity-80 truncate text-[9px]">
                                      {fmtTime(e.start_time)}
                                      {e.end_time && `–${fmtTime(e.end_time)}`}
                                      {e.recurrence_id && ' ↻'}
                                    </div>
                                  )}
                                </button>
                              </HoverCardTrigger>
                              <EventHoverPopup event={e} />
                            </HoverCard>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              /* Month view (Google-style mini grid) */
              <div>
                {/* Weekday header */}
                <div className="grid grid-cols-7 border-b bg-muted/30">
                  {WEEKDAY_LABELS.map(l => (
                    <div
                      key={l}
                      className="text-[10px] uppercase tracking-wide text-muted-foreground text-center py-1.5 border-r last:border-r-0"
                    >
                      {l}
                    </div>
                  ))}
                </div>
                {/* 6 week rows */}
                <div className="grid grid-cols-7 grid-rows-6">
                  {monthInfo.days.map((d, i) => {
                    const inMonth = d.getMonth() === anchor.getMonth();
                    const isToday = sameDay(d, today);
                    const dayEvents = eventsByIsoDate.get(isoDate(d)) ?? [];
                    const visible = dayEvents.slice(0, 3);
                    const hidden = dayEvents.length - visible.length;
                    return (
                      <div
                        key={i}
                        onClick={() => openCreate(d)}
                        onDragOver={ev => { ev.preventDefault(); ev.dataTransfer.dropEffect = 'move'; }}
                        onDrop={ev => handleDropOnAllDay(ev, d)}
                        className={cn(
                          'min-h-[88px] border-b border-r last:border-r-0 p-1 cursor-pointer hover:bg-accent/30 transition-colors flex flex-col gap-0.5',
                          !inMonth && 'bg-muted/20',
                          isToday && 'bg-primary/5',
                          (i + 1) % 7 === 0 && 'border-r-0',
                          i >= 35 && 'border-b-0',
                        )}
                      >
                        <div
                          className={cn(
                            'self-end inline-flex items-center justify-center h-5 w-5 rounded-full text-[11px] font-semibold',
                            !inMonth && 'text-muted-foreground/60',
                            isToday && 'bg-primary text-primary-foreground',
                          )}
                        >
                          {d.getDate()}
                        </div>
                        <div className="flex-1 space-y-0.5 overflow-hidden">
                          {visible.map(e => {
                            const cs = getCatStyle(e.category);
                            return (
                              <HoverCard key={e.id} openDelay={150} closeDelay={50}>
                                <HoverCardTrigger asChild>
                                  <button
                                    onClick={ev => { ev.stopPropagation(); openEdit(e); }}
                                    draggable
                                    onDragStart={ev => {
                                      ev.stopPropagation();
                                      ev.dataTransfer.setData('text/event-id', e.id);
                                      ev.dataTransfer.effectAllowed = 'move';
                                      setDraggingId(e.id);
                                    }}
                                    onDragEnd={() => setDraggingId(null)}
                                    className={cn(
                                      'w-full flex items-center gap-1 rounded-sm px-1 py-0 text-left text-[10px] truncate cursor-grab active:cursor-grabbing leading-tight',
                                      cs.bar,
                                      cs.text,
                                      draggingId === e.id && 'opacity-50',
                                    )}
                                  >
                                    <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', cs.swatch)} />
                                    {e.start_time && (
                                      <span className="opacity-70 shrink-0">{fmtTime(e.start_time)}</span>
                                    )}
                                    <span className="truncate">{e.title}</span>
                                  </button>
                                </HoverCardTrigger>
                                <EventHoverPopup event={e} />
                              </HoverCard>
                            );
                          })}
                          {hidden > 0 && (
                            <div className="text-[10px] text-muted-foreground px-1">
                              +{hidden} more
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit event' : 'New event'}</DialogTitle>
            <DialogDescription>
              {editing
                ? 'Update or remove this event. To change the repeat pattern, delete and recreate.'
                : 'Plan something on your personal calendar. Choose a repeat pattern below for daily, weekly, or monthly events.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="ev-title">Title</Label>
              <Input
                id="ev-title"
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                placeholder="Doctor appointment, Cleaning, Journaling…"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select
                  value={form.category}
                  onValueChange={v => setForm({ ...form, category: v as EventCategory })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    {CATEGORY_OPTIONS.map(c => (
                      <SelectItem key={c.value} value={c.value}>
                        <span className="flex items-center gap-2">
                          <span className={cn('h-2 w-2 rounded-full', c.swatch)} />
                          {c.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ev-date">Date</Label>
                <Input
                  id="ev-date"
                  type="date"
                  value={form.date}
                  onChange={e => setForm({ ...form, date: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ev-start">Start</Label>
                <Input
                  id="ev-start"
                  type="time"
                  value={form.start_time}
                  onChange={e => setForm({ ...form, start_time: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ev-end">End</Label>
                <Input
                  id="ev-end"
                  type="time"
                  value={form.end_time}
                  onChange={e => setForm({ ...form, end_time: e.target.value })}
                />
              </div>
            </div>

            {!editing && (
              <div className="rounded-md border border-primary/30 bg-primary/5 p-3 space-y-3">
                <Label className="text-xs font-semibold uppercase tracking-wide text-primary">
                  ↻ Repeat this event
                </Label>

                <div className="space-y-1.5">
                  <Label className="text-xs">Frequency</Label>
                  <Select
                    value={form.recurrence}
                    onValueChange={v => setForm({ ...form, recurrence: v as EventRecurrence })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      <SelectItem value="none">Does not repeat</SelectItem>
                      <SelectItem value="daily">Every day</SelectItem>
                      <SelectItem value="weekly">Weekly on selected days</SelectItem>
                      <SelectItem value="monthly">Every month</SelectItem>
                      <SelectItem value="yearly">Every year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {form.recurrence === 'weekly' && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Repeat on</Label>
                    <div className="flex gap-1.5 flex-wrap">
                      {[
                        { d: 0, l: 'S' },
                        { d: 1, l: 'M' },
                        { d: 2, l: 'T' },
                        { d: 3, l: 'W' },
                        { d: 4, l: 'T' },
                        { d: 5, l: 'F' },
                        { d: 6, l: 'S' },
                      ].map(({ d, l }) => {
                        const active = form.weekdays.includes(d);
                        return (
                          <button
                            key={d}
                            type="button"
                            onClick={() =>
                              setForm({
                                ...form,
                                weekdays: active
                                  ? form.weekdays.filter(x => x !== d)
                                  : [...form.weekdays, d],
                              })
                            }
                            className={cn(
                              'h-8 w-8 rounded-full border text-xs font-semibold transition-colors',
                              active
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'bg-background border-border text-muted-foreground hover:bg-accent',
                            )}
                            aria-pressed={active}
                            aria-label={`Toggle ${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d]}`}
                          >
                            {l}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {form.recurrence !== 'none' && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Ends</Label>
                    <div className="flex gap-2">
                      <Select
                        value={form.end_mode}
                        onValueChange={v => setForm({ ...form, end_mode: v as 'count' | 'until' })}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-popover z-50">
                          <SelectItem value="count">After</SelectItem>
                          <SelectItem value="until">On date</SelectItem>
                        </SelectContent>
                      </Select>
                      {form.end_mode === 'count' ? (
                        <div className="flex items-center gap-2 flex-1">
                          <Input
                            type="number"
                            min={1}
                            max={366}
                            value={form.recurrence_count}
                            onChange={e =>
                              setForm({
                                ...form,
                                recurrence_count: parseInt(e.target.value || '1', 10),
                              })
                            }
                            className="flex-1"
                          />
                          <span className="text-xs text-muted-foreground">times</span>
                        </div>
                      ) : (
                        <Input
                          type="date"
                          value={form.until}
                          min={form.date}
                          onChange={e => setForm({ ...form, until: e.target.value })}
                          className="flex-1"
                        />
                      )}
                    </div>
                  </div>
                )}

                {form.recurrence === 'daily' && (
                  <p className="text-[10px] text-muted-foreground">
                    Tip: for things you want to track consistency on (work, gym, journaling), the Habit Tracker is a better fit.
                  </p>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="ev-desc">Notes (optional)</Label>
              <Textarea
                id="ev-desc"
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            {editing ? (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => handleDeleteRequest(editing)}
              >
                <Trash2 className="h-4 w-4 mr-1" /> Delete
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {editing ? 'Save' : 'Create'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Recurring delete prompt */}
      <AlertDialog open={!!pendingDelete} onOpenChange={o => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete recurring event</AlertDialogTitle>
            <AlertDialogDescription>
              This event is part of a series. What would you like to delete?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button
              variant="outline"
              onClick={() => {
                if (pendingDelete) {
                  deleteMutation.mutate(pendingDelete.id);
                  setPendingDelete(null);
                  setDialogOpen(false);
                }
              }}
            >
              Only this occurrence
            </Button>
            <AlertDialogAction
              onClick={() => {
                if (pendingDelete?.recurrence_id) {
                  deleteSeriesMutation.mutate({
                    recurrence_id: pendingDelete.recurrence_id,
                    fromDate: pendingDelete.date,
                  });
                  setPendingDelete(null);
                  setDialogOpen(false);
                }
              }}
            >
              This & all future
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
