import React, { useState } from 'react';
import { useClientPortalAuth } from '../../contexts/ClientPortalAuthContext';
import {
    Plus, Clock, CheckCircle2, XCircle, AlertCircle, X,
    Calendar, FileText, Shield, Sparkles, ChevronRight,
    Send, MapPin, Users, Wrench, ShieldAlert, Check, RefreshCw,
    Building2, Filter, Inbox
} from 'lucide-react';
import { ServiceRequest } from '../../lib/types';
import { hasFeature } from '../../lib/tiers';

export function ServiceRequests() {
    const { organization, client } = useClientPortalAuth();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [statusFilter, setStatusFilter] = useState('all');
    const [submitting, setSubmitting] = useState(false);

    const [requestsList, setRequestsList] = useState<ServiceRequest[]>([
        {
            id: 'SR-2026-901',
            client_id: client?.id || 'c_1',
            requested_by: 'cpu_1',
            site_id: 'site_1',
            request_type: 'extra_coverage',
            description: 'Require 2 additional armed security guards for Executive Gala event. Access control required at West Lobby.',
            requested_date: '2026-06-15',
            requested_start_time: '17:00',
            requested_end_time: '23:30',
            status: 'approved',
            created_at: '2026-06-01T10:00:00Z',
            resolution_notes: 'Request approved. Officer Marcus Johnson and Sarah Williams assigned to West Lobby detail.'
        },
        {
            id: 'SR-2026-842',
            client_id: client?.id || 'c_1',
            requested_by: 'cpu_1',
            site_id: 'site_1',
            request_type: 'special_patrol',
            description: 'Requesting increased vehicle patrol frequency near perimeter fence 4 due to scheduled night maintenance.',
            requested_date: '2026-06-10',
            status: 'pending',
            created_at: '2026-06-02T14:30:00Z',
        },
        {
            id: 'SR-2026-780',
            client_id: client?.id || 'c_1',
            requested_by: 'cpu_1',
            site_id: 'site_1',
            request_type: 'equipment',
            description: 'Installation of high-range mobile guard scan points near Loading Dock B.',
            requested_date: '2026-05-28',
            status: 'completed',
            created_at: '2026-05-20T09:00:00Z',
            resolution_notes: '4 new NFC checkpoint beacons installed & registered into officer mobile patrol route.',
        },
    ]);

    const [newRequest, setNewRequest] = useState({
        site_name: 'Corporate HQ - Main Complex',
        request_type: 'extra_coverage' as const,
        description: '',
        requested_date: '',
        requested_start_time: '',
        requested_end_time: '',
    });

    const tier = organization?.subscription_tier || 'basic';
    const canSubmitRequests = hasFeature(tier, 'service_requests');
    const branding = organization?.white_label || { primary_color: '#3b82f6' };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        setTimeout(() => {
            const created: ServiceRequest = {
                id: `SR-2026-${Math.floor(100 + Math.random() * 900)}`,
                client_id: client?.id || 'c_1',
                requested_by: 'Current User',
                site_id: 'site_1',
                request_type: newRequest.request_type,
                description: newRequest.description || 'Special security officer dispatch request',
                requested_date: newRequest.requested_date || new Date().toISOString().split('T')[0],
                requested_start_time: newRequest.requested_start_time || '08:00',
                requested_end_time: newRequest.requested_end_time || '16:00',
                status: 'pending',
                created_at: new Date().toISOString(),
            };

            setRequestsList([created, ...requestsList]);
            setSubmitting(false);
            setIsFormOpen(false);
            setNewRequest({
                site_name: 'Corporate HQ - Main Complex',
                request_type: 'extra_coverage',
                description: '',
                requested_date: '',
                requested_start_time: '',
                requested_end_time: '',
            });
        }, 800);
    };

    const getStatusConfig = (status: ServiceRequest['status']) => {
        switch (status) {
            case 'pending':
                return {
                    label: 'Pending Dispatch Review',
                    color: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
                    icon: Clock
                };
            case 'approved':
                return {
                    label: 'Approved & Scheduled',
                    color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                    icon: CheckCircle2
                };
            case 'declined':
                return {
                    label: 'Declined',
                    color: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
                    icon: XCircle
                };
            case 'completed':
                return {
                    label: 'Service Fulfilled',
                    color: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
                    icon: CheckCircle2
                };
            default:
                return {
                    label: status,
                    color: 'bg-slate-800 text-slate-300 border-white/10',
                    icon: Clock
                };
        }
    };

    const getRequestTypeDetails = (type: string) => {
        switch (type) {
            case 'extra_coverage':
                return { name: 'Additional Guard Coverage', icon: Users, accent: 'text-blue-400 bg-blue-500/10 border-blue-500/20' };
            case 'special_patrol':
                return { name: 'Special Vehicle Patrol Sweep', icon: MapPin, accent: 'text-purple-400 bg-purple-500/10 border-purple-500/20' };
            case 'equipment':
                return { name: 'Checkpoint & Tech Upgrade', icon: Wrench, accent: 'text-amber-400 bg-amber-500/10 border-amber-500/20' };
            default:
                return { name: 'Custom Security Request', icon: FileText, accent: 'text-slate-400 bg-slate-800 border-white/10' };
        }
    };

    const filteredRequests = statusFilter === 'all'
        ? requestsList
        : requestsList.filter(r => r.status === statusFilter);

    if (!canSubmitRequests) {
        return (
            <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-500">
                <div className="text-center space-y-3">
                    <h1 className="text-3xl font-black text-white">Service Dispatch Hub</h1>
                    <p className="text-slate-400 text-sm">Direct line for requesting on-demand guards and site patrols.</p>
                </div>

                <div className="relative overflow-hidden rounded-3xl bg-slate-900 border border-white/10 p-10 text-center shadow-2xl space-y-6">
                    <div className="h-16 w-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto text-blue-400">
                        <Sparkles className="h-8 w-8" />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-xl font-bold text-white">Enterprise Feature Required</h3>
                        <p className="text-slate-300 text-sm max-w-md mx-auto leading-relaxed">
                            On-demand guard dispatching and special patrol scheduling are available exclusively for Enterprise tier accounts.
                        </p>
                    </div>
                    <button
                        onClick={() => alert('Account Manager notification dispatched.')}
                        className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xs shadow-xl hover:opacity-90 transition-all"
                    >
                        Upgrade Subscription Tier
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Architectural Header Banner */}
            <div className="relative overflow-hidden rounded-3xl bg-slate-900 border border-white/10 p-6 lg:p-8 shadow-2xl">
                <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-blue-600/20 via-indigo-600/10 to-transparent rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/3" />

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <span className="px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                DIRECT DISPATCH CHANNEL
                            </span>
                            <span className="text-xs font-mono text-slate-400">
                                Guaranteed Response: &lt; 2 Hours
                            </span>
                        </div>
                        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
                            Service & <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-300">Guard Dispatch</span>
                        </h1>
                        <p className="text-sm text-slate-300 max-w-xl">
                            Request additional security personnel for corporate events, emergency coverage, or customized site post orders.
                        </p>
                    </div>

                    <button
                        onClick={() => setIsFormOpen(true)}
                        className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xs shadow-xl hover:opacity-95 transition-all flex items-center gap-2 border border-white/20 shrink-0 active:scale-95"
                    >
                        <Plus className="h-4 w-4" />
                        Submit New Request
                    </button>
                </div>
            </div>

            {/* Filter Tabs & Quick Summary */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/90 p-4 rounded-3xl border border-white/[0.08]">
                <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
                    {['all', 'pending', 'approved', 'completed'].map((status) => (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(status)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold capitalize transition-all ${statusFilter === status
                                    ? 'bg-blue-600 text-white shadow-md'
                                    : 'bg-slate-950 text-slate-400 hover:text-white border border-white/5'
                                }`}
                        >
                            {status} ({status === 'all' ? requestsList.length : requestsList.filter(r => r.status === status).length})
                        </button>
                    ))}
                </div>

                <div className="text-xs font-mono text-slate-400 bg-slate-950 px-4 py-2 rounded-xl border border-white/10 w-full sm:w-auto text-center">
                    Active Client ID: <strong className="text-white">{client?.id || 'CLIENT-PRIMARY'}</strong>
                </div>
            </div>

            {/* Existing Requests Roster */}
            <div className="space-y-4">
                {filteredRequests.map((request) => {
                    const statusConfig = getStatusConfig(request.status);
                    const StatusIcon = statusConfig.icon;
                    const typeInfo = getRequestTypeDetails(request.request_type);
                    const TypeIcon = typeInfo.icon;

                    return (
                        <div
                            key={request.id}
                            className="group relative bg-slate-900/90 rounded-3xl border border-white/[0.08] p-6 hover:border-white/20 transition-all duration-300 shadow-xl overflow-hidden"
                        >
                            <div className="relative flex flex-col md:flex-row md:items-start justify-between gap-6">
                                <div className="flex items-start gap-4">
                                    <div className={`h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 border ${typeInfo.accent}`}>
                                        <TypeIcon className="h-6 w-6" />
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-3 flex-wrap">
                                            <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors">
                                                {typeInfo.name}
                                            </h3>
                                            <span className="text-xs font-mono text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded-md border border-blue-500/20">
                                                {request.id}
                                            </span>
                                        </div>

                                        <p className="text-sm text-slate-300 leading-relaxed max-w-2xl">
                                            {request.description}
                                        </p>

                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-mono text-slate-400 pt-2 border-t border-white/5">
                                            <span className="flex items-center gap-1.5 text-slate-300">
                                                <Calendar className="h-3.5 w-3.5 text-blue-400" />
                                                Date: {request.requested_date}
                                            </span>
                                            {request.requested_start_time && (
                                                <span className="flex items-center gap-1.5 text-slate-300">
                                                    <Clock className="h-3.5 w-3.5 text-indigo-400" />
                                                    Time: {request.requested_start_time} - {request.requested_end_time}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col items-end gap-3 shrink-0">
                                    <span className={`px-3 py-1.5 rounded-full text-xs font-bold border flex items-center gap-1.5 ${statusConfig.color}`}>
                                        <StatusIcon className="h-3.5 w-3.5" />
                                        {statusConfig.label}
                                    </span>
                                </div>
                            </div>

                            {request.resolution_notes && (
                                <div className="mt-4 pt-4 border-t border-white/[0.06] bg-slate-950/60 -mx-6 -mb-6 p-4 px-6 flex items-start gap-3">
                                    <Shield className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-xs font-bold text-white uppercase tracking-wider">Dispatch Resolution Notes</p>
                                        <p className="text-xs text-slate-300 mt-0.5">{request.resolution_notes}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}

                {filteredRequests.length === 0 && (
                    <div className="p-12 bg-slate-900/50 rounded-3xl border border-white/[0.08] text-center space-y-3">
                        <Inbox className="h-10 w-10 text-slate-600 mx-auto" />
                        <h3 className="text-base font-bold text-white">No Requests Found</h3>
                        <p className="text-xs text-slate-400">There are no service requests matching this filter status.</p>
                    </div>
                )}
            </div>

            {/* Request Form Glass Modal */}
            {isFormOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
                    <div
                        className="bg-slate-900 border border-white/10 rounded-3xl shadow-2xl max-w-xl w-full p-6 lg:p-8 space-y-6 animate-in zoom-in-95 duration-200 relative overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between border-b border-white/10 pb-4">
                            <div>
                                <h2 className="text-xl font-black text-white flex items-center gap-2">
                                    <Plus className="h-5 w-5 text-blue-400" />
                                    Create Dispatch Request
                                </h2>
                                <p className="text-xs text-slate-400 mt-0.5">Submit extra guard coverage or special patrol details</p>
                            </div>
                            <button
                                onClick={() => setIsFormOpen(false)}
                                className="p-2 rounded-xl bg-slate-950 border border-white/10 text-slate-400 hover:text-white transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Request Type</label>
                                <select
                                    className="w-full h-12 rounded-xl bg-slate-950 border border-white/10 px-4 text-xs font-bold text-white focus:outline-none focus:border-blue-500"
                                    value={newRequest.request_type}
                                    onChange={(e) => setNewRequest({ ...newRequest, request_type: e.target.value as any })}
                                >
                                    <option value="extra_coverage">Additional Guard Personnel</option>
                                    <option value="special_patrol">Special Vehicle Patrol Sweep</option>
                                    <option value="equipment">Security Hardware & NFC Tags</option>
                                    <option value="other">General Service Request</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Date Needed</label>
                                    <input
                                        type="date"
                                        required
                                        className="w-full h-11 rounded-xl bg-slate-950 border border-white/10 px-3 text-xs text-white focus:outline-none focus:border-blue-500"
                                        value={newRequest.requested_date}
                                        onChange={(e) => setNewRequest({ ...newRequest, requested_date: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Start Time</label>
                                    <input
                                        type="time"
                                        className="w-full h-11 rounded-xl bg-slate-950 border border-white/10 px-3 text-xs text-white focus:outline-none focus:border-blue-500"
                                        value={newRequest.requested_start_time}
                                        onChange={(e) => setNewRequest({ ...newRequest, requested_start_time: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400">End Time</label>
                                    <input
                                        type="time"
                                        className="w-full h-11 rounded-xl bg-slate-950 border border-white/10 px-3 text-xs text-white focus:outline-none focus:border-blue-500"
                                        value={newRequest.requested_end_time}
                                        onChange={(e) => setNewRequest({ ...newRequest, requested_end_time: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Detailed Instructions & Post Orders</label>
                                <textarea
                                    required
                                    rows={4}
                                    placeholder="Describe specific duties, guest count, dress code, or entrance verification protocols required..."
                                    className="w-full rounded-2xl bg-slate-950 border border-white/10 p-4 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
                                    value={newRequest.description}
                                    onChange={(e) => setNewRequest({ ...newRequest, description: e.target.value })}
                                />
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                                <button
                                    type="button"
                                    onClick={() => setIsFormOpen(false)}
                                    className="px-5 py-3 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 font-bold text-xs border border-white/10"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 flex items-center gap-2"
                                >
                                    {submitting ? (
                                        <>
                                            <RefreshCw className="h-4 w-4 animate-spin" />
                                            Submitting...
                                        </>
                                    ) : (
                                        <>
                                            <Send className="h-4 w-4" />
                                            Dispatch Request
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

