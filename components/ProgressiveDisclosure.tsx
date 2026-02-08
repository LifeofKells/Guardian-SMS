/**
 * ProgressiveDisclosure Component
 * Collapsible sections for forms and content organization
 * Reduces cognitive load by hiding complexity until needed
 */

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronRight, Info, AlertCircle, CheckCircle2, LucideIcon } from 'lucide-react';
import { cn } from './ui';

interface CollapsibleSectionProps {
  /** Section title */
  title: string;
  /** Optional subtitle/description */
  subtitle?: string;
  /** Section content */
  children: React.ReactNode;
  /** Whether section is initially open */
  defaultOpen?: boolean;
  /** Controlled open state */
  open?: boolean;
  /** Callback when open state changes */
  onOpenChange?: (open: boolean) => void;
  /** Optional icon before title */
  icon?: LucideIcon;
  /** Visual style variant */
  variant?: 'default' | 'card' | 'bordered' | 'ghost';
  /** Show completion indicator */
  completed?: boolean;
  /** Show error state */
  hasError?: boolean;
  /** Badge content (e.g., count) */
  badge?: React.ReactNode;
  /** Additional className */
  className?: string;
  /** Disable interaction */
  disabled?: boolean;
}

export function CollapsibleSection({
  title,
  subtitle,
  children,
  defaultOpen = false,
  open: controlledOpen,
  onOpenChange,
  icon: Icon,
  variant = 'default',
  completed = false,
  hasError = false,
  badge,
  className,
  disabled = false
}: CollapsibleSectionProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight);
    }
  }, [children]);

  const handleToggle = () => {
    if (disabled) return;
    
    const newState = !isOpen;
    if (onOpenChange) {
      onOpenChange(newState);
    } else {
      setInternalOpen(newState);
    }
  };

  const variantStyles = {
    default: 'border-b border-border',
    card: 'bg-card rounded-xl border border-border shadow-sm',
    bordered: 'border border-border rounded-lg',
    ghost: ''
  };

  const headerStyles = {
    default: 'py-4 hover:bg-muted/30',
    card: 'p-4 hover:bg-muted/30 rounded-t-xl',
    bordered: 'p-4 hover:bg-muted/30 rounded-t-lg',
    ghost: 'py-3 hover:bg-muted/30 rounded-lg'
  };

  const contentWrapperStyles = {
    default: 'pb-4',
    card: 'px-4 pb-4',
    bordered: 'px-4 pb-4',
    ghost: 'py-3'
  };

  return (
    <div className={cn(variantStyles[variant], className)}>
      {/* Header */}
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className={cn(
          'flex w-full items-center justify-between gap-3 text-left transition-colors',
          headerStyles[variant],
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Status Icon or Custom Icon */}
          {hasError ? (
            <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
          ) : completed ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
          ) : Icon ? (
            <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
          ) : null}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={cn(
                "font-medium text-foreground",
                hasError && "text-destructive"
              )}>
                {title}
              </span>
              {badge && (
                <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium rounded-full bg-muted text-muted-foreground">
                  {badge}
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-sm text-muted-foreground truncate">{subtitle}</p>
            )}
          </div>
        </div>

        {/* Chevron */}
        <ChevronDown 
          className={cn(
            "h-5 w-5 text-muted-foreground shrink-0 transition-transform duration-200",
            isOpen && "rotate-180"
          )} 
        />
      </button>

      {/* Content */}
      <div
        className={cn(
          'overflow-hidden transition-all duration-200 ease-out',
          isOpen ? 'opacity-100' : 'opacity-0'
        )}
        style={{
          maxHeight: isOpen ? contentHeight : 0,
        }}
      >
        <div ref={contentRef} className={contentWrapperStyles[variant]}>
          {children}
        </div>
      </div>
    </div>
  );
}

/**
 * Accordion component - only one section open at a time
 */
interface AccordionProps {
  children: React.ReactElement<CollapsibleSectionProps>[];
  /** Allow multiple sections open */
  multiple?: boolean;
  /** Default open section index */
  defaultIndex?: number;
  className?: string;
}

export function Accordion({
  children,
  multiple = false,
  defaultIndex,
  className
}: AccordionProps) {
  const [openIndices, setOpenIndices] = useState<number[]>(
    defaultIndex !== undefined ? [defaultIndex] : []
  );

  const handleToggle = (index: number) => {
    if (multiple) {
      setOpenIndices(prev =>
        prev.includes(index)
          ? prev.filter(i => i !== index)
          : [...prev, index]
      );
    } else {
      setOpenIndices(prev =>
        prev.includes(index) ? [] : [index]
      );
    }
  };

  return (
    <div className={cn('divide-y divide-border', className)}>
      {React.Children.map(children, (child, index) => {
        if (!React.isValidElement(child)) return child;
        
        return React.cloneElement(child as React.ReactElement<CollapsibleSectionProps>, {
          open: openIndices.includes(index),
          onOpenChange: () => handleToggle(index),
          variant: child.props.variant || 'default'
        });
      })}
    </div>
  );
}

