
import React from 'react';
import { cn } from './ui';
import { Button } from './ui';
import { LucideIcon, Sparkles, ArrowRight, Lightbulb, MessageCircle, CalendarDays, Users, FileText, Send, BarChart3 } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'compact' | 'onboarding' | 'illustration';
  tips?: string[];
  animationDelay?: number;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  className,
  size = 'md',
  variant = 'default',
  tips,
  animationDelay = 0,
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
    compact: 'flex items-center gap-3 text-left',
    onboarding: 'flex flex-col items-center justify-center text-center',
    illustration: 'flex flex-col items-center justify-center text-center',
  };

  if (variant === 'onboarding') {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center text-center',
          sizeClasses[size].container,
          'rounded-2xl border-2 border-dashed border-primary/20 bg-gradient-to-b from-primary/5 via-transparent to-transparent',
          className
        )}
        style={{ animationDelay: `${animationDelay}ms` }}
      >
        {/* Animated icon with glow */}
        {Icon && (
          <div className="relative mb-4">
            <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl animate-pulse" />
            <div className={cn(
              'relative rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 shadow-lg',
              sizeClasses[size].iconWrapper,
              'p-5'
            )}>
              <Icon className={cn(sizeClasses[size].icon, 'text-primary')} />
            </div>
          </div>
        )}

        <h3 className={cn('font-bold text-foreground mb-1.5', sizeClasses[size].title, 'text-lg')}>
          {title}
        </h3>
        {description && (
          <p className={cn(
            'max-w-sm mx-auto leading-relaxed text-muted-foreground',
            sizeClasses[size].description
          )}>
            {description}
          </p>
        )}

        {/* Tips / Getting Started */}
        {tips && tips.length > 0 && (
          <div className="mt-5 w-full max-w-sm space-y-2">
            {tips.map((tip, i) => (
              <div
                key={i}
                className="flex items-start gap-2.5 text-left rounded-xl border border-border/60 bg-card/60 px-3.5 py-2.5 text-sm transition-all hover:bg-muted/40 hover:border-primary/30 group"
              >
                <div className="rounded-full bg-primary/10 p-1 mt-0.5 shrink-0 group-hover:bg-primary/20 transition-colors">
                  <Lightbulb className="h-3 w-3 text-primary" />
                </div>
                <span className="text-muted-foreground">{tip}</span>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        {(action || secondaryAction) && (
          <div className="mt-5 flex items-center gap-2 flex-wrap justify-center">
            {action && (
              <Button onClick={action.onClick} size="sm" className="gap-1.5">
                {action.icon && <action.icon className="h-4 w-4" />}
                {action.label}
                <ArrowRight className="h-3.5 w-3.5 ml-0.5" />
              </Button>
            )}
            {secondaryAction && (
              <Button onClick={secondaryAction.onClick} variant="outline" size="sm" className="gap-1.5">
                {secondaryAction.icon && <secondaryAction.icon className="h-4 w-4" />}
                {secondaryAction.label}
              </Button>
            )}
          </div>
        )}
      </div>
    );
  }

  if (variant === 'illustration') {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center text-center',
          sizeClasses[size].container,
          'rounded-2xl bg-gradient-to-b from-muted/50 via-transparent to-transparent',
          className
        )}
      >
        {/* Stacked icons illustration */}
        <div className="relative mb-5  h-20 w-20 flex items-center justify-center">
          <div className="absolute inset-0 rounded-2xl bg-muted/50 transform rotate-6" />
          <div className="absolute inset-0 rounded-2xl bg-muted/80 transform -rotate-3" />
          <div className="relative rounded-2xl bg-card border border-border shadow-sm p-4">
            {Icon ? (
              <Icon className="h-10 w-10 text-muted-foreground/60" />
            ) : (
              <Sparkles className="h-10 w-10 text-muted-foreground/60" />
            )}
          </div>
        </div>

        <h3 className={cn('font-bold text-foreground mb-1.5', sizeClasses[size].title, 'text-lg')}>
          {title}
        </h3>
        {description && (
          <p className={cn(
            'max-w-xs mx-auto leading-relaxed text-muted-foreground',
            sizeClasses[size].description
          )}>
            {description}
          </p>
        )}

        {(action || secondaryAction) && (
          <div className="mt-5 flex items-center gap-2 flex-wrap justify-center">
            {action && (
              <Button onClick={action.onClick} size="sm" className="gap-1.5">
                {action.icon && <action.icon className="h-4 w-4" />}
                {action.label}
              </Button>
            )}
            {secondaryAction && (
              <Button onClick={secondaryAction.onClick} variant="outline" size="sm" className="gap-1.5">
                {secondaryAction.icon && <secondaryAction.icon className="h-4 w-4" />}
                {secondaryAction.label}
              </Button>
            )}
          </div>
        )}
      </div>
    );
  }

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

      {(action || secondaryAction) && (
        <div className="mt-4 flex items-center gap-2 flex-wrap">
          {action && (
            <Button
              onClick={action.onClick}
              variant="outline"
              size="sm"
            >
              {action.icon && <action.icon className="h-4 w-4 mr-1" />}
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              onClick={secondaryAction.onClick}
              variant="ghost"
              size="sm"
            >
              {secondaryAction.icon && <secondaryAction.icon className="h-4 w-4 mr-1" />}
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// Pre-built empty state configurations for common pages
export const EMPTY_STATES = {
  messaging: {
    icon: MessageCircle,
    title: 'Welcome to Messaging',
    description: 'Your team communication hub. Create channels, send messages, and coordinate operations in real-time.',
    tips: [
      'Create a channel for each site or team',
      'Pin important directives for quick access',
      'Use @mentions to notify specific people',
      'Mark messages as urgent for priority alerts',
    ],
  },
  schedule: {
    icon: CalendarDays,
    title: 'No Shifts Scheduled',
    description: 'Start building your weekly schedule by adding shifts or using shift templates.',
    tips: [
      'Use shift templates for recurring assignments',
      'Drag and drop officers to assign shifts',
      'Enable conflict detection to avoid double-booking',
    ],
  },
  officers: {
    icon: Users,
    title: 'No Officers Added',
    description: 'Add your security officers to start managing schedules, certifications, and assignments.',
    tips: [
      'Import officers from a CSV file',
      'Track certifications and expiry dates',
      'Set skills to match officers with sites',
    ],
  },
  reports: {
    icon: BarChart3,
    title: 'No Reports Generated',
    description: 'Generate reports to track performance, revenue, and operational metrics across your organization.',
    tips: [
      'Try generating a weekly operations summary',
      'Export reports as PDF for distribution',
      'Schedule automatic report delivery',
    ],
  },
  feedback: {
    icon: Send,
    title: 'No Feedback Yet',
    description: 'Client feedback helps improve service quality. Start collecting ratings and comments.',
    tips: [
      'Send a satisfaction survey after completed shifts',
      'Review feedback trends in the reports module',
      'Respond to low ratings within 24 hours',
    ],
  },
};
