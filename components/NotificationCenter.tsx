/**
 * NotificationCenter Component
 * Bell icon with dropdown for in-app notifications
 * Supports real-time updates, read/unread states, and actions
 */

import React, { useState, useRef, useEffect, createContext, useContext, useCallback } from 'react';
import { 
  Bell, 
  Check, 
  CheckCheck, 
  X, 
  AlertCircle, 
  Info, 
  CheckCircle2, 
  AlertTriangle,
  Clock,
  Settings,
  Trash2,
  ExternalLink
} from 'lucide-react';
import { cn } from './ui';
import { Button } from './ui';

// Types
export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  createdAt: Date;
  /** Optional action button */
  action?: {
    label: string;
    onClick: () => void;
  };
  /** Optional link */
  link?: {
    label: string;
    href: string;
  };
  /** Auto-dismiss after ms (0 = never) */
  autoDismiss?: number;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'read' | 'createdAt'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

// Context
const NotificationContext = createContext<NotificationContextType | null>(null);

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
}

// Provider
interface NotificationProviderProps {
  children: React.ReactNode;
  /** Maximum notifications to keep */
  maxNotifications?: number;
  /** Persist to localStorage */
  persist?: boolean;
  /** Storage key for persistence */
  storageKey?: string;
}

export function NotificationProvider({
  children,
  maxNotifications = 50,
  persist = true,
  storageKey = 'guardian_notifications'
}: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<Notification[]>(() => {
    if (persist && typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          return parsed.map((n: any) => ({
            ...n,
            createdAt: new Date(n.createdAt)
          }));
        }
      } catch (e) {
        console.error('Failed to load notifications:', e);
      }
    }
    return [];
  });

  // Persist notifications
  useEffect(() => {
    if (persist && typeof window !== 'undefined') {
      localStorage.setItem(storageKey, JSON.stringify(notifications));
    }
  }, [notifications, persist, storageKey]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'read' | 'createdAt'>) => {
    const newNotification: Notification = {
      ...notification,
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      read: false,
      createdAt: new Date()
    };

    setNotifications(prev => {
      const updated = [newNotification, ...prev];
      return updated.slice(0, maxNotifications);
    });

    // Auto-dismiss if specified
    if (notification.autoDismiss && notification.autoDismiss > 0) {
      setTimeout(() => {
        removeNotification(newNotification.id);
      }, notification.autoDismiss);
    }
  }, [maxNotifications]);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev =>
      prev.map(n => ({ ...n, read: true }))
    );
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      addNotification,
      markAsRead,
      markAllAsRead,
      removeNotification,
      clearAll
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

// Notification Item
interface NotificationItemProps {
  notification: Notification;
  onRead: (id: string) => void;
  onRemove: (id: string) => void;
  onClose?: () => void;
}

function NotificationItem({ notification, onRead, onRemove, onClose }: NotificationItemProps) {
  const typeIcons = {
    info: Info,
    success: CheckCircle2,
    warning: AlertTriangle,
    error: AlertCircle
  };

  const typeColors = {
    info: 'text-blue-500 bg-blue-500/10',
    success: 'text-emerald-500 bg-emerald-500/10',
    warning: 'text-amber-500 bg-amber-500/10',
    error: 'text-red-500 bg-red-500/10'
  };

  const Icon = typeIcons[notification.type];
  const timeAgo = getTimeAgo(notification.createdAt);

  const handleClick = () => {
    if (!notification.read) {
      onRead(notification.id);
    }
  };

  const handleAction = (e: React.MouseEvent) => {
    e.stopPropagation();
    notification.action?.onClick();
    onClose?.();
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        'group relative p-4 border-b border-border last:border-b-0 transition-colors cursor-pointer',
        notification.read ? 'bg-transparent' : 'bg-primary/5',
        'hover:bg-muted/50'
      )}
    >
      <div className="flex gap-3">
        {/* Icon */}
        <div className={cn('p-2 rounded-lg shrink-0', typeColors[notification.type])}>
          <Icon className="h-4 w-4" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className={cn(
                'text-sm truncate',
                notification.read ? 'font-medium text-foreground' : 'font-semibold text-foreground'
              )}>
                {notification.title}
              </p>
              <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                {notification.message}
              </p>
            </div>

            {/* Remove button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove(notification.id);
              }}
              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-muted transition-all"
            >
              <X className="h-3 w-3 text-muted-foreground" />
            </button>
          </div>

          {/* Actions and Time */}
          <div className="flex items-center gap-3 mt-2">
            {notification.action && (
              <button
                onClick={handleAction}
                className="text-xs font-medium text-primary hover:underline"
              >
                {notification.action.label}
              </button>
            )}
            {notification.link && (
              <a
                href={notification.link.href}
                onClick={onClose}
                className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1"
              >
                {notification.link.label}
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
            <span className="text-xs text-muted-foreground flex items-center gap-1 ml-auto">
              <Clock className="h-3 w-3" />
              {timeAgo}
            </span>
          </div>
        </div>

        {/* Unread indicator */}
        {!notification.read && (
          <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary" />
        )}
      </div>
    </div>
  );
}

