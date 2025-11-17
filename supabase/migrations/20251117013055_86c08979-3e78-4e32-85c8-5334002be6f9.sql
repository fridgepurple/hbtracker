-- Fix search_path for the time range validation function
DROP FUNCTION IF EXISTS check_habit_time_range() CASCADE;

CREATE OR REPLACE FUNCTION check_habit_time_range()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.start_time IS NOT NULL AND NEW.end_time IS NOT NULL AND NEW.end_time <= NEW.start_time THEN
    RAISE EXCEPTION 'end_time must be after start_time';
  END IF;
  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER validate_habit_time_range
  BEFORE INSERT OR UPDATE ON public.habits
  FOR EACH ROW
  EXECUTE FUNCTION check_habit_time_range();