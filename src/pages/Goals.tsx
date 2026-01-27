import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, addMonths, getWeek, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, getDate } from 'date-fns';
import Layout from '@/components/Layout';
import { fetchGoals, createGoal, updateGoal, deleteGoal, Goal, GoalType, GoalCategory } from '@/lib/goalQueries';
import { 
  fetchProjects, fetchProjectTasks, createProject, updateProject, deleteProject,
  createTask, updateTask, deleteTask, Project, ProjectTask 
} from '@/lib/projectQueries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  ChevronLeft, ChevronRight, Plus, Trash2, Calendar, CalendarDays, CalendarRange, 
  Home, DollarSign, Briefcase, GraduationCap, Heart, FolderKanban, CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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
};

const taskStatusConfig = {
  todo: { label: 'To Do', color: 'bg-slate-500', textColor: 'text-slate-600' },
  in_progress: { label: 'Working on it', color: 'bg-amber-500', textColor: 'text-amber-600' },
  done: { label: 'Done', color: 'bg-green-500', textColor: 'text-green-600' },
};

// Mini calendar component for each goal type
function MiniCalendar({ type, currentDate }: { type: GoalType; currentDate: Date }) {
  const today = new Date();
  
  if (type === 'daily') {
    return (
      <div className="flex flex-col items-center justify-center p-3 rounded-lg bg-rose-500/10 border border-rose-500/20">
        <span className="text-[10px] uppercase font-medium text-rose-600 dark:text-rose-400">
          {format(currentDate, 'EEE')}
        </span>
        <span className="text-2xl font-bold text-rose-600 dark:text-rose-400">
          {format(currentDate, 'd')}
        </span>
        <span className="text-[10px] text-muted-foreground">
          {format(currentDate, 'MMM')}
        </span>
      </div>
    );
  }
  
  if (type === 'weekly') {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekDays = eachDayOfInterval({ start: weekStart, end: endOfWeek(currentDate, { weekStartsOn: 1 }) });
    
    return (
      <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
        <div className="text-[9px] uppercase font-medium text-amber-600 dark:text-amber-400 text-center mb-1">
          Week {getWeek(currentDate)}
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {weekDays.map((day) => (
            <div
              key={day.toISOString()}
              className={cn(
                'w-5 h-5 rounded-sm text-[9px] flex items-center justify-center',
                isSameDay(day, today)
                  ? 'bg-amber-500 text-white font-bold'
                  : 'text-amber-700 dark:text-amber-300'
              )}
            >
              {format(day, 'd')}
            </div>
          ))}
        </div>
      </div>
    );
  }
  
  // Monthly
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOfWeek = monthStart.getDay();
  
  return (
    <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
      <div className="text-[9px] uppercase font-medium text-purple-600 dark:text-purple-400 text-center mb-1">
        {format(currentDate, 'MMMM')}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {/* Empty cells for offset */}
        {Array.from({ length: startDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} className="w-3 h-3" />
        ))}
        {daysInMonth.slice(0, 28).map((day) => (
          <div
            key={day.toISOString()}
            className={cn(
              'w-3 h-3 rounded-[2px] text-[6px] flex items-center justify-center',
              isSameDay(day, today)
                ? 'bg-purple-500 text-white'
                : 'bg-purple-200/50 dark:bg-purple-800/30'
            )}
          />
        ))}
      </div>
    </div>
  );
}

