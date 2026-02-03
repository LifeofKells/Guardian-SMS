import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Package, DollarSign, Wrench, Plus, Check, X,
    AlertCircle, Search, Filter, Calendar, TrendingUp, CreditCard,
    Briefcase, FileText, Download, Eye, MoreHorizontal, Upload, Loader2
} from 'lucide-react';
import { db } from '../lib/db';
import { storage } from '../lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useToast } from '../contexts/ToastContext';
import {
    Button,
    Badge,
    Tabs,
    TabsList,
    TabsTrigger,
    TabsContent,
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    Input,
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
import type { Expense, Equipment, MaintenanceRecord, ExpenseCategory, ExpenseStatus, EquipmentType, EquipmentStatus } from '../lib/types';

export default function Resources() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold tracking-tight text-foreground">Resources & Assets</h2>
                    <p className="text-sm text-muted-foreground">Manage organizational expenses, equipment inventory, and maintenance.</p>
                </div>
            </div>

            <Tabs defaultValue="expenses" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="expenses" className="gap-2"><DollarSign className="h-4 w-4" /> Expenses</TabsTrigger>
                    <TabsTrigger value="equipment" className="gap-2"><Package className="h-4 w-4" /> Equipment</TabsTrigger>
                    <TabsTrigger value="maintenance" className="gap-2"><Wrench className="h-4 w-4" /> Maintenance</TabsTrigger>
                </TabsList>

                <TabsContent value="expenses" className="space-y-4">
                    <ExpensesTab />
                </TabsContent>

                <TabsContent value="equipment" className="space-y-4">
                    <EquipmentTab />
                </TabsContent>

                <TabsContent value="maintenance" className="space-y-4">
                    <MaintenanceTab />
                </TabsContent>
            </Tabs>
        </div>
    );
}

