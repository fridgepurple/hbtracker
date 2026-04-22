import { supabase } from '@/integrations/supabase/client';

export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';
export type ProjectCategory = 'home' | 'finance' | 'work' | 'school' | 'personal' | 'travel';

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  category: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectTask {
  id: string;
  project_id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  completed_at: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export const fetchProjects = async (): Promise<Project[]> => {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as Project[];
};

export const fetchProjectTasks = async (projectId: string): Promise<ProjectTask[]> => {
  const { data, error } = await supabase
    .from('project_tasks')
    .select('*')
    .eq('project_id', projectId)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data || []) as ProjectTask[];
};

export const fetchAllTasks = async (): Promise<ProjectTask[]> => {
  const { data, error } = await supabase
    .from('project_tasks')
    .select('*')
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data || []) as ProjectTask[];
};

export const reorderTasks = async (
  updates: { id: string; project_id: string; display_order: number }[]
): Promise<void> => {
  // Update each task's display_order (and project_id if it moved across projects)
  await Promise.all(
    updates.map(u =>
      supabase
        .from('project_tasks')
        .update({ project_id: u.project_id, display_order: u.display_order })
        .eq('id', u.id)
    )
  );
};

export const createProject = async (project: {
  name: string;
  description?: string;
  category?: string;
}): Promise<Project> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('projects')
    .insert({
      user_id: user.id,
      name: project.name,
      description: project.description || null,
      category: project.category || 'work',
    })
    .select()
    .single();

  if (error) throw error;
  return data as Project;
};

export const updateProject = async (
  id: string,
  updates: Partial<Omit<Project, 'id' | 'user_id' | 'created_at'>>
): Promise<Project> => {
  const { data, error } = await supabase
    .from('projects')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Project;
};

export const deleteProject = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

export const createTask = async (task: {
  project_id: string;
  title: string;
  description?: string;
  priority?: string;
  due_date?: string;
}): Promise<ProjectTask> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('project_tasks')
    .insert({
      user_id: user.id,
      project_id: task.project_id,
      title: task.title,
      description: task.description || null,
      priority: task.priority || 'medium',
      due_date: task.due_date || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data as ProjectTask;
};

export const updateTask = async (
  id: string,
  updates: Partial<Omit<ProjectTask, 'id' | 'user_id' | 'project_id' | 'created_at'>>
): Promise<ProjectTask> => {
  const updateData: Record<string, unknown> = { ...updates };
  
  // If marking as done, set completed_at
  if (updates.status === 'done' && !updates.completed_at) {
    updateData.completed_at = new Date().toISOString();
  } else if (updates.status && updates.status !== 'done') {
    updateData.completed_at = null;
  }

  const { data, error } = await supabase
    .from('project_tasks')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as ProjectTask;
};

export const deleteTask = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('project_tasks')
    .delete()
    .eq('id', id);

  if (error) throw error;
};
