// Category color mapping for habit categories
export const categoryColors: Record<string, { bg: string; text: string }> = {
  // Work & Study
  'work': { bg: 'bg-blue-500/20', text: 'text-blue-400' },
  'study': { bg: 'bg-indigo-500/20', text: 'text-indigo-400' },
  'school': { bg: 'bg-indigo-500/20', text: 'text-indigo-400' },
  
  // Health
  'health': { bg: 'bg-emerald-500/20', text: 'text-emerald-400' },
  'physical health': { bg: 'bg-emerald-500/20', text: 'text-emerald-400' },
  'mental health': { bg: 'bg-violet-500/20', text: 'text-violet-400' },
  'therapy': { bg: 'bg-purple-500/20', text: 'text-purple-400' },
  
  // Wellness
  'hydration': { bg: 'bg-cyan-500/20', text: 'text-cyan-400' },
  'nutrition': { bg: 'bg-orange-500/20', text: 'text-orange-400' },
  'sleep & rest': { bg: 'bg-slate-500/20', text: 'text-slate-400' },
  'sleep': { bg: 'bg-slate-500/20', text: 'text-slate-400' },
  'self-care': { bg: 'bg-pink-500/20', text: 'text-pink-400' },
  
  // Life
  'home & organization': { bg: 'bg-amber-500/20', text: 'text-amber-400' },
  'home': { bg: 'bg-amber-500/20', text: 'text-amber-400' },
  'relationships': { bg: 'bg-rose-500/20', text: 'text-rose-400' },
  'hobbies': { bg: 'bg-fuchsia-500/20', text: 'text-fuchsia-400' },
  'spirituality': { bg: 'bg-teal-500/20', text: 'text-teal-400' },
  'finances': { bg: 'bg-green-500/20', text: 'text-green-400' },
  'personal growth': { bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
  'personal': { bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
  'travel': { bg: 'bg-sky-500/20', text: 'text-sky-400' },

  // Personal calendar
  'appointments': { bg: 'bg-rose-500/20', text: 'text-rose-400' },
  'self_care': { bg: 'bg-violet-500/20', text: 'text-violet-400' },
  'self-care & rituals': { bg: 'bg-violet-500/20', text: 'text-violet-400' },
  'home & cleaning': { bg: 'bg-amber-500/20', text: 'text-amber-400' },
};

export function getCategoryColor(category: string): { bg: string; text: string } {
  const normalizedCategory = category.toLowerCase().trim();
  return categoryColors[normalizedCategory] || { bg: 'bg-primary/10', text: 'text-primary' };
}
