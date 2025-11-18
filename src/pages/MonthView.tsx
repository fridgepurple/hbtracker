import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths } from 'date-fns';
import Layout from '@/components/Layout';
import HabitCheckbox from '@/components/HabitCheckbox';
import ProgressCard from '@/components/ProgressCard';
import { fetchHabits, fetchHabitLogs, toggleHabitLog, calculateMonthlyProgress } from '@/lib/habitQueries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

export default function MonthView() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [sortBy, setSortBy] = useState<SortOption>('alphabetical');
  const queryClient = useQueryClient();

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

  const isCompleted = (habitId: string, date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return logs.some(log => log.habit_id === habitId && log.date === dateStr && log.completed);
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
                {habits.map(habit => (
                  <div 
                    key={habit.id} 
                    className="grid gap-1 p-2 border-b hover:bg-muted/30 transition-colors"
                    style={{
                      gridTemplateColumns: `200px repeat(${Math.min(daysInMonth.length, 31)}, minmax(32px, 1fr))`
                    }}
                  >
                    <div className="p-2 flex items-center min-w-0">
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
                      const completed = isCompleted(habit.id, day);
                      
                      return (
                        <div key={dateStr} className="flex items-center justify-center">
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
