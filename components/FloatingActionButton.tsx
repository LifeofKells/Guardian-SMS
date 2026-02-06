/**
 * FloatingActionButton Component
 * Sticky button in bottom-right for primary actions
 * Mobile-optimized, always accessible
 */

import React, { useState } from 'react';
import { cn } from './ui';
import { Plus, X } from 'lucide-react';

interface FABAction {
  id: string;
  label: string;
  icon: React.ElementType;
  onClick: () => void;
  variant?: 'default' | 'primary' | 'secondary';
}

interface FloatingActionButtonProps {
  /** Main action when clicking the FAB */
  onMainClick?: () => void;
  /** Icon for the main button */
  mainIcon?: React.ElementType;
  /** Label for the main button (shown on hover) */
  mainLabel?: string;
  /** Additional actions to show in a menu when expanded */
  actions?: FABAction[];
  /** Position on screen */
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  /** Custom className */
  className?: string;
  /** Whether to show the label on desktop */
  showLabel?: boolean;
}

export function FloatingActionButton({
  onMainClick,
  mainIcon: MainIcon = Plus,
  mainLabel = 'Add New',
  actions = [],
  position = 'bottom-right',
  className,
  showLabel = true
}: FloatingActionButtonProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasMultipleActions = actions.length > 0;

  const positionClasses = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
    'top-right': 'top-6 right-6',
    'top-left': 'top-6 left-6'
  };

  const handleMainClick = () => {
    if (hasMultipleActions) {
      setIsExpanded(!isExpanded);
    } else if (onMainClick) {
      onMainClick();
    }
  };

  const handleActionClick = (action: FABAction) => {
    action.onClick();
    setIsExpanded(false);
  };

  return (
    <div className={cn(
      "fixed z-50 flex flex-col items-end gap-3",
      positionClasses[position],
      className
    )}>
      {/* Expanded Actions */}
      {hasMultipleActions && isExpanded && (
        <div className="flex flex-col items-end gap-2 mb-2 animate-in slide-in-from-bottom-2 fade-in duration-200">
          {actions.map((action, index) => (
            <div
              key={action.id}
              className="flex items-center gap-3 group"
              style={{
                animationDelay: `${index * 50}ms`
              }}
            >
              {/* Label */}
              <span className={cn(
                "px-3 py-1.5 bg-slate-900 text-white text-sm rounded-lg shadow-lg",
                "opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap",
                "hidden md:block"
              )}>
                {action.label}
              </span>
              
              {/* Action Button */}
              <button
                onClick={() => handleActionClick(action)}
                className={cn(
                  "h-12 w-12 rounded-full shadow-lg flex items-center justify-center",
                  "transition-all duration-200 hover:scale-110",
                  "bg-white dark:bg-slate-800 text-slate-900 dark:text-white",
                  "border border-border hover:border-primary"
                )}
                title={action.label}
              >
                <action.icon className="h-5 w-5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Main FAB Button */}
      <button
        onClick={handleMainClick}
        className={cn(
          "group flex items-center gap-2 rounded-full shadow-2xl",
          "transition-all duration-300 ease-out",
          "hover:scale-105 active:scale-95",
          "bg-primary text-primary-foreground",
          "hover:shadow-primary/25 hover:shadow-xl",
          hasMultipleActions && isExpanded && "rotate-45",
          showLabel ? "pl-4 pr-2 py-2 md:pr-4" : "p-4"
        )}
      >
        {/* Icon */}
        <span className={cn(
          "transition-transform duration-300",
          hasMultipleActions && isExpanded && "rotate-45"
        )}>
          {hasMultipleActions && isExpanded ? (
            <X className="h-6 w-6" />
          ) : (
            <MainIcon className="h-6 w-6" />
          )}
        </span>
        
        {/* Label - hidden on mobile when FAB is icon-only */}
        {showLabel && (
          <span className={cn(
            "text-sm font-semibold whitespace-nowrap",
            "hidden md:inline-block",
            "transition-all duration-300",
            hasMultipleActions && isExpanded && "hidden"
          )}>
            {mainLabel}
          </span>
        )}
      </button>
    </div>
  );
}

// Preset FAB configurations for common use cases
export const OfficerPageFAB = ({ onAdd, onBulkImport }: { onAdd: () => void; onBulkImport?: () => void }) => (
  <FloatingActionButton
    mainLabel="Add Officer"
    onMainClick={onAdd}
    actions={onBulkImport ? [
      {
        id: 'bulk-import',
        label: 'Bulk Import',
        icon: () => <span>📁</span>,
        onClick: onBulkImport
      }
    ] : []}
  />
);

export const SchedulePageFAB = ({ onAdd }: { onAdd: () => void }) => (
  <FloatingActionButton
    mainLabel="Create Shift"
    onMainClick={onAdd}
  />
);

export const ClientsPageFAB = ({ onAddClient, onAddSite }: { onAddClient: () => void; onAddSite: () => void }) => (
  <FloatingActionButton
    mainLabel="Add Client"
    actions={[
      {
        id: 'add-client',
        label: 'Add Client',
        icon: () => <span>🏢</span>,
        onClick: onAddClient
      },
      {
        id: 'add-site',
        label: 'Add Site',
        icon: () => <span>📍</span>,
        onClick: onAddSite
      }
    ]}
  />
);

export default FloatingActionButton;
