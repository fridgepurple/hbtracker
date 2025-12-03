-- Drop the trigger that enforces time range validation (to allow overnight habits)
DROP TRIGGER IF EXISTS validate_habit_time_range ON public.habits;

-- Drop the function as well since we no longer need it
DROP FUNCTION IF EXISTS public.check_habit_time_range();