// --- EXPENSES TAB ---
function ExpensesTab() {
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [statusFilter, setStatusFilter] = useState<ExpenseStatus | 'all'>('all');
    const [categoryFilter, setCategoryFilter] = useState<ExpenseCategory | 'all'>('all');
    const { user, profile, organization } = useAuth();
    const queryClient = useQueryClient();
    const { addToast } = useToast();

    const { data: expensesData, isLoading } = useQuery({
        queryKey: ['expenses', organization?.id],
        enabled: !!organization,
        queryFn: async () => {
            if (!organization) return [];
            const { data } = await db.getFullExpenses(organization.id);
            return data || [];
        }
    });

    // Mutations for Approve/Reject generic handler
    const updateStatusMutation = useMutation({
        mutationFn: async ({ id, status, amount }: { id: string, status: 'approved' | 'rejected', amount: number }) => {
            const { error } = await db.expenses.update(id, {
                status,
                reviewed_at: new Date().toISOString(),
                reviewed_by: user?.uid || 'unknown'
            });
            if (error) throw error;
            return { id, status, amount };
        },
        onSuccess: async ({ id, status, amount }) => {
            await db.audit_logs.create({
                action: 'update',
                description: `${status === 'approved' ? 'Approved' : 'Rejected'} expense ${id}`,
                performed_by: profile?.full_name || 'Unknown',
                performed_by_id: user?.uid || 'system',
                target_resource: 'Expense',
                target_id: id,
                organization_id: organization?.id || '',
                timestamp: new Date().toISOString()
            });
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
            addToast({ type: status === 'approved' ? 'success' : 'info', title: `Expense ${status === 'approved' ? 'Approved' : 'Rejected'}`, description: `The expense has been ${status}.` });
        },
        onError: (err: any) => {
            addToast({ type: 'error', title: 'Error', description: err.message });
        }
    });

    const filteredExpenses = expensesData?.filter(exp => {
        if (statusFilter !== 'all' && exp.status !== statusFilter) return false;
        if (categoryFilter !== 'all' && exp.category !== categoryFilter) return false;
        return true;
    }) || [];

    const stats = {
        pending: expensesData?.filter(e => e.status === 'pending').reduce((sum, e) => sum + e.amount, 0) || 0,
        approvedTotal: expensesData?.filter(e => e.status === 'approved').reduce((sum, e) => sum + e.amount, 0) || 0,
        rejectedCount: expensesData?.filter(e => e.status === 'rejected').length || 0,
        totalCount: expensesData?.length || 0
    };

    return (
        <>
            {/* Stats Row */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
                        <AlertCircle className="h-4 w-4 text-amber-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${stats.pending.toFixed(2)}</div>
                        <p className="text-xs text-muted-foreground mt-1">Requires review</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Approved</CardTitle>
                        <Check className="h-4 w-4 text-emerald-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${stats.approvedTotal.toFixed(2)}</div>
                        <p className="text-xs text-muted-foreground mt-1">All time</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Rejected Claims</CardTitle>
                        <X className="h-4 w-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.rejectedCount}</div>
                        <p className="text-xs text-muted-foreground mt-1">Claims denied</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Claims</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalCount}</div>
                        <p className="text-xs text-muted-foreground mt-1">Total submissions</p>
                    </CardContent>
                </Card>
            </div>

            {/* Filter Card */}
            <div className="bg-card p-4 rounded-lg border border-border mb-4 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex flex-col sm:flex-row items-end gap-4">
                    <div className="grid gap-1.5 flex-1 w-full">
                        <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                            <Filter className="h-3 w-3" /> Status
                        </label>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                            <option value="all">All Statuses</option>
                            <option value="pending">Pending</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                            <option value="paid">Paid</option>
                        </select>
                    </div>
                    <div className="grid gap-1.5 flex-1 w-full">
                        <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                            <Filter className="h-3 w-3" /> Category
                        </label>
                        <select
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value as typeof categoryFilter)}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                            <option value="all">All Categories</option>
                            <option value="mileage">Mileage</option>
                            <option value="fuel">Fuel</option>
                            <option value="parking">Parking</option>
                            <option value="supplies">Supplies</option>
                            <option value="uniform">Uniform</option>
                            <option value="training">Training</option>
                            <option value="other">Other</option>
                        </select>
                    </div>
                    <div className="flex gap-2 pb-0.5 w-full sm:w-auto">
                        <Button onClick={() => setIsAddOpen(true)} className="w-full sm:w-auto">
                            <Plus className="w-4 h-4 mr-2" /> Submit Expense
                        </Button>
                    </div>
                </div>
            </div>

            {/* Expenses Table */}
            <Card>
                <CardHeader className="py-4 border-b">
                    <CardTitle className="text-base">Expense Log</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="rounded-none overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/50 border-b border-border">
                                <tr>
                                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">Officer</th>
                                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">Date</th>
                                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">Category</th>
                                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">Description</th>
                                    <th className="h-10 px-6 text-right font-medium text-muted-foreground">Amount</th>
                                    <th className="h-10 px-6 text-center font-medium text-muted-foreground">Status</th>
                                    <th className="h-10 px-6 text-right font-medium text-muted-foreground">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border text-left">
                                {isLoading ? (
                                    <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Loading expenses...</td></tr>
                                ) : filteredExpenses.length === 0 ? (
                                    <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No expenses found matching the filters.</td></tr>
                                ) : (
                                    filteredExpenses.map((expense: any) => {
                                        const statusColors: any = {
                                            pending: 'warning',
                                            approved: 'success',
                                            rejected: 'destructive',
                                            paid: 'outline'
                                        };
                                        return (
                                            <tr key={expense.id} className="hover:bg-muted/30 transition-colors">
                                                <td className="px-6 py-4 font-medium">{expense.officer?.full_name || 'Unknown'}</td>
                                                <td className="px-6 py-4">{new Date(expense.date).toLocaleDateString()}</td>
                                                <td className="px-6 py-4 capitalize">{expense.category}</td>
                                                <td className="px-6 py-4 max-w-xs truncate text-muted-foreground">{expense.description}</td>
                                                <td className="px-6 py-4 text-right font-medium">${expense.amount.toFixed(2)}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <Badge variant={statusColors[expense.status]}>{expense.status}</Badge>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        {expense.status === 'pending' && (
                                                            <>
                                                                <Button
                                                                    variant="ghost" size="icon" className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                                                    title="Approve"
                                                                    onClick={() => updateStatusMutation.mutate({ id: expense.id, status: 'approved', amount: expense.amount })}
                                                                >
                                                                    <Check className="h-4 w-4" />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                                                    title="Reject"
                                                                    onClick={() => updateStatusMutation.mutate({ id: expense.id, status: 'rejected', amount: expense.amount })}
                                                                >
                                                                    <X className="h-4 w-4" />
                                                                </Button>
                                                            </>
                                                        )}
                                                        {expense.receipt_url && (
                                                            <Button
                                                                variant="ghost" size="icon" className="h-8 w-8"
                                                                title="View Receipt"
                                                                onClick={() => window.open(expense.receipt_url, '_blank')}
                                                            >
                                                                <FileText className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            <AddExpenseDialog open={isAddOpen} onOpenChange={setIsAddOpen} />
        </>
    );
}

// --- EQUIPMENT TAB (Now Table View) ---
function EquipmentTab() {
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [statusFilter, setStatusFilter] = useState<EquipmentStatus | 'all'>('all');
    const { organization } = useAuth();

    const { data: equipmentData, isLoading } = useQuery({
        queryKey: ['equipment', organization?.id],
        enabled: !!organization,
        queryFn: async () => {
            if (!organization) return [];
            const { data } = await db.getFullEquipment(organization.id);
            return data || [];
        }
    });

    const filteredEquipment = equipmentData?.filter(eq => {
        if (statusFilter !== 'all' && eq.status !== statusFilter) return false;
        return true;
    }) || [];

    const stats = {
        total: equipmentData?.length || 0,
        available: equipmentData?.filter(e => e.status === 'available').length || 0,
        assigned: equipmentData?.filter(e => e.status === 'assigned').length || 0
    };

    return (
        <>
            {/* Stats Row */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.total}</div>
                        <p className="text-xs text-muted-foreground mt-1">Items in inventory</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Available</CardTitle>
                        <Check className="h-4 w-4 text-emerald-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.available}</div>
                        <p className="text-xs text-muted-foreground mt-1">Ready for assignment</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Assigned</CardTitle>
                        <Briefcase className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.assigned}</div>
                        <p className="text-xs text-muted-foreground mt-1">Currently in use</p>
                    </CardContent>
                </Card>
            </div>

            {/* Filter Card */}
            <div className="bg-card p-4 rounded-lg border border-border mb-4 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex flex-col sm:flex-row items-end gap-4">
                    <div className="grid gap-1.5 flex-1 w-full">
                        <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                            <Filter className="h-3 w-3" /> Status
                        </label>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                            <option value="all">All Statuses</option>
                            <option value="available">Available</option>
                            <option value="assigned">Assigned</option>
                            <option value="maintenance">Maintenance</option>
                            <option value="damaged">Damaged</option>
                            <option value="lost">Lost</option>
                            <option value="retired">Retired</option>
                        </select>
                    </div>
                    <div className="flex gap-2 pb-0.5 w-full sm:w-auto">
                        <Button onClick={() => setIsAddOpen(true)} className="w-full sm:w-auto">
                            <Plus className="w-4 h-4 mr-2" /> Add Equipment
                        </Button>
                    </div>
                </div>
            </div>

            {/* Equipment Table */}
            <Card>
                <CardHeader className="py-4 border-b">
                    <CardTitle className="text-base">Inventory List</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="rounded-none overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/50 border-b border-border">
                                <tr>
                                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">Item Name</th>
                                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">Identifier</th>
                                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">Type</th>
                                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">Assigned To / Location</th>
                                    <th className="h-10 px-6 text-right font-medium text-muted-foreground">Value</th>
                                    <th className="h-10 px-6 text-center font-medium text-muted-foreground">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border text-left">
                                {isLoading ? (
                                    <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Loading equipment...</td></tr>
                                ) : filteredEquipment.length === 0 ? (
                                    <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No equipment found.</td></tr>
                                ) : (
                                    filteredEquipment.map((item: any) => {
                                        const statusColors: any = {
                                            available: 'success',
                                            assigned: 'outline',
                                            maintenance: 'warning',
                                            damaged: 'destructive',
                                            lost: 'destructive',
                                            retired: 'secondary'
                                        };
                                        return (
                                            <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                                                <td className="px-6 py-4 font-medium">{item.name}</td>
                                                <td className="px-6 py-4 text-muted-foreground">{item.identifier}</td>
                                                <td className="px-6 py-4 capitalize">{item.type.replace('_', ' ')}</td>
                                                <td className="px-6 py-4 text-muted-foreground">
                                                    {item.assigned_officer ? (
                                                        <span className="text-foreground">{item.assigned_officer.full_name}</span>
                                                    ) : (
                                                        item.location || '-'
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-right">${item.purchase_price?.toFixed(2) || '0.00'}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <Badge variant={statusColors[item.status]}>{item.status}</Badge>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            <AddEquipmentDialog open={isAddOpen} onOpenChange={setIsAddOpen} />
        </>
    );
}

// --- MAINTENANCE TAB ---
function MaintenanceTab() {
    const [isAddOpen, setIsAddOpen] = useState(false);
    const { organization } = useAuth();

    const { data: maintenanceData, isLoading } = useQuery({
        queryKey: ['maintenance', organization?.id],
        enabled: !!organization,
        queryFn: async () => {
            if (!organization) return [];
            const { data } = await db.getFullMaintenance(organization.id);
            return data || [];
        }
    });

    return (
        <>
            <div className="flex justify-end mb-4">
                <Button onClick={() => setIsAddOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" /> Schedule Maintenance
                </Button>
            </div>

            <Card>
                <CardHeader className="py-4 border-b">
                    <CardTitle className="text-base">Maintenance Records</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="rounded-none overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/50 border-b border-border">
                                <tr>
                                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">Equipment</th>
                                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">Type</th>
                                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">Description</th>
                                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">Scheduled Date</th>
                                    <th className="h-10 px-6 text-right font-medium text-muted-foreground">Cost</th>
                                    <th className="h-10 px-6 text-center font-medium text-muted-foreground">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border text-left">
                                {isLoading ? (
                                    <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Loading records...</td></tr>
                                ) : maintenanceData.length === 0 ? (
                                    <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No maintenance records found.</td></tr>
                                ) : (
                                    maintenanceData.map((record: any) => (
                                        <tr key={record.id} className="hover:bg-muted/30 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-foreground">{record.equipment?.name || 'Unknown'}</div>
                                                <div className="text-xs text-muted-foreground">{record.equipment?.identifier}</div>
                                            </td>
                                            <td className="px-6 py-4 capitalize"><Badge variant="outline">{record.type}</Badge></td>
                                            <td className="px-6 py-4 max-w-xs truncate text-muted-foreground">{record.description}</td>
                                            <td className="px-6 py-4">{new Date(record.scheduled_date).toLocaleDateString()}</td>
                                            <td className="px-6 py-4 text-right font-medium">{record.cost ? `$${record.cost.toFixed(2)}` : '-'}</td>
                                            <td className="px-6 py-4 text-center">
                                                <Badge variant={record.status === 'completed' ? 'success' : record.status === 'cancelled' ? 'secondary' : 'warning'}>
                                                    {record.status}
                                                </Badge>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            <AddMaintenanceDialog open={isAddOpen} onOpenChange={setIsAddOpen} />
        </>
    );
}

function AddExpenseDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
    const { addToast } = useToast();
    const { user, profile, organization } = useAuth();
    const queryClient = useQueryClient();
    const [category, setCategory] = useState<ExpenseCategory>('other');
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [receiptFile, setReceiptFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    // Mileage specific fields
    const [startOdometer, setStartOdometer] = useState('');
    const [endOdometer, setEndOdometer] = useState('');
    const [ratePerMile, setRatePerMile] = useState('0.655');

    const createMutation = useMutation({
        mutationFn: async () => {
            if (!user) throw new Error("You must be logged in to submit.");

            const expense: Omit<Expense, 'id'> = {
                organization_id: organization?.id || '', // Added
                officer_id: user.uid,
                category,
                amount: parseFloat(amount),
                description,
                date,
                status: 'pending',
                submitted_at: new Date().toISOString()
            };

            // Receipt Upload
            if (receiptFile) {
                setIsUploading(true);
                try {
                    const storageRef = ref(storage, `receipts/${user.uid}/${Date.now()}_${receiptFile.name}`);
                    await uploadBytes(storageRef, receiptFile);
                    const url = await getDownloadURL(storageRef);
                    expense.receipt_url = url;
                } catch (e: any) {
                    setIsUploading(false);
                    throw new Error("Failed to upload receipt: " + e.message);
                }
                setIsUploading(false);
            }

            if (category === 'mileage' && startOdometer && endOdometer) {
                const distance = parseFloat(endOdometer) - parseFloat(startOdometer);
                expense.mileage = {
                    start_odometer: parseFloat(startOdometer),
                    end_odometer: parseFloat(endOdometer),
                    distance,
                    rate_per_mile: parseFloat(ratePerMile)
                };
                expense.amount = distance * parseFloat(ratePerMile);
            }

            const result = await db.expenses.create(expense);
            if (result.error) throw result.error;
            return result.data;
        },
        onSuccess: async (data: any) => {
            await db.audit_logs.create({
                action: 'create',
                description: `Submitted expense for $${amount}`,
                performed_by: profile?.full_name || 'Unknown',
                performed_by_id: user?.uid || 'system',
                target_resource: 'Expense',
                target_id: data?.id,
                organization_id: organization?.id || '', // Added
                timestamp: new Date().toISOString()
            });
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
            addToast({ type: 'success', title: 'Submitted', description: 'Expense submitted successfully.' });
            onOpenChange(false);
            setAmount('');
            setDescription('');
            setStartOdometer('');
            setEndOdometer('');
            setReceiptFile(null);
            setIsUploading(false);
        },
        onError: (err: any) => {
            addToast({ type: 'error', title: 'Failed', description: err.message });
        }
    });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Submit Expense</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Category</label>
                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                                <option value="mileage">Mileage</option>
                                <option value="fuel">Fuel</option>
                                <option value="parking">Parking</option>
                                <option value="supplies">Supplies</option>
                                <option value="uniform">Uniform</option>
                                <option value="training">Training</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Date</label>
                            <Input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                            />
                        </div>
                    </div>

                    {category === 'mileage' ? (
                        <div className="space-y-4 p-4 bg-muted/40 rounded-lg border border-border">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-muted-foreground uppercase">Start Odometer</label>
                                    <Input
                                        type="number"
                                        value={startOdometer}
                                        onChange={(e) => setStartOdometer(e.target.value)}
                                        placeholder="0"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-muted-foreground uppercase">End Odometer</label>
                                    <Input
                                        type="number"
                                        value={endOdometer}
                                        onChange={(e) => setEndOdometer(e.target.value)}
                                        placeholder="0"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-muted-foreground uppercase">Rate per Mile ($)</label>
                                <Input
                                    type="number"
                                    step="0.001"
                                    value={ratePerMile}
                                    onChange={(e) => setRatePerMile(e.target.value)}
                                />
                            </div>
                            {startOdometer && endOdometer && (
                                <div className="flex justify-between items-center text-sm pt-2 border-t border-border mt-2">
                                    <span className="text-muted-foreground">
                                        Distance: <span className="font-medium text-foreground">{(parseFloat(endOdometer) - parseFloat(startOdometer)).toFixed(1)} mi</span>
                                    </span>
                                    <span className="font-bold text-lg text-emerald-600">
                                        ${((parseFloat(endOdometer) - parseFloat(startOdometer)) * parseFloat(ratePerMile)).toFixed(2)}
                                    </span>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Amount ($)</label>
                            <Input
                                type="number"
                                step="0.01"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0.00"
                                className="text-lg font-medium"
                            />
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Description</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                            className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                            placeholder="Describe the business purpose..."
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Receipt / Attachment</label>
                        <div className="flex items-center gap-2">
                            <Input
                                type="file"
                                accept="image/*,application/pdf"
                                onChange={(e) => {
                                    if (e.target.files && e.target.files[0]) {
                                        setReceiptFile(e.target.files[0]);
                                    }
                                }}
                                className="cursor-pointer"
                            />
                        </div>
                        {receiptFile && <p className="text-xs text-muted-foreground flex items-center gap-1"><Check className="h-3 w-3 text-emerald-500" /> Selected: {receiptFile.name}</p>}
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button
                        onClick={() => createMutation.mutate()}
                        disabled={createMutation.isPending || isUploading || !description || (category !== 'mileage' && !amount) || (category === 'mileage' && (!startOdometer || !endOdometer))}
                    >
                        {createMutation.isPending || isUploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</> : 'Submit Expense'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function AddEquipmentDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
    const { addToast } = useToast();
    const queryClient = useQueryClient();
    const { user, profile } = useAuth();
    const [type, setType] = useState<EquipmentType>('other');
    const [name, setName] = useState('');
    const [identifier, setIdentifier] = useState('');
    const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
    const [purchasePrice, setPurchasePrice] = useState('');
    const [location, setLocation] = useState('');
    const [notes, setNotes] = useState('');
    const { organization } = useAuth();

    const createMutation = useMutation({
        mutationFn: async () => {
            const equipment: Omit<Equipment, 'id'> = {
                organization_id: organization?.id || '', // Added
                type,
                name,
                identifier,
                purchase_date: purchaseDate,
                purchase_price: parseFloat(purchasePrice) || 0,
                status: 'available',
                location,
                notes
            };
            const result = await db.equipment.create(equipment);
            if (result.error) throw result.error;
            return result.data;
        },
        onSuccess: async (data: any) => {
            await db.audit_logs.create({
                action: 'create',
                description: `Added equipment: ${name} (${type})`,
                performed_by: profile?.full_name || 'Unknown',
                performed_by_id: user?.uid || 'system',
                target_resource: 'Equipment',
                target_id: data?.id,
                organization_id: organization?.id || '', // Added
                timestamp: new Date().toISOString()
            });
            queryClient.invalidateQueries({ queryKey: ['equipment'] });
            addToast({ type: 'success', title: 'Equipment Added', description: 'Added to inventory.' });
            onOpenChange(false);
            setName('');
            setIdentifier('');
            setPurchasePrice('');
        },
        onError: (err: any) => {
            addToast({ type: 'error', title: 'Error', description: err.message });
        }
    });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Add Equipment</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto px-1">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Type</label>
                            <select
                                value={type}
                                onChange={(e) => setType(e.target.value as EquipmentType)}
                                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                                <option value="radio">Radio</option>
                                <option value="vehicle">Vehicle</option>
                                <option value="uniform">Uniform</option>
                                <option value="firearm">Firearm</option>
                                <option value="baton">Baton</option>
                                <option value="flashlight">Flashlight</option>
                                <option value="body_camera">Body Camera</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Identifier</label>
                            <Input
                                value={identifier}
                                onChange={(e) => setIdentifier(e.target.value)}
                                placeholder="SN-12345"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Item Name</label>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Motorola XPR 7550e"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Purchase Date</label>
                            <Input
                                type="date"
                                value={purchaseDate}
                                onChange={(e) => setPurchaseDate(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Price ($)</label>
                            <Input
                                type="number"
                                step="0.01"
                                value={purchasePrice}
                                onChange={(e) => setPurchasePrice(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Initial Location</label>
                        <Input
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            placeholder="Main Office - Locker 3"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !name || !identifier}>
                        Add Item
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function AddMaintenanceDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
    const { addToast } = useToast();
    const queryClient = useQueryClient();
    const { user, profile, organization } = useAuth();
    const [equipmentId, setEquipmentId] = useState('');
    const [type, setType] = useState<'routine' | 'repair' | 'inspection'>('routine');
    const [description, setDescription] = useState('');
    const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().split('T')[0]);
    const [cost, setCost] = useState('');
    // Removed useOrganization line

    const { data: equipmentList } = useQuery({
        queryKey: ['equipment', organization?.id],
        enabled: !!organization,
        queryFn: async () => {
            if (!organization) return [];
            const { data } = await db.equipment.select(organization.id);
            return data || [];
        }
    });

    const createMutation = useMutation({
        mutationFn: async () => {
            const record: Omit<MaintenanceRecord, 'id'> = {
                organization_id: organization?.id || '', // Added
                equipment_id: equipmentId,
                type,
                description,
                scheduled_date: scheduledDate,
                status: 'scheduled',
                cost: cost ? parseFloat(cost) : undefined
            };
            const result = await db.maintenance.create(record);
            if (result.error) throw result.error;
            return result.data;
        },
        onSuccess: async (data: any) => {
            await db.audit_logs.create({
                action: 'create',
                description: `Scheduled ${type} maintenance for equipment ${equipmentId}`,
                performed_by: profile?.full_name || 'Unknown',
                performed_by_id: user?.uid || 'system',
                target_resource: 'Maintenance',
                target_id: data?.id,
                organization_id: organization?.id || '', // Added
                timestamp: new Date().toISOString()
            });
            queryClient.invalidateQueries({ queryKey: ['maintenance'] });
            addToast({ type: 'success', title: 'Scheduled', description: 'Maintenance has been scheduled.' });
            onOpenChange(false);
            setDescription('');
            setEquipmentId('');
        },
        onError: (err: any) => {
            addToast({ type: 'error', title: 'Error', description: err.message });
        }
    });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Schedule Maintenance</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Equipment</label>
                        <select
                            value={equipmentId}
                            onChange={(e) => setEquipmentId(e.target.value)}
                            className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            <option value="">Select equipment...</option>
                            {equipmentList?.map((eq) => (
                                <option key={eq.id} value={eq.id}>
                                    {eq.name} ({eq.identifier})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Type</label>
                            <select
                                value={type}
                                onChange={(e) => setType(e.target.value as typeof type)}
                                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                                <option value="routine">Routine</option>
                                <option value="repair">Repair</option>
                                <option value="inspection">Inspection</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Date</label>
                            <Input
                                type="date"
                                value={scheduledDate}
                                onChange={(e) => setScheduledDate(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Estimated Cost ($)</label>
                        <Input
                            type="number"
                            value={cost}
                            onChange={(e) => setCost(e.target.value)}
                            placeholder="Optional"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Description</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                            className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                            placeholder="Details about the work needed..."
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !equipmentId || !description}>
                        Schedule
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
