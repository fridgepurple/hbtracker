-- 1) Mood options (per-user emoji catalog)
CREATE TABLE IF NOT EXISTS public.mood_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  emoji text NOT NULL,
  label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT mood_options_user_emoji_unique UNIQUE (user_id, emoji)
);

ALTER TABLE public.mood_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own mood options"
ON public.mood_options
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own mood options"
ON public.mood_options
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own mood options"
ON public.mood_options
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own mood options"
ON public.mood_options
FOR DELETE
USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_mood_options_user_sort
ON public.mood_options (user_id, sort_order);

-- Keep updated_at fresh
DROP TRIGGER IF EXISTS update_mood_options_updated_at ON public.mood_options;
CREATE TRIGGER update_mood_options_updated_at
BEFORE UPDATE ON public.mood_options
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();


-- 2) Update mood_entries to the new structure
-- Existing table may already exist from prior iteration; evolve it safely.
ALTER TABLE public.mood_entries
  ADD COLUMN IF NOT EXISTS mood_option_id uuid;

-- Convert existing emoji/emotion to mood_option_id by seeding defaults for any existing users.
-- (We intentionally do NOT attach triggers to auth.*; seeding for brand-new users is handled by the app.)
WITH distinct_users AS (
  SELECT DISTINCT user_id
  FROM public.mood_entries
), defaults AS (
  SELECT * FROM (VALUES
    ('😀','Great',1),
    ('🙂','Good',2),
    ('😐','Neutral',3),
    ('😕','Meh',4),
    ('😔','Sad',5),
    ('😢','Very sad',6),
    ('😡','Angry',7),
    ('😤','Frustrated',8),
    ('😰','Anxious',9),
    ('😴','Tired',10),
    ('🤒','Sick',11),
    ('🥺','Sensitive',12),
    ('💔','Heart heavy',13)
  ) AS t(emoji,label,sort_order)
)
INSERT INTO public.mood_options (user_id, emoji, label, sort_order, is_active)
SELECT u.user_id, d.emoji, d.label, d.sort_order, true
FROM distinct_users u
CROSS JOIN defaults d
ON CONFLICT (user_id, emoji) DO NOTHING;

-- Backfill mood_option_id from existing mood_emoji / emotion
UPDATE public.mood_entries me
SET mood_option_id = mo.id
FROM public.mood_options mo
WHERE me.user_id = mo.user_id
  AND mo.emoji = COALESCE(
    me.mood_emoji,
    CASE me.emotion
      WHEN 'sad' THEN '😔'
      WHEN 'neutral' THEN '😐'
      WHEN 'happy' THEN '🙂'
      WHEN 'angry' THEN '😡'
      ELSE NULL
    END
  )
  AND me.mood_option_id IS NULL;

-- If we have entries with no mood selection, remove them before enforcing NOT NULL
DELETE FROM public.mood_entries
WHERE mood_option_id IS NULL;

-- Ensure slider ranges and defaults align with the new UX
ALTER TABLE public.mood_entries
  ALTER COLUMN intensity SET DEFAULT 5,
  ALTER COLUMN energy SET DEFAULT 5;

-- Drop legacy columns/constraints
ALTER TABLE public.mood_entries
  DROP CONSTRAINT IF EXISTS mood_entries_emotion_check,
  DROP CONSTRAINT IF EXISTS mood_entries_intensity_range,
  DROP CONSTRAINT IF EXISTS mood_entries_energy_range,
  DROP COLUMN IF EXISTS mood_emoji,
  DROP COLUMN IF EXISTS emotion;

-- Enforce mood_option_id presence + FK
ALTER TABLE public.mood_entries
  ALTER COLUMN mood_option_id SET NOT NULL,
  ADD CONSTRAINT mood_entries_mood_option_id_fkey
    FOREIGN KEY (mood_option_id) REFERENCES public.mood_options(id)
    ON DELETE RESTRICT;

-- Add helpful indexes
CREATE INDEX IF NOT EXISTS idx_mood_entries_user_date
ON public.mood_entries (user_id, date);

CREATE INDEX IF NOT EXISTS idx_mood_entries_mood_option
ON public.mood_entries (mood_option_id);

-- RLS: keep existing user ownership policies if they exist, but ensure mood_option belongs to the same user on write.
ALTER TABLE public.mood_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can create their own mood entries" ON public.mood_entries;
CREATE POLICY "Users can create their own mood entries"
ON public.mood_entries
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1
    FROM public.mood_options mo
    WHERE mo.id = mood_entries.mood_option_id
      AND mo.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can update their own mood entries" ON public.mood_entries;
CREATE POLICY "Users can update their own mood entries"
ON public.mood_entries
FOR UPDATE
USING (
  auth.uid() = user_id
)
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1
    FROM public.mood_options mo
    WHERE mo.id = mood_entries.mood_option_id
      AND mo.user_id = auth.uid()
  )
);

-- Keep updated_at fresh
DROP TRIGGER IF EXISTS update_mood_entries_updated_at ON public.mood_entries;
CREATE TRIGGER update_mood_entries_updated_at
BEFORE UPDATE ON public.mood_entries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
