import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, addMonths, getWeek, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, getDate, addDays, subDays, isToday as isDateToday } from 'date-fns';
import Layout from '@/components/Layout';
import { fetchGoals, fetchAllGoalsForMonth, createGoal, updateGoal, deleteGoal, Goal, GoalType, GoalCategory } from '@/lib/goalQueries';
import { 
  fetchProjects, fetchProjectTasks, fetchAllTasks, createProject, updateProject, deleteProject,
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

// Goal list component used inside each tab
function GoalList({ goals, type, onAdd, onUpdate, onDelete, getGoalStatus }: {
  goals: Goal[];
  type: GoalType;
  onAdd: () => void;
  onUpdate: (id: string, updates: Partial<Goal>) => void;
  onDelete: (id: string) => void;
  getGoalStatus: (progress: number) => { label: string; color: string; bgColor: string };
}) {
  const config = goalTypeConfig[type];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {type === 'daily' ? 'Today\'s Goals' : type === 'weekly' ? 'This Week\'s Goals' : 'Monthly Goals'}
        </h4>
        <Button size="sm" variant="ghost" onClick={onAdd} className="h-7 gap-1 text-xs">
          <Plus className="h-3.5 w-3.5" />
          Add
        </Button>
      </div>
      {goals.length === 0 ? (
        <div className="py-8 text-center border border-dashed border-border rounded-lg">
          <p className="text-sm text-muted-foreground">No goals yet</p>
          <Button variant="link" size="sm" onClick={onAdd} className="mt-1 text-xs">
            Create your first goal
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {goals.map((goal) => {
            const goalStatus = getGoalStatus(goal.progress);
            const catConfig = categoryConfig[(goal.category as GoalCategory) || 'personal'];
            return (
              <div
                key={goal.id}
                className="p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-start gap-2">
                  <Checkbox
                    checked={goal.completed}
                    onCheckedChange={(checked) =>
                      onUpdate(goal.id, { completed: checked as boolean })
                    }
                    className={cn('mt-0.5', config.checkbox)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className={cn('text-[9px] px-1 py-0', catConfig.bgColor, catConfig.color)}>
                        {catConfig.label}
                      </Badge>
                    </div>
                    <p className={cn(
                      'text-sm font-medium mt-1',
                      goal.completed && 'line-through text-muted-foreground'
                    )}>
                      {goal.title}
                    </p>
                    {!goal.completed && (
                      <div className="mt-2 space-y-1">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className={goalStatus.color}>{goalStatus.label}</span>
                          <span className="text-muted-foreground">{goal.progress}%</span>
                        </div>
                        <Slider
                          value={[goal.progress]}
                          onValueChange={([value]) =>
                            onUpdate(goal.id, { progress: value })
                          }
                          max={100}
                          step={5}
                          className={cn('h-1', config.slider)}
                        />
                      </div>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(goal.id)}
                    className="h-6 w-6 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
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
  
  // Projects state
  const [isCreateProjectDialogOpen, setIsCreateProjectDialogOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [newProjectCategory, setNewProjectCategory] = useState<GoalCategory>('work');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isCreateTaskDialogOpen, setIsCreateTaskDialogOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  
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

  const { data: projectTasks = [] } = useQuery({
    queryKey: ['project_tasks', selectedProjectId],
    queryFn: () => selectedProjectId ? fetchProjectTasks(selectedProjectId) : Promise.resolve([]),
    enabled: !!selectedProjectId,
  });

  // Fetch all tasks across all projects for the card view
  const { data: allTasks = [] } = useQuery({
    queryKey: ['all_project_tasks'],
    queryFn: fetchAllTasks,
  });

  // Goals mutations
  const createGoalMutation = useMutation({
    mutationFn: createGoal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      toast.success('Goal created!');
      setIsCreateDialogOpen(false);
      setNewGoalTitle('');
      setNewGoalDescription('');
      setSelectedEmoji('🎯');
      setSelectedCategory('personal');
    },
    onError: () => {
      toast.error('Failed to create goal');
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
      setSelectedProjectId(null);
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
      toast.success('Task created!');
      setIsCreateTaskDialogOpen(false);
      setNewTaskTitle('');
      setNewTaskDescription('');
    },
    onError: () => {
      toast.error('Failed to create task');
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<ProjectTask> }) => updateTask(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project_tasks'] });
    },
    onError: () => {
      toast.error('Failed to update task');
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: deleteTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project_tasks'] });
      toast.success('Task deleted!');
    },
    onError: () => {
      toast.error('Failed to delete task');
    },
  });

  const handleOpenCreateDialog = (type: GoalType) => {
    setCreateGoalType(type);
    setIsCreateDialogOpen(true);
  };

  const handleCreateGoal = () => {
    if (!newGoalTitle.trim()) {
      toast.error('Please enter a goal title');
      return;
    }

    createGoalMutation.mutate({
      title: `${selectedEmoji} ${newGoalTitle}`,
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
    if (!newTaskTitle.trim() || !selectedProjectId) {
      toast.error('Please enter a task title');
      return;
    }
    createTaskMutation.mutate({
      project_id: selectedProjectId,
      title: newTaskTitle,
      description: newTaskDescription || undefined,
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
  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const completedTasks = projectTasks.filter(t => t.status === 'done').length;
  const totalTasks = projectTasks.length;
  const taskProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const isSelectedProjectComplete = selectedProject?.status === 'completed';

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

  const handleGoalUpdate = (id: string, updates: Partial<Goal>) => {
    updateGoalMutation.mutate({ id, updates });
  };

  const handleGoalDelete = (id: string) => {
    deleteGoalMutation.mutate(id);
  };

  // Get goals for current tab
  const currentGoals = activeTab === 'daily' ? dailyGoals : activeTab === 'weekly' ? weeklyGoals : monthlyGoals;
  const completedGoalsCount = currentGoals.filter(g => g.completed).length;
  const totalGoalsCount = currentGoals.length;
  const overallProgress = totalGoalsCount > 0 ? Math.round((completedGoalsCount / totalGoalsCount) * 100) : 0;

  return (
    <Layout>
      <div className="space-y-8">
        {/* ── Goals Section ── */}
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
                        const isCurrentWeek = weekDays.some(wd => isSameDay(wd, day));
                        const isSelected = isSameDay(day, currentDate);
                        const isPopoverOpen = calendarPopoverDay !== null && isSameDay(calendarPopoverDay, day);
                        
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
                                <div className={cn(
                                  'h-7 w-7 rounded-full flex items-center justify-center text-sm font-medium mb-1',
                                  isToday && 'bg-primary text-primary-foreground',
                                  isSelected && !isToday && 'ring-2 ring-primary'
                                )}>
                                  {dayNum}
                                </div>
                                {/* Goal dots */}
                                {dayGoals.length > 0 && (
                                  <div className="space-y-0.5">
                                    {dayGoals.slice(0, 3).map((g) => (
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
                                    {dayGoals.length > 3 && (
                                      <span className="text-[9px] text-muted-foreground pl-1">+{dayGoals.length - 3} more</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </PopoverTrigger>
                            <PopoverContent className="w-48 p-2" side="bottom" align="start">
                              <p className="text-xs font-semibold text-muted-foreground mb-2 px-1">
                                {format(day, 'MMM d, yyyy')}
                              </p>
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

        {/* ── Projects Section ── */}
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
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Projects List */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">All Projects</h3>
                  <Dialog open={isCreateProjectDialogOpen} onOpenChange={setIsCreateProjectDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                        <Plus className="h-4 w-4 mr-1" />
                        New
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
                            placeholder="e.g., Home Renovation"
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
                          <Button onClick={handleCreateProject} className="flex-1 bg-blue-600 hover:bg-blue-700" disabled={!newProjectName.trim()}>
                            Create
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                {activeProjects.length === 0 && completedProjects.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center">
                      <FolderKanban className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">No projects yet</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {/* Active Projects */}
                    <div className="space-y-2">
                      {activeProjects.map((project) => {
                        const catConfig = categoryConfig[(project.category as GoalCategory) || 'work'];
                        const CatIcon = catConfig.icon;
                        const isSelected = selectedProjectId === project.id;
                        return (
                          <Card
                            key={project.id}
                            className={`cursor-pointer transition-all ${isSelected ? 'ring-2 ring-blue-500' : 'hover:border-blue-300'}`}
                            onClick={() => setSelectedProjectId(project.id)}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${catConfig.bgColor}`}>
                                  <CatIcon className={`h-4 w-4 ${catConfig.color}`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-medium truncate">{project.name}</h3>
                                  <p className="text-xs text-muted-foreground">{catConfig.label}</p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>

                    {/* Completed Projects */}
                    {completedProjects.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1">Completed</p>
                        {completedProjects.map((project) => {
                          const catConfig = categoryConfig[(project.category as GoalCategory) || 'work'];
                          const CatIcon = catConfig.icon;
                          const isSelected = selectedProjectId === project.id;
                          return (
                            <Card
                              key={project.id}
                              className={`cursor-pointer transition-all opacity-60 ${isSelected ? 'ring-2 ring-green-500' : 'hover:border-green-300'}`}
                              onClick={() => setSelectedProjectId(project.id)}
                            >
                              <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                  <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h3 className="font-medium truncate line-through">{project.name}</h3>
                                    <p className="text-xs text-muted-foreground">{catConfig.label}</p>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Tasks Panel */}
              <div className="lg:col-span-2">
                {selectedProject ? (
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle>{selectedProject.name}</CardTitle>
                          {selectedProject.description && (
                            <p className="text-sm text-muted-foreground mt-1">{selectedProject.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Dialog open={isCreateTaskDialogOpen} onOpenChange={setIsCreateTaskDialogOpen}>
                            <DialogTrigger asChild>
                              <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white">
                                <Plus className="h-4 w-4 mr-1" />
                                Add Task
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Add Task</DialogTitle>
                                <DialogDescription>Add a new task to this project</DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 pt-4">
                                <div className="space-y-2">
                                  <label className="text-sm font-medium">Task Title</label>
                                  <Input
                                    value={newTaskTitle}
                                    onChange={(e) => setNewTaskTitle(e.target.value)}
                                    placeholder="e.g., Buy paint supplies"
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
                                <div className="flex gap-3">
                                  <Button variant="outline" onClick={() => setIsCreateTaskDialogOpen(false)} className="flex-1">
                                    Cancel
                                  </Button>
                                  <Button onClick={handleCreateTask} className="flex-1 bg-green-600 hover:bg-green-700" disabled={!newTaskTitle.trim()}>
                                    Add Task
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const newStatus = isSelectedProjectComplete ? 'active' : 'completed';
                              updateProject(selectedProject.id, { status: newStatus }).then(() => {
                                queryClient.invalidateQueries({ queryKey: ['projects'] });
                                toast.success(newStatus === 'completed' ? 'Project completed!' : 'Project reactivated!');
                              });
                            }}
                            className={isSelectedProjectComplete ? 'text-amber-600 border-amber-300' : 'text-green-600 border-green-300'}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            {isSelectedProjectComplete ? 'Reactivate' : 'Complete'}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteProjectMutation.mutate(selectedProject.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      {totalTasks > 0 && (
                        <div className="mt-4 space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Progress</span>
                            <span className="font-medium">{completedTasks}/{totalTasks} tasks done</span>
                          </div>
                          <Progress value={taskProgress} className="h-2" />
                        </div>
                      )}
                    </CardHeader>
                    <CardContent>
                      {projectTasks.length === 0 ? (
                        <div className="py-8 text-center">
                          <CheckCircle2 className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground">No tasks yet. Add your first task!</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {projectTasks.map((task) => {
                            const statusConfig = taskStatusConfig[task.status as keyof typeof taskStatusConfig] || taskStatusConfig.todo;
                            return (
                              <div key={task.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/30">
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
                                />
                                <div className="flex-1 min-w-0">
                                  <p className={cn('text-sm font-medium', task.status === 'done' && 'line-through text-muted-foreground')}>
                                    {task.title}
                                  </p>
                                  {task.description && (
                                    <p className="text-xs text-muted-foreground truncate">{task.description}</p>
                                  )}
                                </div>
                                <Select
                                  value={task.status || 'todo'}
                                  onValueChange={(value) => {
                                    updateTaskMutation.mutate({
                                      id: task.id,
                                      updates: {
                                        status: value,
                                        completed_at: value === 'done' ? new Date().toISOString() : null,
                                      },
                                    });
                                  }}
                                >
                                  <SelectTrigger className="w-[130px] h-7 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {Object.entries(taskStatusConfig).map(([key, { label, textColor }]) => (
                                      <SelectItem key={key} value={key}>
                                        <span className={textColor}>{label}</span>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => deleteTaskMutation.mutate(task.id)}
                                  className="h-7 w-7 text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <FolderKanban className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                      <p className="text-muted-foreground">Select a project to view tasks</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
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
