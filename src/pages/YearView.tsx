import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, startOfYear, endOfYear } from 'date-fns';
import Layout from '@/components/Layout';
import { fetchHabits, fetchHabitLogs, calculateYearlyOverview, calculateMonthlyProgress } from '@/lib/habitQueries';
import { sortHabits, sortOptions, SortOption } from '@/lib/habitSorting';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function YearView() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedHabitId, setSelectedHabitId] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('alphabetical');

  const yearStart = startOfYear(new Date(selectedYear, 0));
  const yearEnd = endOfYear(new Date(selectedYear, 0));

  const { data: habits = [] } = useQuery({
    queryKey: ['habits'],
    queryFn: fetchHabits,
  });

  const sortedHabits = useMemo(() => sortHabits(habits, sortBy), [habits, sortBy]);

  const { data: logs = [] } = useQuery({
    queryKey: ['habitLogs', format(yearStart, 'yyyy-MM-dd'), format(yearEnd, 'yyyy-MM-dd')],
    queryFn: () => fetchHabitLogs(format(yearStart, 'yyyy-MM-dd'), format(yearEnd, 'yyyy-MM-dd')),
  });

  const chartData = selectedHabitId === 'all'
    ? calculateYearlyOverview(habits, selectedYear, logs)
    : Array.from({ length: 12 }, (_, i) => {
        const progress = calculateMonthlyProgress(selectedHabitId, selectedYear, i, logs);
        return {
          month: format(new Date(selectedYear, i), 'MMM'),
          percentage: progress
        };
      });

  return (
    <Layout>
      <div className="space-y-6">
        {/* Year Navigator & Filters */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={() => setSelectedYear(selectedYear - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <CardTitle className="text-2xl">{selectedYear}</CardTitle>
                
                <Button variant="outline" size="icon" onClick={() => setSelectedYear(selectedYear + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    {sortOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select value={selectedHabitId} onValueChange={setSelectedHabitId}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select habit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Habits (Average)</SelectItem>
                    {sortedHabits.map(habit => (
                      <SelectItem key={habit.id} value={habit.id}>
                        {habit.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <CardDescription>
              {selectedHabitId === 'all' 
                ? 'Average completion across all habits per month'
                : `Monthly completion for ${sortedHabits.find(h => h.id === selectedHabitId)?.name}`
              }
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Chart */}
        {sortedHabits.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                No habits yet. <a href="/habits" className="text-primary hover:underline">Create your first habit</a>
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Yearly Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="month" 
                    className="text-muted-foreground"
                  />
                  <YAxis 
                    domain={[0, 100]}
                    className="text-muted-foreground"
                    label={{ value: 'Completion %', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '0.5rem'
                    }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="percentage" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={3}
                    name="Completion %"
                    dot={{ fill: 'hsl(var(--primary))', r: 5 }}
                    activeDot={{ r: 7 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Summary Stats */}
        {habits.length > 0 && (
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Average Completion</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary">
                  {Math.round(chartData.reduce((sum, d) => sum + d.percentage, 0) / chartData.length)}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">Across all months</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Best Month</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-success">
                  {chartData.reduce((max, d) => d.percentage > max.percentage ? d : max, chartData[0])?.month || '-'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {Math.max(...chartData.map(d => d.percentage))}% completion
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Active Habits</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {habits.length}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Currently tracking</p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  );
}
