import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import ThemeToggle from '@/components/ThemeToggle';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Calendar, 
  CalendarRange, 
  BarChart3, 
  LogOut,
  CheckCircle2,
  Target,
  ChevronDown,
  FolderKanban,
  CalendarClock
} from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { signOut, user } = useAuth();
  const location = useLocation();

  const habitTrackerItems = [
    { path: '/', label: 'Today', icon: Calendar },
    { path: '/month', label: 'Calendar', icon: CalendarRange },
  ];

  const isHabitTrackerActive = ['/', '/month'].includes(location.pathname);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-xl">
            <div className="p-2 rounded-lg bg-primary text-primary-foreground">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <span className="hidden sm:inline">HabitFlow</span>
          </Link>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground hidden sm:inline">
              {user?.email}
            </span>
            <ThemeToggle />
            <Button variant="outline" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="border-b bg-card/30">
        <div className="container mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto">
            {/* Habit Tracker Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant={isHabitTrackerActive ? 'default' : 'ghost'}
                  className="flex items-center gap-2 whitespace-nowrap"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Habit Tracker</span>
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="bg-popover">
                {habitTrackerItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  
                  return (
                    <DropdownMenuItem key={item.path} asChild>
                      <Link
                        to={item.path}
                        className={`flex items-center gap-2 w-full ${isActive ? 'bg-accent' : ''}`}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </Link>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Goals & Projects */}
            <Link to="/goals">
              <Button
                variant={location.pathname === '/goals' ? 'default' : 'ghost'}
                className="flex items-center gap-2 whitespace-nowrap"
              >
                <Target className="h-4 w-4" />
                <span>Goals & Projects</span>
              </Button>
            </Link>

            {/* Personal Calendar */}
            <Link to="/calendar">
              <Button
                variant={location.pathname === '/calendar' ? 'default' : 'ghost'}
                className="flex items-center gap-2 whitespace-nowrap"
              >
                <CalendarClock className="h-4 w-4" />
                <span>Calendar</span>
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}
