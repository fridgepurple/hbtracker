import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import Layout from '@/components/Layout';
import HabitCheckbox from '@/components/HabitCheckbox';
import { fetchHabits, fetchHabitLogs, toggleHabitLog, updateHabit } from '@/lib/habitQueries';
import { sortHabits, sortOptions, SortOption } from '@/lib/habitSorting';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, GripVertical } from 'lucide-react';
import { toast } from 'sonner';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableHabitCardProps {
  habit: any;
  log: any;
  isCustomSort: boolean;
  onToggle: (habitId: string, completed: boolean) => void;
}

function SortableHabitCard({ habit, log, isCustomSort, onToggle }: SortableHabitCardProps) {
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

  const isCompleted = log?.completed || false;

  return (
    <Card ref={setNodeRef} style={style} className="hover:shadow-md transition-shadow">
      <CardContent className="py-4">
        <div className="flex items-center gap-4">
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
            onCheckedChange={(checked) => onToggle(habit.id, checked as boolean)}
          />
          
          <div className="flex-1 min-w-0">
            <h3 className="font-medium truncate">{habit.name}</h3>
            {habit.description && (
              <p className="text-sm text-muted-foreground truncate">
                {habit.description}
              </p>
            )}
            {habit.category && (
              <span className="inline-block mt-1 px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary">
                {habit.category}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [sortBy, setSortBy] = useState<SortOption>('alphabetical');
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
  
  const dateStr = format(selectedDate, 'yyyy-MM-dd');

  const { data: habits = [] } = useQuery({
    queryKey: ['habits'],
    queryFn: fetchHabits,
  });

  const sortedHabits = useMemo(() => sortHabits(habits, sortBy), [habits, sortBy]);

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

  const completedToday = sortedHabits.filter(habit =>
    logs.some(log => log.habit_id === habit.id && log.completed)
  ).length;

  const changeDate = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Date Navigator */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <Button variant="outline" size="icon" onClick={() => changeDate(-1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <CardTitle className="text-2xl">
                {format(selectedDate, 'EEEE, MMMM d, yyyy')}
              </CardTitle>
              
              <Button variant="outline" size="icon" onClick={() => changeDate(1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary">
                {completedToday} / {sortedHabits.length}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                habits completed today
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Sort Control */}
        <div className="flex justify-end">
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

        {/* Habits List */}
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
            <SortableContext
              items={sortedHabits.map(h => h.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="grid gap-3">
                {sortedHabits.map(habit => {
                  const log = logs.find(l => l.habit_id === habit.id);
                  return (
                    <SortableHabitCard
                      key={habit.id}
                      habit={habit}
                      log={log}
                      isCustomSort={sortBy === 'custom'}
                      onToggle={(habitId, completed) =>
                        toggleMutation.mutate({ habitId, completed })
                      }
                    />
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </Layout>
  );
}
