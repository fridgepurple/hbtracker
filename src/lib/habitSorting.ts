import { Habit } from './habitQueries';

export type SortOption = 'alphabetical' | 'category' | 'created' | 'custom';

export function sortHabits(habits: Habit[], sortBy: SortOption): Habit[] {
  const sorted = [...habits];
  
  switch (sortBy) {
    case 'alphabetical':
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    
    case 'category':
      return sorted.sort((a, b) => {
        const catA = a.category || '';
        const catB = b.category || '';
        if (catA === catB) {
          return a.name.localeCompare(b.name);
        }
        return catA.localeCompare(catB);
      });
    
    case 'created':
      return sorted.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    
    case 'custom':
      return sorted.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
    
    default:
      return sorted;
  }
}

export const sortOptions = [
  { value: 'alphabetical', label: 'Alphabetical' },
  { value: 'category', label: 'By Category' },
  { value: 'created', label: 'By Creation Date' },
  { value: 'custom', label: 'Custom Order' },
] as const;