// Bell Button with Dropdown
interface NotificationBellProps {
  className?: string;
}

export function NotificationBell({ className }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead, 
    removeNotification,
    clearAll 
  } = useNotifications();

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && 
        buttonRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  return (
    <div className={cn('relative', className)}>
      {/* Bell Button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'relative p-2 rounded-lg transition-colors',
          'hover:bg-muted text-muted-foreground hover:text-foreground',
          isOpen && 'bg-muted text-foreground'
        )}
        aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
      >
        <Bell className="h-5 w-5" />
        
        {/* Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className={cn(
            'absolute right-0 top-full mt-2 w-96 max-w-[calc(100vw-2rem)]',
            'bg-card border border-border rounded-xl shadow-xl',
            'animate-in fade-in slide-in-from-top-2 duration-200',
            'z-50 overflow-hidden'
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
            <h3 className="font-semibold text-foreground">Notifications</h3>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  title="Mark all as read"
                >
                  <CheckCheck className="h-4 w-4" />
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={clearAll}
                  className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-destructive transition-colors"
                  title="Clear all"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Bell className="h-10 w-10 mb-3 opacity-20" />
                <p className="text-sm font-medium">No notifications</p>
                <p className="text-xs">You're all caught up!</p>
              </div>
            ) : (
              notifications.map(notification => (
                <React.Fragment key={notification.id}>
                  <NotificationItem
                    notification={notification}
                    onRead={markAsRead}
                    onRemove={removeNotification}
                    onClose={() => setIsOpen(false)}
                  />
                </React.Fragment>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2 border-t border-border bg-muted/30 text-center">
              <button
                onClick={() => {
                  // Could navigate to notifications page
                  setIsOpen(false);
                }}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Helper function
function getTimeAgo(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  
  return date.toLocaleDateString();
}

// Demo notifications hook (for testing)
export function useDemoNotifications() {
  const { addNotification } = useNotifications();

  const addDemoNotification = (type: Notification['type'] = 'info') => {
    const demos: Record<Notification['type'], Omit<Notification, 'id' | 'read' | 'createdAt'>> = {
      info: {
        type: 'info',
        title: 'New shift assigned',
        message: 'You have been assigned to Site Alpha for tomorrow at 8:00 AM.',
        action: {
          label: 'View Schedule',
          onClick: () => console.log('View schedule')
        }
      },
      success: {
        type: 'success',
        title: 'Timesheet approved',
        message: 'Your timesheet for the week of Jan 15-21 has been approved.',
      },
      warning: {
        type: 'warning',
        title: 'License expiring soon',
        message: 'Your security license expires in 30 days. Please renew to continue assignments.',
        action: {
          label: 'Renew Now',
          onClick: () => console.log('Renew license')
        }
      },
      error: {
        type: 'error',
        title: 'Clock-in failed',
        message: 'Unable to record your clock-in. Please try again or contact support.',
        action: {
          label: 'Retry',
          onClick: () => console.log('Retry clock-in')
        }
      }
    };

    addNotification(demos[type]);
  };

  return { addDemoNotification };
}

export default NotificationBell;
