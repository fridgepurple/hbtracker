import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, addMonths, getWeek, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, getDate, addDays, subDays, isToday as isDateToday } from 'date-fns';
import Layout from '@/components/Layout';
import { fetchGoals, fetchAllGoalsForMonth, createGoal, createRecurringGoals, updateGoal, updateRecurringGoals, deleteGoal, deleteRecurringGoals, Goal, GoalType, GoalCategory } from '@/lib/goalQueries';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { 
  fetchProjects, fetchAllTasks, createProject, updateProject, deleteProject,
  createTask, updateTask, deleteTask, Project, ProjectTask 
} from '@/lib/projectQueries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { 
  ChevronLeft, ChevronRight, Plus, Trash2, Calendar, CalendarDays, CalendarRange, 
  Home, DollarSign, Briefcase, GraduationCap, Heart, FolderKanban, CheckCircle2, Plane
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

// Common goal emojis
const goalEmojis = [
  '🎯', '⭐', '🏆', '💪', '📚', '💰', '❤️', '🧘', '🏃', '🎨',
  '✍️', '🎓', '💼', '🏠', '🌱', '🍎', '💤', '🧠', '🎵', '✈️',
  '🤝', '📱', '🔥', '⚡', '🌟', '💎', '🎪', '🏋️', '🚀', '🎉'
];

const goalTypeConfig = {
  daily: {
    icon: Calendar,
    color: 'from-rose-500/20 to-rose-600/20',
    border: 'border-rose-500/30',
    text: 'text-rose-600 dark:text-rose-400',
    button: 'bg-rose-600 hover:bg-rose-700',
    checkbox: 'border-rose-500 data-[state=checked]:bg-rose-600',
    slider: '[&_[role=slider]]:bg-rose-600 [&_[role=slider]]:border-rose-600',
    label: 'Today',
  },
  weekly: {
    icon: CalendarDays,
    color: 'from-amber-500/20 to-amber-600/20',
    border: 'border-amber-500/30',
    text: 'text-amber-600 dark:text-amber-400',
    button: 'bg-amber-600 hover:bg-amber-700',
    checkbox: 'border-amber-500 data-[state=checked]:bg-amber-600',
    slider: '[&_[role=slider]]:bg-amber-600 [&_[role=slider]]:border-amber-600',
    label: 'This Week',
  },
  monthly: {
    icon: CalendarRange,
    color: 'from-purple-500/20 to-purple-600/20',
    border: 'border-purple-500/30',
    text: 'text-purple-600 dark:text-purple-400',
    button: 'bg-purple-600 hover:bg-purple-700',
    checkbox: 'border-purple-500 data-[state=checked]:bg-purple-600',
    slider: '[&_[role=slider]]:bg-purple-600 [&_[role=slider]]:border-purple-600',
    label: 'This Month',
  },
};

