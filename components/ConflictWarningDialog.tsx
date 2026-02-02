/**
 * Conflict Warning Dialog
 * Display schedule conflicts before assignment
 */

import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    Button,
    Badge
} from './ui';
import { AlertTriangle, AlertCircle, Clock, Calendar, Award, Timer } from 'lucide-react';
import type { ConflictResult } from '../lib/scheduleValidation';

interface ConflictWarningDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    conflicts: ConflictResult[];
    officerName: string;
    shiftDetails: string;
    onConfirm: () => void;
    onCancel: () => void;
}

export function ConflictWarningDialog({
    open,
    onOpenChange,
    conflicts,
    officerName,
    shiftDetails,
    onConfirm,
    onCancel
}: ConflictWarningDialogProps) {
    const hasErrors = conflicts.some(c => c.severity === 'error');
    const warnings = conflicts.filter(c => c.severity === 'warning');
    const errors = conflicts.filter(c => c.severity === 'error');

    const getIcon = (type: ConflictResult['type']) => {
        switch (type) {
            case 'overlap':
                return <AlertCircle className="h-5 w-5" />;
            case 'rest_period':
                return <Clock className="h-5 w-5" />;
            case 'availability':
                return <Calendar className="h-5 w-5" />;
            case 'certification':
                return <Award className="h-5 w-5" />;
            case 'overtime':
                return <Timer className="h-5 w-5" />;
            default:
                return <AlertTriangle className="h-5 w-5" />;
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <AlertTriangle className={hasErrors ? 'text-red-500' : 'text-amber-500'} />
                        {hasErrors ? 'Scheduling Conflict' : 'Scheduling Warning'}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                        Assigning <strong>{officerName}</strong> to <strong>{shiftDetails}</strong>:
                    </p>

                    {/* Errors */}
                    {errors.length > 0 && (
                        <div className="space-y-2">
                            <h4 className="text-sm font-medium text-red-500 flex items-center gap-1">
                                <AlertCircle className="h-4 w-4" />
                                Cannot Assign
                            </h4>
                            <div className="space-y-2">
                                {errors.map((conflict, i) => (
                                    <div
                                        key={i}
                                        className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg"
                                    >
                                        <div className="text-red-500 mt-0.5">
                                            {getIcon(conflict.type)}
                                        </div>
                                        <div>
                                            <Badge variant="destructive" className="text-xs mb-1">
                                                {conflict.type.replace('_', ' ')}
                                            </Badge>
                                            <p className="text-sm text-foreground">{conflict.message}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Warnings */}
                    {warnings.length > 0 && (
                        <div className="space-y-2">
                            <h4 className="text-sm font-medium text-amber-600 flex items-center gap-1">
                                <AlertTriangle className="h-4 w-4" />
                                Warnings
                            </h4>
                            <div className="space-y-2">
                                {warnings.map((conflict, i) => (
                                    <div
                                        key={i}
                                        className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg"
                                    >
                                        <div className="text-amber-500 mt-0.5">
                                            {getIcon(conflict.type)}
                                        </div>
                                        <div>
                                            <Badge className="text-xs mb-1 bg-amber-500">
                                                {conflict.type.replace('_', ' ')}
                                            </Badge>
                                            <p className="text-sm text-foreground">{conflict.message}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="mt-4">
                    <Button variant="outline" onClick={onCancel}>
                        Cancel
                    </Button>
                    {!hasErrors && (
                        <Button
                            onClick={onConfirm}
                            className="bg-amber-500 hover:bg-amber-600 text-white"
                        >
                            Assign Anyway
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
