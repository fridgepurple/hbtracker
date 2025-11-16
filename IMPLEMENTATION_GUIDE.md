# HabitFlow: Complete Implementation Guide

## Table of Contents
1. [Architecture & Stack Choice](#architecture--stack-choice)
2. [Project Setup](#project-setup)
3. [Database & Schema](#database--schema)
4. [Backend API & Data Layer](#backend-api--data-layer)
5. [Frontend Implementation](#frontend-implementation)
6. [Progress Calculations](#progress-calculations)
7. [Styling & UX](#styling--ux)
8. [Running the App](#running-the-app)
9. [Extending the Project](#extending-the-project)

---

## 1. Architecture & Stack Choice

### Technology Stack

**Frontend:**
- **React 18** with TypeScript for type safety and modern component development
- **Vite** as the build tool for fast development and optimized production builds
- **Tailwind CSS** for utility-first styling with a custom design system
- **Shadcn/ui** component library for consistent, accessible UI components
- **React Query** (@tanstack/react-query) for server state management and caching

**Backend:**
- **Lovable Cloud** (powered by Supabase) providing:
  - PostgreSQL database with Row Level Security (RLS)
  - Built-in authentication system
  - Real-time capabilities (if needed)
  - RESTful API via Supabase client

**Additional Libraries:**
- **date-fns** for robust date manipulation
- **recharts** for data visualization
- **sonner** for toast notifications
- **zod** for schema validation (available for future enhancements)

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend (React)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Dashboard   │  │  Week View   │  │  Month View  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐                         │
│  │  Year View   │  │   Habits     │                         │
│  └──────────────┘  └──────────────┘                         │
└────────────────────────┬────────────────────────────────────┘
                         │ React Query
                         │ Supabase Client
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                    Lovable Cloud (Supabase)                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │     Auth     │  │  PostgreSQL  │  │     RLS      │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                               │
│  Tables: habits, habit_logs                                  │
└─────────────────────────────────────────────────────────────┘
```

### Why This Stack?

1. **React + TypeScript**: Industry standard for type-safe component development
2. **Vite**: 10-100x faster than traditional bundlers, excellent DX
3. **Tailwind**: Rapid UI development with consistent design tokens
4. **Lovable Cloud**: Zero-config backend with enterprise-grade security
5. **React Query**: Eliminates boilerplate for data fetching, caching, and synchronization
6. **date-fns**: More reliable and smaller than moment.js

---

## 2. Project Setup

### Prerequisites

- Node.js 18+ and npm installed
- Git (optional, for version control)
- Modern web browser

### Initial Setup

This project is already set up in Lovable. If you want to run it locally:

```bash
# Clone the repository (if using git)
git clone <your-repo-url>
cd habitflow

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:8080`

### Key Configuration Files

**vite.config.ts** - Build configuration
```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

**tailwind.config.ts** - Styling configuration with custom design tokens
- Includes all semantic color tokens
- Custom animations and transitions
- Responsive breakpoints

**src/index.css** - Global styles and CSS variables
- Light and dark mode color schemes
- Custom gradients and shadows
- Transition utilities

---

## 3. Database & Schema

### Database Tables

#### habits Table

Stores information about each habit to track.

```sql
CREATE TABLE public.habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  archived_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT name_not_empty CHECK (length(trim(name)) > 0)
);
```

**Columns:**
- `id`: Unique identifier (UUID)
- `user_id`: Links habit to authenticated user (foreign key to auth.users)
- `name`: Habit name (required, non-empty)
- `description`: Optional longer description
- `category`: Optional category like "Health", "Work", "Personal"
- `created_at`: Timestamp when habit was created
- `archived_at`: NULL if active, timestamp if archived (soft delete)

#### habit_logs Table

Records daily completion status for each habit.

```sql
CREATE TABLE public.habit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id UUID NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(habit_id, date)
);
```

**Columns:**
- `id`: Unique identifier (UUID)
- `habit_id`: Links to habit (foreign key with CASCADE delete)
- `date`: The date this log entry is for (DATE type, not timestamp)
- `completed`: Boolean flag for completion status
- `created_at`: Timestamp when log was created

**Unique Constraint**: `(habit_id, date)` ensures only one log entry per habit per day.

### Row Level Security (RLS)

All tables have RLS enabled with policies ensuring users can only access their own data.

**habits table policies:**
```sql
-- Users can view their own habits
CREATE POLICY "Users can view their own habits"
  ON public.habits FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own habits
CREATE POLICY "Users can create their own habits"
  ON public.habits FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Similar policies for UPDATE and DELETE
```

**habit_logs table policies:**
```sql
-- Users can view logs for their habits
CREATE POLICY "Users can view their own habit logs"
  ON public.habit_logs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.habits
    WHERE habits.id = habit_logs.habit_id
    AND habits.user_id = auth.uid()
  ));

-- Similar policies for INSERT, UPDATE, and DELETE
```

### Indexes

Performance indexes on frequently queried columns:

```sql
CREATE INDEX idx_habits_user_id ON public.habits(user_id);
CREATE INDEX idx_habits_archived_at ON public.habits(archived_at);
CREATE INDEX idx_habit_logs_habit_id ON public.habit_logs(habit_id);
CREATE INDEX idx_habit_logs_date ON public.habit_logs(date);
```

---

## 4. Backend API & Data Layer

### Supabase Client

The Supabase client is automatically configured in `src/integrations/supabase/client.ts`. Import it like this:

```typescript
import { supabase } from "@/integrations/supabase/client";
```

### Data Access Functions

All database operations are encapsulated in `src/lib/habitQueries.ts`:

#### 1. Fetch Active Habits

```typescript
export async function fetchHabits() {
  const { data, error } = await supabase
    .from('habits')
    .select('*')
    .is('archived_at', null)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data as Habit[];
}
```

**What it does:**
- Fetches all habits where `archived_at IS NULL`
- Orders by creation date (oldest first)
- Returns typed array of Habit objects

#### 2. Fetch Habit Logs (Date Range)

```typescript
export async function fetchHabitLogs(startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from('habit_logs')
    .select('*')
    .gte('date', startDate)
    .lte('date', endDate);

  if (error) throw error;
  return data as HabitLog[];
}
```

**Parameters:**
- `startDate`: ISO date string (YYYY-MM-DD)
- `endDate`: ISO date string (YYYY-MM-DD)

**What it does:**
- Fetches all logs between the specified dates (inclusive)
- Returns array of HabitLog objects

#### 3. Toggle Habit Completion

```typescript
export async function toggleHabitLog(
  habitId: string, 
  date: string, 
  completed: boolean
) {
  const { data: existing } = await supabase
    .from('habit_logs')
    .select('*')
    .eq('habit_id', habitId)
    .eq('date', date)
    .single();

  if (existing) {
    // Update existing log
    const { error } = await supabase
      .from('habit_logs')
      .update({ completed })
      .eq('id', existing.id);
    
    if (error) throw error;
  } else {
    // Create new log
    const { error } = await supabase
      .from('habit_logs')
      .insert({ habit_id: habitId, date, completed });
    
    if (error) throw error;
  }
}
```

**Logic:**
1. Check if a log entry exists for this habit + date
2. If exists → UPDATE the completed status
3. If not exists → INSERT new log entry

#### 4. CRUD Operations

**Create Habit:**
```typescript
export async function createHabit(habit: {
  name: string;
  description?: string;
  category?: string;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('habits')
    .insert({ ...habit, user_id: user.id })
    .select()
    .single();

  if (error) throw error;
  return data as Habit;
}
```

**Update Habit:**
```typescript
export async function updateHabit(id: string, updates: Partial<Habit>) {
  const { data, error } = await supabase
    .from('habits')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Habit;
}
```

**Archive Habit (Soft Delete):**
```typescript
export async function archiveHabit(id: string) {
  const { error } = await supabase
    .from('habits')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
}
```

**Delete Habit (Hard Delete):**
```typescript
export async function deleteHabit(id: string) {
  const { error } = await supabase
    .from('habits')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
```

---

## 5. Frontend Implementation

### Authentication Flow

**Auth Context** (`src/lib/auth.tsx`):

```typescript
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // ... signUp, signIn, signOut methods
}
```

**Key Points:**
- Stores both `user` and `session` (session contains auth tokens)
- Sets up listener BEFORE checking for existing session
- Automatically handles token refresh

### Route Protection

Protected routes redirect to `/auth` if user not authenticated:

```typescript
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <LoadingSpinner />;
  }
  
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  
  return <>{children}</>;
}
```

### Page Structure

#### 1. Dashboard (Today View) - `/`

**Purpose**: View and toggle habits for a single day

**Key Features:**
- Date navigator (previous/next day)
- List of all habits with checkboxes
- Count of completed habits today
- Quick toggle functionality

**State Management:**
```typescript
const [selectedDate, setSelectedDate] = useState(new Date());
const dateStr = format(selectedDate, 'yyyy-MM-dd');

const { data: habits = [] } = useQuery({
  queryKey: ['habits'],
  queryFn: fetchHabits,
});

const { data: logs = [] } = useQuery({
  queryKey: ['habitLogs', dateStr, dateStr],
  queryFn: () => fetchHabitLogs(dateStr, dateStr),
});
```

**How it works:**
1. User selects a date (default: today)
2. Fetch all habits and logs for that date
3. Display habits with checkbox showing completion status
4. On checkbox change, call `toggleHabitLog` mutation
5. React Query automatically refetches and updates UI

#### 2. Week View - `/week`

**Purpose**: Grid view showing 7 days across, habits down

**Layout:**
```
┌──────────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┐
│ Habit    │ Mon │ Tue │ Wed │ Thu │ Fri │ Sat │ Sun │
├──────────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┤
│ Exercise │  ✓  │  ✓  │     │  ✓  │     │  ✓  │  ✓  │
│ Reading  │  ✓  │     │  ✓  │     │  ✓  │     │  ✓  │
└──────────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┘
```

**Implementation:**
```typescript
const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
const daysOfWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });

// Fetch logs for entire week
const { data: logs = [] } = useQuery({
  queryKey: ['habitLogs', format(weekStart, 'yyyy-MM-dd'), format(weekEnd, 'yyyy-MM-dd')],
  queryFn: () => fetchHabitLogs(
    format(weekStart, 'yyyy-MM-dd'), 
    format(weekEnd, 'yyyy-MM-dd')
  ),
});

// Check if habit is completed on a specific day
const isCompleted = (habitId: string, date: Date) => {
  const dateStr = format(date, 'yyyy-MM-dd');
  return logs.some(log => 
    log.habit_id === habitId && 
    log.date === dateStr && 
    log.completed
  );
};
```

#### 3. Month View - `/month`

**Purpose**: Shows entire month with progress cards and full calendar grid

**Two sections:**

1. **Progress Cards** (top): Show completion percentage for each habit
2. **Calendar Grid** (bottom): Checkbox grid for all days in month

**Progress Calculation:**
```typescript
const progress = calculateMonthlyProgress(
  habit.id,
  currentMonth.getFullYear(),
  currentMonth.getMonth(),
  logs
);
```

**Grid Layout:**
- Similar to week view but with up to 31 columns
- Uses CSS Grid with dynamic columns based on days in month
- Horizontal scrolling on mobile

#### 4. Year View - `/year`

**Purpose**: Visualize long-term trends with charts

**Features:**
- Line chart showing monthly completion percentages
- Filter to show all habits (average) or single habit
- Summary stats: average completion, best month, active habits

**Chart Implementation:**
```typescript
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

const chartData = selectedHabitId === 'all'
  ? calculateYearlyOverview(habits, selectedYear, logs)
  : Array.from({ length: 12 }, (_, i) => ({
      month: format(new Date(selectedYear, i), 'MMM'),
      percentage: calculateMonthlyProgress(selectedHabitId, selectedYear, i, logs)
    }));

<ResponsiveContainer width="100%" height={400}>
  <LineChart data={chartData}>
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey="month" />
    <YAxis domain={[0, 100]} />
    <Tooltip />
    <Legend />
    <Line 
      type="monotone" 
      dataKey="percentage" 
      stroke="hsl(var(--primary))" 
      strokeWidth={3}
    />
  </LineChart>
</ResponsiveContainer>
```

#### 5. Habits Management - `/habits`

**Purpose**: CRUD interface for managing habits

**Features:**
- List all active habits
- Create new habit (dialog form)
- Edit existing habit (dialog form)
- Archive habit (soft delete, preserves logs)
- Delete habit (hard delete, removes all logs)

**Form Validation:**
```typescript
const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  
  if (!formData.name.trim()) {
    toast.error('Habit name is required');
    return;
  }

  if (editingHabit) {
    updateMutation.mutate({ id: editingHabit.id, updates: formData });
  } else {
    createMutation.mutate(formData);
  }
};
```

### Component Reusability

**HabitCheckbox Component:**
```typescript
export default function HabitCheckbox({ 
  checked, 
  onCheckedChange, 
  disabled 
}: HabitCheckboxProps) {
  return (
    <div className={cn(
      "flex items-center justify-center p-2 rounded-lg transition-all",
      checked && "bg-success/10",
      !disabled && "hover:bg-muted cursor-pointer"
    )}>
      <Checkbox
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        className={cn(
          "h-5 w-5",
          checked && "data-[state=checked]:bg-success"
        )}
      />
    </div>
  );
}
```

**ProgressCard Component:**
```typescript
export default function ProgressCard({ 
  habitName, 
  percentage, 
  previousPercentage 
}: ProgressCardProps) {
  const trend = previousPercentage !== undefined 
    ? percentage - previousPercentage 
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{habitName}</CardTitle>
        <TrendIndicator trend={trend} />
      </CardHeader>
      <CardContent>
        <Progress value={percentage} />
        <span>{percentage}%</span>
      </CardContent>
    </Card>
  );
}
```

---

## 6. Progress Calculations

### Monthly Progress (Per Habit)

**Formula:**
```
progress% = (completed_days_in_month / total_days_in_month) × 100
```

**Implementation:**
```typescript
export function calculateMonthlyProgress(
  habitId: string,
  year: number,
  month: number,
  logs: HabitLog[]
): number {
  // Get all days in the month
  const monthStart = startOfMonth(new Date(year, month));
  const monthEnd = endOfMonth(new Date(year, month));
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  // Count completed days for this habit
  const completedDays = logs.filter(log => 
    log.habit_id === habitId && 
    log.completed &&
    new Date(log.date) >= monthStart &&
    new Date(log.date) <= monthEnd
  ).length;

  // Calculate percentage
  return Math.round((completedDays / daysInMonth.length) * 100);
}
```

**Example:**
- Month: March 2025 (31 days)
- Habit: "Morning Exercise"
- Completed: 23 days
- Progress: (23 / 31) × 100 = 74%

### Yearly Overview (All Habits)

**Formula:**
```
overall_progress_per_month = Σ(habit_progress) / number_of_habits
```

**Implementation:**
```typescript
export function calculateYearlyOverview(
  habits: Habit[],
  year: number,
  logs: HabitLog[]
): { month: string; percentage: number }[] {
  const months = Array.from({ length: 12 }, (_, i) => i);
  
  return months.map(month => {
    // Calculate progress for each habit in this month
    const percentages = habits.map(habit => 
      calculateMonthlyProgress(habit.id, year, month, logs)
    );
    
    // Calculate average across all habits
    const average = percentages.length > 0
      ? percentages.reduce((sum, p) => sum + p, 0) / percentages.length
      : 0;

    return {
      month: format(new Date(year, month), 'MMM'),
      percentage: Math.round(average)
    };
  });
}
```

**Example:**
- Month: January 2025
- Habits: Exercise (80%), Reading (60%), Meditation (90%)
- Overall: (80 + 60 + 90) / 3 = 77%

### Worked Example

**Scenario:**
- User has 3 habits: Exercise, Reading, Meditation
- Month: January 2025 (31 days)

**Data:**
```
Exercise:
- Completed: 25 days
- Progress: (25/31) × 100 = 81%

Reading:
- Completed: 20 days
- Progress: (20/31) × 100 = 65%

Meditation:
- Completed: 28 days
- Progress: (28/31) × 100 = 90%
```

**Monthly average for January:**
```
(81 + 65 + 90) / 3 = 78.67% → rounded to 79%
```

This 79% becomes the data point for January on the yearly chart.

---

## 7. Styling & UX Enhancements

### Design System

All colors are defined as HSL values in `src/index.css`:

```css
:root {
  --primary: 174 60% 45%;        /* Teal-green for main actions */
  --success: 142 76% 36%;        /* Green for completed habits */
  --accent: 36 100% 60%;         /* Warm orange for highlights */
  --muted: 210 12% 96%;          /* Light gray for backgrounds */
  
  /* Gradients */
  --gradient-primary: linear-gradient(135deg, hsl(174 60% 45%), hsl(174 70% 35%));
  --gradient-success: linear-gradient(135deg, hsl(142 76% 36%), hsl(142 70% 45%));
  
  /* Shadows */
  --shadow-soft: 0 2px 8px -2px hsl(210 20% 20% / 0.08);
  --shadow-medium: 0 4px 16px -4px hsl(210 20% 20% / 0.12);
}
```

### Component Styling Examples

**Using semantic tokens:**
```tsx
// ✅ CORRECT
<Button className="bg-primary text-primary-foreground">
  Click me
</Button>

// ❌ AVOID
<Button className="bg-teal-500 text-white">
  Click me
</Button>
```

**Hover states with semantic tokens:**
```tsx
<Card className="hover:shadow-medium transition-shadow">
  <CardContent className="hover:bg-muted/30">
    Content
  </CardContent>
</Card>
```

### Responsive Design

**Mobile-first approach:**
```tsx
<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
  {/* Cards */}
</div>
```

**Breakpoints:**
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1400px

### Keyboard Navigation

**Checkbox accessibility:**
```tsx
<HabitCheckbox
  checked={completed}
  onCheckedChange={handleChange}
  aria-label={`Mark ${habitName} as completed for ${dateStr}`}
/>
```

**Dialog keyboard shortcuts:**
- `Escape`: Close dialog
- `Enter`: Submit form
- `Tab`: Navigate between fields

### Loading States

```tsx
if (loading) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );
}
```

### Error Handling

```tsx
const toggleMutation = useMutation({
  mutationFn: toggleHabitLog,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['habitLogs'] });
    toast.success('Habit updated!');
  },
  onError: (error) => {
    console.error('Failed to update habit:', error);
    toast.error('Failed to update habit');
  },
});
```

---

## 8. Running the App

### Development Mode

```bash
# Start the development server
npm run dev

# The app will be available at http://localhost:8080
```

**What happens:**
- Vite starts development server with hot module replacement (HMR)
- Changes to files trigger instant updates in browser
- TypeScript compilation happens in real-time
- Tailwind JIT compiler generates CSS on-demand

### First Time Setup

1. **Create an account:**
   - Navigate to `/auth`
   - Click "Sign Up" tab
   - Enter email and password (min 6 characters)
   - Auto-confirm is enabled, so you'll be logged in immediately

2. **Create your first habit:**
   - Click "Habits" in navigation
   - Click "New Habit" button
   - Fill in name (required), description, and category
   - Click "Create Habit"

3. **Track daily:**
   - Go to "Today" view (/)
   - Click checkboxes to mark habits as complete
   - Use arrow buttons to navigate to different dates

4. **View progress:**
   - "Week" tab: See 7-day overview
   - "Month" tab: Full month grid + progress cards
   - "Year" tab: Line chart showing trends

### Building for Production

```bash
# Create optimized production build
npm run build

# The build output will be in the 'dist' folder
```

**What happens:**
- Vite bundles and minifies all JavaScript
- Tailwind purges unused CSS
- Images are optimized
- Source maps are generated for debugging

### Deploying

The app is automatically deployed via Lovable when you click "Publish". For manual deployment:

1. Run `npm run build`
2. Upload the `dist` folder to any static hosting service:
   - Netlify
   - Vercel
   - AWS S3 + CloudFront
   - GitHub Pages

**Environment variables:**
- `VITE_SUPABASE_URL`: Automatically configured
- `VITE_SUPABASE_ANON_KEY`: Automatically configured

---

## 9. Extending the Project

### Adding Habit Streaks

**What**: Track consecutive days of completion

**Implementation:**
```typescript
export function calculateStreak(habitId: string, logs: HabitLog[]): number {
  const habitLogs = logs
    .filter(log => log.habit_id === habitId && log.completed)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  let streak = 0;
  let currentDate = new Date();
  
  for (const log of habitLogs) {
    const logDate = new Date(log.date);
    const diffDays = Math.floor(
      (currentDate.getTime() - logDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (diffDays === streak) {
      streak++;
      currentDate = logDate;
    } else {
      break;
    }
  }
  
  return streak;
}
```

**Display:**
```tsx
<Card>
  <CardHeader>
    <CardTitle>Current Streak</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="text-4xl font-bold text-primary">
      {streak} days 🔥
    </div>
  </CardContent>
</Card>
```

### Adding Habit Reminders

**Database migration:**
```sql
ALTER TABLE public.habits
ADD COLUMN reminder_time TIME,
ADD COLUMN reminder_enabled BOOLEAN DEFAULT false;
```

**UI component:**
```tsx
<FormField
  control={form.control}
  name="reminder_time"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Reminder Time</FormLabel>
      <FormControl>
        <Input type="time" {...field} />
      </FormControl>
    </FormItem>
  )}
/>
```

**Edge function for sending reminders:**
```typescript
// supabase/functions/send-reminders/index.ts
import { createClient } from '@supabase/supabase-js'

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Fetch habits with reminders due
  const now = new Date().toTimeString().slice(0, 5); // HH:MM
  const { data: habits } = await supabase
    .from('habits')
    .select('*, profiles(email)')
    .eq('reminder_enabled', true)
    .eq('reminder_time', now);

  // Send email/push notifications
  for (const habit of habits) {
    await sendReminderEmail(habit.profiles.email, habit.name);
  }

  return new Response('OK');
});
```

### Adding Habit Notes

**Database migration:**
```sql
CREATE TABLE public.habit_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_log_id UUID NOT NULL REFERENCES public.habit_logs(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

**UI:**
```tsx
<Dialog>
  <DialogTrigger asChild>
    <Button variant="ghost" size="sm">
      <MessageSquare className="h-4 w-4" />
    </Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Add Note</DialogTitle>
    </DialogHeader>
    <Textarea 
      placeholder="How did it go today?"
      value={note}
      onChange={(e) => setNote(e.target.value)}
    />
    <DialogFooter>
      <Button onClick={handleSaveNote}>Save Note</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Adding Multi-Day Habits

**Example**: Track "exercise 3 times per week" instead of daily

**Database migration:**
```sql
ALTER TABLE public.habits
ADD COLUMN frequency_type VARCHAR(20) DEFAULT 'daily',
ADD COLUMN frequency_target INTEGER DEFAULT 1;
```

**Progress calculation:**
```typescript
export function calculateWeeklyProgress(
  habitId: string,
  weekStart: Date,
  logs: HabitLog[],
  target: number
): number {
  const completedCount = logs.filter(log =>
    log.habit_id === habitId &&
    log.completed &&
    new Date(log.date) >= weekStart &&
    new Date(log.date) < addDays(weekStart, 7)
  ).length;

  return Math.min(Math.round((completedCount / target) * 100), 100);
}
```

### Adding Social Features

**Tables:**
```sql
CREATE TABLE public.habit_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  created_by UUID REFERENCES auth.users(id),
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE public.friends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  friend_id UUID REFERENCES auth.users(id),
  status VARCHAR(20) DEFAULT 'pending',
  UNIQUE(user_id, friend_id)
);
```

**Features:**
- Share habit templates
- View friends' progress (opt-in)
- Compete on leaderboards
- Send encouragement messages

### Adding Data Export

**CSV export function:**
```typescript
export function exportToCSV(habits: Habit[], logs: HabitLog[]) {
  const headers = ['Date', ...habits.map(h => h.name)];
  
  // Get date range
  const dates = Array.from(
    new Set(logs.map(log => log.date))
  ).sort();
  
  // Build CSV rows
  const rows = dates.map(date => {
    const row = [date];
    for (const habit of habits) {
      const log = logs.find(l => l.habit_id === habit.id && l.date === date);
      row.push(log?.completed ? '1' : '0');
    }
    return row.join(',');
  });
  
  // Create CSV file
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  
  // Trigger download
  const a = document.createElement('a');
  a.href = url;
  a.download = `habits-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
}
```

### Testing

**Unit tests example (Vitest):**
```typescript
import { describe, it, expect } from 'vitest';
import { calculateMonthlyProgress } from '@/lib/habitQueries';

describe('calculateMonthlyProgress', () => {
  it('returns 100% when all days are completed', () => {
    const logs: HabitLog[] = Array.from({ length: 31 }, (_, i) => ({
      id: `log-${i}`,
      habit_id: 'habit-1',
      date: `2025-01-${String(i + 1).padStart(2, '0')}`,
      completed: true,
      created_at: new Date().toISOString()
    }));
    
    const progress = calculateMonthlyProgress('habit-1', 2025, 0, logs);
    expect(progress).toBe(100);
  });
  
  it('returns 0% when no days are completed', () => {
    const progress = calculateMonthlyProgress('habit-1', 2025, 0, []);
    expect(progress).toBe(0);
  });
  
  it('calculates partial completion correctly', () => {
    const logs: HabitLog[] = Array.from({ length: 15 }, (_, i) => ({
      id: `log-${i}`,
      habit_id: 'habit-1',
      date: `2025-01-${String(i + 1).padStart(2, '0')}`,
      completed: true,
      created_at: new Date().toISOString()
    }));
    
    const progress = calculateMonthlyProgress('habit-1', 2025, 0, logs);
    expect(progress).toBe(48); // 15/31 = 48.39% → rounded to 48
  });
});
```

---

## Conclusion

You now have a complete, production-ready habit tracking application with:

✅ Full-stack architecture with React + Lovable Cloud  
✅ Secure authentication and data isolation  
✅ Daily, weekly, monthly, and yearly views  
✅ Progress tracking and visualization  
✅ Clean, maintainable code structure  
✅ Responsive design with modern UI  
✅ Type-safe with TypeScript  
✅ Performance-optimized with React Query  

**Next steps:**
1. Customize the design to match your brand
2. Add the extensions suggested above
3. Implement analytics to track user engagement
4. Add tests for critical business logic
5. Set up CI/CD for automated deployments

Happy coding! 🚀
