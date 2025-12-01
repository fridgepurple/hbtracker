import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, addMonths } from 'date-fns';
import Layout from '@/components/Layout';
import { fetchGoals, createGoal, updateGoal, deleteGoal, Goal } from '@/lib/goalQueries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ChevronLeft, ChevronRight, Plus, Trash2, Edit } from 'lucide-react';
import { toast } from 'sonner';

export default function Goals() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalDescription, setNewGoalDescription] = useState('');
  const queryClient = useQueryClient();

  const { data: goals = [] } = useQuery({
    queryKey: ['goals', currentMonth.getFullYear(), currentMonth.getMonth() + 1],
    queryFn: () => fetchGoals(currentMonth.getFullYear(), currentMonth.getMonth() + 1),
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
      setEditingGoal(null);
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
      month: currentMonth.getMonth() + 1,
      year: currentMonth.getFullYear(),
    });
  };

  const completedGoals = goals.filter(g => g.completed).length;
  const totalGoals = goals.length;
  const overallProgress = totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border-purple-500/20">
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentMonth(addMonths(currentMonth, -1))}
                  className="border-purple-500/20"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <CardTitle className="text-2xl bg-gradient-to-r from-purple-600 to-purple-400 bg-clip-text text-transparent">
                  {format(currentMonth, 'MMMM yyyy')} Goals
                </CardTitle>

                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                  className="border-purple-500/20"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-purple-600 hover:bg-purple-700 text-white">
                    <Plus className="h-4 w-4 mr-2" />
                    New Goal
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Goal</DialogTitle>
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
                      className="w-full bg-purple-600 hover:bg-purple-700"
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
                  <span className="text-purple-600 font-medium">Overall Progress</span>
                  <span className="text-purple-600 font-medium">
                    {completedGoals} / {totalGoals} completed ({overallProgress}%)
                  </span>
                </div>
                <div className="h-2 bg-purple-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-600 to-purple-400 transition-all duration-500"
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
                No goals set for this month. Create your first goal to get started!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {goals.map((goal) => (
              <Card
                key={goal.id}
                className="border-purple-500/20 hover:border-purple-500/40 transition-colors"
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
                        className="mt-1 border-purple-500 data-[state=checked]:bg-purple-600"
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
                        <span className="text-purple-600 font-medium">Progress</span>
                        <span className="text-purple-600 font-medium">{goal.progress}%</span>
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
                        className="[&_[role=slider]]:bg-purple-600 [&_[role=slider]]:border-purple-600"
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
