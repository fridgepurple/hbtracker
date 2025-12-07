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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChevronLeft, ChevronRight, Plus, Trash2, Calendar, CalendarDays, CalendarRange, X } from 'lucide-react';
import { toast } from 'sonner';

// Common goal emojis
const goalEmojis = [
  '🎯', '⭐', '🏆', '💪', '📚', '💰', '❤️', '🧘', '🏃', '🎨',
  '✍️', '🎓', '💼', '🏠', '🌱', '🍎', '💤', '🧠', '🎵', '✈️',
  '🤝', '📱', '🔥', '⚡', '🌟', '💎', '🎪', '🏋️', '🚀', '🎉'
];

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
  const [selectedEmoji, setSelectedEmoji] = useState('🎯');
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
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
      setSelectedEmoji('🎯');
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
      title: `${selectedEmoji} ${newGoalTitle}`,
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

  // Get goal status based on progress
  const getGoalStatus = (progress: number) => {
    if (progress >= 70) return { label: 'on track', color: 'text-green-600', bgColor: 'bg-green-500', icon: '✓' };
    if (progress >= 40) return { label: 'at risk', color: 'text-yellow-600', bgColor: 'bg-yellow-500', icon: '⚡' };
    return { label: 'off track', color: 'text-red-600', bgColor: 'bg-red-500', icon: '!' };
  };

  const overallStatus = getGoalStatus(overallProgress);

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

              <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
                setIsCreateDialogOpen(open);
                if (!open) {
                  setNewGoalTitle('');
                  setNewGoalDescription('');
                  setSelectedEmoji('🎯');
                }
              }}>
                <DialogTrigger asChild>
                  <Button className={`${config.button} text-white`}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Goal
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle className="text-xl">Add goal</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-6 pt-4">
                    {/* Question prompt */}
                    <p className="text-muted-foreground">
                      What is the goal or key result you want to accomplish?
                    </p>

                    {/* Emoji + Title */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Goal title</label>
                      <div className="flex gap-2">
                        <Popover open={isEmojiPickerOpen} onOpenChange={setIsEmojiPickerOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="h-10 w-12 text-xl p-0"
                            >
                              {selectedEmoji}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-64 p-2" align="start">
                            <div className="grid grid-cols-6 gap-1">
                              {goalEmojis.map((emoji) => (
                                <Button
                                  key={emoji}
                                  variant="ghost"
                                  className="h-9 w-9 p-0 text-xl hover:bg-muted"
                                  onClick={() => {
                                    setSelectedEmoji(emoji);
                                    setIsEmojiPickerOpen(false);
                                  }}
                                >
                                  {emoji}
                                </Button>
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>
                        <Input
                          value={newGoalTitle}
                          onChange={(e) => setNewGoalTitle(e.target.value)}
                          placeholder="e.g., Read 12 books this year"
                          className="flex-1"
                          maxLength={100}
                        />
                      </div>
                    </div>

                    {/* Time Period */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Time period</label>
                      <div className="flex items-center gap-2 px-3 py-2 border rounded-md bg-muted/30">
                        <Icon className={`h-4 w-4 ${config.text}`} />
                        <span className="text-sm">{getDateLabel()}</span>
                      </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Description (optional)</label>
                      <Textarea
                        value={newGoalDescription}
                        onChange={(e) => setNewGoalDescription(e.target.value)}
                        placeholder="Add more details about what you want to achieve..."
                        className="min-h-[80px]"
                        maxLength={500}
                      />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-2">
                      <Button
                        variant="outline"
                        onClick={() => setIsCreateDialogOpen(false)}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleCreateGoal}
                        className={`flex-1 ${config.button}`}
                        disabled={!newGoalTitle.trim()}
                      >
                        Save Goal
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Overall Progress with Status */}
            {totalGoals > 0 && (
              <div className="mt-4 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-foreground">This period is</span>
                  <span className={`font-semibold ${overallStatus.color}`}>
                    {overallStatus.label}.
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground font-medium">
                    {overallProgress}% / 100%
                  </span>
                  <span className="text-muted-foreground">
                    {completedGoals} / {totalGoals} completed
                  </span>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full ${overallStatus.bgColor} transition-all duration-500`}
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

                    {/* Progress Slider with Status */}
                    <div className="space-y-2">
                      {(() => {
                        const status = getGoalStatus(goal.progress);
                        return (
                          <>
                            <div className="flex items-center justify-between text-sm">
                              <span className={`font-medium ${status.color}`}>
                                {status.label}
                              </span>
                              <span className="text-muted-foreground font-medium">{goal.progress}%</span>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full ${status.bgColor} transition-all duration-300`}
                                style={{ width: `${goal.progress}%` }}
                              />
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
                          </>
                        );
                      })()}
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
