import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import Layout from '@/components/Layout';
import HabitCheckbox from '@/components/HabitCheckbox';
import { fetchHabits, fetchHabitLogs, toggleHabitLog, updateHabit } from '@/lib/habitQueries';
import { getCategoryColor } from '@/lib/categoryColors';
import { sortHabits, sortOptions, SortOption } from '@/lib/habitSorting';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Sunrise, Sun, Moon, Clock } from 'lucide-react';

interface SortableHabitCardProps {
  habit: any;
  isCompleted: boolean;
  isCustomSort: boolean;
  onToggle: (checked: boolean) => void;
}

function SortableHabitCard({ habit, isCompleted, isCustomSort, onToggle }: SortableHabitCardProps) {
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

  return (
    <Card ref={setNodeRef} style={style} className="hover:shadow-sm transition-all border-2">
      <CardContent className="py-4">
        <div className="flex items-center gap-3">
          {isCustomSort && (
            <button
              type="button"
              className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors touch-none"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-5 w-5" />
            </button>
          )}
          <HabitCheckbox
            checked={isCompleted}
            onCheckedChange={onToggle}
          />
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate">{habit.name}</div>
            {(habit.start_time || habit.end_time) && (
              <div className="text-sm text-muted-foreground">
                {habit.start_time && habit.start_time.slice(0, 5)}
                {habit.start_time && habit.end_time && ' - '}
                {habit.end_time && habit.end_time.slice(0, 5)}
              </div>
            )}
          </div>
          {habit.category && (
            <span className={`hidden sm:inline-flex px-2 py-1 text-xs rounded-full font-medium ${getCategoryColor(habit.category).bg} ${getCategoryColor(habit.category).text}`}>
              {habit.category}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

type TimeOfDay = 'morning' | 'noon' | 'night' | 'unscheduled';

function getTimeOfDay(startTime: string | null): TimeOfDay {
  if (!startTime) return 'unscheduled';
  
  const hour = parseInt(startTime.split(':')[0]);
  
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'noon';
  return 'night';
}

const timeOfDayConfig = {
  morning: {
    label: 'Morning',
    icon: Sunrise,
    gradient: 'from-blue-500/10 to-blue-600/10',
    border: 'border-blue-500/20',
    text: 'text-blue-600',
    iconBg: 'bg-blue-500',
  },
  noon: {
    label: 'Noon',
    icon: Sun,
    gradient: 'from-orange-500/10 to-orange-600/10',
    border: 'border-orange-500/20',
    text: 'text-orange-600',
    iconBg: 'bg-orange-500',
  },
  night: {
    label: 'Night',
    icon: Moon,
    gradient: 'from-purple-500/10 to-purple-600/10',
    border: 'border-purple-500/20',
    text: 'text-purple-600',
    iconBg: 'bg-purple-500',
  },
  unscheduled: {
    label: 'Unscheduled',
    icon: Clock,
    gradient: 'from-muted/10 to-muted/20',
    border: 'border-muted/20',
    text: 'text-muted-foreground',
    iconBg: 'bg-muted',
  },
};

export default function Dashboard() {
  const [sortBy, setSortBy] = useState<SortOption>('alphabetical');
  const queryClient = useQueryClient();
  const today = new Date();
  const dateStr = format(today, 'yyyy-MM-dd');

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

  const { data: habits = [] } = useQuery({
    queryKey: ['habits'],
    queryFn: fetchHabits,
  });

  const sortedHabits = useMemo(() => sortHabits(habits, sortBy), [habits, sortBy]);
  
  const habitsByTimeOfDay = useMemo(() => {
    const grouped: Record<TimeOfDay, typeof habits> = {
      morning: [],
      noon: [],
      night: [],
      unscheduled: [],
    };
    
    sortedHabits.forEach(habit => {
      const timeOfDay = getTimeOfDay(habit.start_time);
      grouped[timeOfDay].push(habit);
    });
    
    return grouped;
  }, [sortedHabits]);

  const { data: logs = [] } = useQuery({
    queryKey: ['habitLogs', dateStr, dateStr],
    queryFn: () => fetchHabitLogs(dateStr, dateStr),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ habitId, completed }: { habitId: string; completed: boolean }) =>
      toggleHabitLog(habitId, dateStr, completed),
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
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <CardTitle className="text-2xl">Today - {format(today, 'MMMM d, yyyy')}</CardTitle>
              
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

        {/* Habits by Time of Day */}
        {sortedHabits.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                No habits yet. <a href="/habits" className="text-primary hover:underline">Create your first habit</a>
              </p>
            </CardContent>
          </Card>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <div className="space-y-6">
              {(['morning', 'noon', 'night', 'unscheduled'] as TimeOfDay[]).map(timeOfDay => {
                const habitsInPeriod = habitsByTimeOfDay[timeOfDay];
                // Only hide unscheduled if empty
                if (timeOfDay === 'unscheduled' && habitsInPeriod.length === 0) return null;
                
                const config = timeOfDayConfig[timeOfDay];
                const Icon = config.icon;
                
                return (
                  <div key={timeOfDay}>
                    <Card className={`bg-gradient-to-br ${config.gradient} ${config.border} mb-3`}>
                      <CardHeader className="py-3">
                        <div className="flex items-center gap-2">
                          <div className={`p-2 rounded-lg ${config.iconBg} text-white`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <CardTitle className={`text-lg ${config.text}`}>
                            {config.label}
                          </CardTitle>
                          <Badge variant="secondary" className="ml-auto">
                            {habitsInPeriod.filter(h => 
                              logs.some(log => log.habit_id === h.id && log.date === dateStr && log.completed)
                            ).length} / {habitsInPeriod.length}
                          </Badge>
                        </div>
                      </CardHeader>
                    </Card>
                    
                    <SortableContext
                      items={habitsInPeriod.map(h => h.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-3">
                        {habitsInPeriod.map(habit => {
                          const completed = logs.some(log => 
                            log.habit_id === habit.id && log.date === dateStr && log.completed
                          );
                          
                          return (
                            <SortableHabitCard
                              key={habit.id}
                              habit={habit}
                              isCompleted={completed}
                              isCustomSort={sortBy === 'custom'}
                              onToggle={(checked) =>
                                toggleMutation.mutate({ 
                                  habitId: habit.id, 
                                  completed: checked as boolean 
                                })
                              }
                            />
                          );
                        })}
                      </div>
                    </SortableContext>
                  </div>
                );
              })}
            </div>
          </DndContext>
        )}
      </div>
    </Layout>
  );
}
