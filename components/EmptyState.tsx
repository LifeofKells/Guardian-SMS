
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
      icon: 'h-6 w-6',
      iconWrapper: 'p-2',
      title: 'text-sm font-semibold',
      description: 'text-xs'
    },
    md: {
      container: 'p-8',
      icon: 'h-10 w-10',
      iconWrapper: 'p-3',
      title: 'text-base font-semibold',
      description: 'text-sm'
    },
    lg: {
      container: 'p-12',
      icon: 'h-12 w-12',
      iconWrapper: 'p-4',
      title: 'text-lg font-semibold',
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
          'rounded-2xl border border-slate-200 bg-slate-50/50',
          className
        )}
        style={{ animationDelay: `${animationDelay}ms` }}
      >
        {Icon && (
          <div className="relative mb-4">
            <div className={cn(
              'relative rounded-2xl bg-white border border-slate-200 shadow-sm',
              sizeClasses[size].iconWrapper,
              'p-4'
            )}>
              <Icon className={cn(sizeClasses[size].icon, 'text-slate-700')} />
            </div>
          </div>
        )}

        <h3 className={cn('text-slate-900 mb-1.5', sizeClasses[size].title)}>
          {title}
        </h3>
        {description && (
          <p className={cn(
            'max-w-sm mx-auto leading-relaxed text-slate-500',
            sizeClasses[size].description
          )}>
            {description}
          </p>
        )}

        {/* Tips / Getting Started */}
        {tips && tips.length > 0 && (
          <div className="mt-6 w-full max-w-sm space-y-2">
            {tips.map((tip, i) => (
              <div
                key={i}
                className="flex items-start gap-3 w-full text-left rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm transition-all hover:border-slate-300"
              >
                <div className="rounded-full bg-slate-100 p-1 mt-0.5 shrink-0">
                  <Lightbulb className="h-4 w-4 text-slate-600" />
                </div>
                <span className="text-slate-600">{tip}</span>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        {(action || secondaryAction) && (
          <div className="mt-6 flex items-center gap-3 flex-wrap justify-center">
            {action && (
              <Button onClick={action.onClick} size="sm" className="gap-2 shadow-sm">
                {action.icon && <action.icon className="h-4 w-4" />}
                {action.label}
              </Button>
            )}
            {secondaryAction && (
              <Button onClick={secondaryAction.onClick} variant="outline" size="sm" className="gap-2">
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
          'rounded-2xl border border-slate-100 bg-white',
          className
        )}
      >
        {/* Stacked icons illustration */}
        <div className="relative mb-6 h-24 w-24 flex items-center justify-center">
          <div className="absolute inset-0 rounded-2xl border border-slate-200 bg-slate-50 transform rotate-6" />
          <div className="absolute inset-0 rounded-2xl border border-slate-200 bg-slate-50 transform -rotate-3" />
          <div className="relative rounded-2xl bg-white border border-slate-200 shadow-sm p-5">
            {Icon ? (
              <Icon className="h-12 w-12 text-slate-400" />
            ) : (
              <Sparkles className="h-12 w-12 text-slate-400" />
            )}
          </div>
        </div>

        <h3 className={cn('text-slate-900 mb-1.5', sizeClasses[size].title)}>
          {title}
        </h3>
        {description && (
          <p className={cn(
            'max-w-xs mx-auto leading-relaxed text-slate-500',
            sizeClasses[size].description
          )}>
            {description}
          </p>
        )}

        {(action || secondaryAction) && (
          <div className="mt-6 flex items-center gap-3 flex-wrap justify-center">
            {action && (
              <Button onClick={action.onClick} size="sm" className="gap-2 shadow-sm">
                {action.icon && <action.icon className="h-4 w-4" />}
                {action.label}
              </Button>
            )}
            {secondaryAction && (
              <Button onClick={secondaryAction.onClick} variant="outline" size="sm" className="gap-2 bg-white">
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
      'text-slate-500',
      className
    )}>
      {Icon && (
        <div className={cn(
          'rounded-full bg-slate-100 mb-4',
          sizeClasses[size].iconWrapper,
          variant === 'compact' && 'mb-0'
        )}>
          <Icon className={cn(
            sizeClasses[size].icon,
            'text-slate-400'
          )} />
        </div>
      )}

      <div className={cn(variant === 'compact' && 'flex-1')}>
        <p className={cn(
          'text-slate-900 mb-1',
          sizeClasses[size].title
        )}>
          {title}
        </p>
        {description && (
          <p className={cn(
            'max-w-xs mx-auto leading-relaxed text-slate-500',
            sizeClasses[size].description,
            variant === 'compact' && 'mx-0 max-w-none'
          )}>
            {description}
          </p>
        )}
      </div>

      {(action || secondaryAction) && (
        <div className={cn("flex flex-wrap items-center gap-3", variant === 'compact' ? 'ml-auto' : 'mt-5')}>
          {action && (
            <Button
              onClick={action.onClick}
              variant="outline"
              size="sm"
              className="bg-white shadow-sm gap-2"
            >
              {action.icon && <action.icon className="h-4 w-4" />}
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              onClick={secondaryAction.onClick}
              variant="ghost"
              size="sm"
              className="gap-2"
            >
              {secondaryAction.icon && <secondaryAction.icon className="h-4 w-4" />}
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
