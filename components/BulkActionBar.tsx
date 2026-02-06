/**
 * BulkActionBar Component
 * Floating action bar for bulk operations on selected items
 */

import React from 'react';
import { X, Trash2, Download, Mail, Printer, CheckSquare, Square } from 'lucide-react';
import { Button, cn } from './ui';

interface BulkAction {
    id: string;
    label: string;
    icon: React.ElementType;
    onClick: () => void;
    variant?: 'default' | 'destructive' | 'secondary';
}

interface BulkActionBarProps {
    selectedCount: number;
    totalCount: number;
    onSelectAll: () => void;
    onDeselectAll: () => void;
    onClose: () => void;
    actions: BulkAction[];
    className?: string;
    itemName?: string;
}

export function BulkActionBar({
    selectedCount,
    totalCount,
    onSelectAll,
    onDeselectAll,
    onClose,
    actions,
    className,
    itemName = 'items'
}: BulkActionBarProps) {
    const allSelected = selectedCount === totalCount && totalCount > 0;

    return (
        <div className={cn(
            "fixed bottom-6 left-1/2 -translate-x-1/2 z-50",
            "bg-background border border-border/50 shadow-2xl rounded-xl",
            "flex items-center gap-4 px-4 py-3",
            "animate-in slide-in-from-bottom-4 fade-in duration-300",
            className
        )}>
            {/* Selection Info */}
            <div className="flex items-center gap-3 border-r border-border pr-4">
                <button
                    onClick={allSelected ? onDeselectAll : onSelectAll}
                    className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors"
                >
                    {allSelected ? (
                        <CheckSquare className="h-5 w-5 text-primary" />
                    ) : (
                        <Square className="h-5 w-5 text-muted-foreground" />
                    )}
                    <span className="whitespace-nowrap">
                        {selectedCount} of {totalCount} selected
                    </span>
                </button>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
                {actions.map((action) => (
                    <Button
                        key={action.id}
                        variant={action.variant || 'secondary'}
                        size="sm"
                        className="gap-2"
                        onClick={action.onClick}
                    >
                        <action.icon className="h-4 w-4" />
                        <span className="hidden sm:inline">{action.label}</span>
                    </Button>
                ))}
            </div>

            {/* Close Button */}
            <button
                onClick={onClose}
                className="ml-2 p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
                <X className="h-4 w-4" />
            </button>
        </div>
    );
}

export default BulkActionBar;
