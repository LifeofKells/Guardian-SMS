
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Button, Avatar, Badge, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, Label } from '../components/ui';
import { db } from '../lib/db';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { Star, MessageSquare, Loader2, User, CheckCircle2 } from 'lucide-react';

export default function Feedback() {
    const { profile, organization } = useAuth(); // Added organization
    const queryClient = useQueryClient();
    const isClient = profile?.role === 'client';

    const [isRateOpen, setIsRateOpen] = useState(false);
    const [selectedShift, setSelectedShift] = useState<any>(null);
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');

    // 1. Fetch Feedback History (All for admin, filtered for client)
    const { data: feedbackList = [] } = useQuery({
        queryKey: ['feedback', profile?.id, organization?.id],
        enabled: !!organization,
        queryFn: async () => {
            if (!organization) return [];
            const { data } = await db.feedback.select(organization.id);
            let list = data || [];
            if (isClient && profile?.client_id) {
                list = list.filter(f => f.client_id === profile.client_id);
            }
            return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        }
    });

    // 2. Fetch Recent Completed Shifts (for Client to rate)
    const { data: recentShifts = [] } = useQuery({
        queryKey: ['recentShifts', profile?.client_id, organization?.id],
        enabled: isClient && !!profile?.client_id && !!organization,
        queryFn: async () => {
            if (!organization) return [];
            const { data } = await db.getFullSchedule(organization.id);
            if (!data) return [];

            // Filter: Completed, Belong to this client, Don't have feedback yet
            const completed = data.filter((s: any) =>
                s.status === 'completed' &&
                s.site?.client_id === profile!.client_id
            );

            // Exclude already rated (client side filter for simplicity)
            const ratedShiftIds = feedbackList.map(f => f.shift_id);
            return completed.filter(s => !ratedShiftIds.includes(s.id)).slice(0, 5); // Show top 5 unrated
        }
    });

    // Mutation
    const submitFeedbackMutation = useMutation({
        mutationFn: async () => {
            if (!selectedShift || !profile?.client_id || !organization) return;
            await db.feedback.create({
                organization_id: organization.id,
                client_id: profile.client_id,
                shift_id: selectedShift.id,
                rating,
                comments: comment,
                created_at: new Date().toISOString(),
                status: 'new'
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['feedback'] });
            queryClient.invalidateQueries({ queryKey: ['recentShifts'] });
            setIsRateOpen(false);
            setRating(5);
            setComment('');
        }
    });

    const handleOpenRate = (shift: any) => {
        setSelectedShift(shift);
        setIsRateOpen(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold tracking-tight">Shift Feedback</h2>
                    <p className="text-sm text-muted-foreground">{isClient ? 'Rate recent shifts and help us improve.' : 'View client feedback and ratings.'}</p>
                </div>
            </div>

            {isClient && recentShifts.length > 0 && (
                <Card className="bg-blue-50 border-blue-100">
                    <CardHeader><CardTitle className="text-base text-blue-900">Pending Reviews</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                        {recentShifts.map(shift => (
                            <div key={shift.id} className="bg-white p-4 rounded-lg border border-blue-100 flex items-center justify-between">
                                <div>
                                    <p className="font-semibold text-sm">{new Date(shift.start_time).toLocaleDateString()} at {shift.site?.name}</p>
                                    <p className="text-xs text-muted-foreground">Officer: {shift.officer?.full_name || 'Unassigned'}</p>
                                </div>
                                <Button size="sm" onClick={() => handleOpenRate(shift)} className="bg-blue-600 hover:bg-blue-700">Rate Shift</Button>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            <div className="grid gap-4">
                {feedbackList.length === 0 && <div className="p-8 text-center text-muted-foreground border rounded-lg bg-white">No feedback history found.</div>}
                {feedbackList.map(item => (
                    <Card key={item.id}>
                        <CardContent className="p-4">
                            <div className="flex gap-4">
                                <div className="flex flex-col items-center justify-center p-3 bg-yellow-50 rounded-lg min-w-[60px]">
                                    <span className="text-2xl font-bold text-yellow-600">{item.rating}</span>
                                    <div className="flex"><Star className="h-3 w-3 text-yellow-500 fill-yellow-500" /></div>
                                </div>
                                <div className="flex-1 space-y-1">
                                    <div className="flex justify-between items-start">
                                        <p className="font-semibold text-sm">Shift Review</p>
                                        <span className="text-xs text-muted-foreground">{new Date(item.created_at).toLocaleDateString()}</span>
                                    </div>
                                    <p className="text-sm text-slate-700 italic">"{item.comments}"</p>
                                    {!isClient && (
                                        <div className="flex items-center gap-2 mt-2 pt-2 border-t text-xs text-muted-foreground">
                                            <Badge variant="outline">Client ID: {item.client_id.substring(0, 8)}</Badge>
                                            {item.status === 'new' && <Badge className="bg-blue-100 text-blue-700 border-0">New</Badge>}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Dialog open={isRateOpen} onOpenChange={setIsRateOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Rate Service Quality</DialogTitle></DialogHeader>
                    <div className="py-4 space-y-6">
                        <div className="flex flex-col items-center gap-2">
                            <Label>How would you rate this shift?</Label>
                            <div className="flex gap-2">
                                {[1, 2, 3, 4, 5].map(star => (
                                    <button
                                        key={star}
                                        onClick={() => setRating(star)}
                                        className={`p-2 rounded-full transition-all ${rating >= star ? 'bg-yellow-100 text-yellow-500 scale-110' : 'bg-slate-50 text-slate-300'}`}
                                    >
                                        <Star className={`h-8 w-8 ${rating >= star ? 'fill-current' : ''}`} />
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Comments (Optional)</Label>
                            <textarea
                                className="flex min-h-[80px] w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                placeholder="Officer was professional..."
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsRateOpen(false)}>Cancel</Button>
                        <Button onClick={() => submitFeedbackMutation.mutate()} disabled={submitFeedbackMutation.isPending}>
                            {submitFeedbackMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Submit Feedback
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
