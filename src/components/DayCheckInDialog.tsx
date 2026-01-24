import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { MoodOption, MoodEntry } from '@/lib/moodQueries';

/** Map energy 0-10 to an emoji for quick display */
export function energyToEmoji(energy: number) {
  if (energy <= 2) return '🪫';
  if (energy <= 5) return '🔋';
  if (energy <= 8) return '⚡';
  return '🔥';
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string; // yyyy-mm-dd
  moodOptions: MoodOption[];
  existing?: (MoodEntry & { emoji: string; label: string }) | null;
  onChange: (next: { date: string; mood_option_id: string; intensity: number; energy: number }) => void;
};

export default function DayCheckInDialog({ open, onOpenChange, date, moodOptions, existing, onChange }: Props) {
  const initial = useMemo(() => ({
    mood_option_id: existing?.mood_option_id ?? null,
    intensity: typeof existing?.intensity === 'number' ? existing.intensity : 5,
    energy: typeof existing?.energy === 'number' ? existing.energy : 5,
  }), [existing]);

  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(initial.mood_option_id);
  const [intensity, setIntensity] = useState<number>(initial.intensity);
  const [energy, setEnergy] = useState<number>(initial.energy);

  // Sync when date/existing changes
  useEffect(() => {
    setSelectedOptionId(initial.mood_option_id);
    setIntensity(initial.intensity);
    setEnergy(initial.energy);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, existing?.id]);

  // Autosave on change (debounced) — only when we have a selected mood
  useEffect(() => {
    if (!open || !selectedOptionId) return;
    const handle = window.setTimeout(() => {
      onChange({ date, mood_option_id: selectedOptionId, intensity, energy });
    }, 450);
    return () => window.clearTimeout(handle);
  }, [open, date, selectedOptionId, intensity, energy, onChange]);

  const handleSelectMood = (optionId: string) => {
    setSelectedOptionId(optionId);
    toast.success('Mood updated');
  };

  const selectedOption = moodOptions.find((o) => o.id === selectedOptionId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Check-in</DialogTitle>
          <DialogDescription>{date}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Mood Grid */}
          <section className="space-y-2">
            <div className="text-sm font-medium">Mood</div>
            <div className="grid grid-cols-5 gap-2">
              {moodOptions.map((opt) => (
                <Button
                  key={opt.id}
                  type="button"
                  variant={selectedOptionId === opt.id ? 'default' : 'outline'}
                  className={cn(
                    'h-11 w-11 p-0 text-xl',
                    selectedOptionId === opt.id && 'ring-2 ring-ring ring-offset-2 ring-offset-background'
                  )}
                  onClick={() => handleSelectMood(opt.id)}
                  aria-label={opt.label}
                  title={opt.label}
                >
                  {opt.emoji}
                </Button>
              ))}
            </div>
            {selectedOption && (
              <p className="text-xs text-muted-foreground mt-1 text-center">{selectedOption.label}</p>
            )}
          </section>


          {/* Energy slider */}
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
              disabled={!selectedOptionId}
              onValueChange={(v) => setEnergy(v[0] ?? 5)}
            />
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
