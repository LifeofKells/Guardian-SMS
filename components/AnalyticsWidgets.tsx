import React, { useMemo } from 'react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    Legend,
    PieChart,
    Pie,
    Cell
} from 'recharts';
import { format, subDays, startOfDay, isSameDay } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, cn } from './ui';
import { Incident, TimeEntry, Officer } from '../lib/types';

// --- THEME COLORS ---
const COLORS = {
    primary: '#3b82f6', // blue-500
    success: '#10b981', // emerald-500
    warning: '#f59e0b', // amber-500
    danger: '#ef4444',  // red-500
    subtle: '#94a3b8',  // slate-400
    grid: '#e2e8f0',    // slate-200 (light mode grid)
    gridDark: '#334155' // slate-700 (dark mode grid)
};

// --- ACTIVITY TREND CHART ---
interface ActivityTrendProps {
    incidents: Incident[];
    entries: TimeEntry[];
    days?: number;
}

export function ActivityTrendChart({ incidents, entries, days = 7 }: ActivityTrendProps) {
    const data = useMemo(() => {
        const result = [];
        for (let i = days - 1; i >= 0; i--) {
            const date = subDays(new Date(), i);
            const dateStr = format(date, 'MMM dd');

            const dayIncidents = incidents.filter(Inc => isSameDay(new Date(Inc.reported_at), date)).length;
            const dayEntries = entries.filter(Ent => isSameDay(new Date(Ent.clock_in), date)).length;

            result.push({
                date: dateStr,
                incidents: dayIncidents,
                activity: dayEntries
            });
        }
        return result;
    }, [incidents, entries, days]);

    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">7-Day Activity Trend</CardTitle>
            </CardHeader>
            <CardContent className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorActivity" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.1} />
                                <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorIncidents" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={COLORS.danger} stopOpacity={0.1} />
                                <stop offset="95%" stopColor={COLORS.danger} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={COLORS.grid} className="stroke-border" />
                        <XAxis
                            dataKey="date"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 10, fill: COLORS.subtle }}
                            dy={10}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 10, fill: COLORS.subtle }}
                        />
                        <Tooltip
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            labelStyle={{ color: COLORS.subtle, fontSize: '10px', marginBottom: '4px' }}
                        />
                        <Area
                            type="monotone"
                            dataKey="activity"
                            stroke={COLORS.primary}
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorActivity)"
                            name="Shift Logins"
                        />
                        <Area
                            type="monotone"
                            dataKey="incidents"
                            stroke={COLORS.danger}
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorIncidents)"
                            name="Incidents"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}

// --- REVENUE VS COST CHART ---
interface RevenueCostProps {
    entries: TimeEntry[];
}

export function RevenueCostChart({ entries }: RevenueCostProps) {
    const data = useMemo(() => {
        // Aggregate by week or just show current totals? 
        // Let's show a mock "Last 4 Weeks" derived from entries or just simulated if entries are scant
        // For this demo, we'll bucket entries by day of week for the last 7 days to show daily profitability

        const result = [];
        for (let i = 6; i >= 0; i--) {
            const date = subDays(new Date(), i);
            const dayName = format(date, 'EEE'); // Mon, Tue...

            const dayEntries = entries.filter(e => isSameDay(new Date(e.clock_in), date));

            let revenue = 0;
            let cost = 0;

            dayEntries.forEach(e => {
                const hours = Math.max(e.total_hours, 0); // avoid negative
                // Mock rates if missing
                const billRate = e.shift?.site?.client?.billing_settings?.standard_rate || 45;
                const payRate = e.officer?.financials?.base_rate || 20;

                revenue += hours * billRate;
                cost += hours * payRate;
            });

            // If no data, mock some for visualization if "demo" mode, but let's stick to real data (or 0)
            // To make it look good if empty, we might want to handle empty states, but let's render what we have.

            result.push({
                name: dayName,
                Revenue: Math.round(revenue),
                Payroll: Math.round(cost),
                Profit: Math.round(revenue - cost)
            });
        }
        return result;
    }, [entries]);

    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Daily Financial Performance</CardTitle>
            </CardHeader>
            <CardContent className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={COLORS.grid} className="stroke-border" />
                        <XAxis
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 10, fill: COLORS.subtle }}
                            dy={10}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 10, fill: COLORS.subtle }}
                        />
                        <Tooltip
                            cursor={{ fill: 'transparent' }}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                        <Bar dataKey="Revenue" fill={COLORS.success} radius={[4, 4, 0, 0]} barSize={20} />
                        <Bar dataKey="Payroll" fill={COLORS.warning} radius={[4, 4, 0, 0]} barSize={20} />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}

// --- OFFICER STATUS DISTRIBUTION ---
interface OfficerStatusProps {
    officers: Officer[];
}

export function OfficerStatusChart({ officers }: OfficerStatusProps) {
    const data = useMemo(() => {
        const active = officers.filter(o => o.employment_status === 'active').length;
        const onboarding = officers.filter(o => o.employment_status === 'onboarding').length;
        const terminated = officers.filter(o => o.employment_status === 'terminated').length;
        const suspended = officers.filter(o => o.employment_status === 'suspended').length;

        // Filter out zero values to avoid ugly charts
        const result = [
            { name: 'Active', value: active, color: COLORS.success },
            { name: 'Onboarding', value: onboarding, color: COLORS.primary },
            { name: 'Suspended', value: suspended, color: COLORS.warning },
            { name: 'Terminated', value: terminated, color: COLORS.subtle },
        ].filter(d => d.value > 0);

        return result;
    }, [officers]);

    const total = officers.length;

    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Workforce Status</CardTitle>
            </CardHeader>
            <CardContent className="h-[250px] w-full flex items-center justify-center relative">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                            stroke="none"
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                    </PieChart>
                </ResponsiveContainer>
                {/* Center Label */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pr-24">
                    <div className="text-2xl font-bold">{total}</div>
                    <div className="text-xs text-muted-foreground uppercase">Officers</div>
                </div>
            </CardContent>
        </Card>
    );
}
