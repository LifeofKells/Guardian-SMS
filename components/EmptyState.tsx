
import React from 'react';
import { cn } from './ui';
import { Button } from './ui';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'compact';
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  size = 'md',
  variant = 'default'
}: EmptyStateProps) {
  const sizeClasses = {
    sm: {
      container: 'p-4',
      icon: 'h-8 w-8',
      iconWrapper: 'p-2',
      title: 'text-sm',
      description: 'text-xs'
    },
    md: {
      container: 'p-8',
      icon: 'h-12 w-12',
      iconWrapper: 'p-3',
      title: 'text-base',
      description: 'text-sm'
    },
    lg: {
      container: 'p-12',
      icon: 'h-16 w-16',
      iconWrapper: 'p-4',
      title: 'text-lg',
      description: 'text-base'
    }
  };

  const variants = {
    default: 'flex flex-col items-center justify-center text-center',
    compact: 'flex items-center gap-3 text-left'
  };

  return (
    <div className={cn(
      variants[variant],
      sizeClasses[size].container,
      'text-muted-foreground',
      className
    )}>
      {Icon && (
        <div className={cn(
          'rounded-full bg-muted mb-3',
          sizeClasses[size].iconWrapper,
          variant === 'compact' && 'mb-0'
        )}>
          <Icon className={cn(
            sizeClasses[size].icon,
            'opacity-50'
          )} />
        </div>
      )}
      
      <div className={cn(variant === 'compact' && 'flex-1')}>
        <p className={cn(
          'font-semibold text-foreground mb-1',
          sizeClasses[size].title
        )}>
          {title}
        </p>
        {description && (
          <p className={cn(
            'max-w-xs mx-auto leading-relaxed',
            sizeClasses[size].description,
            variant === 'compact' && 'mx-0 max-w-none'
          )}>
            {description}
          </p>
        )}
      </div>

      {action && (
        <Button
          onClick={action.onClick}
          variant="outline"
          size="sm"
          className="mt-4"
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}
