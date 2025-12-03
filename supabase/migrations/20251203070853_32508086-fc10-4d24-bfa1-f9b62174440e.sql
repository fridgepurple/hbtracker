-- Add goal_type column to distinguish between daily, weekly, and monthly goals
ALTER TABLE public.goals 
ADD COLUMN goal_type text NOT NULL DEFAULT 'monthly' 
CHECK (goal_type IN ('daily', 'weekly', 'monthly'));

-- Add week column for weekly goals (1-53)
ALTER TABLE public.goals 
ADD COLUMN week integer;

-- Add day column for daily goals
ALTER TABLE public.goals 
ADD COLUMN day integer;

-- Add constraint to ensure week is valid when goal_type is weekly
ALTER TABLE public.goals 
ADD CONSTRAINT goals_week_check CHECK (
  (goal_type != 'weekly' OR (week >= 1 AND week <= 53))
);

-- Add constraint to ensure day is valid when goal_type is daily
ALTER TABLE public.goals 
ADD CONSTRAINT goals_day_check CHECK (
  (goal_type != 'daily' OR (day >= 1 AND day <= 31))
);

-- Create index for faster lookups by goal_type
CREATE INDEX idx_goals_goal_type ON public.goals(goal_type);