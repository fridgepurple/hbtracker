import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths } from 'date-fns';
import Layout from '@/components/Layout';
import HabitCheckbox from '@/components/HabitCheckbox';
import ProgressCard from '@/components/ProgressCard';
import { fetchHabits, fetchHabitLogs, toggleHabitLog, calculateMonthlyProgress, updateHabit } from '@/lib/habitQueries';
import { sortHabits, sortOptions, SortOption } from '@/lib/habitSorting';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, GripVertical } from 'lucide-react';
import { toast } from 'sonner';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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
          <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing flex-shrink-0">
            <GripVertical className="h-5 w-5 text-muted-foreground" />
          </div>
        )}
        <div>
          <div className="font-medium truncate text-sm">{habit.name}</div>
          {(habit.start_time || habit.end_time) && (
            <div className="text-xs text-muted-foreground truncate">
              {habit.start_time && habit.start_time.slice(0, 5)}
              {habit.start_time && habit.end_time && ' - '}
              {habit.end_time && habit.end_time.slice(0, 5)}
            </div>
          )}
        </div>
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
  const queryClient = useQueryClient();

  const sensors = useSensors(
    useSensor(PointerSensor),
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
                  {format(currentMonth, 'MMMM yyyy')}
                </CardTitle>
                
                <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              
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
          </CardHeader>
        </Card>

        {/* Progress Cards */}
        {habits.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {habits.map(habit => {
              const progress = calculateMonthlyProgress(
                habit.id,
                currentMonth.getFullYear(),
                currentMonth.getMonth(),
                logs
              );

              return (
                <ProgressCard
                  key={habit.id}
                  habitName={habit.name}
                  percentage={progress}
                />
              );
            })}
          </div>
        )}

        {/* Month Grid */}
        {sortedHabits.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                No habits yet. <a href="/habits" className="text-primary hover:underline">Create your first habit</a>
              </p>
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
      </div>
    </Layout>
  );
}
