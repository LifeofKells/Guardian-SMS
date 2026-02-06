/**
 * QuickFilterChips Component
 * Horizontal scrollable chips for instant filtering
 * Mobile-optimized, always accessible
 */

import React from 'react';
import { cn } from './ui';
import { X } from 'lucide-react';

interface FilterChip {
  id: string;
  label: string;
  count?: number;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
}

interface QuickFilterChipsProps {
  /** Available filter options */
  chips: FilterChip[];
  /** Currently selected chip IDs */
  selectedChips: string[];
  /** Callback when a chip is toggled */
  onToggle: (chipId: string) => void;
  /** Callback to clear all filters */
  onClearAll?: () => void;
  /** Optional title above chips */
  title?: string;
  /** Custom className */
  className?: string;
  /** Whether to show "All" option */
  showAllOption?: boolean;
  /** Label for "All" option */
  allLabel?: string;
}

export function QuickFilterChips({
  chips,
  selectedChips,
  onToggle,
  onClearAll,
  title = 'Quick Filters',
  className,
  showAllOption = true,
  allLabel = 'All'
}: QuickFilterChipsProps) {
  const hasActiveFilters = selectedChips.length > 0;

  const handleAllClick = () => {
    if (onClearAll) {
      onClearAll();
    }
  };

  const variantStyles = {
    default: {
      base: 'bg-muted text-muted-foreground border-transparent',
      active: 'bg-slate-900 text-white border-slate-900',
      hover: 'hover:bg-muted/80'
    },
    success: {
      base: 'bg-green-50 text-green-700 border-green-200',
      active: 'bg-green-600 text-white border-green-600',
      hover: 'hover:bg-green-100'
    },
    warning: {
      base: 'bg-amber-50 text-amber-700 border-amber-200',
      active: 'bg-amber-600 text-white border-amber-600',
      hover: 'hover:bg-amber-100'
    },
    danger: {
      base: 'bg-red-50 text-red-700 border-red-200',
      active: 'bg-red-600 text-white border-red-600',
      hover: 'hover:bg-red-100'
    },
    info: {
      base: 'bg-blue-50 text-blue-700 border-blue-200',
      active: 'bg-blue-600 text-white border-blue-600',
      hover: 'hover:bg-blue-100'
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        {hasActiveFilters && onClearAll && (
          <button
            onClick={onClearAll}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
          >
            <X className="h-3 w-3" />
            Clear
          </button>
        )}
      </div>

      {/* Chips Container */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {/* All Option */}
        {showAllOption && (
          <button
            onClick={handleAllClick}
            className={cn(
              "px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap",
              "border transition-all duration-200",
              "flex items-center gap-1.5 shrink-0",
              !hasActiveFilters
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-muted text-muted-foreground border-transparent hover:bg-muted/80'
            )}
          >
            {allLabel}
            {!hasActiveFilters && (
              <span className="w-1.5 h-1.5 rounded-full bg-white/50" />
            )}
          </button>
        )}

        {/* Filter Chips */}
        {chips.map((chip) => {
          const isSelected = selectedChips.includes(chip.id);
          const variant = chip.variant || 'default';
          const styles = variantStyles[variant];

          return (
            <button
              key={chip.id}
              onClick={() => onToggle(chip.id)}
              className={cn(
                "px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap",
                "border transition-all duration-200",
                "flex items-center gap-1.5 shrink-0",
                styles.hover,
                isSelected ? styles.active : styles.base
              )}
            >
              {chip.label}
              {chip.count !== undefined && (
                <span
                  className={cn(
                    "text-xs px-1.5 py-0.5 rounded-full",
                    isSelected
                      ? 'bg-white/20 text-white'
                      : 'bg-black/5 text-current'
                  )}
                >
                  {chip.count}
                </span>
              )}
              {isSelected && (
                <X className="h-3 w-3 ml-0.5" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Preset filter configurations for common use cases

export const OfficerFilterChips = ({
  selectedFilters,
  onFilterChange,
  officerCounts
}: {
  selectedFilters: string[];
  onFilterChange: (filters: string[]) => void;
  officerCounts: {
    all: number;
    active: number;
    onboarding: number;
    terminated: number;
    expiringCerts: number;
  };
}) => {
  const chips: FilterChip[] = [
    { id: 'active', label: 'Active', count: officerCounts.active, variant: 'success' },
    { id: 'onboarding', label: 'Onboarding', count: officerCounts.onboarding, variant: 'info' },
    { id: 'terminated', label: 'Terminated', count: officerCounts.terminated, variant: 'default' },
    { id: 'expiring-certs', label: 'Expiring Certs', count: officerCounts.expiringCerts, variant: 'warning' }
  ];

  const handleToggle = (chipId: string) => {
    if (selectedFilters.includes(chipId)) {
      onFilterChange(selectedFilters.filter(id => id !== chipId));
    } else {
      onFilterChange([...selectedFilters, chipId]);
    }
  };

  const handleClearAll = () => {
    onFilterChange([]);
  };

  return (
    <QuickFilterChips
      chips={chips}
      selectedChips={selectedFilters}
      onToggle={handleToggle}
      onClearAll={handleClearAll}
      title="Filter Officers"
    />
  );
};

export const ScheduleFilterChips = ({
  selectedFilters,
  onFilterChange,
  shiftCounts
}: {
  selectedFilters: string[];
  onFilterChange: (filters: string[]) => void;
  shiftCounts: {
    today: number;
    thisWeek: number;
    open: number;
    myShifts: number;
  };
}) => {
  const chips: FilterChip[] = [
    { id: 'today', label: 'Today', count: shiftCounts.today, variant: 'info' },
    { id: 'this-week', label: 'This Week', count: shiftCounts.thisWeek, variant: 'default' },
    { id: 'open', label: 'Open Shifts', count: shiftCounts.open, variant: 'success' },
    { id: 'my-shifts', label: 'My Shifts', count: shiftCounts.myShifts, variant: 'primary' as any }
  ];

  const handleToggle = (chipId: string) => {
    if (selectedFilters.includes(chipId)) {
      onFilterChange(selectedFilters.filter(id => id !== chipId));
    } else {
      onFilterChange([...selectedFilters, chipId]);
    }
  };

  const handleClearAll = () => {
    onFilterChange([]);
  };

  return (
    <QuickFilterChips
      chips={chips}
      selectedChips={selectedFilters}
      onToggle={handleToggle}
      onClearAll={handleClearAll}
      title="Filter Schedule"
    />
  );
};

export const IncidentFilterChips = ({
  selectedFilters,
  onFilterChange,
  incidentCounts
}: {
  selectedFilters: string[];
  onFilterChange: (filters: string[]) => void;
  incidentCounts: {
    all: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}) => {
  const chips: FilterChip[] = [
    { id: 'critical', label: 'Critical', count: incidentCounts.critical, variant: 'danger' },
    { id: 'high', label: 'High', count: incidentCounts.high, variant: 'warning' },
    { id: 'medium', label: 'Medium', count: incidentCounts.medium, variant: 'info' },
    { id: 'low', label: 'Low', count: incidentCounts.low, variant: 'success' }
  ];

  const handleToggle = (chipId: string) => {
    if (selectedFilters.includes(chipId)) {
      onFilterChange(selectedFilters.filter(id => id !== chipId));
    } else {
      onFilterChange([...selectedFilters, chipId]);
    }
  };

  const handleClearAll = () => {
    onFilterChange([]);
  };

  return (
    <QuickFilterChips
      chips={chips}
      selectedChips={selectedFilters}
      onToggle={handleToggle}
      onClearAll={handleClearAll}
      title="Filter by Severity"
      showAllOption={true}
      allLabel="All Incidents"
    />
  );
};

export default QuickFilterChips;