export default function Goals() {
  const [mainTab, setMainTab] = useState<'goals' | 'projects'>('goals');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [createGoalType, setCreateGoalType] = useState<GoalType>('monthly');
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalDescription, setNewGoalDescription] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('🎯');
  const [selectedCategory, setSelectedCategory] = useState<GoalCategory>('personal');
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  
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
    enabled: mainTab === 'goals',
  });

  const { data: weeklyGoals = [] } = useQuery({
    queryKey: ['goals', currentYear, currentMonth, 'weekly', currentWeek, undefined],
    queryFn: () => fetchGoals(currentYear, currentMonth, 'weekly', currentWeek, undefined),
    enabled: mainTab === 'goals',
  });

  const { data: monthlyGoals = [] } = useQuery({
    queryKey: ['goals', currentYear, currentMonth, 'monthly', undefined, undefined],
    queryFn: () => fetchGoals(currentYear, currentMonth, 'monthly', undefined, undefined),
    enabled: mainTab === 'goals',
  });

  // Projects queries
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: fetchProjects,
    enabled: mainTab === 'projects',
  });

  const { data: projectTasks = [] } = useQuery({
    queryKey: ['project_tasks', selectedProjectId],
    queryFn: () => selectedProjectId ? fetchProjectTasks(selectedProjectId) : Promise.resolve([]),
    enabled: mainTab === 'projects' && !!selectedProjectId,
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

  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const completedTasks = projectTasks.filter(t => t.status === 'done').length;
  const totalTasks = projectTasks.length;
  const taskProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Goal card component
  const GoalCard = ({ type, goals }: { type: GoalType; goals: Goal[] }) => {
    const config = goalTypeConfig[type];
    const Icon = config.icon;
    const completedGoals = goals.filter(g => g.completed).length;
    const totalGoals = goals.length;
    const overallProgress = totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0;
    const status = getGoalStatus(overallProgress);

    return (
      <Card className={cn('h-full flex flex-col', config.border)}>
        <CardHeader className={cn('bg-gradient-to-br rounded-t-lg', config.color)}>
          <div className="flex items-start justify-between gap-3">
            <MiniCalendar type={type} currentDate={currentDate} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Icon className={cn('h-4 w-4', config.text)} />
                <CardTitle className={cn('text-base', config.text)}>{config.label}</CardTitle>
              </div>
              {totalGoals > 0 && (
                <div className="mt-2 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className={cn('font-medium', status.color)}>{status.label}</span>
                    <span className="text-muted-foreground">{completedGoals}/{totalGoals}</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className={cn('h-full transition-all', status.bgColor)} style={{ width: `${overallProgress}%` }} />
                  </div>
                </div>
              )}
            </div>
            <Button
              size="icon"
              variant="ghost"
              className={cn('h-7 w-7', config.text)}
              onClick={() => handleOpenCreateDialog(type)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 p-3 overflow-auto">
          {goals.length === 0 ? (
            <div className="h-full flex items-center justify-center py-6">
              <p className="text-sm text-muted-foreground text-center">
                No goals yet
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {goals.map((goal) => {
                const goalStatus = getGoalStatus(goal.progress);
                const catConfig = categoryConfig[(goal.category as GoalCategory) || 'personal'];
                return (
                  <div
                    key={goal.id}
                    className={cn(
                      'p-3 rounded-lg border transition-colors',
                      config.border,
                      'hover:bg-muted/30'
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <Checkbox
                        checked={goal.completed}
                        onCheckedChange={(checked) =>
                          updateGoalMutation.mutate({ id: goal.id, updates: { completed: checked as boolean } })
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
                                updateGoalMutation.mutate({ id: goal.id, updates: { progress: value } })
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
                        onClick={() => deleteGoalMutation.mutate(goal.id)}
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
        </CardContent>
      </Card>
    );
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Main Tabs: Goals vs Projects */}
        <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as 'goals' | 'projects')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="goals" className="gap-2">
              <CalendarRange className="h-4 w-4" />
              Goals
            </TabsTrigger>
            <TabsTrigger value="projects" className="gap-2">
              <FolderKanban className="h-4 w-4" />
              Projects
            </TabsTrigger>
          </TabsList>

          {/* Goals Tab Content */}
          <TabsContent value="goals" className="space-y-6 mt-6">
            {/* Month Navigator */}
            <div className="flex items-center justify-center gap-3">
              <Button variant="outline" size="icon" onClick={navigatePrevious}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h2 className="text-xl font-semibold min-w-[180px] text-center">
                {format(currentDate, 'MMMM')} <span className="text-muted-foreground">{format(currentDate, 'yyyy')}</span>
              </h2>
              <Button variant="outline" size="icon" onClick={navigateNext}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Three Goal Cards Side by Side */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <GoalCard type="daily" goals={dailyGoals} />
              <GoalCard type="weekly" goals={weeklyGoals} />
              <GoalCard type="monthly" goals={monthlyGoals} />
            </div>
          </TabsContent>

          {/* Projects Tab Content */}
          <TabsContent value="projects" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Projects List */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Projects</h2>
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

                {projects.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center">
                      <FolderKanban className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">No projects yet</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-2">
                    {projects.map((project) => {
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
          </TabsContent>
        </Tabs>

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
