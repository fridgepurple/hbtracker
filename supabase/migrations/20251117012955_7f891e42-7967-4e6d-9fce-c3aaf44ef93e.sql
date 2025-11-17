-- Add time range fields to habits table
ALTER TABLE public.habits
ADD COLUMN start_time TIME,
ADD COLUMN end_time TIME;

-- Add a check to ensure end_time is after start_time if both are provided
CREATE OR REPLACE FUNCTION check_habit_time_range()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.start_time IS NOT NULL AND NEW.end_time IS NOT NULL AND NEW.end_time <= NEW.start_time THEN
    RAISE EXCEPTION 'end_time must be after start_time';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_habit_time_range
  BEFORE INSERT OR UPDATE ON public.habits
  FOR EACH ROW
  EXECUTE FUNCTION check_habit_time_range();