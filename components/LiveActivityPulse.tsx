/**
 * LiveActivityPulse Component
 * Real-time activity indicator showing system events
 * Displays clock-ins, incidents, alerts, and other activities
 */

import React, { useState, useEffect, createContext, useContext, useCallback, useRef } from 'react';
import {
  Activity,
  Clock,
  LogIn,
  LogOut,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  FileText,
  Users,
  MapPin,
  Bell,
  ChevronRight,
  X,
  Zap,
  Shield
} from 'lucide-react';
import { cn } from './ui';

// ============================================================================
// TYPES
// ============================================================================

export type ActivityType = 
  | 'clock_in' 
  | 'clock_out' 
  | 'incident' 
  | 'alert' 
  | 'shift_assigned' 
  | 'shift_completed'
  | 'report_submitted'
  | 'officer_added'
  | 'site_update';

export interface ActivityEvent {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  timestamp: Date;
  /** Entity involved (officer name, site name, etc.) */
  entity?: string;
  /** Secondary entity (site for clock-in, etc.) */
  location?: string;
  /** For linking to related page */
  link?: {
    page: string;
    data?: Record<string, any>;
  };
  /** Whether this is a high-priority event */
  priority?: 'normal' | 'high' | 'critical';
}

interface ActivityFeedContextType {
  activities: ActivityEvent[];
  latestActivity: ActivityEvent | null;
  isLive: boolean;
  addActivity: (activity: Omit<ActivityEvent, 'id' | 'timestamp'>) => void;
  clearActivities: () => void;
  setIsLive: (live: boolean) => void;
}

// ============================================================================
// CONTEXT
// ============================================================================

const ActivityFeedContext = createContext<ActivityFeedContextType | null>(null);

export function useActivityFeed() {
  const context = useContext(ActivityFeedContext);
  if (!context) {
    throw new Error('useActivityFeed must be used within ActivityFeedProvider');
  }
  return context;
}

// ============================================================================
// PROVIDER
// ============================================================================

interface ActivityFeedProviderProps {
  children: React.ReactNode;
  /** Max activities to keep in memory */
  maxActivities?: number;
  /** Enable demo mode with simulated activities */
  demoMode?: boolean;
  /** Demo activity interval in ms */
  demoInterval?: number;
}

