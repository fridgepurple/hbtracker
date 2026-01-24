import { useCallback, useMemo, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths } from 'date-fns';
import Layout from '@/components/Layout';
import HabitCheckbox from '@/components/HabitCheckbox';
import HabitHeatMap from '@/components/HabitHeatMap';
import { fetchHabits, fetchHabitLogs, toggleHabitLog, calculateMonthlyProgress, updateHabit } from '@/lib/habitQueries';
import { fetchMoodEntries, upsertMoodEntry, ensureMoodOptionsSeeded, MoodOption, MoodEntry } from '@/lib/moodQueries';
import DayCheckInDialog, { energyToEmoji } from '@/components/DayCheckInDialog';
import { sortHabits, sortOptions, SortOption } from '@/lib/habitSorting';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ChevronLeft, ChevronRight, GripVertical, Grid3X3, Table, TrendingDown, TrendingUp, Award } from 'lucide-react';
import { toast } from 'sonner';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';

interface SortableHabitMonthRowProps {
  habit: any;
  daysInMonth: Date[];
  logs: any[];
  isCustomSort: boolean;
  onToggle: (habitId: string, date: string, completed: boolean) => void;
}

function SortableHabitMonthRow({ habit, daysInMonth, logs, isCustomSort, onToggle }: SortableHabitMonthRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: habit.id, disabled: !isCustomSort });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isCompleted = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return logs.some(log => log.habit_id === habit.id && log.date === dateStr && log.completed);
  };

  return (
    <div 
      ref={setNodeRef}
      style={{
        ...style,
        gridTemplateColumns: `200px repeat(${Math.min(daysInMonth.length, 31)}, minmax(32px, 1fr))`
      }}
      className="grid gap-1 p-2 border-b hover:bg-muted/30 transition-colors"
    >
      <div className="p-2 flex items-center gap-2 min-w-0">
        {isCustomSort && (
          <button
            type="button"
            className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors flex-shrink-0 touch-none"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-5 w-5" />
          </button>
        )}
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="cursor-default">
                <div className="font-medium truncate text-sm">{habit.name}</div>
                {(habit.start_time || habit.end_time) && (
                  <div className="text-xs text-muted-foreground truncate">
                    {habit.start_time && habit.start_time.slice(0, 5)}
                    {habit.start_time && habit.end_time && ' - '}
                    {habit.end_time && habit.end_time.slice(0, 5)}
                  </div>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-[200px]">
              <p className="font-medium">{habit.name}</p>
              {habit.description && (
                <p className="text-xs text-muted-foreground mt-1">{habit.description}</p>
              )}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      {daysInMonth.slice(0, 31).map(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const completed = isCompleted(day);
        
        return (
          <div key={dateStr} className="flex items-center justify-center">
            <HabitCheckbox
              checked={completed}
              onCheckedChange={(checked) => onToggle(habit.id, dateStr, checked as boolean)}
            />
          </div>
        );
      })}
    </div>
  );
}

