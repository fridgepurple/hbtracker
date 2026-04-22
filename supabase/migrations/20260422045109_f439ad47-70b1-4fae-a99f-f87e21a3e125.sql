ALTER TABLE public.project_tasks
  ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_project_tasks_display_order
  ON public.project_tasks (project_id, display_order);