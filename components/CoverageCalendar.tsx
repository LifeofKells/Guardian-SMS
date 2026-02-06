import React, { useState } from 'react';
import { Card, CardContent } from './ui';
import { ChevronLeft, ChevronRight, CheckCircle2, AlertCircle, XCircle, MinusCircle } from 'lucide-react';

interface CoverageDay {
    date: Date;
    status: 'filled' | 'partial' | 'uncovered' | 'no_shift';
    filledShifts: number;
    totalShifts: number;
}

interface CoverageCalendarProps {
    month?: Date;
    onDateClick?: (date: Date) => void;
}

export function CoverageCalendar({ month = new Date(), onDateClick }: CoverageCalendarProps) {
    const [currentMonth, setCurrentMonth] = useState(month);

    const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    const startDay = startOfMonth.getDay(); // 0-6

    // Generate mock coverage data
    const generateCoverageData = (date: Date): CoverageDay => {
        const rand = Math.random();
        if (rand > 0.9) return { date, status: 'uncovered', filledShifts: 0, totalShifts: 1 };
        if (rand > 0.8) return { date, status: 'partial', filledShifts: 1, totalShifts: 2 };
        if (rand > 0.3) return { date, status: 'filled', filledShifts: 2, totalShifts: 2 };
        return { date, status: 'no_shift', filledShifts: 0, totalShifts: 0 };
    };

    const days: (CoverageDay | null)[] = [];

    // Add empty cells for days before month starts
    for (let i = 0; i < startDay; i++) {
        days.push(null);
    }

    // Add all days in the month
    for (let day = 1; day <= endOfMonth.getDate(); day++) {
        const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
        days.push(generateCoverageData(date));
    }

    const getDayStyle = (status: CoverageDay['status']) => {
        switch (status) {
            case 'filled':
                return 'bg-green-100 border-green-300 hover:bg-green-200';
            case 'partial':
                return 'bg-amber-100 border-amber-300 hover:bg-amber-200';
            case 'uncovered':
                return 'bg-red-100 border-red-300 hover:bg-red-200';
            case 'no_shift':
                return 'bg-gray-50 border-gray-200';
        }
    };

    const getDayIcon = (status: CoverageDay['status']) => {
        const iconClass = "h-4 w-4";
        switch (status) {
            case 'filled':
                return <CheckCircle2 className={`${iconClass} text-green-600`} />;
            case 'partial':
                return <AlertCircle className={`${iconClass} text-amber-600`} />;
            case 'uncovered':
                return <XCircle className={`${iconClass} text-red-600`} />;
            case 'no_shift':
                return <MinusCircle className={`${iconClass} text-gray-400`} />;
        }
    };

    const previousMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    };

    const nextMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
    };

    return (
        <Card>
            <CardContent className="pt-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold text-gray-900">Coverage Calendar</h2>
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={previousMonth}
                            className="p-1 hover:bg-gray-100 rounded transition-colors"
                        >
                            <ChevronLeft className="h-5 w-5 text-gray-600" />
                        </button>
                        <span className="text-sm font-medium text-gray-700 min-w-[120px] text-center">
                            {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </span>
                        <button
                            onClick={nextMonth}
                            className="p-1 hover:bg-gray-100 rounded transition-colors"
                        >
                            <ChevronRight className="h-5 w-5 text-gray-600" />
                        </button>
                    </div>
                </div>

                {/* Day Headers */}
                <div className="grid grid-cols-7 gap-2 mb-2">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                        <div key={day} className="text-center text-xs font-semibold text-gray-500 py-2">
                            {day}
                        </div>
                    ))}
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-2">
                    {days.map((day, index) => (
                        <div key={index}>
                            {day ? (
                                <button
                                    onClick={() => onDateClick?.(day.date)}
                                    className={`w-full aspect-square rounded-lg border-2 transition-colors ${getDayStyle(day.status)} flex flex-col items-center justify-center p-1 group`}
                                >
                                    <span className="text-sm font-medium text-gray-900">
                                        {day.date.getDate()}
                                    </span>
                                    <div className="mt-1 opacity-70 group-hover:opacity-100 transition-opacity">
                                        {getDayIcon(day.status)}
                                    </div>
                                    {day.status !== 'no_shift' && (
                                        <span className="text-[10px] text-gray-600 mt-0.5">
                                            {day.filledShifts}/{day.totalShifts}
                                        </span>
                                    )}
                                </button>
                            ) : (
                                <div className="w-full aspect-square" />
                            )}
                        </div>
                    ))}
                </div>

                {/* Legend */}
                <div className="mt-6 pt-4 border-t border-gray-200 flex flex-wrap gap-4 text-xs">
                    <div className="flex items-center space-x-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <span className="text-gray-600">Fully Staffed</span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <AlertCircle className="h-4 w-4 text-amber-600" />
                        <span className="text-gray-600">Partially Staffed</span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <XCircle className="h-4 w-4 text-red-600" />
                        <span className="text-gray-600">Uncovered</span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <MinusCircle className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600">No Scheduled Shift</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
