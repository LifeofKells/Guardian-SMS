import React from 'react';
import { X, Filter, Info, Edit3, PanelRightOpen } from 'lucide-react';
import { cn } from './ui';

interface SlidePanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  title?: string;
  description?: string;
  width?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  position?: 'left' | 'right';
  variant?: 'default' | 'filter' | 'details' | 'edit';
  showCloseButton?: boolean;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
  footer?: React.ReactNode;
}

const widthClasses = {
  sm: 'w-80',
  md: 'w-96',
  lg: 'w-[480px]',
  xl: 'w-[560px]',
  full: 'w-full max-w-lg'
};

const variantIcons = {
  default: PanelRightOpen,
  filter: Filter,
  details: Info,
  edit: Edit3
};

export function SlidePanel({
  open,
  onOpenChange,
  children,
  title,
  description,
  width = 'md',
  position = 'right',
  variant = 'default',
  showCloseButton = true,
  className,
  headerClassName,
  contentClassName,
  footer
}: SlidePanelProps) {
  const Icon = variantIcons[variant];

  if (!open) return null;

  return (
    <div 
      className={cn(
        "fixed inset-0 z-50 flex bg-black/40 backdrop-blur-sm animate-in fade-in duration-300",
        position === 'right' ? 'justify-end' : 'justify-start'
      )}
      onClick={() => onOpenChange?.(false)}
    >
      <div
        className={cn(
          "relative h-full flex flex-col animate-in shadow-2xl",
          position === 'right' ? 'slide-in-from-right' : 'slide-in-from-left',
          "duration-300",
          widthClasses[width],
          "glass-card-depth border-l border-r-0",
          position === 'left' && "border-l-0 border-r",
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={cn(
          "flex flex-col space-y-1 p-6 pb-4 border-b border-border/50",
          "glass-gradient-border",
          headerClassName
        )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2 rounded-lg",
                variant === 'filter' && "bg-primary/10 text-primary",
                variant === 'details' && "bg-blue-500/10 text-blue-500",
                variant === 'edit' && "bg-amber-500/10 text-amber-500",
                variant === 'default' && "bg-muted text-muted-foreground"
              )}>
                <Icon className="h-4 w-4" />
              </div>
              <div>
                {title && (
                  <h3 className="text-lg font-semibold text-foreground">
                    {title}
                  </h3>
                )}
                {description && (
                  <p className="text-sm text-muted-foreground">
                    {description}
                  </p>
                )}
              </div>
            </div>
            
            {showCloseButton && (
              <button
                className="rounded-lg p-2 opacity-70 ring-offset-background transition-all hover:opacity-100 hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                onClick={() => onOpenChange?.(false)}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </button>
            )}
          </div>
        </div>

        <div className={cn(
          "flex-1 overflow-y-auto p-6 custom-scrollbar",
          contentClassName
        )}>
          {children}
        </div>

        {footer && (
          <div className="p-6 pt-4 border-t border-border/50 bg-muted/10">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function FilterPanel(props: Omit<SlidePanelProps, 'variant'>) {
  return (
    <SlidePanel 
      {...props} 
      variant="filter" 
      title={props.title || 'Filters'}
      description={props.description || 'Refine your view'}
    />
  );
}

export function DetailsPanel(props: Omit<SlidePanelProps, 'variant'>) {
  return (
    <SlidePanel 
      {...props} 
      variant="details" 
      title={props.title || 'Details'}
    />
  );
}

export function EditPanel(props: Omit<SlidePanelProps, 'variant'>) {
  return (
    <SlidePanel 
      {...props} 
      variant="edit" 
      title={props.title || 'Quick Edit'}
      description={props.description || 'Make changes quickly'}
    />
  );
}

export default SlidePanel;
