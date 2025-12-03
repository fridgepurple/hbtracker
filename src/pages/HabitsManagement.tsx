import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '@/components/Layout';
import { fetchHabits, createHabit, updateHabit, archiveHabit, deleteHabit } from '@/lib/habitQueries';
import { sortHabits, sortOptions, SortOption } from '@/lib/habitSorting';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, Archive, GripVertical } from 'lucide-react';
import { toast } from 'sonner';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { supabase } from '@/integrations/supabase/client';

interface SortableHabitCardProps {
  habit: any;
  isCustomSort: boolean;
  onEdit: (habit: any) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
  editingHabit: any;
  formData: any;
  setFormData: (data: any) => void;
  handleSubmit: (e: React.FormEvent) => void;
  updateMutation: any;
  setEditingHabit: (habit: any) => void;
}

function SortableHabitCard({
  habit,
  isCustomSort,
  onEdit,
  onArchive,
  onDelete,
  editingHabit,
  formData,
  setFormData,
  handleSubmit,
  updateMutation,
  setEditingHabit,
}: SortableHabitCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: habit.id, disabled: !isCustomSort });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
              {isCustomSort && (
                <button
                  className="cursor-grab active:cursor-grabbing mt-1 text-muted-foreground hover:text-foreground"
                  {...attributes}
                  {...listeners}
                >
                  <GripVertical className="h-5 w-5" />
                </button>
              )}
              <div className="flex-1">
                <CardTitle>{habit.name}</CardTitle>
                {habit.description && (
                  <CardDescription className="mt-1">{habit.description}</CardDescription>
                )}
                <div className="flex gap-2 mt-2 flex-wrap">
                  {habit.category && (
                    <span className="inline-block px-2 py-1 text-xs rounded-full bg-primary/10 text-primary">
                      {habit.category}
                    </span>
                  )}
                  {(habit.start_time || habit.end_time) && (
                    <span className="inline-block px-2 py-1 text-xs rounded-full bg-accent/10 text-accent-foreground">
                      {habit.start_time && habit.start_time.slice(0, 5)}
                      {habit.start_time && habit.end_time && ' - '}
                      {habit.end_time && habit.end_time.slice(0, 5)}
                      {habit.start_time && habit.end_time && habit.end_time < habit.start_time && ' (+1)'}
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Dialog open={editingHabit?.id === habit.id} onOpenChange={(open) => !open && setEditingHabit(null)}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="icon" onClick={() => onEdit(habit)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <form onSubmit={handleSubmit}>
                    <DialogHeader>
                      <DialogTitle>Edit Habit</DialogTitle>
                      <DialogDescription>
                        Update your habit details
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit-name">Habit Name *</Label>
                        <Input
                          id="edit-name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="edit-description">Description</Label>
                        <Textarea
                          id="edit-description"
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          rows={3}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="edit-category">Category</Label>
                        <Input
                          id="edit-category"
                          value={formData.category}
                          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="edit-start_time">Start Time</Label>
                          <Input
                            id="edit-start_time"
                            type="time"
                            value={formData.start_time}
                            onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="edit-end_time">End Time</Label>
                          <Input
                            id="edit-end_time"
                            type="time"
                            value={formData.end_time}
                            onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>
                    
                    <DialogFooter>
                      <Button type="submit" disabled={updateMutation.isPending}>
                        {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>

              <Button 
                variant="outline" 
                size="icon"
                onClick={() => onArchive(habit.id)}
              >
                <Archive className="h-4 w-4" />
              </Button>

              <Button 
                variant="outline" 
                size="icon"
                onClick={() => {
                  if (confirm('Are you sure? This will permanently delete this habit and all its logs.')) {
                    onDelete(habit.id);
                  }
                }}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>
    </div>
  );
}

export default function HabitsManagement() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<any>(null);
  const [sortBy, setSortBy] = useState<SortOption>('alphabetical');
  const [formData, setFormData] = useState({ 
    name: '', 
    description: '', 
    category: '',
    start_time: '',
    end_time: ''
  });
  const queryClient = useQueryClient();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const { data: habits = [] } = useQuery({
    queryKey: ['habits'],
    queryFn: fetchHabits,
  });

  const sortedHabits = useMemo(() => sortHabits(habits, sortBy), [habits, sortBy]);

  const createMutation = useMutation({
    mutationFn: createHabit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      setIsCreateOpen(false);
      setFormData({ name: '', description: '', category: '', start_time: '', end_time: '' });
      toast.success('Habit created successfully!');
    },
    onError: () => {
      toast.error('Failed to create habit');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) => updateHabit(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      setEditingHabit(null);
      setFormData({ name: '', description: '', category: '', start_time: '', end_time: '' });
      toast.success('Habit updated successfully!');
    },
    onError: () => {
      toast.error('Failed to update habit');
    },
  });

  const archiveMutation = useMutation({
    mutationFn: archiveHabit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      toast.success('Habit archived successfully!');
    },
    onError: () => {
      toast.error('Failed to archive habit');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteHabit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      toast.success('Habit deleted permanently!');
    },
    onError: () => {
      toast.error('Failed to delete habit');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Habit name is required');
      return;
    }

    // Note: We allow overnight time ranges (e.g., 21:00 to 05:00)

    const dataToSubmit = {
      ...formData,
      start_time: formData.start_time || undefined,
      end_time: formData.end_time || undefined
    };

    if (editingHabit) {
      updateMutation.mutate({ id: editingHabit.id, updates: dataToSubmit });
    } else {
      createMutation.mutate(dataToSubmit);
    }
  };

  const startEdit = (habit: any) => {
    setEditingHabit(habit);
    setFormData({
      name: habit.name,
      description: habit.description || '',
      category: habit.category || '',
      start_time: habit.start_time || '',
      end_time: habit.end_time || '',
    });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = sortedHabits.findIndex((h) => h.id === active.id);
      const newIndex = sortedHabits.findIndex((h) => h.id === over.id);

      const reorderedHabits = arrayMove(sortedHabits, oldIndex, newIndex);

      // Update display_order for all affected habits
      const updates = reorderedHabits.map((habit, index) => ({
        id: habit.id,
        display_order: index,
      }));

      try {
        // Optimistically update the UI
        queryClient.setQueryData(['habits'], (old: any) => {
          return old.map((habit: any) => {
            const update = updates.find((u) => u.id === habit.id);
            return update ? { ...habit, display_order: update.display_order } : habit;
          });
        });

        // Update in database
        await Promise.all(
          updates.map((update) =>
            supabase
              .from('habits')
              .update({ display_order: update.display_order })
              .eq('id', update.id)
          )
        );

        toast.success('Habit order updated!');
      } catch (error) {
        toast.error('Failed to update habit order');
        queryClient.invalidateQueries({ queryKey: ['habits'] });
      }
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Manage Habits</h1>
            <p className="text-muted-foreground">Create and organize your daily habits</p>
          </div>
          
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Habit
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>Create New Habit</DialogTitle>
                  <DialogDescription>
                    Add a new habit to track daily
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Habit Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Morning Exercise"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Optional description"
                      rows={3}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Input
                      id="category"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      placeholder="e.g., Health, Work, Personal"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="start_time">Start Time</Label>
                      <Input
                        id="start_time"
                        type="time"
                        value={formData.start_time}
                        onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="end_time">End Time</Label>
                      <Input
                        id="end_time"
                        type="time"
                        value={formData.end_time}
                        onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
                
                <DialogFooter>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? 'Creating...' : 'Create Habit'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Sort Controls */}
        <div className="flex items-center gap-4">
          <Label htmlFor="sort-by" className="whitespace-nowrap">Sort by:</Label>
          <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
            <SelectTrigger id="sort-by" className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {sortBy === 'custom' && (
            <p className="text-sm text-muted-foreground">Drag habits to reorder</p>
          )}
        </div>

        {/* Habits List */}
        {sortedHabits.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">
                No habits yet. Create your first habit to get started!
              </p>
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create First Habit
              </Button>
            </CardContent>
          </Card>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={sortedHabits.map((h) => h.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="grid gap-4">
                {sortedHabits.map((habit) => (
                  <SortableHabitCard
                    key={habit.id}
                    habit={habit}
                    isCustomSort={sortBy === 'custom'}
                    onEdit={startEdit}
                    onArchive={(id) => archiveMutation.mutate(id)}
                    onDelete={(id) => deleteMutation.mutate(id)}
                    editingHabit={editingHabit}
                    formData={formData}
                    setFormData={setFormData}
                    handleSubmit={handleSubmit}
                    updateMutation={updateMutation}
                    setEditingHabit={setEditingHabit}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </Layout>
  );
}
