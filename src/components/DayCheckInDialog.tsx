import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { MoodEmotion, MoodEntry } from '@/lib/moodQueries';

const MOOD_OPTIONS: Array<{ emoji: string; emotion: MoodEmotion; label: string }> = [
  { emoji: '😞', emotion: 'sad', label: 'Sad' },
  { emoji: '😐', emotion: 'neutral', label: 'Neutral' },
  { emoji: '🙂', emotion: 'happy', label: 'Happy' },
  { emoji: '😠', emotion: 'angry', label: 'Angry' },
];

export function energyToEmoji(energy: number) {
  if (energy <= 2) return '🪫';
  if (energy <= 5) return '🔋';
  if (energy <= 8) return '⚡';
  return '⚡⚡';
}

export function emotionToEmoji(emotion: MoodEmotion | null | undefined) {
  if (!emotion) return null;
  return MOOD_OPTIONS.find((o) => o.emotion === emotion)?.emoji ?? null;
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string; // yyyy-mm-dd
  existing?: MoodEntry | null;
  onChange: (next: { date: string; mood_emoji: string | null; emotion: MoodEmotion | null; intensity: number; energy: number }) => void;
};

export default function DayCheckInDialog({ open, onOpenChange, date, existing, onChange }: Props) {
  const initial = useMemo(() => {
    return {
      mood_emoji: existing?.mood_emoji ?? emotionToEmoji(existing?.emotion) ?? null,
      emotion: existing?.emotion ?? (existing?.mood_emoji ? (MOOD_OPTIONS.find(o => o.emoji === existing.mood_emoji)?.emotion ?? null) : null),
      intensity: typeof existing?.intensity === 'number' ? existing!.intensity : 0,
      energy: typeof existing?.energy === 'number' ? existing!.energy : 0,
    };
  }, [existing]);

  const [mood, setMood] = useState<{ mood_emoji: string | null; emotion: MoodEmotion | null }>(() => ({
    mood_emoji: initial.mood_emoji,
    emotion: initial.emotion,
  }));
  const [intensity, setIntensity] = useState<number>(initial.intensity);
  const [energy, setEnergy] = useState<number>(initial.energy);

  // Sync when switching dates
  useEffect(() => {
    setMood({ mood_emoji: initial.mood_emoji, emotion: initial.emotion });
    setIntensity(initial.intensity);
    setEnergy(initial.energy);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, existing?.id]);

  // Autosave (debounced)
  useEffect(() => {
    if (!open) return;
    const handle = window.setTimeout(() => {
      onChange({
        date,
        mood_emoji: mood.mood_emoji,
        emotion: mood.emotion,
        intensity,
        energy,
      });
    }, 450);
    return () => window.clearTimeout(handle);
  }, [open, date, mood.mood_emoji, mood.emotion, intensity, energy, onChange]);

  const setMoodByEmoji = (emoji: string) => {
    const match = MOOD_OPTIONS.find((o) => o.emoji === emoji);
    if (!match) return;
    setMood({ mood_emoji: match.emoji, emotion: match.emotion });
    toast.success('Mood updated');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Check-in</DialogTitle>
          <DialogDescription>{date}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Mood */}
          <section className="space-y-2">
            <div className="text-sm font-medium">Mood</div>
            <div className="flex items-center gap-2">
              {MOOD_OPTIONS.map((opt) => (
                <Button
                  key={opt.emotion}
                  type="button"
                  variant={mood.emotion === opt.emotion ? 'default' : 'outline'}
                  className={cn('h-11 w-11 p-0 text-xl', mood.emotion === opt.emotion && 'ring-2 ring-ring ring-offset-2 ring-offset-background')}
                  onClick={() => setMoodByEmoji(opt.emoji)}
                  aria-label={opt.label}
                >
                  {opt.emoji}
                </Button>
              ))}
            </div>
          </section>

          {/* Temperature / intensity */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Temperature</div>
              <div className="text-xs text-muted-foreground">{intensity}/10</div>
            </div>
            <Slider
              value={[intensity]}
              min={0}
              max={10}
              step={1}
              onValueChange={(v) => setIntensity(v[0] ?? 0)}
            />
          </section>

          {/* Energy */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Energy</div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{energyToEmoji(energy)}</span>
                <span>{energy}/10</span>
              </div>
            </div>
            <Slider
              value={[energy]}
              min={0}
              max={10}
              step={1}
              onValueChange={(v) => setEnergy(v[0] ?? 0)}
            />
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
