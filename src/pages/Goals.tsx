import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, addMonths, getWeek, addWeeks, startOfWeek, endOfWeek, addDays, startOfMonth, getDate } from 'date-fns';
import Layout from '@/components/Layout';
import { fetchGoals, createGoal, updateGoal, deleteGoal, Goal, GoalType } from '@/lib/goalQueries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChevronLeft, ChevronRight, Plus, Trash2, Calendar, CalendarDays, CalendarRange } from 'lucide-react';
import { toast } from 'sonner';

const goalTypeConfig = {
  daily: {
    icon: Calendar,
    color: 'from-rose-500/10 to-rose-600/10',
    border: 'border-rose-500/20',
    text: 'text-rose-600',
    button: 'bg-rose-600 hover:bg-rose-700',
    checkbox: 'border-rose-500 data-[state=checked]:bg-rose-600',
    slider: '[&_[role=slider]]:bg-rose-600 [&_[role=slider]]:border-rose-600',
  },
  weekly: {
    icon: CalendarDays,
    color: 'from-amber-500/10 to-amber-600/10',
    border: 'border-amber-500/20',
    text: 'text-amber-600',
    button: 'bg-amber-600 hover:bg-amber-700',
    checkbox: 'border-amber-500 data-[state=checked]:bg-amber-600',
    slider: '[&_[role=slider]]:bg-amber-600 [&_[role=slider]]:border-amber-600',
  },
  monthly: {
    icon: CalendarRange,
    color: 'from-purple-500/10 to-purple-600/10',
    border: 'border-purple-500/20',
    text: 'text-purple-600',
    button: 'bg-purple-600 hover:bg-purple-700',
    checkbox: 'border-purple-500 data-[state=checked]:bg-purple-600',
    slider: '[&_[role=slider]]:bg-purple-600 [&_[role=slider]]:border-purple-600',
  },
};

