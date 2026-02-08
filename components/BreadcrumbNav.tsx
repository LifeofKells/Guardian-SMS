import React from 'react';
import { ChevronRight, ChevronLeft, Home } from 'lucide-react';
import { useBreadcrumbs } from '../contexts/BreadcrumbContext';
import { Button, cn } from './ui';

interface BreadcrumbNavProps {
  onNavigate: (page: string, data?: Record<string, any>) => void;
  className?: string;
  showBackButton?: boolean;
}

export function BreadcrumbNav({ 
  onNavigate, 
  className,
  showBackButton = true 
}: BreadcrumbNavProps) {
  const { breadcrumbs, goToBreadcrumb, popBreadcrumb } = useBreadcrumbs();

  const handleBreadcrumbClick = (index: number) => {
    const target = goToBreadcrumb(index);
    if (target) {
      onNavigate(target.page, target.data);
    }
  };

  const handleBack = () => {
    if (breadcrumbs.length > 1) {
      const target = breadcrumbs[breadcrumbs.length - 2];
      popBreadcrumb();
      onNavigate(target.page, target.data);
    }
  };

  const canGoBack = breadcrumbs.length > 1;

  return (
    <div className={cn(
      "flex items-center gap-3 px-4 py-2 rounded-xl glass-panel border border-border/50",
      className
    )}>
      {showBackButton && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBack}
          disabled={!canGoBack}
          className={cn(
            "h-8 px-2 gap-1 transition-all",
            !canGoBack && "opacity-50 cursor-not-allowed"
          )}
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="text-xs font-medium">Back</span>
        </Button>
      )}

      <nav className="flex items-center gap-1 overflow-hidden">
        {breadcrumbs.map((item, index) => {
          const isLast = index === breadcrumbs.length - 1;
          const isFirst = index === 0;

          return (
            <React.Fragment key={item.id}>
              {index > 0 && (
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0 mx-0.5" />
              )}
              
              <button
                onClick={() => !isLast && handleBreadcrumbClick(index)}
                disabled={isLast}
                className={cn(
                  "flex items-center gap-1.5 px-2 py-1 rounded-md text-sm transition-all duration-200 shrink-0",
                  isLast 
                    ? "font-semibold text-foreground cursor-default bg-primary/5 dark:bg-primary/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50 cursor-pointer",
                  isFirst && "pl-1.5"
                )}
              >
                {isFirst && <Home className="h-3.5 w-3.5" />}
                <span className="truncate max-w-[120px] sm:max-w-[160px] md:max-w-[200px]">
                  {item.label}
                </span>
              </button>
            </React.Fragment>
          );
        })}
      </nav>
    </div>
  );
}

export default BreadcrumbNav;
