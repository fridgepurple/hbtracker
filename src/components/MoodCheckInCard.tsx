import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { ensureMoodOptionsSeeded, fetchMoodEntries, upsertMoodEntry, MoodOption } from '@/lib/moodQueries';
import { energyToEmoji } from './DayCheckInDialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

export default function MoodCheckInCard() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const queryClient = useQueryClient();
  const [pickerOpen, setPickerOpen] = useState(false);

  // Mood options (seeded once)
  const { data: moodOptions = [] } = useQuery({
    queryKey: ['moodOptions'],
    queryFn: ensureMoodOptionsSeeded,
    staleTime: Infinity,
  });

  // Today's entry
  const { data: entries = [] } = useQuery({
    queryKey: ['moodEntries', today, today],
    queryFn: () => fetchMoodEntries(today, today),
  });

  const todayEntry = entries[0] ?? null;

  const upsertMutation = useMutation({
    mutationFn: upsertMoodEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['moodEntries'] });
    },
    onError: () => {
      toast.error('Failed to save mood');
    },
  });

  const handleSelectMood = (option: MoodOption) => {
    upsertMutation.mutate({
      date: today,
      mood_option_id: option.id,
      intensity: todayEntry?.intensity ?? 5,
      energy: todayEntry?.energy ?? 5,
    });
    setPickerOpen(false);
    toast.success('Mood saved');
  };

  const handleSliderChange = (field: 'intensity' | 'energy', value: number) => {
    if (!todayEntry) return;
    upsertMutation.mutate({
      date: today,
      mood_option_id: todayEntry.mood_option_id,
      intensity: field === 'intensity' ? value : todayEntry.intensity,
      energy: field === 'energy' ? value : todayEntry.energy,
    });
  };

  const selectedEmoji = todayEntry?.emoji ?? null;

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Mood Check-in</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Emoji square */}
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className={cn(
              'w-14 h-14 rounded-lg border-2 border-border flex items-center justify-center text-2xl',
              'hover:border-primary transition-colors',
              !selectedEmoji && 'text-muted-foreground'
            )}
            aria-label="Open mood picker"
          >
            {selectedEmoji ?? '+'}
          </button>

          {/* Sliders (only visible after mood selected) */}
          {todayEntry && (
            <div className="space-y-3">
              {/* Temperature */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Temperature</span>
                  <span>{todayEntry.intensity}/10</span>
                </div>
                <Slider
                  value={[todayEntry.intensity]}
                  min={0}
                  max={10}
                  step={1}
                  onValueChange={(v) => handleSliderChange('intensity', v[0] ?? 5)}
                />
              </div>
              {/* Energy */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Energy</span>
                  <span className="flex items-center gap-1">
                    {energyToEmoji(todayEntry.energy)} {todayEntry.energy}/10
                  </span>
                </div>
                <Slider
                  value={[todayEntry.energy]}
                  min={0}
                  max={10}
                  step={1}
                  onValueChange={(v) => handleSliderChange('energy', v[0] ?? 5)}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Emoji picker modal */}
      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>How are you feeling?</DialogTitle>
            <DialogDescription>Pick a mood emoji</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-5 gap-2 pt-2">
            {moodOptions.map((opt) => (
              <Button
                key={opt.id}
                type="button"
                variant={todayEntry?.mood_option_id === opt.id ? 'default' : 'outline'}
                className={cn(
                  'h-11 w-11 p-0 text-xl',
                  todayEntry?.mood_option_id === opt.id &&
                    'ring-2 ring-ring ring-offset-2 ring-offset-background'
                )}
                onClick={() => handleSelectMood(opt)}
                title={opt.label}
                aria-label={opt.label}
              >
                {opt.emoji}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
