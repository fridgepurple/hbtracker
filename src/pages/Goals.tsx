import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, addMonths, getWeek, startOfWeek, endOfWeek, getDate } from 'date-fns';
import Layout from '@/components/Layout';
import WeekCalendar from '@/components/WeekCalendar';
import {
  fetchGoals,
  createGoal,
  createRecurringGoals,
  updateGoal,
  deleteGoal,
  deleteRecurringGoals,
  Goal,
  GoalType,
  GoalCategory,
} from '@/lib/goalQueries';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  fetchProjects,
  fetchAllTasks,
  createProject,
  updateProject,
  deleteProject,
  createTask,
  updateTask,
  deleteTask,
  reorderTasks,
  Project,
  ProjectTask,
} from '@/lib/projectQueries';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Calendar,
  CalendarDays,
  CalendarRange,
  Home,
  DollarSign,
  Briefcase,
  GraduationCap,
  Heart,
  FolderKanban,
  CheckCircle2,
  Plane,
  GripVertical,
  CalendarClock,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Common goal emojis
const goalEmojis = [
  '🎯', '⭐', '🏆', '💪', '📚', '💰', '❤️', '🧘', '🏃', '🎨',
  '✍️', '🎓', '💼', '🏠', '🌱', '🍎', '💤', '🧠', '🎵', '✈️',
  '🤝', '📱', '🔥', '⚡', '🌟', '💎', '🎪', '🏋️', '🚀', '🎉',
];

