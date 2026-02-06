/**
 * Checkbox Component
 * Simple checkbox with optional label
 */

import React from 'react';
import { cn } from './ui';

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  className?: string;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, ...props }, ref) => {
    return (
      <label className={cn("flex items-center gap-2 cursor-pointer", className)}>
        <input
          type="checkbox"
          ref={ref}
          className={cn(
            "peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "checked:bg-primary checked:text-primary-foreground",
            "appearance-none transition-all",
            "relative after:absolute after:inset-0 after:flex after:items-center after:justify-center",
            "after:content-[''] checked:after:content-['✓']",
            "after:text-white after:text-xs after:font-bold"
          )}
          {...props}
        />
        {label && (
          <span className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            {label}
          </span>
        )}
      </label>
    );
  }
);
Checkbox.displayName = "Checkbox";

export default Checkbox;