export default function MonthView() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [sortBy, setSortBy] = useState<SortOption>('alphabetical');
  const [viewMode, setViewMode] = useState<'grid' | 'heatmap'>('heatmap');
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [checkInDate, setCheckInDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const queryClient = useQueryClient();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const { data: habits = [] } = useQuery({
    queryKey: ['habits'],
    queryFn: fetchHabits,
  });

  const sortedHabits = useMemo(() => sortHabits(habits, sortBy), [habits, sortBy]);

  const { data: logs = [] } = useQuery({
    queryKey: ['habitLogs', format(monthStart, 'yyyy-MM-dd'), format(monthEnd, 'yyyy-MM-dd')],
    queryFn: () => fetchHabitLogs(format(monthStart, 'yyyy-MM-dd'), format(monthEnd, 'yyyy-MM-dd')),
  });

  // Mood options (seeded once)
  const { data: moodOptions = [] } = useQuery({
    queryKey: ['moodOptions'],
    queryFn: ensureMoodOptionsSeeded,
    staleTime: Infinity,
  });

  const { data: moodEntries = [] } = useQuery({
    queryKey: ['moodEntries', format(monthStart, 'yyyy-MM-dd'), format(monthEnd, 'yyyy-MM-dd')],
    queryFn: () => fetchMoodEntries(format(monthStart, 'yyyy-MM-dd'), format(monthEnd, 'yyyy-MM-dd')),
  });

  const moodEntryByDate = useMemo(() => {
    const map = new Map<string, (typeof moodEntries)[number]>();
    for (const e of moodEntries) map.set(e.date, e);
    return map;
  }, [moodEntries]);

  const toggleMutation = useMutation({
    mutationFn: ({ habitId, date, completed }: { habitId: string; date: string; completed: boolean }) =>
      toggleHabitLog(habitId, date, completed),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habitLogs'] });
      toast.success('Habit updated!');
    },
    onError: () => {
      toast.error('Failed to update habit');
    },
  });

  const moodUpsertMutation = useMutation({
    mutationFn: upsertMoodEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['moodEntries'] });
    },
    onError: () => {
      toast.error('Failed to save check-in');
    },
  });

  const openCheckIn = useCallback((date: string) => {
    setCheckInDate(date);
    setCheckInOpen(true);
  }, []);

  const updateOrderMutation = useMutation({
    mutationFn: async (updates: Array<{ id: string; display_order: number }>) => {
      await Promise.all(updates.map(({ id, display_order }) => updateHabit(id, { display_order })));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
    },
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) return;

    const oldIndex = sortedHabits.findIndex(h => h.id === active.id);
    const newIndex = sortedHabits.findIndex(h => h.id === over.id);
    
    const newOrder = arrayMove(sortedHabits, oldIndex, newIndex);
    const updates = newOrder.map((habit, index) => ({
      id: habit.id,
      display_order: index,
    }));
    
    updateOrderMutation.mutate(updates);
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Month Navigator */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, -1))}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <CardTitle className="text-2xl">
                  {format(currentMonth, 'MMMM')} <span className="text-muted-foreground">{format(currentMonth, 'yyyy')}</span>
                </CardTitle>
                
                <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex items-center gap-2">
                <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'grid' | 'heatmap')}>
                  <TabsList>
                    <TabsTrigger value="heatmap" className="gap-1.5">
                      <Grid3X3 className="h-4 w-4" />
                      Heat Map
                    </TabsTrigger>
                    <TabsTrigger value="grid" className="gap-1.5">
                      <Table className="h-4 w-4" />
                      Grid
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
                
                <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    {sortOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Month View Content */}
        {sortedHabits.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                No habits yet. Create your first habit from Today view.
              </p>
            </CardContent>
          </Card>
        ) : viewMode === 'heatmap' ? (
          <Card>
            <CardContent className="py-6">
              <HabitHeatMap
                habits={sortedHabits}
                logs={logs}
                startDate={monthStart}
                endDate={monthEnd}
                onToggle={(habitId, date, completed) =>
                  toggleMutation.mutate({ habitId, date, completed })
                }
                onDayClick={(date) => openCheckIn(date)}
                bottomRows={
                  <div className="mt-3 space-y-1">
                    {/* Mood row (emoji only) */}
                    <div className="flex items-center gap-1">
                      <div className="w-32 pr-2 truncate text-xs font-medium text-muted-foreground">Mood</div>
                      <div className="flex gap-1">
                        {daysInMonth.map((d) => {
                          const dateStr = format(d, 'yyyy-MM-dd');
                          const entry = moodEntryByDate.get(dateStr);
                          const emoji = entry?.emoji ?? '·';
                          const isPlaceholder = emoji === '·';
                          return (
                            <button
                              key={`mood-${dateStr}`}
                              type="button"
                              onClick={() => openCheckIn(dateStr)}
                              className={cn(
                                'w-6 h-6 rounded-sm border border-border/50 flex items-center justify-center text-[12px] transition-transform',
                                'hover:scale-110 active:scale-95',
                                isPlaceholder && 'text-muted-foreground/70'
                              )}
                              aria-label={`Mood check-in for ${dateStr}`}
                            >
                              {emoji}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Energy row */}
                    <div className="flex items-center gap-1">
                      <div className="w-32 pr-2 truncate text-xs font-medium text-muted-foreground">Energy</div>
                      <div className="flex gap-1">
                        {daysInMonth.map((d) => {
                          const dateStr = format(d, 'yyyy-MM-dd');
                          const entry = moodEntryByDate.get(dateStr);
                          const emoji = entry ? energyToEmoji(entry.energy) : '·';
                          const isPlaceholder = emoji === '·';
                          return (
                            <button
                              key={`energy-${dateStr}`}
                              type="button"
                              onClick={() => openCheckIn(dateStr)}
                              className={cn(
                                'w-6 h-6 rounded-sm border border-border/50 flex items-center justify-center text-[11px] transition-transform',
                                'hover:scale-110 active:scale-95',
                                isPlaceholder && 'text-muted-foreground/70'
                              )}
                              aria-label={`Energy check-in for ${dateStr}`}
                            >
                              {emoji}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                }
              />
            </CardContent>
          </Card>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <div className="min-w-[800px]">
                {/* Header */}
                <div className="grid gap-1 p-2 bg-muted/50 border-b" style={{
                  gridTemplateColumns: `200px repeat(${Math.min(daysInMonth.length, 31)}, minmax(32px, 1fr))`
                }}>
                  <div className="p-2 font-medium">Habit</div>
                  {daysInMonth.slice(0, 31).map(day => (
                    <div key={day.toISOString()} className="text-center text-xs p-1">
                      {format(day, 'd')}
                    </div>
                  ))}
                </div>

                {/* Habit Rows */}
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={sortedHabits.map(h => h.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {sortedHabits.map(habit => (
                      <SortableHabitMonthRow
                        key={habit.id}
                        habit={habit}
                        daysInMonth={daysInMonth}
                        logs={logs}
                        isCustomSort={sortBy === 'custom'}
                        onToggle={(habitId, date, completed) =>
                          toggleMutation.mutate({ habitId, date, completed })
                        }
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              </div>
            </div>
          </Card>
        )}

        {/* Progress Summary - Categorized */}
        {habits.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Need Improve - Red */}
            {(() => {
              const needImproveHabits = habits.filter(habit => {
                const progress = calculateMonthlyProgress(habit.id, currentMonth.getFullYear(), currentMonth.getMonth(), logs);
                return progress < 50;
              });
              return (
                <Card className="border-destructive/30 bg-destructive/5">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="p-1.5 rounded-full bg-destructive/20">
                        <TrendingDown className="h-4 w-4 text-destructive" />
                      </div>
                      <h3 className="font-semibold text-destructive">Need Improve</h3>
                      <span className="ml-auto text-xs text-muted-foreground">(&lt;50%)</span>
                    </div>
                    {needImproveHabits.length === 0 ? (
                      <p className="text-sm text-muted-foreground italic">No habits here</p>
                    ) : (
                      <ul className="space-y-2">
                        {needImproveHabits.map(habit => {
                          const progress = calculateMonthlyProgress(habit.id, currentMonth.getFullYear(), currentMonth.getMonth(), logs);
                          return (
                            <li key={habit.id} className="flex items-center justify-between text-sm">
                              <span className="truncate max-w-[150px]">{habit.name}</span>
                              <span className="font-medium text-destructive">{progress}%</span>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              );
            })()}

            {/* Moderated - Yellow */}
            {(() => {
              const moderatedHabits = habits.filter(habit => {
                const progress = calculateMonthlyProgress(habit.id, currentMonth.getFullYear(), currentMonth.getMonth(), logs);
                return progress >= 50 && progress < 80;
              });
              return (
                <Card className="border-warning/30 bg-warning/5">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="p-1.5 rounded-full bg-warning/20">
                        <TrendingUp className="h-4 w-4 text-warning" />
                      </div>
                      <h3 className="font-semibold text-warning">Moderated</h3>
                      <span className="ml-auto text-xs text-muted-foreground">(50-79%)</span>
                    </div>
                    {moderatedHabits.length === 0 ? (
                      <p className="text-sm text-muted-foreground italic">No habits here</p>
                    ) : (
                      <ul className="space-y-2">
                        {moderatedHabits.map(habit => {
                          const progress = calculateMonthlyProgress(habit.id, currentMonth.getFullYear(), currentMonth.getMonth(), logs);
                          return (
                            <li key={habit.id} className="flex items-center justify-between text-sm">
                              <span className="truncate max-w-[150px]">{habit.name}</span>
                              <span className="font-medium text-warning">{progress}%</span>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              );
            })()}

            {/* Consistent - Green */}
            {(() => {
              const consistentHabits = habits.filter(habit => {
                const progress = calculateMonthlyProgress(habit.id, currentMonth.getFullYear(), currentMonth.getMonth(), logs);
                return progress >= 80;
              });
              return (
                <Card className="border-success/30 bg-success/5">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="p-1.5 rounded-full bg-success/20">
                        <Award className="h-4 w-4 text-success" />
                      </div>
                      <h3 className="font-semibold text-success">Consistent</h3>
                      <span className="ml-auto text-xs text-muted-foreground">(≥80%)</span>
                    </div>
                    {consistentHabits.length === 0 ? (
                      <p className="text-sm text-muted-foreground italic">No habits here</p>
                    ) : (
                      <ul className="space-y-2">
                        {consistentHabits.map(habit => {
                          const progress = calculateMonthlyProgress(habit.id, currentMonth.getFullYear(), currentMonth.getMonth(), logs);
                          return (
                            <li key={habit.id} className="flex items-center justify-between text-sm">
                              <span className="truncate max-w-[150px]">{habit.name}</span>
                              <span className="font-medium text-success">{progress}%</span>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              );
            })()}
          </div>
        )}

        <DayCheckInDialog
          open={checkInOpen}
          onOpenChange={setCheckInOpen}
          date={checkInDate}
          moodOptions={moodOptions}
          existing={moodEntryByDate.get(checkInDate) ?? null}
          onChange={(next) => moodUpsertMutation.mutate(next)}
        />
      </div>
    </Layout>
  );
}
