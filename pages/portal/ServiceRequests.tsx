import React, { useState } from 'react';
import { useClientPortalAuth } from '../../contexts/ClientPortalAuthContext';
import { Button, Input, Label, Badge } from '../../components/ui';
import {
    Plus, Clock, CheckCircle2, XCircle, AlertCircle, X,
    Calendar, FileText, Shield, Sparkles, ChevronRight,
    Send, MapPin, Users, Wrench
} from 'lucide-react';
import { ServiceRequest } from '../../lib/types';
import { hasFeature } from '../../lib/tiers';

export function ServiceRequests() {
    const { organization, client } = useClientPortalAuth();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [newRequest, setNewRequest] = useState({
        site_id: '',
        request_type: 'extra_coverage' as const,
        description: '',
        requested_date: '',
        requested_start_time: '',
        requested_end_time: '',
    });

    const tier = organization?.subscription_tier || 'basic';
    const canSubmitRequests = hasFeature(tier, 'service_requests');
    const branding = organization?.white_label || { primary_color: '#3b82f6' };

    // Mock existing requests
    const existingRequests: ServiceRequest[] = [
        {
            id: 'sr_1',
            client_id: client?.id || '',
            requested_by: 'cpu_1',
            site_id: 'site_1',
            request_type: 'extra_coverage',
            description: 'Need extra coverage for corporate event Friday evening. Expecting 200+ guests.',
            requested_date: '2026-02-10',
            requested_start_time: '18:00',
            requested_end_time: '23:00',
            status: 'approved',
            created_at: '2026-02-03T10:00:00Z',
        },
        {
            id: 'sr_2',
            client_id: client?.id || '',
            requested_by: 'cpu_1',
            site_id: 'site_1',
            request_type: 'special_patrol',
            description: 'Additional patrols near construction zone due to recent incidents',
            requested_date: '2026-02-05',
            status: 'pending',
            created_at: '2026-02-02T14:30:00Z',
        },
        {
            id: 'sr_3',
            client_id: client?.id || '',
            requested_by: 'cpu_1',
            site_id: 'site_1',
            request_type: 'equipment',
            description: 'Request for additional radio equipment for the east wing',
            requested_date: '2026-02-01',
            status: 'completed',
            created_at: '2026-01-28T09:00:00Z',
            resolution_notes: 'Equipment delivered and tested. All units operational.',
        },
    ];

    const handleSubmit = () => {
        console.log('Submitting request:', newRequest);
        setIsFormOpen(false);
        setNewRequest({
            site_id: '',
            request_type: 'extra_coverage',
            description: '',
            requested_date: '',
            requested_start_time: '',
            requested_end_time: '',
        });
    };

    const getStatusConfig = (status: ServiceRequest['status']) => {
        const configs = {
            pending: {
                color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
                icon: Clock,
                bgGlow: 'from-amber-500/10'
            },
            approved: {
                color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
                icon: CheckCircle2,
                bgGlow: 'from-green-500/10'
            },
            declined: {
                color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
                icon: XCircle,
                bgGlow: 'from-red-500/10'
            },
            completed: {
                color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
                icon: CheckCircle2,
                bgGlow: 'from-blue-500/10'
            },
        };
        return configs[status];
    };

    const getRequestTypeIcon = (type: string) => {
        switch (type) {
            case 'extra_coverage': return <Users className="h-5 w-5" />;
            case 'special_patrol': return <MapPin className="h-5 w-5" />;
            case 'equipment': return <Wrench className="h-5 w-5" />;
            default: return <FileText className="h-5 w-5" />;
        }
    };

    const getRequestTypeColor = (type: string) => {
        switch (type) {
            case 'extra_coverage': return 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400';
            case 'special_patrol': return 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400';
            case 'equipment': return 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400';
            default: return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
        }
    };

    if (!canSubmitRequests) {
        return (
            <div className="max-w-2xl mx-auto">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-6">Service Requests</h1>
                <div
                    className="relative overflow-hidden rounded-2xl p-8 text-center border-2 border-dashed"
                    style={{ borderColor: `${branding.primary_color}40` }}
                >
                    <div
                        className="absolute inset-0 opacity-50"
                        style={{ background: `radial-gradient(circle at center, ${branding.primary_color}10, transparent)` }}
                    />
                    <div className="relative">
                        <div
                            className="h-16 w-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                            style={{ background: `linear-gradient(135deg, ${branding.primary_color}20, ${branding.primary_color}10)` }}
                        >
                            <Sparkles className="h-8 w-8" style={{ color: branding.primary_color }} />
                        </div>
                        <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                            Feature Not Available
                        </h3>
                        <p className="text-slate-600 dark:text-slate-400 mb-6 max-w-md mx-auto">
                            Service requests allow you to directly communicate with your security provider.
                            Upgrade to Enterprise to unlock this feature.
                        </p>
                        <Button
                            className="shadow-lg"
                            style={{
                                background: `linear-gradient(135deg, ${branding.primary_color}, ${branding.primary_color}dd)`,
                                boxShadow: `0 4px 14px ${branding.primary_color}40`
                            }}
                        >
                            Upgrade to Enterprise
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Service Requests</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Submit and track special service requests
                    </p>
                </div>
                <Button
                    onClick={() => setIsFormOpen(true)}
                    className="shadow-lg"
                    style={{
                        background: `linear-gradient(135deg, ${branding.primary_color}, ${branding.primary_color}dd)`,
                        boxShadow: `0 4px 14px ${branding.primary_color}40`
                    }}
                >
                    <Plus className="h-4 w-4 mr-2" />
                    New Request
                </Button>
            </div>

            {/* Request Form Modal */}
            {isFormOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div
                        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-auto animate-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="sticky top-0 bg-white dark:bg-slate-800 px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                                <FileText className="h-5 w-5" style={{ color: branding.primary_color }} />
                                New Service Request
                            </h2>
                            <button
                                onClick={() => setIsFormOpen(false)}
                                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                            >
                                <X className="h-5 w-5 text-slate-500" />
                            </button>
                        </div>

                        <div className="p-6 space-y-5">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-slate-700 dark:text-slate-300">Request Type</Label>
                                    <select
                                        className="flex h-11 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-4 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                                        value={newRequest.request_type}
                                        onChange={(e) => setNewRequest(p => ({ ...p, request_type: e.target.value as any }))}
                                    >
                                        <option value="extra_coverage">Extra Coverage</option>
                                        <option value="special_patrol">Special Patrol</option>
                                        <option value="equipment">Equipment Request</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-slate-700 dark:text-slate-300">Date Needed</Label>
                                    <div className="relative">
                                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                        <Input
                                            type="date"
                                            value={newRequest.requested_date}
                                            onChange={(e) => setNewRequest(p => ({ ...p, requested_date: e.target.value }))}
                                            className="pl-11 h-11 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                                        />
                                    </div>
                                </div>
                            </div>

                            {(newRequest.request_type === 'extra_coverage' || newRequest.request_type === 'special_patrol') && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-slate-700 dark:text-slate-300">Start Time</Label>
                                        <div className="relative">
                                            <Clock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                            <Input
                                                type="time"
                                                value={newRequest.requested_start_time}
                                                onChange={(e) => setNewRequest(p => ({ ...p, requested_start_time: e.target.value }))}
                                                className="pl-11 h-11 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-slate-700 dark:text-slate-300">End Time</Label>
                                        <div className="relative">
                                            <Clock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                            <Input
                                                type="time"
                                                value={newRequest.requested_end_time}
                                                onChange={(e) => setNewRequest(p => ({ ...p, requested_end_time: e.target.value }))}
                                                className="pl-11 h-11 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label className="text-slate-700 dark:text-slate-300">Description</Label>
                                <textarea
                                    className="flex min-h-[120px] w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-4 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
                                    placeholder="Provide details about your request..."
                                    value={newRequest.description}
                                    onChange={(e) => setNewRequest(p => ({ ...p, description: e.target.value }))}
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <Button
                                    className="flex-1 h-11 shadow-lg"
                                    onClick={handleSubmit}
                                    style={{
                                        background: `linear-gradient(135deg, ${branding.primary_color}, ${branding.primary_color}dd)`,
                                        boxShadow: `0 4px 14px ${branding.primary_color}40`
                                    }}
                                >
                                    <Send className="h-4 w-4 mr-2" />
                                    Submit Request
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => setIsFormOpen(false)}
                                    className="h-11"
                                >
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Stats Summary */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: 'Pending', value: existingRequests.filter(r => r.status === 'pending').length, color: 'amber' },
                    { label: 'Approved', value: existingRequests.filter(r => r.status === 'approved').length, color: 'green' },
                    { label: 'Completed', value: existingRequests.filter(r => r.status === 'completed').length, color: 'blue' },
                ].map((stat) => (
                    <div
                        key={stat.label}
                        className="bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200/50 dark:border-slate-700/50 p-4 text-center"
                    >
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{stat.label}</p>
                    </div>
                ))}
            </div>

            {/* Existing Requests */}
            <div className="space-y-4">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Your Requests</h2>
                {existingRequests.map((request) => {
                    const statusConfig = getStatusConfig(request.status);
                    const StatusIcon = statusConfig.icon;
                    return (
                        <div
                            key={request.id}
                            className="group relative bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-6 hover:shadow-lg hover:shadow-slate-200/50 dark:hover:shadow-slate-900/50 transition-all duration-300 overflow-hidden"
                        >
                            {/* Status glow effect */}
                            <div className={`absolute top-0 right-0 w-48 h-48 bg-gradient-to-br ${statusConfig.bgGlow} to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-50`} />

                            <div className="relative">
                                <div className="flex items-start justify-between gap-4 mb-4">
                                    <div className="flex items-start gap-4">
                                        <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${getRequestTypeColor(request.request_type)}`}>
                                            {getRequestTypeIcon(request.request_type)}
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-slate-900 dark:text-white capitalize text-lg">
                                                {request.request_type.replace('_', ' ')}
                                            </h3>
                                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                                Requested {new Date(request.created_at).toLocaleDateString('en-US', {
                                                    month: 'short', day: 'numeric', year: 'numeric'
                                                })}
                                            </p>
                                        </div>
                                    </div>
                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${statusConfig.color}`}>
                                        <StatusIcon className="h-3.5 w-3.5" />
                                        {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                                    </span>
                                </div>

                                <p className="text-slate-700 dark:text-slate-300 mb-4">{request.description}</p>

                                <div className="flex flex-wrap items-center gap-4 text-sm">
                                    <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                                        <Calendar className="h-4 w-4" />
                                        {new Date(request.requested_date).toLocaleDateString('en-US', {
                                            weekday: 'short', month: 'short', day: 'numeric'
                                        })}
                                    </span>
                                    {request.requested_start_time && (
                                        <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                                            <Clock className="h-4 w-4" />
                                            {request.requested_start_time} - {request.requested_end_time}
                                        </span>
                                    )}
                                </div>

                                {request.resolution_notes && (
                                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700/50">
                                        <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl">
                                            <Shield className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                                            <div>
                                                <p className="text-sm font-medium text-slate-900 dark:text-white">Response from Security Team</p>
                                                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{request.resolution_notes}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
