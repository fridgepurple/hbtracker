import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface ProgressCardProps {
  habitName: string;
  percentage: number;
  previousPercentage?: number;
}

export default function ProgressCard({ habitName, percentage, previousPercentage }: ProgressCardProps) {
  const trend = previousPercentage !== undefined 
    ? percentage - previousPercentage 
    : 0;

  const TrendIcon = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus;
  const trendColor = trend > 0 ? 'text-success' : trend < 0 ? 'text-destructive' : 'text-muted-foreground';

  return (
    <Card className="hover:shadow-medium transition-shadow">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium flex items-center justify-between">
          <span className="truncate">{habitName}</span>
          {previousPercentage !== undefined && (
            <div className={cn("flex items-center gap-1 text-sm", trendColor)}>
              <TrendIcon className="h-3 w-3" />
              <span>{Math.abs(trend)}%</span>
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Completion</span>
          <span className="font-semibold text-lg">{percentage}%</span>
        </div>
        <Progress 
          value={percentage} 
          className="h-2"
        />
      </CardContent>
    </Card>
  );
}

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(' ');
}
