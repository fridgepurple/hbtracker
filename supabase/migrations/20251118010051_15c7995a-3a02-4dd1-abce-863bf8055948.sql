-- Add display_order column to habits table for custom sorting
ALTER TABLE habits ADD COLUMN display_order INTEGER DEFAULT 0;

-- Create index for better performance on sorting
CREATE INDEX idx_habits_display_order ON habits(display_order);