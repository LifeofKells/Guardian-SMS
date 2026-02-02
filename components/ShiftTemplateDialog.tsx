/**
 * Shift Template Dialogs
 * Create and apply reusable shift templates
 */

import React, { useState, useMemo } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    Button,
    Input,
    Label,
    Badge
} from './ui';
import { Plus, Calendar, Clock, MapPin, Copy, Trash2, Check } from 'lucide-react';
import type { ShiftTemplate, Site, Shift } from '../lib/types';

// --- SHIFT TEMPLATE DIALOG ---

interface ShiftTemplateDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    template?: ShiftTemplate | null;
    sites: Site[];
    onSave: (template: Omit<ShiftTemplate, 'id'>) => void;
    onDelete?: (id: string) => void;
}

export function ShiftTemplateDialog({
    open,
    onOpenChange,
    template,
    sites,
    onSave,
    onDelete
}: ShiftTemplateDialogProps) {
    const [formData, setFormData] = useState<Partial<ShiftTemplate>>(
        template || {
            name: '',
            site_id: '',
            start_time: '08:00',
            end_time: '16:00',
            days_of_week: [],
            is_active: true
        }
    );

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const toggleDay = (day: number) => {
        setFormData(prev => {
            const current = prev.days_of_week || [];
            if (current.includes(day)) {
                return { ...prev, days_of_week: current.filter(d => d !== day) };
            }
            return { ...prev, days_of_week: [...current, day].sort() };
        });
    };

    const handleSave = () => {
        if (!formData.name || !formData.site_id) return;

        onSave({
            name: formData.name,
            site_id: formData.site_id,
            start_time: formData.start_time || '08:00',
            end_time: formData.end_time || '16:00',
            days_of_week: formData.days_of_week || [],
            required_skills: formData.required_skills,
            bill_rate: formData.bill_rate,
            pay_rate: formData.pay_rate,
            is_active: formData.is_active ?? true
        });

        onOpenChange(false);
    };

    const isEditing = !!template;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[450px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Copy className="h-5 w-5 text-primary" />
                        {isEditing ? 'Edit Template' : 'Create Shift Template'}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Template Name */}
                    <div className="space-y-2">
                        <Label>Template Name</Label>
                        <Input
                            value={formData.name || ''}
                            onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="e.g., Weekday Morning Shift"
                        />
                    </div>

                    {/* Site Selection */}
                    <div className="space-y-2">
                        <Label className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            Site
                        </Label>
                        <select
                            className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                            value={formData.site_id || ''}
                            onChange={e => setFormData(prev => ({ ...prev, site_id: e.target.value }))}
                        >
                            <option value="">Select a site...</option>
                            {sites.map(site => (
                                <option key={site.id} value={site.id}>{site.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Time Range */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <Label className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Start Time
                            </Label>
                            <Input
                                type="time"
                                value={formData.start_time || '08:00'}
                                onChange={e => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>End Time</Label>
                            <Input
                                type="time"
                                value={formData.end_time || '16:00'}
                                onChange={e => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
                            />
                        </div>
                    </div>

                    {/* Days of Week */}
                    <div className="space-y-2">
                        <Label className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Days of Week
                        </Label>
                        <div className="flex gap-1 flex-wrap">
                            {dayNames.map((day, i) => (
                                <button
                                    key={day}
                                    onClick={() => toggleDay(i)}
                                    className={`
                    px-3 py-1.5 rounded text-sm font-medium transition-colors
                    ${(formData.days_of_week || []).includes(i)
                                            ? 'bg-primary text-primary-foreground'
                                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                        }
                  `}
                                >
                                    {day}
                                </button>
                            ))}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Quick:
                            <button
                                className="ml-2 text-primary hover:underline"
                                onClick={() => setFormData(prev => ({ ...prev, days_of_week: [1, 2, 3, 4, 5] }))}
                            >
                                Weekdays
                            </button>
                            {' | '}
                            <button
                                className="text-primary hover:underline"
                                onClick={() => setFormData(prev => ({ ...prev, days_of_week: [0, 6] }))}
                            >
                                Weekends
                            </button>
                            {' | '}
                            <button
                                className="text-primary hover:underline"
                                onClick={() => setFormData(prev => ({ ...prev, days_of_week: [0, 1, 2, 3, 4, 5, 6] }))}
                            >
                                All
                            </button>
                        </p>
                    </div>

                    {/* Rates (optional) */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <Label>Pay Rate ($/hr)</Label>
                            <Input
                                type="number"
                                step="0.01"
                                value={formData.pay_rate || ''}
                                onChange={e => setFormData(prev => ({ ...prev, pay_rate: parseFloat(e.target.value) || undefined }))}
                                placeholder="Optional"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Bill Rate ($/hr)</Label>
                            <Input
                                type="number"
                                step="0.01"
                                value={formData.bill_rate || ''}
                                onChange={e => setFormData(prev => ({ ...prev, bill_rate: parseFloat(e.target.value) || undefined }))}
                                placeholder="Optional"
                            />
                        </div>
                    </div>
                </div>

                <DialogFooter className="mt-4">
                    {isEditing && onDelete && (
                        <Button
                            variant="destructive"
                            onClick={() => { onDelete(template!.id); onOpenChange(false); }}
                            className="mr-auto"
                        >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                        </Button>
                    )}
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={!formData.name || !formData.site_id}>
                        {isEditing ? 'Save Changes' : 'Create Template'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// --- APPLY TEMPLATE DIALOG ---

interface ApplyTemplateDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    templates: ShiftTemplate[];
    sites: Site[];
    onApply: (templateId: string, startDate: string, endDate: string) => void;
}

export function ApplyTemplateDialog({
    open,
    onOpenChange,
    templates,
    sites,
    onApply
}: ApplyTemplateDialogProps) {
    const [selectedTemplate, setSelectedTemplate] = useState<string>('');
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');

    const template = templates.find(t => t.id === selectedTemplate);
    const site = template ? sites.find(s => s.id === template.site_id) : null;

    // Calculate shifts that will be created
    const previewShifts = useMemo(() => {
        if (!template || !startDate || !endDate) return [];

        const shifts: { date: string; day: string }[] = [];
        const start = new Date(startDate);
        const end = new Date(endDate);

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            if (template.days_of_week.includes(d.getDay())) {
                shifts.push({
                    date: d.toISOString().split('T')[0],
                    day: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                });
            }
        }

        return shifts;
    }, [template, startDate, endDate]);

    const handleApply = () => {
        if (!selectedTemplate || !startDate || !endDate) return;
        onApply(selectedTemplate, startDate, endDate);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-primary" />
                        Apply Shift Template
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Template Selection */}
                    <div className="space-y-2">
                        <Label>Select Template</Label>
                        <select
                            className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                            value={selectedTemplate}
                            onChange={e => setSelectedTemplate(e.target.value)}
                        >
                            <option value="">Choose a template...</option>
                            {templates.filter(t => t.is_active).map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Template Details */}
                    {template && (
                        <div className="p-3 bg-muted rounded-lg space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="font-medium">{template.name}</span>
                                <Badge variant="outline">{site?.name}</Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {template.start_time} - {template.end_time}
                                </span>
                                <span>
                                    {template.days_of_week.map(d => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]).join(', ')}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Date Range */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <Label>Start Date</Label>
                            <Input
                                type="date"
                                value={startDate}
                                onChange={e => setStartDate(e.target.value)}
                                min={new Date().toISOString().split('T')[0]}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>End Date</Label>
                            <Input
                                type="date"
                                value={endDate}
                                onChange={e => setEndDate(e.target.value)}
                                min={startDate || new Date().toISOString().split('T')[0]}
                            />
                        </div>
                    </div>

                    {/* Preview */}
                    {previewShifts.length > 0 && (
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                Shifts to Create
                                <Badge variant="secondary">{previewShifts.length}</Badge>
                            </Label>
                            <div className="max-h-32 overflow-y-auto space-y-1 p-2 bg-muted/50 rounded">
                                {previewShifts.slice(0, 10).map((shift, i) => (
                                    <div key={i} className="flex items-center gap-2 text-sm">
                                        <Check className="h-3 w-3 text-green-500" />
                                        <span>{shift.day}</span>
                                        <span className="text-muted-foreground">
                                            {template?.start_time} - {template?.end_time}
                                        </span>
                                    </div>
                                ))}
                                {previewShifts.length > 10 && (
                                    <div className="text-sm text-muted-foreground">
                                        +{previewShifts.length - 10} more shifts...
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="mt-4">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleApply}
                        disabled={!selectedTemplate || !startDate || !endDate || previewShifts.length === 0}
                    >
                        <Plus className="h-4 w-4 mr-1" />
                        Create {previewShifts.length} Shift{previewShifts.length !== 1 ? 's' : ''}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
