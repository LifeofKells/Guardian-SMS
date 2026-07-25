import React from 'react';
import { Button, Badge, cn } from './ui';
import {
    Plus,
    Download,
    Upload,
    Filter,
    RefreshCw,
    CalendarPlus,
    UserPlus,
    Send,
    FileText,
    Copy,
    Search,
    Hash,
    BarChart3,
    AlertTriangle,
    Clock,
    Megaphone,
    type LucideIcon
} from 'lucide-react';

interface QuickAction {
    id: string;
    label: string;
    icon: LucideIcon;
    onClick: () => void;
    variant?: 'default' | 'outline' | 'ghost' | 'secondary';
    badge?: string | number;
    hideOnMobile?: boolean;
    className?: string;
}

interface PageHeaderProps {
    title: string;
    description?: string;
    actions?: QuickAction[];
    badge?: string | number;
    badgeVariant?: 'default' | 'secondary' | 'outline' | 'success' | 'warning' | 'destructive';
    children?: React.ReactNode;
    className?: string;
}

// Predefined quick actions for common pages
export const PAGE_ACTIONS: Record<string, (handlers: Record<string, () => void>) => QuickAction[]> = {
    schedule: (handlers) => [
        { id: 'add-shift', label: 'Add Shift', icon: CalendarPlus, onClick: handlers.addShift || (() => { }), variant: 'default' },
        { id: 'copy-week', label: 'Copy Last Week', icon: Copy, onClick: handlers.copyWeek || (() => { }), variant: 'outline', hideOnMobile: true },
        { id: 'export', label: 'Export', icon: Download, onClick: handlers.export || (() => { }), variant: 'ghost', hideOnMobile: true },
    ],
    officers: (handlers) => [
        { id: 'add-officer', label: 'Add Officer', icon: UserPlus, onClick: handlers.addOfficer || (() => { }), variant: 'default' },
        { id: 'export-csv', label: 'Export CSV', icon: Download, onClick: handlers.export || (() => { }), variant: 'outline', hideOnMobile: true },
    ],
    messaging: (handlers) => [
        { id: 'new-channel', label: 'New Channel', icon: Hash, onClick: handlers.newChannel || (() => { }), variant: 'default' },
        { id: 'search', label: 'Search Messages', icon: Search, onClick: handlers.search || (() => { }), variant: 'outline', hideOnMobile: true },
    ],
    timesheets: (handlers) => [
        { id: 'approve-all', label: 'Approve Pending', icon: Clock, onClick: handlers.approveAll || (() => { }), variant: 'default' },
        { id: 'export', label: 'Export', icon: Download, onClick: handlers.export || (() => { }), variant: 'outline', hideOnMobile: true },
    ],
    clients: (handlers) => [
        { id: 'add-client', label: 'Add Client', icon: Plus, onClick: handlers.addClient || (() => { }), variant: 'default' },
        { id: 'add-site', label: 'Add Site', icon: Plus, onClick: handlers.addSite || (() => { }), variant: 'outline' },
    ],
    reports: (handlers) => [
        { id: 'generate', label: 'Generate Report', icon: BarChart3, onClick: handlers.generate || (() => { }), variant: 'default' },
        { id: 'export', label: 'Export PDF', icon: FileText, onClick: handlers.export || (() => { }), variant: 'outline', hideOnMobile: true },
    ],
    feedback: (handlers) => [
        { id: 'send-survey', label: 'Send Survey', icon: Send, onClick: handlers.sendSurvey || (() => { }), variant: 'default' },
        { id: 'filter', label: 'Filter', icon: Filter, onClick: handlers.filter || (() => { }), variant: 'outline', hideOnMobile: true },
    ],
    accounting: (handlers) => [
        { id: 'new-invoice', label: 'New Invoice', icon: Plus, onClick: handlers.newInvoice || (() => { }), variant: 'default' },
        { id: 'run-payroll', label: 'Run Payroll', icon: RefreshCw, onClick: handlers.runPayroll || (() => { }), variant: 'outline' },
        { id: 'export', label: 'Export', icon: Download, onClick: handlers.export || (() => { }), variant: 'ghost', hideOnMobile: true },
    ],
    resources: (handlers) => [
        { id: 'add-item', label: 'Add Item', icon: Plus, onClick: handlers.addItem || (() => { }), variant: 'default' },
        { id: 'upload', label: 'Upload', icon: Upload, onClick: handlers.upload || (() => { }), variant: 'outline', hideOnMobile: true },
    ],
};

export function PageHeader({
    title,
    description,
    actions = [],
    badge,
    badgeVariant = 'secondary',
    children,
    className,
}: PageHeaderProps) {
    return (
        <div className={cn('flex items-start sm:items-center justify-between gap-3 flex-wrap', className)}>
            <div className="min-w-0">
                <div className="flex items-center gap-3">
                    <h2 className="text-lg font-bold tracking-tight text-foreground truncate">{title}</h2>
                    {badge !== undefined && (
                        <Badge variant={badgeVariant} className="h-6 px-2.5 shrink-0">
                            {badge}
                        </Badge>
                    )}
                </div>
                {description && (
                    <p className="text-sm text-muted-foreground mt-0.5 max-w-xl truncate">{description}</p>
                )}
            </div>

            <div className="flex items-center gap-2 shrink-0 flex-wrap">
                {children}
                {actions.map((action) => {
                    const ActionIcon = action.icon;
                    return (
                        <Button
                            key={action.id}
                            variant={(action.variant as any) || 'outline'}
                            size="sm"
                            className={cn(
                                'gap-1.5 h-9 transition-all duration-200',
                                action.hideOnMobile && 'hidden sm:inline-flex',
                                action.className
                            )}
                            onClick={action.onClick}
                        >
                            <ActionIcon className="h-4 w-4" />
                            <span>{action.label}</span>
                            {action.badge !== undefined && (
                                <Badge variant="default" className="h-4 px-1.5 ml-0.5 text-[10px]">
                                    {action.badge}
                                </Badge>
                            )}
                        </Button>
                    );
                })}
            </div>
        </div>
    );
}

export default PageHeader;
