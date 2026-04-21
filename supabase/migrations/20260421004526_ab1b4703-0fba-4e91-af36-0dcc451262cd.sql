ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS recurrence_id UUID;
CREATE INDEX IF NOT EXISTS idx_goals_recurrence_id ON public.goals(recurrence_id);