import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks } from 'date-fns';
import Layout from '@/components/Layout';
import HabitCheckbox from '@/components/HabitCheckbox';
import { fetchHabits, fetchHabitLogs, toggleHabitLog } from '@/lib/habitQueries';
import { sortHabits, sortOptions, SortOption } from '@/lib/habitSorting';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

export default function WeekView() {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [sortBy, setSortBy] = useState<SortOption>('alphabetical');
  const queryClient = useQueryClient();

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 }); // Monday
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
  const daysOfWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const { data: habits = [] } = useQuery({
    queryKey: ['habits'],
    queryFn: fetchHabits,
  });

  const sortedHabits = useMemo(() => sortHabits(habits, sortBy), [habits, sortBy]);

  const { data: logs = [] } = useQuery({
    queryKey: ['habitLogs', format(weekStart, 'yyyy-MM-dd'), format(weekEnd, 'yyyy-MM-dd')],
    queryFn: () => fetchHabitLogs(format(weekStart, 'yyyy-MM-dd'), format(weekEnd, 'yyyy-MM-dd')),
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

  const isCompleted = (habitId: string, date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return logs.some(log => log.habit_id === habitId && log.date === dateStr && log.completed);
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Week Navigator */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={() => setCurrentWeek(addWeeks(currentWeek, -1))}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <CardTitle className="text-xl">
                  {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
                </CardTitle>
                
                <Button variant="outline" size="icon" onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}>
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

        {/* Week Grid */}
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
              <div className="min-w-[600px]">
                {/* Header Row */}
                <div className="grid grid-cols-8 border-b bg-muted/50">
                  <div className="p-3 font-medium">Habit</div>
                  {daysOfWeek.map(day => (
                    <div key={day.toISOString()} className="p-3 text-center">
                      <div className="text-xs text-muted-foreground">{format(day, 'EEE')}</div>
                      <div className="font-medium">{format(day, 'd')}</div>
                    </div>
                  ))}
                </div>

                {/* Habit Rows */}
                {sortedHabits.map(habit => (
                  <div key={habit.id} className="grid grid-cols-8 border-b hover:bg-muted/30 transition-colors">
                    <div className="p-3 flex items-center">
                      <div className="min-w-0">
                        <div className="font-medium truncate">{habit.name}</div>
                        {habit.category && (
                          <span className="inline-block mt-1 px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary">
                            {habit.category}
                          </span>
                        )}
                      </div>
                    </div>
                    {daysOfWeek.map(day => {
                      const dateStr = format(day, 'yyyy-MM-dd');
                      const completed = isCompleted(habit.id, day);
                      
                      return (
                        <div key={dateStr} className="flex items-center justify-center border-l">
                          <HabitCheckbox
                            checked={completed}
                            onCheckedChange={(checked) =>
                              toggleMutation.mutate({
                                habitId: habit.id,
                                date: dateStr,
                                completed: checked as boolean,
                              })
                            }
                          />
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}
      </div>
    </Layout>
  );
}
