import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

interface HabitCheckboxProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}

export default function HabitCheckbox({ checked, onCheckedChange, disabled }: HabitCheckboxProps) {
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
          checked && "data-[state=checked]:bg-success data-[state=checked]:border-success"
        )}
      />
    </div>
  );
}