export function ActivityFeedProvider({
  children,
  maxActivities = 50,
  demoMode = false,
  demoInterval = 8000
}: ActivityFeedProviderProps) {
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [isLive, setIsLive] = useState(true);
  const demoIntervalRef = useRef<ReturnType<typeof setInterval>>();

  const latestActivity = activities.length > 0 ? activities[0] : null;

  const addActivity = useCallback((activity: Omit<ActivityEvent, 'id' | 'timestamp'>) => {
    const newActivity: ActivityEvent = {
      ...activity,
      id: `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date()
    };

    setActivities(prev => {
      const updated = [newActivity, ...prev];
      return updated.slice(0, maxActivities);
    });
  }, [maxActivities]);

  const clearActivities = useCallback(() => {
    setActivities([]);
  }, []);

  // Demo mode - simulate random activities
  useEffect(() => {
    if (!demoMode || !isLive) {
      if (demoIntervalRef.current) {
        clearInterval(demoIntervalRef.current);
      }
      return;
    }

    const demoActivities: Omit<ActivityEvent, 'id' | 'timestamp'>[] = [
      {
        type: 'clock_in',
        title: 'Officer Clocked In',
        description: 'Started shift at assigned location',
        entity: 'Marcus Johnson',
        location: 'Downtown Plaza',
        priority: 'normal'
      },
      {
        type: 'clock_out',
        title: 'Officer Clocked Out',
        description: 'Completed 8-hour shift',
        entity: 'Sarah Chen',
        location: 'Tech Park Campus',
        priority: 'normal'
      },
      {
        type: 'incident',
        title: 'Incident Reported',
        description: 'Suspicious activity reported near entrance',
        entity: 'James Wilson',
        location: 'Harbor Mall',
        priority: 'high'
      },
      {
        type: 'alert',
        title: 'Coverage Alert',
        description: 'Shift starting in 30 minutes with no officer assigned',
        location: 'Central Station',
        priority: 'critical'
      },
      {
        type: 'shift_assigned',
        title: 'Shift Assigned',
        description: 'New shift assignment confirmed',
        entity: 'Emily Rodriguez',
        location: 'Business Center',
        priority: 'normal'
      },
      {
        type: 'report_submitted',
        title: 'DAR Submitted',
        description: 'Daily Activity Report filed',
        entity: 'Michael Chang',
        location: 'Riverside Complex',
        priority: 'normal'
      },
      {
        type: 'shift_completed',
        title: 'Shift Completed',
        description: 'All checkpoints verified',
        entity: 'David Park',
        location: 'Corporate HQ',
        priority: 'normal'
      }
    ];

    // Add initial activity
    const randomIndex = Math.floor(Math.random() * demoActivities.length);
    addActivity(demoActivities[randomIndex]);

    // Continue adding activities at interval
    demoIntervalRef.current = setInterval(() => {
      const randomIdx = Math.floor(Math.random() * demoActivities.length);
      addActivity(demoActivities[randomIdx]);
    }, demoInterval);

    return () => {
      if (demoIntervalRef.current) {
        clearInterval(demoIntervalRef.current);
      }
    };
  }, [demoMode, demoInterval, isLive, addActivity]);

  return (
    <ActivityFeedContext.Provider value={{
      activities,
      latestActivity,
      isLive,
      addActivity,
      clearActivities,
      setIsLive
    }}>
      {children}
    </ActivityFeedContext.Provider>
  );
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getActivityIcon(type: ActivityType) {
  switch (type) {
    case 'clock_in': return LogIn;
    case 'clock_out': return LogOut;
    case 'incident': return AlertTriangle;
    case 'alert': return AlertCircle;
    case 'shift_assigned': return Users;
    case 'shift_completed': return CheckCircle2;
    case 'report_submitted': return FileText;
    case 'officer_added': return Users;
    case 'site_update': return MapPin;
    default: return Activity;
  }
}

function getActivityColor(type: ActivityType, priority?: string) {
  if (priority === 'critical') return 'text-red-500 bg-red-500/10';
  if (priority === 'high') return 'text-amber-500 bg-amber-500/10';
  
  switch (type) {
    case 'clock_in': return 'text-emerald-500 bg-emerald-500/10';
    case 'clock_out': return 'text-slate-500 bg-slate-500/10';
    case 'incident': return 'text-amber-500 bg-amber-500/10';
    case 'alert': return 'text-red-500 bg-red-500/10';
    case 'shift_assigned': return 'text-blue-500 bg-blue-500/10';
    case 'shift_completed': return 'text-emerald-500 bg-emerald-500/10';
    case 'report_submitted': return 'text-purple-500 bg-purple-500/10';
    case 'officer_added': return 'text-blue-500 bg-blue-500/10';
    case 'site_update': return 'text-cyan-500 bg-cyan-500/10';
    default: return 'text-muted-foreground bg-muted';
  }
}

function getPulseColor(type?: ActivityType, priority?: string) {
  if (priority === 'critical') return 'bg-red-500';
  if (priority === 'high') return 'bg-amber-500';
  if (type === 'clock_in' || type === 'shift_completed') return 'bg-emerald-500';
  if (type === 'incident') return 'bg-amber-500';
  if (type === 'alert') return 'bg-red-500';
  return 'bg-primary';
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);

  if (seconds < 10) return 'Just now';
  if (seconds < 60) return `${seconds}s ago`;
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  
  return date.toLocaleDateString();
}

// ============================================================================
// ACTIVITY ITEM COMPONENT
// ============================================================================

interface ActivityItemProps {
  activity: ActivityEvent;
  compact?: boolean;
  onClick?: () => void;
}

function ActivityItem({ activity, compact = false, onClick }: ActivityItemProps) {
  const Icon = getActivityIcon(activity.type);
  const colorClass = getActivityColor(activity.type, activity.priority);

  if (compact) {
    return (
      <div 
        className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
        onClick={onClick}
      >
        <div className={cn('p-1 rounded', colorClass)}>
          <Icon className="h-3 w-3" />
        </div>
        <span className="text-xs text-muted-foreground truncate flex-1">
          {activity.entity || activity.title}
        </span>
        <span className="text-[10px] text-muted-foreground/60">
          {getTimeAgo(activity.timestamp)}
        </span>
      </div>
    );
  }

  return (
    <div 
      className={cn(
        "flex gap-3 p-3 rounded-xl transition-all cursor-pointer",
        "hover:bg-muted/50 border border-transparent hover:border-border",
        activity.priority === 'critical' && "bg-red-500/5 border-red-500/20"
      )}
      onClick={onClick}
    >
      <div className={cn('p-2 rounded-lg shrink-0 h-fit', colorClass)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-medium text-foreground">{activity.title}</p>
            {activity.entity && (
              <p className="text-sm text-foreground/80">{activity.entity}</p>
            )}
          </div>
          <span className="text-xs text-muted-foreground shrink-0">
            {getTimeAgo(activity.timestamp)}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{activity.description}</p>
        {activity.location && (
          <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <span>{activity.location}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// PULSE INDICATOR COMPONENT
// ============================================================================

interface PulseIndicatorProps {
  isActive: boolean;
  color?: string;
  size?: 'sm' | 'md' | 'lg';
}

function PulseIndicator({ isActive, color = 'bg-emerald-500', size = 'md' }: PulseIndicatorProps) {
  const sizes = {
    sm: 'h-2 w-2',
    md: 'h-2.5 w-2.5',
    lg: 'h-3 w-3'
  };

  return (
    <span className="relative flex items-center justify-center">
      {isActive && (
        <span 
          className={cn(
            "absolute inline-flex rounded-full opacity-75 animate-ping",
            sizes[size],
            color
          )} 
        />
      )}
      <span 
        className={cn(
          "relative inline-flex rounded-full",
          sizes[size],
          color
        )} 
      />
    </span>
  );
}

// ============================================================================
// LIVE ACTIVITY PULSE (COMPACT - FOR SIDEBAR)
// ============================================================================

interface LiveActivityPulseProps {
  collapsed?: boolean;
  onExpand?: () => void;
  className?: string;
}

export function LiveActivityPulse({ collapsed = false, onExpand, className }: LiveActivityPulseProps) {
  const { latestActivity, isLive, activities } = useActivityFeed();
  const [showPreview, setShowPreview] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const prevActivityRef = useRef<string | null>(null);

  // Trigger animation when new activity arrives
  useEffect(() => {
    if (latestActivity && latestActivity.id !== prevActivityRef.current) {
      prevActivityRef.current = latestActivity.id;
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [latestActivity]);

  const pulseColor = latestActivity 
    ? getPulseColor(latestActivity.type, latestActivity.priority)
    : 'bg-muted-foreground';

  if (collapsed) {
    return (
      <div className={cn("relative", className)}>
        <button
          onClick={onExpand}
          className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center mx-auto",
            "hover:bg-muted transition-all relative",
            isAnimating && "ring-2 ring-primary/30"
          )}
          title="Live Activity"
        >
          <Activity className={cn(
            "h-5 w-5 transition-colors",
            isLive ? "text-primary" : "text-muted-foreground"
          )} />
          <div className="absolute top-1.5 right-1.5">
            <PulseIndicator isActive={isLive && !!latestActivity} color={pulseColor} size="sm" />
          </div>
        </button>
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      <button
        onClick={() => setShowPreview(!showPreview)}
        className={cn(
          "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all",
          "hover:bg-muted/50 text-left",
          isAnimating && "bg-primary/5 ring-1 ring-primary/20",
          showPreview && "bg-muted/50"
        )}
      >
        <div className="relative">
          <div className={cn(
            "p-2 rounded-lg transition-colors",
            isLive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
          )}>
            <Zap className="h-4 w-4" />
          </div>
          <div className="absolute -top-0.5 -right-0.5">
            <PulseIndicator isActive={isLive && !!latestActivity} color={pulseColor} size="sm" />
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">Live Activity</span>
            {activities.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                {activities.length}
              </span>
            )}
          </div>
          {latestActivity ? (
            <p className={cn(
              "text-xs text-muted-foreground truncate transition-all",
              isAnimating && "text-foreground"
            )}>
              {latestActivity.entity || latestActivity.title} • {getTimeAgo(latestActivity.timestamp)}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">No recent activity</p>
          )}
        </div>

        <ChevronRight className={cn(
          "h-4 w-4 text-muted-foreground transition-transform",
          showPreview && "rotate-90"
        )} />
      </button>

      {/* Mini Preview */}
      {showPreview && activities.length > 0 && (
        <div className="mt-1 mx-1 p-2 rounded-lg bg-muted/30 border border-border/50 space-y-0.5 animate-in fade-in slide-in-from-top-2 duration-200">
          {activities.slice(0, 4).map(activity => (
            <React.Fragment key={activity.id}>
              <ActivityItem activity={activity} compact />
            </React.Fragment>
          ))}
          {activities.length > 4 && (
            <button
              onClick={onExpand}
              className="w-full text-xs text-primary hover:underline py-1.5 text-center"
            >
              View all {activities.length} activities
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// FULL ACTIVITY STREAM (PANEL)
// ============================================================================

interface ActivityStreamProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ActivityStream({ isOpen, onClose }: ActivityStreamProps) {
  const { activities, isLive, setIsLive, clearActivities } = useActivityFeed();

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-card/95 backdrop-blur-xl border-l border-border shadow-2xl h-full flex flex-col animate-in slide-in-from-right duration-300"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="p-2 rounded-lg bg-primary/10">
                <Activity className="h-5 w-5 text-primary" />
              </div>
              <div className="absolute -top-0.5 -right-0.5">
                <PulseIndicator isActive={isLive} color="bg-primary" size="sm" />
              </div>
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Live Activity</h2>
              <p className="text-xs text-muted-foreground">
                {activities.length} events • {isLive ? 'Live' : 'Paused'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Live Toggle */}
            <button
              onClick={() => setIsLive(!isLive)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                isLive 
                  ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20" 
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {isLive ? 'Live' : 'Paused'}
            </button>
            
            {/* Close */}
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Activity List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
          {activities.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Shield className="h-12 w-12 mb-4 opacity-20" />
              <p className="font-medium">No Activity Yet</p>
              <p className="text-sm text-center mt-1">
                Events will appear here in real-time
              </p>
            </div>
          ) : (
            activities.map(activity => (
              <React.Fragment key={activity.id}>
                <ActivityItem activity={activity} />
              </React.Fragment>
            ))
          )}
        </div>

        {/* Footer */}
        {activities.length > 0 && (
          <div className="px-6 py-3 border-t border-border">
            <button
              onClick={clearActivities}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear all activities
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// COMBINED COMPONENT (SIDEBAR + PANEL)
// ============================================================================

interface LiveActivityWidgetProps {
  collapsed?: boolean;
  className?: string;
}

export function LiveActivityWidget({ collapsed = false, className }: LiveActivityWidgetProps) {
  const [isStreamOpen, setIsStreamOpen] = useState(false);

  return (
    <>
      <LiveActivityPulse
        collapsed={collapsed}
        onExpand={() => setIsStreamOpen(true)}
        className={className}
      />
      <ActivityStream
        isOpen={isStreamOpen}
        onClose={() => setIsStreamOpen(false)}
      />
    </>
  );
}

export default LiveActivityWidget;
