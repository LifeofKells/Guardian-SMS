/**
 * HelpTooltip Component
 * Contextual help tooltips for explaining UI elements
 */

import React, { useState } from 'react';
import { HelpCircle, X } from 'lucide-react';
import { cn } from './ui';

interface HelpTooltipProps {
  content: string;
  title?: string;
  children?: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
  iconOnly?: boolean;
}

export function HelpTooltip({ 
  content, 
  title, 
  children, 
  position = 'top',
  className,
  iconOnly = false 
}: HelpTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2'
  };

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-slate-900',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-slate-900',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-slate-900',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-slate-900'
  };

  if (iconOnly) {
    return (
      <div className="relative inline-block">
        <button
          onMouseEnter={() => setIsVisible(true)}
          onMouseLeave={() => setIsVisible(false)}
          onClick={() => setIsVisible(!isVisible)}
          className="text-muted-foreground hover:text-primary transition-colors"
        >
          <HelpCircle className="h-4 w-4" />
        </button>
        
        {isVisible && (
          <div className={cn(
            "absolute z-50 w-64 p-3 bg-slate-900 text-white rounded-lg shadow-xl",
            "animate-in fade-in zoom-in-95 duration-200",
            positionClasses[position]
          )}>
            {title && <p className="font-semibold text-sm mb-1">{title}</p>}
            <p className="text-xs text-slate-300 leading-relaxed">{content}</p>
            <div className={cn(
              "absolute w-0 h-0 border-[6px] border-transparent",
              arrowClasses[position]
            )} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div 
      className={cn("relative inline-block", className)}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      
      {isVisible && (
        <div className={cn(
          "absolute z-50 w-64 p-3 bg-slate-900 text-white rounded-lg shadow-xl",
          "animate-in fade-in zoom-in-95 duration-200",
          positionClasses[position]
        )}>
          {title && <p className="font-semibold text-sm mb-1">{title}</p>}
          <p className="text-xs text-slate-300 leading-relaxed">{content}</p>
          <div className={cn(
            "absolute w-0 h-0 border-[6px] border-transparent",
            arrowClasses[position]
          )} />
        </div>
      )}
    </div>
  );
}

// Inline help text component
interface InlineHelpProps {
  children: React.ReactNode;
  className?: string;
}

export function InlineHelp({ children, className }: InlineHelpProps) {
  return (
    <p className={cn("text-xs text-muted-foreground mt-1", className)}>
      {children}
    </p>
  );
}

// Help badge for inline hints
interface HelpBadgeProps {
  text: string;
  variant?: 'info' | 'tip' | 'warning';
}

export function HelpBadge({ text, variant = 'info' }: HelpBadgeProps) {
  const variantClasses = {
    info: 'bg-blue-50 text-blue-700 border-blue-200',
    tip: 'bg-amber-50 text-amber-700 border-amber-200',
    warning: 'bg-red-50 text-red-700 border-red-200'
  };

  return (
    <span className={cn(
      "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border",
      variantClasses[variant]
    )}>
      {variant === 'tip' && <span className="mr-1">💡</span>}
      {variant === 'info' && <span className="mr-1">ℹ️</span>}
      {variant === 'warning' && <span className="mr-1">⚠️</span>}
      {text}
    </span>
  );
}

export default HelpTooltip;