const categoryConfig: Record<GoalCategory, { icon: typeof Home; label: string; color: string; bgColor: string }> = {
  home: { icon: Home, label: 'Home', color: 'text-orange-600', bgColor: 'bg-orange-100 dark:bg-orange-900/30' },
  finance: { icon: DollarSign, label: 'Finance', color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900/30' },
  work: { icon: Briefcase, label: 'Work', color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
  school: { icon: GraduationCap, label: 'School', color: 'text-indigo-600', bgColor: 'bg-indigo-100 dark:bg-indigo-900/30' },
  personal: { icon: Heart, label: 'Personal / Wellness', color: 'text-pink-600', bgColor: 'bg-pink-100 dark:bg-pink-900/30' },
  travel: { icon: Plane, label: 'Travel', color: 'text-sky-600', bgColor: 'bg-sky-100 dark:bg-sky-900/30' },
};

const taskStatusConfig = {
  todo: { label: 'To Do', color: 'bg-slate-500', textColor: 'text-slate-600' },
  in_progress: { label: 'Working on it', color: 'bg-amber-500', textColor: 'text-amber-600' },
  done: { label: 'Done', color: 'bg-green-500', textColor: 'text-green-600' },
};

const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Compact goal list — no progress slider, hides completed (shown in Completed tab)
function GoalList({ goals, type, onAdd, onUpdate, onDelete }: {
  goals: Goal[];
  type: GoalType;
  onAdd: () => void;
  onUpdate: (goal: Goal, updates: Partial<Goal>) => void;
  onDelete: (goal: Goal) => void;
}) {
  const config = goalTypeConfig[type];
  const activeGoals = goals.filter(g => !g.completed);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {type === 'daily' ? "Today's Goals" : type === 'weekly' ? "This Week" : "This Month"}
        </h4>
        <Button size="sm" variant="ghost" onClick={onAdd} className="h-6 gap-1 text-xs">
          <Plus className="h-3 w-3" />
          Add
        </Button>
      </div>
      {activeGoals.length === 0 ? (
        <div className="py-6 text-center border border-dashed border-border rounded-lg">
          <p className="text-xs text-muted-foreground">No active goals</p>
          <Button variant="link" size="sm" onClick={onAdd} className="mt-0.5 text-xs h-auto p-0">
            Add one
          </Button>
        </div>
      ) : (
        <div className="space-y-1">
          {activeGoals.map((goal) => {
            const catConfig = categoryConfig[(goal.category as GoalCategory) || 'personal'];
            return (
              <div
                key={goal.id}
                className="flex items-center gap-2 px-2 py-1.5 rounded-md border border-border hover:bg-muted/30 transition-colors group"
              >
                <Checkbox
                  checked={goal.completed}
                  onCheckedChange={(checked) =>
                    onUpdate(goal, { completed: checked as boolean, progress: checked ? 100 : goal.progress })
                  }
                  className={cn('h-4 w-4', config.checkbox)}
                />
                <div className="flex-1 min-w-0 flex items-center gap-1.5">
                  <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', catConfig.bgColor)} />
                  <p className="text-sm truncate">{goal.title}</p>
                  {goal.recurrence_id && (
                    <Badge variant="outline" className="text-[8px] px-1 py-0 h-3.5 shrink-0" title="Recurring">↻</Badge>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(goal)}
                  className="h-5 w-5 text-destructive hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Completed goals list — read-only with reactivate / delete
function CompletedGoalList({ goals, onUpdate, onDelete }: {
  goals: Goal[];
  onUpdate: (goal: Goal, updates: Partial<Goal>) => void;
  onDelete: (goal: Goal) => void;
}) {
  const completed = goals.filter(g => g.completed);
  if (completed.length === 0) {
    return (
      <div className="py-6 text-center border border-dashed border-border rounded-lg">
        <p className="text-xs text-muted-foreground">Nothing completed yet</p>
      </div>
    );
  }
  return (
    <div className="space-y-1">
      {completed.map((goal) => {
        const catConfig = categoryConfig[(goal.category as GoalCategory) || 'personal'];
        return (
          <div
            key={goal.id}
            className="flex items-center gap-2 px-2 py-1.5 rounded-md border border-border hover:bg-muted/30 transition-colors group"
          >
            <Checkbox
              checked
              onCheckedChange={() => onUpdate(goal, { completed: false })}
              className="h-4 w-4"
            />
            <div className="flex-1 min-w-0 flex items-center gap-1.5">
              <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', catConfig.bgColor)} />
              <p className="text-sm truncate line-through text-muted-foreground">{goal.title}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(goal)}
              className="h-5 w-5 text-destructive hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        );
      })}
    </div>
  );
}

export default function Goals() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState<GoalType>('monthly');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [calendarPopoverDay, setCalendarPopoverDay] = useState<Date | null>(null);
  const [createGoalType, setCreateGoalType] = useState<GoalType>('monthly');
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalDescription, setNewGoalDescription] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('🎯');
  const [selectedCategory, setSelectedCategory] = useState<GoalCategory>('personal');
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [goalsOpen, setGoalsOpen] = useState(true);
  const [projectsOpen, setProjectsOpen] = useState(true);
  const [goalsViewTab, setGoalsViewTab] = useState<'active' | 'completed'>('active');

  // Recurrence (only for weekly/monthly)
  const [recurrenceCount, setRecurrenceCount] = useState<number>(1);

  // Confirm dialogs for recurring goal edit/delete
  const [pendingDeleteGoal, setPendingDeleteGoal] = useState<Goal | null>(null);
  
  // Projects state
  const [isCreateProjectDialogOpen, setIsCreateProjectDialogOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [newProjectCategory, setNewProjectCategory] = useState<GoalCategory>('work');
  
  const [isCreateTaskDialogOpen, setIsCreateTaskDialogOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [taskDialogProjectId, setTaskDialogProjectId] = useState<string | null>(null);
  const [hideDoneByProject, setHideDoneByProject] = useState<Set<string>>(new Set());
  
  const queryClient = useQueryClient();

  const currentWeek = getWeek(currentDate);
  const currentDay = getDate(currentDate);
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  // Fetch all goal types at once
  const { data: dailyGoals = [] } = useQuery({
    queryKey: ['goals', currentYear, currentMonth, 'daily', undefined, currentDay],
    queryFn: () => fetchGoals(currentYear, currentMonth, 'daily', undefined, currentDay),
  });

  const { data: weeklyGoals = [] } = useQuery({
    queryKey: ['goals', currentYear, currentMonth, 'weekly', currentWeek, undefined],
    queryFn: () => fetchGoals(currentYear, currentMonth, 'weekly', currentWeek, undefined),
  });

  const { data: monthlyGoals = [] } = useQuery({
    queryKey: ['goals', currentYear, currentMonth, 'monthly', undefined, undefined],
    queryFn: () => fetchGoals(currentYear, currentMonth, 'monthly', undefined, undefined),
  });

  // Fetch all goals for the month (for calendar dots)
  const { data: allMonthGoals = [] } = useQuery({
    queryKey: ['goals', currentYear, currentMonth, 'all'],
    queryFn: () => fetchAllGoalsForMonth(currentYear, currentMonth),
  });

  // Projects queries
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: fetchProjects,
  });

  // Fetch all tasks across all projects for the card view
  const { data: allTasks = [] } = useQuery({
    queryKey: ['all_project_tasks'],
    queryFn: fetchAllTasks,
  });

  const resetCreateGoalForm = () => {
    setIsCreateDialogOpen(false);
    setNewGoalTitle('');
    setNewGoalDescription('');
    setSelectedEmoji('🎯');
    setSelectedCategory('personal');
    setRecurrenceCount(1);
  };

  const createGoalMutation = useMutation({
    mutationFn: createGoal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      toast.success('Goal created!');
      resetCreateGoalForm();
    },
    onError: () => {
      toast.error('Failed to create goal');
    },
  });

  const createRecurringGoalsMutation = useMutation({
    mutationFn: createRecurringGoals,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      toast.success(`Created ${data?.length ?? ''} recurring goals!`);
      resetCreateGoalForm();
    },
    onError: () => {
      toast.error('Failed to create recurring goals');
    },
  });

  const updateGoalMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Goal> }) => updateGoal(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    },
    onError: () => {
      toast.error('Failed to update goal');
    },
  });

  const deleteGoalMutation = useMutation({
    mutationFn: deleteGoal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      toast.success('Goal deleted!');
    },
    onError: () => {
      toast.error('Failed to delete goal');
    },
  });

  // Projects mutations
  const createProjectMutation = useMutation({
    mutationFn: createProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project created!');
      setIsCreateProjectDialogOpen(false);
      setNewProjectName('');
      setNewProjectDescription('');
      setNewProjectCategory('work');
    },
    onError: () => {
      toast.error('Failed to create project');
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: deleteProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['all_project_tasks'] });
      toast.success('Project deleted!');
    },
    onError: () => {
      toast.error('Failed to delete project');
    },
  });

  // Tasks mutations
  const createTaskMutation = useMutation({
    mutationFn: createTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project_tasks'] });
      queryClient.invalidateQueries({ queryKey: ['all_project_tasks'] });
      toast.success('Task created!');
      setIsCreateTaskDialogOpen(false);
      setNewTaskTitle('');
      setNewTaskDescription('');
      setNewTaskDueDate('');
      setTaskDialogProjectId(null);
    },
    onError: () => {
      toast.error('Failed to create task');
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<ProjectTask> }) => updateTask(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project_tasks'] });
      queryClient.invalidateQueries({ queryKey: ['all_project_tasks'] });
    },
    onError: () => {
      toast.error('Failed to update task');
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: deleteTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project_tasks'] });
      queryClient.invalidateQueries({ queryKey: ['all_project_tasks'] });
      toast.success('Task deleted!');
    },
    onError: () => {
      toast.error('Failed to delete task');
    },
  });

  const handleOpenCreateDialog = (type: GoalType) => {
    setCreateGoalType(type);
    setRecurrenceCount(1);
    setIsCreateDialogOpen(true);
  };

  const handleCreateGoal = () => {
    if (!newGoalTitle.trim()) {
      toast.error('Please enter a goal title');
      return;
    }

    const fullTitle = `${selectedEmoji} ${newGoalTitle}`;
    const isRecurring = (createGoalType === 'weekly' || createGoalType === 'monthly') && recurrenceCount > 1;

    if (isRecurring) {
      createRecurringGoalsMutation.mutate({
        title: fullTitle,
        description: newGoalDescription || undefined,
        goal_type: createGoalType as 'weekly' | 'monthly',
        category: selectedCategory,
        startYear: currentYear,
        startMonth: currentMonth,
        startWeek: createGoalType === 'weekly' ? currentWeek : undefined,
        count: recurrenceCount,
      });
      return;
    }

    createGoalMutation.mutate({
      title: fullTitle,
      description: newGoalDescription || undefined,
      month: currentMonth,
      year: currentYear,
      goal_type: createGoalType,
      category: selectedCategory,
      week: createGoalType === 'weekly' ? currentWeek : undefined,
      day: createGoalType === 'daily' ? currentDay : undefined,
    });
  };

  const handleCreateProject = () => {
    if (!newProjectName.trim()) {
      toast.error('Please enter a project name');
      return;
    }
    createProjectMutation.mutate({
      name: newProjectName,
      description: newProjectDescription || undefined,
      category: newProjectCategory,
    });
  };

  const handleCreateTask = () => {
    const projectId = taskDialogProjectId;
    if (!newTaskTitle.trim() || !projectId) {
      toast.error('Please enter a task title');
      return;
    }
    createTaskMutation.mutate({
      project_id: projectId,
      title: newTaskTitle,
      description: newTaskDescription || undefined,
      due_date: newTaskDueDate || undefined,
    });
  };

  const navigatePrevious = () => {
    setCurrentDate(addMonths(currentDate, -1));
  };

  const navigateNext = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  const getGoalStatus = (progress: number) => {
    if (progress >= 70) return { label: 'on track', color: 'text-green-600', bgColor: 'bg-green-500', icon: '✓' };
    if (progress >= 40) return { label: 'at risk', color: 'text-yellow-600', bgColor: 'bg-yellow-500', icon: '⚡' };
    return { label: 'off track', color: 'text-red-600', bgColor: 'bg-red-500', icon: '!' };
  };

  const activeProjects = projects.filter(p => p.status !== 'completed');
  const completedProjects = projects.filter(p => p.status === 'completed');

  // Build the big calendar
  const today = new Date();
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOfWeek = monthStart.getDay();

  // Build weekly calendar
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: endOfWeek(currentDate, { weekStartsOn: 1 }) });

  // Map of days that have goals
  const goalsByDay = useMemo(() => {
    const map = new Map<number, Goal[]>();
    allMonthGoals.forEach(g => {
      if (g.day) {
        const existing = map.get(g.day) || [];
        existing.push(g);
        map.set(g.day, existing);
      }
    });
    return map;
  }, [allMonthGoals]);

  // Map of days that have task deadlines (for the current visible month)
  const tasksByDay = useMemo(() => {
    const map = new Map<number, ProjectTask[]>();
    allTasks.forEach(t => {
      if (!t.due_date) return;
      const d = new Date(t.due_date);
      if (d.getFullYear() === currentYear && d.getMonth() + 1 === currentMonth) {
        const dayNum = d.getDate();
        const existing = map.get(dayNum) || [];
        existing.push(t);
        map.set(dayNum, existing);
      }
    });
    return map;
  }, [allTasks, currentYear, currentMonth]);

  const handleGoalUpdate = (goal: Goal, updates: Partial<Goal>) => {
    // Per-occurrence updates (toggle complete/progress) always apply only to this row.
    updateGoalMutation.mutate({ id: goal.id, updates });
  };

  const handleGoalDelete = (goal: Goal) => {
    if (goal.recurrence_id) {
      // Ask user: this only, or this & future
      setPendingDeleteGoal(goal);
      return;
    }
    deleteGoalMutation.mutate(goal.id);
  };

  // Get goals for current tab
  const currentGoals = activeTab === 'daily' ? dailyGoals : activeTab === 'weekly' ? weeklyGoals : monthlyGoals;
  const completedGoalsCount = currentGoals.filter(g => g.completed).length;
  const totalGoalsCount = currentGoals.length;
  const overallProgress = totalGoalsCount > 0 ? Math.round((completedGoalsCount / totalGoalsCount) * 100) : 0;

  // Today's reminders - incomplete goals for today
  const todayReminders = useMemo(() => {
    const reminders: { goal: Goal; type: string }[] = [];
    dailyGoals.filter(g => !g.completed).forEach(g => reminders.push({ goal: g, type: 'Today' }));
    weeklyGoals.filter(g => !g.completed).forEach(g => reminders.push({ goal: g, type: 'This Week' }));
    monthlyGoals.filter(g => !g.completed).slice(0, 3).forEach(g => reminders.push({ goal: g, type: 'This Month' }));
    return reminders;
  }, [dailyGoals, weeklyGoals, monthlyGoals]);

  // Group tasks by status for card view
  // Map project IDs to project names/categories
  const projectMap = useMemo(() => {
    const map = new Map<string, Project>();
    projects.forEach(p => map.set(p.id, p));
    return map;
  }, [projects]);

  return (
    <Layout>
      <div className="space-y-8">
        {/* ── Today's Reminders ── */}
        {todayReminders.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              ✨ Don't forget today
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {todayReminders.map(({ goal, type }) => {
                const catConfig = categoryConfig[(goal.category as GoalCategory) || 'personal'];
                const goalStatus = getGoalStatus(goal.progress);
                return (
                  <div
                    key={goal.id}
                    className="p-3 rounded-xl border border-border bg-card hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <Badge variant="outline" className={cn('text-[9px] px-1.5 py-0', catConfig.bgColor, catConfig.color)}>
                        {type}
                      </Badge>
                      <span className={cn('text-[9px] font-medium', goalStatus.color)}>{goalStatus.label}</span>
                    </div>
                    <p className="text-sm font-medium leading-snug">{goal.title}</p>
                    <div className="mt-2 h-1 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-primary transition-all rounded-full" style={{ width: `${goal.progress}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        <Collapsible open={goalsOpen} onOpenChange={setGoalsOpen}>
          <CollapsibleTrigger asChild>
            <button className="w-full flex items-center justify-between py-2 group">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <CalendarRange className="h-5 w-5 text-primary" />
                Goals
              </h2>
              <ChevronRight className={cn(
                'h-5 w-5 text-muted-foreground transition-transform duration-200',
                goalsOpen && 'rotate-90'
              )} />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-4">
            {/* Month Navigator */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={navigatePrevious}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <h3 className="text-xl font-semibold">
                  {format(currentDate, 'MMMM')} <span className="text-muted-foreground">{format(currentDate, 'yyyy')}</span>
                </h3>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={navigateNext}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              {totalGoalsCount > 0 && (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">{completedGoalsCount}/{totalGoalsCount} done</span>
                  <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary transition-all rounded-full" style={{ width: `${overallProgress}%` }} />
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* ── Big Calendar Panel ── */}
              <div className="lg:col-span-2">
                <Card>
                  <CardContent className="p-4 md:p-6">
                    {/* Monthly Calendar Grid */}
                    <div className="grid grid-cols-7 gap-0">
                      {/* Day headers */}
                      {dayLabels.map((label) => (
                        <div key={label} className="py-2 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                          {label}
                        </div>
                      ))}
                      {/* Empty cells for offset */}
                      {Array.from({ length: startDayOfWeek }).map((_, i) => (
                        <div key={`empty-${i}`} className="min-h-[80px] md:min-h-[100px] border-b border-r border-border last:border-r-0" />
                      ))}
                      {/* Day cells */}
                      {daysInMonth.map((day) => {
                        const dayNum = getDate(day);
                        const isToday = isSameDay(day, today);
                        const dayGoals = goalsByDay.get(dayNum) || [];
                        const dayTasks = tasksByDay.get(dayNum) || [];
                        const isCurrentWeek = weekDays.some(wd => isSameDay(wd, day));
                        const isSelected = isSameDay(day, currentDate);
                        const isPopoverOpen = calendarPopoverDay !== null && isSameDay(calendarPopoverDay, day);
                        const visibleGoals = dayGoals.slice(0, 2);
                        const remainingForTasks = Math.max(0, 3 - visibleGoals.length);
                        const visibleTasks = dayTasks.slice(0, remainingForTasks);
                        const hiddenCount = dayGoals.length + dayTasks.length - visibleGoals.length - visibleTasks.length;
                        const taskCategoryDots = Array.from(new Set(dayTasks.map(t => projectMap.get(t.project_id)?.category || 'personal'))).slice(0, 3);

                        return (
                          <Popover
                            key={day.toISOString()}
                            open={isPopoverOpen}
                            onOpenChange={(open) => {
                              if (open) {
                                setCalendarPopoverDay(day);
                                setCurrentDate(day);
                              } else {
                                setCalendarPopoverDay(null);
                              }
                            }}
                          >
                            <PopoverTrigger asChild>
                              <div
                                className={cn(
                                  'min-h-[80px] md:min-h-[100px] p-1.5 border-b border-r border-border cursor-pointer transition-colors',
                                  isSelected && 'bg-primary/5',
                                  activeTab === 'weekly' && isCurrentWeek && 'bg-accent/10',
                                  !isSelected && !isCurrentWeek && 'hover:bg-muted/30'
                                )}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <div className={cn(
                                    'h-7 w-7 rounded-full flex items-center justify-center text-sm font-medium',
                                    isToday && 'bg-primary text-primary-foreground',
                                    isSelected && !isToday && 'ring-2 ring-primary'
                                  )}>
                                    {dayNum}
                                  </div>
                                  {taskCategoryDots.length > 0 && (
                                    <div className="flex gap-0.5">
                                      {taskCategoryDots.map((cat, i) => {
                                        const cfg = categoryConfig[(cat as GoalCategory) || 'personal'];
                                        return <span key={i} className={cn('h-1.5 w-1.5 rounded-full', cfg.bgColor)} />;
                                      })}
                                    </div>
                                  )}
                                </div>
                                {(visibleGoals.length > 0 || visibleTasks.length > 0) && (
                                  <div className="space-y-0.5">
                                    {visibleGoals.map((g) => (
                                      <div
                                        key={g.id}
                                        className={cn(
                                          'text-[10px] leading-tight px-1 py-0.5 rounded truncate',
                                          g.completed ? 'bg-muted/50 text-muted-foreground line-through opacity-60' : 'bg-primary/10 text-foreground'
                                        )}
                                      >
                                        {g.title}
                                      </div>
                                    ))}
                                    {visibleTasks.map((t) => {
                                      const proj = projectMap.get(t.project_id);
                                      const cfg = categoryConfig[(proj?.category as GoalCategory) || 'personal'];
                                      const TaskIcon = cfg.icon;
                                      return (
                                        <div
                                          key={t.id}
                                          className={cn(
                                            'text-[10px] leading-tight px-1 py-0.5 rounded truncate flex items-center gap-1',
                                            cfg.bgColor,
                                            cfg.color,
                                            t.status === 'done' && 'line-through opacity-60'
                                          )}
                                        >
                                          <TaskIcon className="h-2.5 w-2.5 shrink-0" />
                                          <span className="truncate">{t.title}</span>
                                        </div>
                                      );
                                    })}
                                    {hiddenCount > 0 && (
                                      <span className="text-[9px] text-muted-foreground pl-1">+{hiddenCount} more</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </PopoverTrigger>
                            <PopoverContent className="w-60 p-2" side="bottom" align="start">
                              <p className="text-xs font-semibold text-muted-foreground mb-2 px-1">
                                {format(day, 'MMM d, yyyy')}
                              </p>
                              {dayTasks.length > 0 && (
                                <div className="mb-2 pb-2 border-b border-border space-y-1">
                                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground px-1">Tasks due</p>
                                  {dayTasks.map((t) => {
                                    const proj = projectMap.get(t.project_id);
                                    const cfg = categoryConfig[(proj?.category as GoalCategory) || 'personal'];
                                    const TaskIcon = cfg.icon;
                                    return (
                                      <div key={t.id} className="flex items-center gap-2 px-1 py-1 text-xs">
                                        <TaskIcon className={cn('h-3 w-3 shrink-0', cfg.color)} />
                                        <span className={cn('truncate', t.status === 'done' && 'line-through text-muted-foreground')}>
                                          {t.title}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                              <div className="space-y-1">
                                <button
                                  onClick={() => {
                                    setCalendarPopoverDay(null);
                                    setActiveTab('daily');
                                    handleOpenCreateDialog('daily');
                                  }}
                                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm font-medium hover:bg-rose-500/10 text-rose-500 transition-colors"
                                >
                                  <Calendar className="h-3.5 w-3.5" />
                                  Add Daily Goal
                                </button>
                                <button
                                  onClick={() => {
                                    setCalendarPopoverDay(null);
                                    setActiveTab('weekly');
                                    handleOpenCreateDialog('weekly');
                                  }}
                                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm font-medium hover:bg-amber-500/10 text-amber-500 transition-colors"
                                >
                                  <CalendarDays className="h-3.5 w-3.5" />
                                  Add Weekly Goal
                                </button>
                                <button
                                  onClick={() => {
                                    setCalendarPopoverDay(null);
                                    setActiveTab('monthly');
                                    handleOpenCreateDialog('monthly');
                                  }}
                                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm font-medium hover:bg-purple-500/10 text-purple-500 transition-colors"
                                >
                                  <CalendarRange className="h-3.5 w-3.5" />
                                  Add Monthly Goal
                                </button>
                                <hr className="border-border my-1" />
                                <button
                                  onClick={() => {
                                    setCalendarPopoverDay(null);
                                    setIsCreateProjectDialogOpen(true);
                                  }}
                                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm font-medium hover:bg-sky-500/10 text-sky-500 transition-colors"
                                >
                                  <FolderKanban className="h-3.5 w-3.5" />
                                  Add Project
                                </button>
                                {activeProjects.length > 0 && (
                                  <button
                                    onClick={() => {
                                      setCalendarPopoverDay(null);
                                      setNewTaskDueDate(format(day, 'yyyy-MM-dd'));
                                      setTaskDialogProjectId(activeProjects[0].id);
                                      setIsCreateTaskDialogOpen(true);
                                    }}
                                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm font-medium hover:bg-emerald-500/10 text-emerald-500 transition-colors"
                                  >
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    Add Task on this date
                                  </button>
                                )}
                              </div>
                            </PopoverContent>
                          </Popover>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* ── Goals Sidebar with Tabs ── */}
              <div>
                <Card className="h-full">
                  <CardContent className="p-4">
                    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as GoalType)}>
                      <TabsList className="w-full grid grid-cols-3 mb-4">
                        <TabsTrigger value="daily" className="text-xs gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          Day
                        </TabsTrigger>
                        <TabsTrigger value="weekly" className="text-xs gap-1">
                          <CalendarDays className="h-3.5 w-3.5" />
                          Week
                        </TabsTrigger>
                        <TabsTrigger value="monthly" className="text-xs gap-1">
                          <CalendarRange className="h-3.5 w-3.5" />
                          Month
                        </TabsTrigger>
                      </TabsList>

                      {/* Date context */}
                      <div className="mb-4 p-3 rounded-lg bg-muted/50 border border-border">
                        {activeTab === 'daily' && (
                          <div className="text-center">
                            <p className="text-2xl font-bold">{format(currentDate, 'd')}</p>
                            <p className="text-xs text-muted-foreground">{format(currentDate, 'EEEE, MMMM yyyy')}</p>
                          </div>
                        )}
                        {activeTab === 'weekly' && (
                          <div className="text-center">
                            <p className="text-sm font-semibold">Week {currentWeek}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(weekStart, 'MMM d')} – {format(weekDays[weekDays.length - 1], 'MMM d, yyyy')}
                            </p>
                          </div>
                        )}
                        {activeTab === 'monthly' && (
                          <div className="text-center">
                            <p className="text-sm font-semibold">{format(currentDate, 'MMMM yyyy')}</p>
                            <p className="text-xs text-muted-foreground">{daysInMonth.length} days</p>
                          </div>
                        )}
                      </div>

                      <TabsContent value="daily" className="mt-0">
                        <GoalList
                          goals={dailyGoals}
                          type="daily"
                          onAdd={() => handleOpenCreateDialog('daily')}
                          onUpdate={handleGoalUpdate}
                          onDelete={handleGoalDelete}
                          getGoalStatus={getGoalStatus}
                        />
                      </TabsContent>
                      <TabsContent value="weekly" className="mt-0">
                        <GoalList
                          goals={weeklyGoals}
                          type="weekly"
                          onAdd={() => handleOpenCreateDialog('weekly')}
                          onUpdate={handleGoalUpdate}
                          onDelete={handleGoalDelete}
                          getGoalStatus={getGoalStatus}
                        />
                      </TabsContent>
                      <TabsContent value="monthly" className="mt-0">
                        <GoalList
                          goals={monthlyGoals}
                          type="monthly"
                          onAdd={() => handleOpenCreateDialog('monthly')}
                          onUpdate={handleGoalUpdate}
                          onDelete={handleGoalDelete}
                          getGoalStatus={getGoalStatus}
                        />
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        <hr className="border-border" />

        {/* ── Projects & Tasks Section ── */}
        <Collapsible open={projectsOpen} onOpenChange={setProjectsOpen}>
          <CollapsibleTrigger asChild>
            <button className="w-full flex items-center justify-between py-2 group">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <FolderKanban className="h-5 w-5 text-primary" />
                Projects
              </h2>
              <ChevronRight className={cn(
                'h-5 w-5 text-muted-foreground transition-transform duration-200',
                projectsOpen && 'rotate-90'
              )} />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-6 pt-4">
            {/* Header: New Project + Completed projects */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <p className="text-sm text-muted-foreground">
                {activeProjects.length} {activeProjects.length === 1 ? 'project' : 'projects'} in progress
              </p>
              <div className="flex items-center gap-2">
                {completedProjects.length > 0 && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="text-xs text-muted-foreground">
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                        Completed ({completedProjects.length})
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-2">
                      {completedProjects.map((p) => {
                        const cfg = categoryConfig[(p.category as GoalCategory) || 'personal'];
                        const PIcon = cfg.icon;
                        return (
                          <div key={p.id} className="flex items-center justify-between gap-2 px-2 py-1.5 rounded hover:bg-muted/50">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground line-through">
                              <PIcon className={cn('h-3.5 w-3.5', cfg.color)} />
                              {p.name}
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => {
                                  updateProject(p.id, { status: 'active' }).then(() => {
                                    queryClient.invalidateQueries({ queryKey: ['projects'] });
                                    toast.success('Project reactivated');
                                  });
                                }}
                              >
                                <CheckCircle2 className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-destructive"
                                onClick={() => deleteProjectMutation.mutate(p.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </PopoverContent>
                  </Popover>
                )}
                <Dialog open={isCreateProjectDialogOpen} onOpenChange={setIsCreateProjectDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="text-xs">
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      New Project
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Project</DialogTitle>
                      <DialogDescription>Add a new project to organize your tasks</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Category</label>
                        <Select value={newProjectCategory} onValueChange={(v) => setNewProjectCategory(v as GoalCategory)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(categoryConfig).map(([key, { icon: CatIcon, label, color }]) => (
                              <SelectItem key={key} value={key}>
                                <div className="flex items-center gap-2">
                                  <CatIcon className={`h-4 w-4 ${color}`} />
                                  <span>{label}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Project Name</label>
                        <Input
                          value={newProjectName}
                          onChange={(e) => setNewProjectName(e.target.value)}
                          placeholder="e.g., Paris Trip Planning"
                          maxLength={100}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Description (optional)</label>
                        <Textarea
                          value={newProjectDescription}
                          onChange={(e) => setNewProjectDescription(e.target.value)}
                          placeholder="What is this project about?"
                          maxLength={500}
                        />
                      </div>
                      <div className="flex gap-3">
                        <Button variant="outline" onClick={() => setIsCreateProjectDialogOpen(false)} className="flex-1">
                          Cancel
                        </Button>
                        <Button onClick={handleCreateProject} className="flex-1" disabled={!newProjectName.trim()}>
                          Create
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Project Cards Grid */}
            {activeProjects.length === 0 ? (
              <div className="py-12 text-center border border-dashed border-border rounded-xl">
                <FolderKanban className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground mb-3">No projects yet</p>
                <Button size="sm" onClick={() => setIsCreateProjectDialogOpen(true)}>
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Create your first project
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {activeProjects.map((project) => {
                  const cfg = categoryConfig[(project.category as GoalCategory) || 'personal'];
                  const PIcon = cfg.icon;
                  const tasks = allTasks.filter(t => t.project_id === project.id);
                  const hideDone = hideDoneByProject.has(project.id);
                  const visibleTasks = hideDone ? tasks.filter(t => t.status !== 'done') : tasks;
                  const doneCount = tasks.filter(t => t.status === 'done').length;
                  const totalCount = tasks.length;

                  return (
                    <Card key={project.id} className="overflow-hidden flex flex-col">
                      {/* Project header with category color */}
                      <div className={cn('px-4 py-3 border-b border-border', cfg.bgColor)}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <PIcon className={cn('h-4 w-4 shrink-0', cfg.color)} />
                            <div className="min-w-0">
                              <h3 className="font-semibold text-sm truncate">{project.name}</h3>
                              <p className="text-[10px] text-muted-foreground">{cfg.label} · {doneCount}/{totalCount} done</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-0.5 shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              title="Mark project complete"
                              onClick={() => {
                                updateProject(project.id, { status: 'completed' }).then(() => {
                                  queryClient.invalidateQueries({ queryKey: ['projects'] });
                                  toast.success('Project completed!');
                                });
                              }}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => deleteProjectMutation.mutate(project.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                        {project.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{project.description}</p>
                        )}
                      </div>

                      {/* Task checklist */}
                      <div className="p-3 space-y-1.5 flex-1">
                        {visibleTasks.length === 0 ? (
                          <p className="text-xs text-muted-foreground text-center py-3">
                            {hideDone && tasks.length > 0 ? 'All tasks done 🎉' : 'No tasks yet'}
                          </p>
                        ) : (
                          visibleTasks.map((task) => (
                            <div key={task.id} className="flex items-start gap-2 py-1 group">
                              <Checkbox
                                checked={task.status === 'done'}
                                onCheckedChange={(checked) => {
                                  updateTaskMutation.mutate({
                                    id: task.id,
                                    updates: {
                                      status: checked ? 'done' : 'todo',
                                      completed_at: checked ? new Date().toISOString() : null,
                                    },
                                  });
                                }}
                                className="mt-0.5"
                              />
                              <div className="flex-1 min-w-0">
                                <p className={cn(
                                  'text-sm leading-snug',
                                  task.status === 'done' && 'line-through text-muted-foreground'
                                )}>
                                  {task.title}
                                </p>
                                {task.due_date && (
                                  <p className={cn(
                                    'text-[10px] mt-0.5 flex items-center gap-1',
                                    new Date(task.due_date) < new Date() && task.status !== 'done'
                                      ? 'text-destructive'
                                      : 'text-muted-foreground'
                                  )}>
                                    <Calendar className="h-2.5 w-2.5" />
                                    {format(new Date(task.due_date), 'MMM d')}
                                  </p>
                                )}
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => deleteTaskMutation.mutate(task.id)}
                                className="h-6 w-6 text-destructive hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Footer: add task + hide done toggle */}
                      <div className="px-3 py-2 border-t border-border flex items-center justify-between gap-2">
                        <button
                          onClick={() => {
                            setTaskDialogProjectId(project.id);
                            setIsCreateTaskDialogOpen(true);
                          }}
                          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                        >
                          <Plus className="h-3 w-3" />
                          Add task
                        </button>
                        {doneCount > 0 && (
                          <button
                            onClick={() => {
                              setHideDoneByProject(prev => {
                                const next = new Set(prev);
                                if (next.has(project.id)) next.delete(project.id);
                                else next.add(project.id);
                                return next;
                              });
                            }}
                            className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {hideDone ? `Show done (${doneCount})` : `Hide done (${doneCount})`}
                          </button>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Add Task Dialog */}
            <Dialog
              open={isCreateTaskDialogOpen}
              onOpenChange={(open) => {
                setIsCreateTaskDialogOpen(open);
                if (!open) {
                  setNewTaskTitle('');
                  setNewTaskDescription('');
                  setNewTaskDueDate('');
                  setTaskDialogProjectId(null);
                }
              }}
            >
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Task</DialogTitle>
                  <DialogDescription>
                    {taskDialogProjectId
                      ? `Add a new task to ${projectMap.get(taskDialogProjectId)?.name || 'your project'}`
                      : 'Add a new task'}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Project</label>
                    <Select
                      value={taskDialogProjectId || ''}
                      onValueChange={(v) => setTaskDialogProjectId(v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a project" />
                      </SelectTrigger>
                      <SelectContent>
                        {activeProjects.map((p) => {
                          const cfg = categoryConfig[(p.category as GoalCategory) || 'personal'];
                          const PIcon = cfg.icon;
                          return (
                            <SelectItem key={p.id} value={p.id}>
                              <div className="flex items-center gap-2">
                                <PIcon className={cn('h-4 w-4', cfg.color)} />
                                <span>{p.name}</span>
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Task Title</label>
                    <Input
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      placeholder="e.g., Buy flight tickets"
                      maxLength={200}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Description (optional)</label>
                    <Textarea
                      value={newTaskDescription}
                      onChange={(e) => setNewTaskDescription(e.target.value)}
                      placeholder="Add details..."
                      maxLength={500}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Deadline (optional)</label>
                    <Input
                      type="date"
                      value={newTaskDueDate}
                      onChange={(e) => setNewTaskDueDate(e.target.value)}
                    />
                    <p className="text-[10px] text-muted-foreground">If set, the task will appear on the calendar.</p>
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setIsCreateTaskDialogOpen(false)} className="flex-1">
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreateTask}
                      className="flex-1"
                      disabled={!newTaskTitle.trim() || !taskDialogProjectId}
                    >
                      Add Task
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </CollapsibleContent>
        </Collapsible>

        {/* Create Goal Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
          setIsCreateDialogOpen(open);
          if (!open) {
            setNewGoalTitle('');
            setNewGoalDescription('');
            setSelectedEmoji('🎯');
            setSelectedCategory('personal');
          }
        }}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-xl">Add {goalTypeConfig[createGoalType].label} Goal</DialogTitle>
              <DialogDescription>Set a goal for {createGoalType === 'daily' ? 'today' : createGoalType === 'weekly' ? 'this week' : 'this month'}</DialogDescription>
            </DialogHeader>
            <div className="space-y-6 pt-4">
              {/* Category Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Category</label>
                <Select value={selectedCategory} onValueChange={(v) => setSelectedCategory(v as GoalCategory)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(categoryConfig).map(([key, { icon: CatIcon, label, color }]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <CatIcon className={`h-4 w-4 ${color}`} />
                          <span>{label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Emoji + Title */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Goal title</label>
                <div className="flex gap-2">
                  <Popover open={isEmojiPickerOpen} onOpenChange={setIsEmojiPickerOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="h-10 w-12 text-xl p-0">
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
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} className="flex-1">
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateGoal} 
                  className={cn('flex-1', goalTypeConfig[createGoalType].button)} 
                  disabled={!newGoalTitle.trim()}
                >
                  Save Goal
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