/**
 * ExpandableDetails - Show/hide additional details inline
 */
interface ExpandableDetailsProps {
  /** Summary text always visible */
  summary: React.ReactNode;
  /** Detailed content shown when expanded */
  children: React.ReactNode;
  /** Initially expanded */
  defaultExpanded?: boolean;
  className?: string;
}

export function ExpandableDetails({
  summary,
  children,
  defaultExpanded = false,
  className
}: ExpandableDetailsProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className={className}>
      <div className="flex items-start gap-2">
        <div className="flex-1">{summary}</div>
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-primary text-sm font-medium hover:underline shrink-0"
        >
          {isExpanded ? 'Show less' : 'Show more'}
        </button>
      </div>
      
      <div
        className={cn(
          'overflow-hidden transition-all duration-200',
          isExpanded ? 'max-h-[1000px] opacity-100 mt-3' : 'max-h-0 opacity-0'
        )}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * FormSection - Specialized collapsible for form organization
 */
interface FormSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  required?: boolean;
  completed?: boolean;
  hasError?: boolean;
  errorCount?: number;
  className?: string;
}

export function FormSection({
  title,
  description,
  children,
  defaultOpen = true,
  required = false,
  completed = false,
  hasError = false,
  errorCount,
  className
}: FormSectionProps) {
  return (
    <CollapsibleSection
      title={
        <>
          {title}
          {required && <span className="text-destructive ml-1">*</span>}
        </>
      }
      subtitle={description}
      defaultOpen={defaultOpen}
      completed={completed}
      hasError={hasError}
      badge={hasError && errorCount ? `${errorCount} error${errorCount > 1 ? 's' : ''}` : undefined}
      variant="card"
      className={cn('mb-4', className)}
    >
      <div className="space-y-4 pt-2">
        {children}
      </div>
    </CollapsibleSection>
  );
}

/**
 * ShowMore - Truncated content with expand option
 */
interface ShowMoreProps {
  /** Full content */
  children: React.ReactNode;
  /** Max height before truncation (in rem) */
  maxHeight?: number;
  className?: string;
}

export function ShowMore({
  children,
  maxHeight = 6,
  className
}: ShowMoreProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [needsTruncation, setNeedsTruncation] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentRef.current) {
      const contentHeight = contentRef.current.scrollHeight;
      const maxHeightPx = maxHeight * 16; // Convert rem to px
      setNeedsTruncation(contentHeight > maxHeightPx);
    }
  }, [children, maxHeight]);

  return (
    <div className={className}>
      <div
        ref={contentRef}
        className={cn(
          'overflow-hidden transition-all duration-300 relative',
          !isExpanded && needsTruncation && 'mask-fade-bottom'
        )}
        style={{
          maxHeight: isExpanded ? contentRef.current?.scrollHeight : `${maxHeight}rem`
        }}
      >
        {children}
      </div>
      
      {needsTruncation && (
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-2 text-primary text-sm font-medium hover:underline flex items-center gap-1"
        >
          {isExpanded ? (
            <>
              Show less
              <ChevronDown className="h-4 w-4 rotate-180" />
            </>
          ) : (
            <>
              Show more
              <ChevronDown className="h-4 w-4" />
            </>
          )}
        </button>
      )}
    </div>
  );
}

/**
 * InfoDisclosure - Expandable info/help section
 */
interface InfoDisclosureProps {
  children: React.ReactNode;
  label?: string;
  className?: string;
}

export function InfoDisclosure({
  children,
  label = 'Learn more',
  className
}: InfoDisclosureProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <Info className="h-4 w-4" />
        <span>{label}</span>
        <ChevronRight 
          className={cn(
            "h-4 w-4 transition-transform duration-200",
            isOpen && "rotate-90"
          )} 
        />
      </button>
      
      <div
        className={cn(
          'overflow-hidden transition-all duration-200',
          isOpen ? 'max-h-[500px] opacity-100 mt-3' : 'max-h-0 opacity-0'
        )}
      >
        <div className="p-4 bg-muted/50 rounded-lg border border-border text-sm text-muted-foreground">
          {children}
        </div>
      </div>
    </div>
  );
}

export default CollapsibleSection;