export default function Goals() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [goalType, setGoalType] = useState<GoalType>('monthly');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalDescription, setNewGoalDescription] = useState('');
  const queryClient = useQueryClient();

  const currentWeek = getWeek(currentDate);
  const currentDay = getDate(currentDate);
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  const config = goalTypeConfig[goalType];

  const { data: goals = [] } = useQuery({
    queryKey: ['goals', currentYear, currentMonth, goalType, currentWeek, currentDay],
    queryFn: () => fetchGoals(
      currentYear,
      currentMonth,
      goalType,
      goalType === 'weekly' ? currentWeek : undefined,
      goalType === 'daily' ? currentDay : undefined
    ),
  });

  const createMutation = useMutation({
    mutationFn: createGoal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      toast.success('Goal created!');
      setIsCreateDialogOpen(false);
      setNewGoalTitle('');
      setNewGoalDescription('');
    },
    onError: () => {
      toast.error('Failed to create goal');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Goal> }) => updateGoal(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      toast.success('Goal updated!');
    },
    onError: () => {
      toast.error('Failed to update goal');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteGoal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      toast.success('Goal deleted!');
    },
    onError: () => {
      toast.error('Failed to delete goal');
    },
  });

  const handleCreateGoal = () => {
    if (!newGoalTitle.trim()) {
      toast.error('Please enter a goal title');
      return;
    }

    createMutation.mutate({
      title: newGoalTitle,
      description: newGoalDescription || undefined,
      month: currentMonth,
      year: currentYear,
      goal_type: goalType,
      week: goalType === 'weekly' ? currentWeek : undefined,
      day: goalType === 'daily' ? currentDay : undefined,
    });
  };

  const navigatePrevious = () => {
    if (goalType === 'daily') {
      setCurrentDate(addDays(currentDate, -1));
    } else if (goalType === 'weekly') {
      setCurrentDate(addWeeks(currentDate, -1));
    } else {
      setCurrentDate(addMonths(currentDate, -1));
    }
  };

  const navigateNext = () => {
    if (goalType === 'daily') {
      setCurrentDate(addDays(currentDate, 1));
    } else if (goalType === 'weekly') {
      setCurrentDate(addWeeks(currentDate, 1));
    } else {
      setCurrentDate(addMonths(currentDate, 1));
    }
  };

  const getDateLabel = () => {
    if (goalType === 'daily') {
      return format(currentDate, 'EEEE, MMMM d, yyyy');
    } else if (goalType === 'weekly') {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
      return `Week ${currentWeek}: ${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;
    }
    return format(currentDate, 'MMMM yyyy');
  };

  const completedGoals = goals.filter(g => g.completed).length;
  const totalGoals = goals.length;
  const overallProgress = totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0;

  const Icon = config.icon;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Goal Type Tabs */}
        <Tabs value={goalType} onValueChange={(v) => setGoalType(v as GoalType)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="daily" className="gap-2">
              <Calendar className="h-4 w-4" />
              Daily
            </TabsTrigger>
            <TabsTrigger value="weekly" className="gap-2">
              <CalendarDays className="h-4 w-4" />
              Weekly
            </TabsTrigger>
            <TabsTrigger value="monthly" className="gap-2">
              <CalendarRange className="h-4 w-4" />
              Monthly
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Header */}
        <Card className={`bg-gradient-to-br ${config.color} ${config.border}`}>
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={navigatePrevious}
                  className={config.border}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <div className="flex items-center gap-2">
                  <Icon className={`h-5 w-5 ${config.text}`} />
                  <CardTitle className={`text-xl sm:text-2xl bg-gradient-to-r ${config.text} bg-clip-text`}>
                    {getDateLabel()}
                  </CardTitle>
                </div>

                <Button
                  variant="outline"
                  size="icon"
                  onClick={navigateNext}
                  className={config.border}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className={`${config.button} text-white`}>
                    <Plus className="h-4 w-4 mr-2" />
                    New {goalType.charAt(0).toUpperCase() + goalType.slice(1)} Goal
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New {goalType.charAt(0).toUpperCase() + goalType.slice(1)} Goal</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div>
                      <label className="text-sm font-medium">Title</label>
                      <Input
                        value={newGoalTitle}
                        onChange={(e) => setNewGoalTitle(e.target.value)}
                        placeholder="Enter goal title"
                        maxLength={100}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Description (Optional)</label>
                      <Textarea
                        value={newGoalDescription}
                        onChange={(e) => setNewGoalDescription(e.target.value)}
                        placeholder="Add details about your goal"
                        maxLength={500}
                      />
                    </div>
                    <Button
                      onClick={handleCreateGoal}
                      className={`w-full ${config.button}`}
                    >
                      Create Goal
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Overall Progress */}
            {totalGoals > 0 && (
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className={`${config.text} font-medium`}>Overall Progress</span>
                  <span className={`${config.text} font-medium`}>
                    {completedGoals} / {totalGoals} completed ({overallProgress}%)
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full bg-gradient-to-r ${config.color.replace('/10', '')} transition-all duration-500`}
                    style={{ width: `${overallProgress}%` }}
                  />
                </div>
              </div>
            )}
          </CardHeader>
        </Card>

        {/* Goals List */}
        {goals.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                No {goalType} goals set for this {goalType === 'daily' ? 'day' : goalType === 'weekly' ? 'week' : 'month'}. Create your first goal!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {goals.map((goal) => (
              <Card
                key={goal.id}
                className={`${config.border} hover:border-opacity-40 transition-colors`}
              >
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-start gap-4">
                      <Checkbox
                        checked={goal.completed}
                        onCheckedChange={(checked) =>
                          updateMutation.mutate({
                            id: goal.id,
                            updates: { completed: checked as boolean },
                          })
                        }
                        className={`mt-1 ${config.checkbox}`}
                      />
                      <div className="flex-1 min-w-0">
                        <h3
                          className={`font-semibold text-lg ${
                            goal.completed ? 'line-through text-muted-foreground' : ''
                          }`}
                        >
                          {goal.title}
                        </h3>
                        {goal.description && (
                          <p className="text-sm text-muted-foreground mt-1">{goal.description}</p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMutation.mutate(goal.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Progress Slider */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className={`${config.text} font-medium`}>Progress</span>
                        <span className={`${config.text} font-medium`}>{goal.progress}%</span>
                      </div>
                      <Slider
                        value={[goal.progress]}
                        onValueChange={([value]) =>
                          updateMutation.mutate({
                            id: goal.id,
                            updates: { progress: value },
                          })
                        }
                        max={100}
                        step={5}
                        className={config.slider}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
