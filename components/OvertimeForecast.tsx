/**
 * Overtime Forecast Component
 * Shows projected weekly hours and overtime costs
 */

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Badge } from './ui';
import { Clock, AlertTriangle, DollarSign, TrendingUp } from 'lucide-react';
import type { Shift, Officer } from '../lib/types';
import { calculateWeeklyHours } from '../lib/scheduleValidation';

interface OvertimeForecastProps {
    shifts: Shift[];
    officers: Officer[];
    weekStartDate?: Date;
    overtimeRate?: number; // Multiplier, e.g., 1.5 for time-and-a-half
}

interface OfficerOvertimeData {
    officer: Officer;
    regular: number;
    overtime: number;
    total: number;
    projectedCost: number;
}

export function OvertimeForecast({
    shifts,
    officers,
    weekStartDate,
    overtimeRate = 1.5
}: OvertimeForecastProps) {
    const data = useMemo(() => {
        const officerData: OfficerOvertimeData[] = officers
            .map(officer => {
                const officerShifts = shifts.filter(s => s.officer_id === officer.id);
                const hours = calculateWeeklyHours(officerShifts, weekStartDate);

                const baseRate = officer.financials?.base_rate || 25;
                const regularCost = hours.regular * baseRate;
                const overtimeCost = hours.overtime * baseRate * overtimeRate;

                return {
                    officer,
                    ...hours,
                    projectedCost: regularCost + overtimeCost
                };
            })
            .filter(d => d.total > 0)
            .sort((a, b) => b.overtime - a.overtime);

        const totals = officerData.reduce(
            (acc, d) => ({
                regularHours: acc.regularHours + d.regular,
                overtimeHours: acc.overtimeHours + d.overtime,
                totalCost: acc.totalCost + d.projectedCost
            }),
            { regularHours: 0, overtimeHours: 0, totalCost: 0 }
        );

        const approachingOvertime = officerData.filter(d => d.total >= 36 && d.overtime === 0);
        const inOvertime = officerData.filter(d => d.overtime > 0);

        return {
            officerData,
            totals,
            approachingOvertime,
            inOvertime
        };
    }, [shifts, officers, weekStartDate, overtimeRate]);

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-blue-500" />
                    Overtime Forecast
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Summary Stats */}
                <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 bg-muted rounded-lg text-center">
                        <div className="text-2xl font-bold text-foreground">
                            {data.totals.regularHours.toFixed(0)}
                        </div>
                        <div className="text-xs text-muted-foreground">Regular Hours</div>
                    </div>
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg text-center">
                        <div className="text-2xl font-bold text-amber-600">
                            {data.totals.overtimeHours.toFixed(1)}
                        </div>
                        <div className="text-xs text-muted-foreground">OT Hours</div>
                    </div>
                    <div className="p-3 bg-muted rounded-lg text-center">
                        <div className="text-2xl font-bold text-foreground">
                            {formatCurrency(data.totals.totalCost)}
                        </div>
                        <div className="text-xs text-muted-foreground">Projected Cost</div>
                    </div>
                </div>

                {/* Officers in Overtime */}
                {data.inOvertime.length > 0 && (
                    <div className="space-y-2">
                        <h4 className="text-sm font-medium flex items-center gap-1 text-amber-600">
                            <AlertTriangle className="h-4 w-4" />
                            In Overtime ({data.inOvertime.length})
                        </h4>
                        <div className="space-y-2">
                            {data.inOvertime.map(({ officer, total, overtime }) => (
                                <div
                                    key={officer.id}
                                    className="flex items-center justify-between p-2 bg-amber-50 dark:bg-amber-950/30 rounded border border-amber-200 dark:border-amber-900"
                                >
                                    <div className="flex items-center gap-2">
                                        <div className="h-8 w-8 bg-amber-200 dark:bg-amber-800 rounded-full flex items-center justify-center text-xs font-bold">
                                            {officer.full_name.charAt(0)}
                                        </div>
                                        <div>
                                            <div className="text-sm font-medium">{officer.full_name}</div>
                                            <div className="text-xs text-muted-foreground">
                                                {total.toFixed(1)}hrs total
                                            </div>
                                        </div>
                                    </div>
                                    <Badge className="bg-amber-500">
                                        +{overtime.toFixed(1)}hr OT
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Approaching Overtime */}
                {data.approachingOvertime.length > 0 && (
                    <div className="space-y-2">
                        <h4 className="text-sm font-medium flex items-center gap-1 text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            Approaching 40hrs ({data.approachingOvertime.length})
                        </h4>
                        <div className="space-y-1">
                            {data.approachingOvertime.slice(0, 5).map(({ officer, total }) => (
                                <div
                                    key={officer.id}
                                    className="flex items-center justify-between p-2 bg-muted/50 rounded"
                                >
                                    <span className="text-sm">{officer.full_name}</span>
                                    <span className="text-sm text-muted-foreground">
                                        {total.toFixed(1)}hrs ({(40 - total).toFixed(1)} remaining)
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* No overtime message */}
                {data.inOvertime.length === 0 && data.approachingOvertime.length === 0 && data.officerData.length > 0 && (
                    <div className="text-center p-4 text-muted-foreground text-sm">
                        ✓ No overtime projected for this week
                    </div>
                )}

                {/* Empty state */}
                {data.officerData.length === 0 && (
                    <div className="text-center p-4 text-muted-foreground text-sm">
                        No scheduled shifts this week
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
