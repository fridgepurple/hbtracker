import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import Layout from '@/components/Layout';
import HabitCheckbox from '@/components/HabitCheckbox';
import { fetchHabits, fetchHabitLogs, toggleHabitLog } from '@/lib/habitQueries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

export default function Dashboard() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const queryClient = useQueryClient();
  
  const dateStr = format(selectedDate, 'yyyy-MM-dd');

  const { data: habits = [] } = useQuery({
    queryKey: ['habits'],
    queryFn: fetchHabits,
  });

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

  const completedToday = habits.filter(habit =>
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
                {completedToday} / {habits.length}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                habits completed today
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Habits List */}
        {habits.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                No habits yet. <a href="/habits" className="text-primary hover:underline">Create your first habit</a>
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {habits.map(habit => {
              const log = logs.find(l => l.habit_id === habit.id);
              const isCompleted = log?.completed || false;

              return (
                <Card key={habit.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="py-4">
                    <div className="flex items-center gap-4">
                      <HabitCheckbox
                        checked={isCompleted}
                        onCheckedChange={(checked) =>
                          toggleMutation.mutate({
                            habitId: habit.id,
                            completed: checked as boolean,
                          })
                        }
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
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
