
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, Input } from '../components/ui';
import { db } from '../lib/db';
import { AuditLog } from '../lib/types';
import { Activity, Search, Filter, RefreshCw, User, Calendar, Tag, Radio } from 'lucide-react';

export default function AuditLogs() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState('all');
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Real-time Subscription
  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = db.audit_logs.subscribe((data) => {
        setLogs(data);
        setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const filteredLogs = logs.filter(log => {
      const matchesSearch = 
        log.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
        log.performed_by.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.target_resource.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesAction = filterAction === 'all' || log.action === filterAction;
      
      return matchesSearch && matchesAction;
  });

  const getActionColor = (action: string) => {
      switch(action) {
          case 'create': return 'success';
          case 'update': return 'default'; // Blue/Primary
          case 'delete': return 'destructive';
          case 'process': return 'warning';
          default: return 'secondary';
      }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between gap-4 items-center">
        <div>
            <h2 className="text-xl font-bold tracking-tight">System Audit Logs</h2>
            <p className="text-sm text-muted-foreground">Track all critical system events and user actions.</p>
        </div>
        <div className="flex gap-2">
            <Badge variant="outline" className="gap-2 px-3 py-1.5 bg-background text-emerald-600 border-emerald-200">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                Live Stream
            </Badge>
        </div>
      </div>

      <Card className="border border-border">
          <CardHeader className="bg-muted/30 border-b border-border py-4">
              <div className="flex flex-col sm:flex-row gap-4 justify-between">
                  <div className="relative w-full max-w-sm">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input 
                        placeholder="Search logs..." 
                        className="pl-9" 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                  </div>
                  <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4 text-muted-foreground" />
                      <select 
                        className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        value={filterAction}
                        onChange={(e) => setFilterAction(e.target.value)}
                      >
                          <option value="all">All Actions</option>
                          <option value="create">Create</option>
                          <option value="update">Update</option>
                          <option value="delete">Delete</option>
                          <option value="process">Process</option>
                      </select>
                  </div>
              </div>
          </CardHeader>
          <CardContent className="p-0">
              <div className="rounded-none border-0 overflow-x-auto">
                  <table className="w-full text-sm">
                      <thead className="bg-muted/50 border-b border-border">
                          <tr>
                              <th className="h-10 px-6 text-left font-medium text-muted-foreground w-[180px]">Timestamp</th>
                              <th className="h-10 px-6 text-left font-medium text-muted-foreground w-[200px]">User</th>
                              <th className="h-10 px-6 text-left font-medium text-muted-foreground w-[120px]">Action</th>
                              <th className="h-10 px-6 text-left font-medium text-muted-foreground w-[120px]">Resource</th>
                              <th className="h-10 px-6 text-left font-medium text-muted-foreground">Details</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                          {isLoading && (
                              <tr>
                                  <td colSpan={5} className="p-12 text-center text-muted-foreground animate-pulse">
                                      Connecting to live feed...
                                  </td>
                              </tr>
                          )}
                          {!isLoading && filteredLogs.map((log) => (
                              <tr key={log.id} className="hover:bg-muted/20 transition-colors animate-in fade-in slide-in-from-top-1 duration-300">
                                  <td className="px-6 py-3 text-muted-foreground whitespace-nowrap text-xs font-mono">
                                      {new Date(log.timestamp).toLocaleString()}
                                  </td>
                                  <td className="px-6 py-3 font-medium">
                                      <div className="flex items-center gap-2">
                                          <div className="h-6 w-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600">
                                              {log.performed_by.charAt(0)}
                                          </div>
                                          <span className="truncate max-w-[150px]">{log.performed_by}</span>
                                      </div>
                                  </td>
                                  <td className="px-6 py-3">
                                      <Badge variant={getActionColor(log.action) as any} className="uppercase text-[10px] w-20 justify-center">
                                          {log.action}
                                      </Badge>
                                  </td>
                                  <td className="px-6 py-3">
                                      <div className="flex items-center gap-1 text-xs font-medium bg-muted px-2 py-1 rounded w-fit">
                                          <Tag className="h-3 w-3" /> {log.target_resource}
                                      </div>
                                  </td>
                                  <td className="px-6 py-3 text-foreground/80">
                                      {log.description}
                                      {log.target_id && <span className="ml-2 font-mono text-[10px] text-muted-foreground opacity-50">#{log.target_id.substring(0,6)}</span>}
                                  </td>
                              </tr>
                          ))}
                          {!isLoading && filteredLogs.length === 0 && (
                              <tr>
                                  <td colSpan={5} className="p-8 text-center text-muted-foreground">
                                      No logs found matching your criteria.
                                  </td>
                              </tr>
                          )}
                      </tbody>
                  </table>
              </div>
          </CardContent>
      </Card>
    </div>
  );
}