const goalTypeConfig = {
  daily: {
    icon: Calendar,
    button: 'bg-rose-600 hover:bg-rose-700',
    checkbox: 'border-rose-500 data-[state=checked]:bg-rose-600',
    label: 'Today',
  },
  weekly: {
    icon: CalendarDays,
    button: 'bg-amber-600 hover:bg-amber-700',
    checkbox: 'border-amber-500 data-[state=checked]:bg-amber-600',
    label: 'This Week',
  },
  monthly: {
    icon: CalendarRange,
    button: 'bg-purple-600 hover:bg-purple-700',
    checkbox: 'border-purple-500 data-[state=checked]:bg-purple-600',
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

// ────────────────────────────────────────────────────────────────────
// Compact goal lists
// ────────────────────────────────────────────────────────────────────
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
          {type === 'daily' ? "Today's Goals" : type === 'weekly' ? 'This Week' : 'This Month'}
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
          {activeGoals.map(goal => {
            const catConfig = categoryConfig[(goal.category as GoalCategory) || 'personal'];
            return (
              <div
                key={goal.id}
                className="flex items-center gap-2 px-2 py-1.5 rounded-md border border-border hover:bg-muted/30 transition-colors group"
              >
                <Checkbox
                  checked={goal.completed}
                  onCheckedChange={checked =>
                    onUpdate(goal, {
                      completed: checked as boolean,
                      progress: checked ? 100 : goal.progress,
                    })
                  }
                  className={cn('h-4 w-4', config.checkbox)}
                />
                <div className="flex-1 min-w-0 flex items-center gap-1.5">
                  <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', catConfig.bgColor)} />
                  <p className="text-sm truncate">{goal.title}</p>
                  {goal.recurrence_id && (
                    <Badge variant="outline" className="text-[8px] px-1 py-0 h-3.5 shrink-0" title="Recurring">
                      ↻
                    </Badge>
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
      {completed.map(goal => {
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

// ────────────────────────────────────────────────────────────────────
// Sortable task row (DnD)
// ────────────────────────────────────────────────────────────────────
function SortableTask({
  task,
  onToggle,
  onDelete,
  onEdit,
}: {
  task: ProjectTask;
  onToggle: (checked: boolean) => void;
  onDelete: () => void;
  onEdit: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: 'task', task },
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-start gap-1.5 py-1 group rounded hover:bg-muted/30 px-1"
    >
      <button
        {...attributes}
        {...listeners}
        className="mt-1 text-muted-foreground/40 hover:text-muted-foreground cursor-grab active:cursor-grabbing touch-none"
        aria-label="Drag task"
      >
        <GripVertical className="h-3 w-3" />
      </button>
      <Checkbox
        checked={task.status === 'done'}
        onCheckedChange={checked => onToggle(!!checked)}
        className="mt-0.5"
      />
      <button
        type="button"
        onClick={onEdit}
        className="flex-1 min-w-0 text-left"
        title="Click to edit"
      >
        {task.description ? (
          <HoverCard openDelay={200} closeDelay={50}>
            <HoverCardTrigger asChild>
              <p
                className={cn(
                  'text-sm leading-snug cursor-pointer hover:text-primary transition-colors',
                  task.status === 'done' && 'line-through text-muted-foreground',
                )}
              >
                {task.title}
              </p>
            </HoverCardTrigger>
            <HoverCardContent side="top" align="start" className="w-64 p-3">
              <p className="font-semibold text-sm">{task.title}</p>
              <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">
                {task.description}
              </p>
            </HoverCardContent>
          </HoverCard>
        ) : (
          <p
            className={cn(
              'text-sm leading-snug cursor-pointer hover:text-primary transition-colors',
              task.status === 'done' && 'line-through text-muted-foreground',
            )}
          >
            {task.title}
          </p>
        )}
        {task.due_date && (
          <p
            className={cn(
              'text-[10px] mt-0.5 flex items-center gap-1',
              new Date(task.due_date) < new Date() && task.status !== 'done'
                ? 'text-destructive'
                : 'text-muted-foreground',
            )}
          >
            <Calendar className="h-2.5 w-2.5" />
            {format(new Date(task.due_date), 'MMM d')}
          </p>
        )}
      </button>
      <Button
        variant="ghost"
        size="icon"
        onClick={onDelete}
        className="h-6 w-6 text-destructive hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Page
// ────────────────────────────────────────────────────────────────────
export default function Goals() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState<GoalType>('monthly');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [createGoalType, setCreateGoalType] = useState<GoalType>('monthly');
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalDescription, setNewGoalDescription] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('🎯');
  const [selectedCategory, setSelectedCategory] = useState<GoalCategory>('personal');
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(true);
  const [goalsOpen, setGoalsOpen] = useState(true);
  const [projectsOpen, setProjectsOpen] = useState(true);
  const [goalsViewTab, setGoalsViewTab] = useState<'active' | 'completed'>('active');
  const [recurrenceCount, setRecurrenceCount] = useState<number>(1);
  const [pendingDeleteGoal, setPendingDeleteGoal] = useState<Goal | null>(null);

  // Projects state
  const [isCreateProjectDialogOpen, setIsCreateProjectDialogOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [newProjectCategory, setNewProjectCategory] = useState<GoalCategory>('personal');

  const [isCreateTaskDialogOpen, setIsCreateTaskDialogOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [taskDialogProjectId, setTaskDialogProjectId] = useState<string | null>(null);
  const [hideDoneByProject, setHideDoneByProject] = useState<Set<string>>(new Set());

  // Edit task state
  const [editingTask, setEditingTask] = useState<ProjectTask | null>(null);
  const [editTaskTitle, setEditTaskTitle] = useState('');
  const [editTaskDescription, setEditTaskDescription] = useState('');
  const [editTaskDueDate, setEditTaskDueDate] = useState('');

  // DnD state
  const [activeDragTask, setActiveDragTask] = useState<ProjectTask | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const queryClient = useQueryClient();

  const currentWeek = getWeek(currentDate);
  const currentDay = getDate(currentDate);
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

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

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: fetchProjects,
  });

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
    onError: () => toast.error('Failed to create goal'),
  });

  const createRecurringGoalsMutation = useMutation({
    mutationFn: createRecurringGoals,
    onSuccess: data => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      toast.success(`Created ${data?.length ?? ''} recurring goals!`);
      resetCreateGoalForm();
    },
    onError: () => toast.error('Failed to create recurring goals'),
  });

  const updateGoalMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Goal> }) => updateGoal(id, updates),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['goals'] }),
    onError: () => toast.error('Failed to update goal'),
  });

  const deleteGoalMutation = useMutation({
    mutationFn: deleteGoal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      toast.success('Goal deleted!');
    },
    onError: () => toast.error('Failed to delete goal'),
  });

  const createProjectMutation = useMutation({
    mutationFn: createProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project created!');
      setIsCreateProjectDialogOpen(false);
      setNewProjectName('');
      setNewProjectDescription('');
      setNewProjectCategory('personal');
    },
    onError: () => toast.error('Failed to create project'),
  });

  const deleteProjectMutation = useMutation({
    mutationFn: deleteProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['all_project_tasks'] });
      toast.success('Project deleted!');
    },
    onError: () => toast.error('Failed to delete project'),
  });

  const createTaskMutation = useMutation({
    mutationFn: createTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all_project_tasks'] });
      toast.success('Task added!');
      setIsCreateTaskDialogOpen(false);
      setNewTaskTitle('');
      setNewTaskDescription('');
      setNewTaskDueDate('');
      setTaskDialogProjectId(null);
    },
    onError: () => toast.error('Failed to create task'),
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<ProjectTask> }) =>
      updateTask(id, updates),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['all_project_tasks'] }),
    onError: () => toast.error('Failed to update task'),
  });

  const deleteTaskMutation = useMutation({
    mutationFn: deleteTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all_project_tasks'] });
      toast.success('Task deleted!');
    },
    onError: () => toast.error('Failed to delete task'),
  });

  const reorderTasksMutation = useMutation({
    mutationFn: reorderTasks,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['all_project_tasks'] }),
    onError: () => toast.error('Failed to reorder tasks'),
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
    const isRecurring =
      (createGoalType === 'weekly' || createGoalType === 'monthly') && recurrenceCount > 1;

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

  const navigatePrevious = () => setCurrentDate(addMonths(currentDate, -1));
  const navigateNext = () => setCurrentDate(addMonths(currentDate, 1));

  const handleGoalUpdate = (goal: Goal, updates: Partial<Goal>) =>
    updateGoalMutation.mutate({ id: goal.id, updates });

  const handleGoalDelete = (goal: Goal) => {
    if (goal.recurrence_id) {
      setPendingDeleteGoal(goal);
      return;
    }
    deleteGoalMutation.mutate(goal.id);
  };

  const currentGoals =
    activeTab === 'daily' ? dailyGoals : activeTab === 'weekly' ? weeklyGoals : monthlyGoals;
  const completedGoalsCount = currentGoals.filter(g => g.completed).length;
  const totalGoalsCount = currentGoals.length;
  const overallProgress =
    totalGoalsCount > 0 ? Math.round((completedGoalsCount / totalGoalsCount) * 100) : 0;

  const projectMap = useMemo(() => {
    const map = new Map<string, Project>();
    projects.forEach(p => map.set(p.id, p));
    return map;
  }, [projects]);

  const activeProjects = projects.filter(p => p.status !== 'completed');
  const completedProjects = projects.filter(p => p.status === 'completed');

  // Tasks grouped per project (sorted by display_order)
  const tasksByProject = useMemo(() => {
    const map = new Map<string, ProjectTask[]>();
    activeProjects.forEach(p => map.set(p.id, []));
    allTasks.forEach(t => {
      const arr = map.get(t.project_id);
      if (arr) arr.push(t);
    });
    map.forEach((arr) => {
      arr.sort((a, b) => {
        if (a.display_order !== b.display_order) return a.display_order - b.display_order;
        return a.created_at.localeCompare(b.created_at);
      });
    });
    return map;
  }, [allTasks, activeProjects]);

  // ── DnD handlers ────────────────────────────────────────────────
  const findTaskById = (id: string) => allTasks.find(t => t.id === id) || null;
  const findContainerOfTask = (id: string): string | null => {
    const t = findTaskById(id);
    return t?.project_id ?? (activeProjects.find(p => p.id === id)?.id ?? null);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const task = findTaskById(String(event.active.id));
    setActiveDragTask(task);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragTask(null);
    const { active, over } = event;
    if (!over) return;

    const activeTask = findTaskById(String(active.id));
    if (!activeTask) return;

    // Determine destination project: over may be a task or a project container
    const overId = String(over.id);
    let destProjectId = findContainerOfTask(overId);
    if (!destProjectId) return;

    const sourceProjectId = activeTask.project_id;
    const sourceTasks = (tasksByProject.get(sourceProjectId) ?? []).slice();
    const destTasks =
      sourceProjectId === destProjectId
        ? sourceTasks
        : (tasksByProject.get(destProjectId) ?? []).slice();

    const oldIndex = sourceTasks.findIndex(t => t.id === activeTask.id);
    if (oldIndex === -1) return;

    let newIndex: number;
    const overTask = findTaskById(overId);
    if (overTask && overTask.project_id === destProjectId) {
      newIndex = destTasks.findIndex(t => t.id === overTask.id);
    } else {
      // dropped on a project container — append
      newIndex = destTasks.length;
    }

    let updates: { id: string; project_id: string; display_order: number }[] = [];

    if (sourceProjectId === destProjectId) {
      if (oldIndex === newIndex) return;
      const reordered = arrayMove(sourceTasks, oldIndex, newIndex);
      updates = reordered.map((t, i) => ({
        id: t.id,
        project_id: destProjectId,
        display_order: i,
      }));
    } else {
      // remove from source, insert into destination
      const movingTask = sourceTasks[oldIndex];
      const newSource = sourceTasks.filter((_, i) => i !== oldIndex);
      const newDest = destTasks.slice();
      newDest.splice(newIndex, 0, { ...movingTask, project_id: destProjectId });
      updates = [
        ...newSource.map((t, i) => ({
          id: t.id,
          project_id: sourceProjectId,
          display_order: i,
        })),
        ...newDest.map((t, i) => ({
          id: t.id,
          project_id: destProjectId,
          display_order: i,
        })),
      ];
    }

    // Optimistic update of cache
    queryClient.setQueryData<ProjectTask[]>(['all_project_tasks'], old => {
      if (!old) return old;
      const updateMap = new Map(updates.map(u => [u.id, u]));
      return old.map(t => {
        const u = updateMap.get(t.id);
        if (!u) return t;
        return { ...t, project_id: u.project_id, display_order: u.display_order };
      });
    });

    reorderTasksMutation.mutate(updates);
  };

  return (
    <Layout>
      <div className="space-y-8">
        {/* ── Personal Calendar (top) ── */}
        <Collapsible open={calendarOpen} onOpenChange={setCalendarOpen}>
          <CollapsibleTrigger asChild>
            <button className="w-full flex items-center justify-between py-2 group">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <CalendarClock className="h-5 w-5 text-primary" />
                Personal Calendar
              </h2>
              <ChevronRight
                className={cn(
                  'h-5 w-5 text-muted-foreground transition-transform duration-200',
                  calendarOpen && 'rotate-90',
                )}
              />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-4">
            <WeekCalendar />
          </CollapsibleContent>
        </Collapsible>

        <hr className="border-border" />

        {/* ── Goals ── */}
        <Collapsible open={goalsOpen} onOpenChange={setGoalsOpen}>
          <CollapsibleTrigger asChild>
            <button className="w-full flex items-center justify-between py-2 group">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <CalendarRange className="h-5 w-5 text-primary" />
                Goals
              </h2>
              <ChevronRight
                className={cn(
                  'h-5 w-5 text-muted-foreground transition-transform duration-200',
                  goalsOpen && 'rotate-90',
                )}
              />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-4">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={navigatePrevious}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <h3 className="text-lg font-semibold">
                  {format(currentDate, 'MMMM')}{' '}
                  <span className="text-muted-foreground">{format(currentDate, 'yyyy')}</span>
                </h3>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={navigateNext}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              {totalGoalsCount > 0 && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{completedGoalsCount}/{totalGoalsCount} done</span>
                  <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all rounded-full"
                      style={{ width: `${overallProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <Card>
              <CardContent className="p-4">
                <Tabs value={activeTab} onValueChange={v => setActiveTab(v as GoalType)}>
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

                  <Tabs value={goalsViewTab} onValueChange={v => setGoalsViewTab(v as 'active' | 'completed')}>
                    <TabsList className="w-full grid grid-cols-2 h-8 mb-3">
                      <TabsTrigger value="active" className="text-[11px]">
                        Active
                      </TabsTrigger>
                      <TabsTrigger value="completed" className="text-[11px]">
                        Completed ({currentGoals.filter(g => g.completed).length})
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="active" className="mt-0">
                      {activeTab === 'daily' && (
                        <GoalList
                          goals={dailyGoals}
                          type="daily"
                          onAdd={() => handleOpenCreateDialog('daily')}
                          onUpdate={handleGoalUpdate}
                          onDelete={handleGoalDelete}
                        />
                      )}
                      {activeTab === 'weekly' && (
                        <GoalList
                          goals={weeklyGoals}
                          type="weekly"
                          onAdd={() => handleOpenCreateDialog('weekly')}
                          onUpdate={handleGoalUpdate}
                          onDelete={handleGoalDelete}
                        />
                      )}
                      {activeTab === 'monthly' && (
                        <GoalList
                          goals={monthlyGoals}
                          type="monthly"
                          onAdd={() => handleOpenCreateDialog('monthly')}
                          onUpdate={handleGoalUpdate}
                          onDelete={handleGoalDelete}
                        />
                      )}
                    </TabsContent>
                    <TabsContent value="completed" className="mt-0">
                      <CompletedGoalList
                        goals={currentGoals}
                        onUpdate={handleGoalUpdate}
                        onDelete={handleGoalDelete}
                      />
                    </TabsContent>
                  </Tabs>
                </Tabs>
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>

        <hr className="border-border" />

        {/* ── Projects ── */}
        <Collapsible open={projectsOpen} onOpenChange={setProjectsOpen}>
          <CollapsibleTrigger asChild>
            <button className="w-full flex items-center justify-between py-2 group">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <FolderKanban className="h-5 w-5 text-primary" />
                Projects
              </h2>
              <ChevronRight
                className={cn(
                  'h-5 w-5 text-muted-foreground transition-transform duration-200',
                  projectsOpen && 'rotate-90',
                )}
              />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 pt-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <p className="text-xs text-muted-foreground max-w-xl">
                Long-running plans you advance step by step — gardening, hobbies, study tracks, home projects. Drag tasks to reorder or move them between projects.
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
                      {completedProjects.map(p => {
                        const cfg = categoryConfig[(p.category as GoalCategory) || 'personal'];
                        const PIcon = cfg.icon;
                        return (
                          <div
                            key={p.id}
                            className="flex items-center justify-between gap-2 px-2 py-1.5 rounded hover:bg-muted/50"
                          >
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
                      <DialogDescription>
                        Group tasks for something you're advancing over time.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Category</label>
                        <Select
                          value={newProjectCategory}
                          onValueChange={v => setNewProjectCategory(v as GoalCategory)}
                        >
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
                          onChange={e => setNewProjectName(e.target.value)}
                          placeholder="e.g., Build the garden, Learn watercolor"
                          maxLength={100}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Description (optional)</label>
                        <Textarea
                          value={newProjectDescription}
                          onChange={e => setNewProjectDescription(e.target.value)}
                          placeholder="What are you trying to achieve?"
                          maxLength={500}
                        />
                      </div>
                      <div className="flex gap-3">
                        <Button
                          variant="outline"
                          onClick={() => setIsCreateProjectDialogOpen(false)}
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleCreateProject}
                          className="flex-1"
                          disabled={!newProjectName.trim()}
                        >
                          Create
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

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
              <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              >
                <div className="columns-1 md:columns-2 xl:columns-3 gap-4 [column-fill:_balance]">
                  {activeProjects.map(project => {
                    const cfg = categoryConfig[(project.category as GoalCategory) || 'personal'];
                    const PIcon = cfg.icon;
                    const tasks = tasksByProject.get(project.id) ?? [];
                    const hideDone = hideDoneByProject.has(project.id);
                    const visibleTasks = hideDone
                      ? tasks.filter(t => t.status !== 'done')
                      : tasks;
                    const doneCount = tasks.filter(t => t.status === 'done').length;
                    const totalCount = tasks.length;

                    return (
                      <Card
                        key={project.id}
                        className="overflow-hidden mb-4 break-inside-avoid"
                      >
                        {/* Project header */}
                        <div className={cn('px-4 py-3 border-b border-border', cfg.bgColor)}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <PIcon className={cn('h-4 w-4 shrink-0', cfg.color)} />
                              <div className="min-w-0">
                                <h3 className="font-semibold text-sm truncate">{project.name}</h3>
                                <p className="text-[10px] text-muted-foreground">
                                  {cfg.label} · {doneCount}/{totalCount} done
                                </p>
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
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {project.description}
                            </p>
                          )}
                        </div>

                        {/* Sortable task list — droppable container is the SortableContext + a min-height div */}
                        <SortableContext
                          id={project.id}
                          items={visibleTasks.map(t => t.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          <div className="p-3 space-y-0.5 min-h-[40px]" data-project-id={project.id}>
                            {visibleTasks.length === 0 ? (
                              <p className="text-xs text-muted-foreground text-center py-3">
                                {hideDone && tasks.length > 0
                                  ? 'All tasks done 🎉'
                                  : 'No tasks yet'}
                              </p>
                            ) : (
                              visibleTasks.map(task => (
                                <SortableTask
                                  key={task.id}
                                  task={task}
                                  onToggle={checked =>
                                    updateTaskMutation.mutate({
                                      id: task.id,
                                      updates: {
                                        status: checked ? 'done' : 'todo',
                                        completed_at: checked ? new Date().toISOString() : null,
                                      },
                                    })
                                  }
                                  onDelete={() => deleteTaskMutation.mutate(task.id)}
                                  onEdit={() => {
                                    setEditingTask(task);
                                    setEditTaskTitle(task.title);
                                    setEditTaskDescription(task.description ?? '');
                                    setEditTaskDueDate(task.due_date ?? '');
                                  }}
                                />
                              ))
                            )}
                          </div>
                        </SortableContext>

                        {/* Footer */}
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

                <DragOverlay>
                  {activeDragTask ? (
                    <div className="rounded-md border border-border bg-card px-2 py-1.5 shadow-md text-sm">
                      {activeDragTask.title}
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>
            )}

            {/* Add Task Dialog */}
            <Dialog
              open={isCreateTaskDialogOpen}
              onOpenChange={open => {
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
                      ? `Add a step to ${projectMap.get(taskDialogProjectId)?.name || 'this project'}`
                      : 'Add a new task'}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Project</label>
                    <Select
                      value={taskDialogProjectId || ''}
                      onValueChange={v => setTaskDialogProjectId(v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a project" />
                      </SelectTrigger>
                      <SelectContent>
                        {activeProjects.map(p => {
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
                      onChange={e => setNewTaskTitle(e.target.value)}
                      placeholder="e.g., Buy seeds"
                      maxLength={200}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Description (optional)</label>
                    <Textarea
                      value={newTaskDescription}
                      onChange={e => setNewTaskDescription(e.target.value)}
                      placeholder="Add details..."
                      maxLength={500}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Deadline (optional)</label>
                    <Input
                      type="date"
                      value={newTaskDueDate}
                      onChange={e => setNewTaskDueDate(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setIsCreateTaskDialogOpen(false)}
                      className="flex-1"
                    >
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

            {/* Edit Task Dialog */}
            <Dialog
              open={!!editingTask}
              onOpenChange={open => {
                if (!open) {
                  setEditingTask(null);
                  setEditTaskTitle('');
                  setEditTaskDescription('');
                  setEditTaskDueDate('');
                }
              }}
            >
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit Task</DialogTitle>
                  <DialogDescription>
                    Update this task's title, notes, or deadline.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Title</label>
                    <Input
                      value={editTaskTitle}
                      onChange={e => setEditTaskTitle(e.target.value)}
                      maxLength={200}
                      autoFocus
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Description (optional)</label>
                    <Textarea
                      value={editTaskDescription}
                      onChange={e => setEditTaskDescription(e.target.value)}
                      maxLength={500}
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Deadline (optional)</label>
                    <Input
                      type="date"
                      value={editTaskDueDate}
                      onChange={e => setEditTaskDueDate(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setEditingTask(null)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => {
                        if (!editingTask || !editTaskTitle.trim()) {
                          toast.error('Title is required');
                          return;
                        }
                        updateTaskMutation.mutate({
                          id: editingTask.id,
                          updates: {
                            title: editTaskTitle.trim(),
                            description: editTaskDescription.trim() || null,
                            due_date: editTaskDueDate || null,
                          },
                        });
                        setEditingTask(null);
                        toast.success('Task updated');
                      }}
                      className="flex-1"
                      disabled={!editTaskTitle.trim()}
                    >
                      Save
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </CollapsibleContent>
        </Collapsible>

        {/* Create Goal Dialog */}
        <Dialog
          open={isCreateDialogOpen}
          onOpenChange={open => {
            setIsCreateDialogOpen(open);
            if (!open) {
              setNewGoalTitle('');
              setNewGoalDescription('');
              setSelectedEmoji('🎯');
              setSelectedCategory('personal');
            }
          }}
        >
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-xl">
                Add {goalTypeConfig[createGoalType].label} Goal
              </DialogTitle>
              <DialogDescription>
                Set a goal for{' '}
                {createGoalType === 'daily'
                  ? 'today'
                  : createGoalType === 'weekly'
                    ? 'this week'
                    : 'this month'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 pt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Category</label>
                <Select
                  value={selectedCategory}
                  onValueChange={v => setSelectedCategory(v as GoalCategory)}
                >
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
                        {goalEmojis.map(emoji => (
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
                    onChange={e => setNewGoalTitle(e.target.value)}
                    placeholder="e.g., Read 12 books this year"
                    className="flex-1"
                    maxLength={100}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Description (optional)
                </label>
                <Textarea
                  value={newGoalDescription}
                  onChange={e => setNewGoalDescription(e.target.value)}
                  placeholder="Add more details about what you want to achieve..."
                  className="min-h-[80px]"
                  maxLength={500}
                />
              </div>

              {(createGoalType === 'weekly' || createGoalType === 'monthly') && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Repeat</label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={1}
                      max={52}
                      value={recurrenceCount}
                      onChange={e => {
                        const v = parseInt(e.target.value || '1', 10);
                        setRecurrenceCount(Math.max(1, Math.min(52, isNaN(v) ? 1 : v)));
                      }}
                      className="w-20"
                    />
                    <span className="text-sm text-muted-foreground">
                      {createGoalType === 'weekly'
                        ? recurrenceCount === 1
                          ? 'week'
                          : 'weeks'
                        : recurrenceCount === 1
                          ? 'month'
                          : 'months'}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {recurrenceCount > 1
                      ? `Will create ${recurrenceCount} ${createGoalType === 'weekly' ? 'weekly' : 'monthly'} occurrences starting now.`
                      : 'Set higher than 1 to repeat this goal.'}
                  </p>
                </div>
              )}

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
                  className={cn('flex-1', goalTypeConfig[createGoalType].button)}
                  disabled={!newGoalTitle.trim()}
                >
                  Save Goal
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Confirm dialog for deleting a recurring goal */}
        <AlertDialog
          open={!!pendingDeleteGoal}
          onOpenChange={open => {
            if (!open) setPendingDeleteGoal(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete recurring goal?</AlertDialogTitle>
              <AlertDialogDescription>
                This goal repeats. Choose what to delete.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex flex-col gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  if (pendingDeleteGoal) deleteGoalMutation.mutate(pendingDeleteGoal.id);
                  setPendingDeleteGoal(null);
                }}
              >
                Only this occurrence
              </Button>
              <Button
                variant="destructive"
                onClick={async () => {
                  const g = pendingDeleteGoal;
                  if (g && g.recurrence_id) {
                    try {
                      await deleteRecurringGoals(g.recurrence_id, g.created_at);
                      queryClient.invalidateQueries({ queryKey: ['goals'] });
                      toast.success('Recurring goals deleted');
                    } catch {
                      toast.error('Failed to delete recurring goals');
                    }
                  }
                  setPendingDeleteGoal(null);
                }}
              >
                This and all future occurrences
              </Button>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
}
