import { useMemo } from 'react';
import { format, subDays, startOfDay, eachDayOfInterval } from 'date-fns';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface Habit {
  id: string;
  name: string;
  category?: string;
  description?: string;
}

interface HabitLog {
  habit_id: string;
  date: string;
  completed: boolean;
}

interface HabitHeatMapProps {
  habits: Habit[];
  logs: HabitLog[];
  onToggle: (habitId: string, date: string, completed: boolean) => void;
  onDayClick?: (date: string) => void;
  bottomRows?: React.ReactNode;
  days?: number;
  startDate?: Date;
  endDate?: Date;
}

export default function HabitHeatMap({ habits, logs, onToggle, onDayClick, bottomRows, days = 30, startDate, endDate }: HabitHeatMapProps) {
  const dateRange = useMemo(() => {
    if (startDate && endDate) {
      return eachDayOfInterval({ start: startDate, end: endDate });
    }
    const end = startOfDay(new Date());
    const start = subDays(end, days - 1);
    return eachDayOfInterval({ start, end });
  }, [days, startDate, endDate]);

  const logMap = useMemo(() => {
    const map = new Map<string, boolean>();
    logs.forEach(log => {
      if (log.completed) {
        map.set(`${log.habit_id}-${log.date}`, true);
      }
    });
    return map;
  }, [logs]);

  const getStreak = (habitId: string, date: Date): number => {
    let streak = 0;
    let currentDate = date;
    
    for (let i = 0; i < 7; i++) {
      const dateStr = format(currentDate, 'yyyy-MM-dd');
      if (logMap.get(`${habitId}-${dateStr}`)) {
        streak++;
        currentDate = subDays(currentDate, 1);
      } else {
        break;
      }
    }
    return streak;
  };

  const getCellColor = (habitId: string, date: Date): string => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const isCompleted = logMap.get(`${habitId}-${dateStr}`);
    
    if (!isCompleted) {
      return 'bg-muted/30 hover:bg-muted/50';
    }
    
    const streak = getStreak(habitId, date);
    
    if (streak >= 7) return 'bg-success hover:bg-success/90 shadow-[0_0_8px_hsl(var(--success)/0.5)]';
    if (streak >= 5) return 'bg-success/90 hover:bg-success/80';
    if (streak >= 3) return 'bg-success/70 hover:bg-success/60';
    return 'bg-success/50 hover:bg-success/40';
  };

  const handleCellClick = (habitId: string, date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const isCompleted = logMap.get(`${habitId}-${dateStr}`);
    onToggle(habitId, dateStr, !isCompleted);
    onDayClick?.(dateStr);
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className="overflow-x-auto">
        <div className="min-w-fit">
          {/* Date headers */}
          <div className="flex gap-1 mb-2 pl-32">
            {dateRange.map((date, i) => (
              <div
                key={i}
                className="w-6 h-6 flex items-center justify-center text-[10px] text-muted-foreground"
              >
                {i % 7 === 0 ? format(date, 'd') : ''}
              </div>
            ))}
          </div>

          {/* Habit rows */}
          {habits.map(habit => (
            <div key={habit.id} className="flex items-center gap-1 mb-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="w-32 pr-2 truncate text-sm font-medium cursor-default">
                    {habit.name}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-[200px]">
                  <p className="font-medium">{habit.name}</p>
                  {habit.description && (
                    <p className="text-xs text-muted-foreground mt-1">{habit.description}</p>
                  )}
                </TooltipContent>
              </Tooltip>
              <div className="flex gap-1">
                {dateRange.map((date) => {
                  const dateStr = format(date, 'yyyy-MM-dd');
                  const isCompleted = logMap.get(`${habit.id}-${dateStr}`);
                  const isToday = format(new Date(), 'yyyy-MM-dd') === dateStr;
                  
                  return (
                    <Tooltip key={dateStr}>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => handleCellClick(habit.id, date)}
                          className={cn(
                            'w-6 h-6 rounded-sm transition-all duration-300 transform',
                            getCellColor(habit.id, date),
                            isToday && 'ring-2 ring-primary ring-offset-1 ring-offset-background',
                            isCompleted && 'scale-100',
                            'hover:scale-110 active:scale-95'
                          )}
                          aria-label={`${habit.name} - ${format(date, 'MMM d')} - ${isCompleted ? 'completed' : 'not completed'}`}
                        />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        <p className="font-medium">{habit.name}</p>
                        <p className="text-muted-foreground">{format(date, 'EEEE, MMM d')}</p>
                        <p className={isCompleted ? 'text-success' : 'text-muted-foreground'}>
                          {isCompleted ? '✓ Completed' : 'Not completed'}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            </div>
          ))}

          {bottomRows}

          {/* Legend */}
          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border">
            <span className="text-xs text-muted-foreground">Less</span>
            <div className="flex gap-1">
              <div className="w-4 h-4 rounded-sm bg-muted/30" />
              <div className="w-4 h-4 rounded-sm bg-success/50" />
              <div className="w-4 h-4 rounded-sm bg-success/70" />
              <div className="w-4 h-4 rounded-sm bg-success/90" />
              <div className="w-4 h-4 rounded-sm bg-success" />
            </div>
            <span className="text-xs text-muted-foreground">More</span>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
