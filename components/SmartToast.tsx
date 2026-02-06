/**
 * SmartToast Component
 * Enhanced toasts with actions, progress bars, and better UX
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { cn } from './ui';
import { X, Undo, Eye, RefreshCw, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
}

export interface SmartToast {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
  actions?: ToastAction[];
  onDismiss?: () => void;
  showProgress?: boolean;
  icon?: React.ReactNode;
}

// Hook to manage smart toasts
export function useSmartToast() {
  const [toasts, setToasts] = useState<SmartToast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(({
    type,
    title,
    description,
    duration = 5000,
    actions,
    onDismiss,
    showProgress = true,
    icon
  }: Omit<SmartToast, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: SmartToast = { 
      id, 
      type, 
      title, 
      description, 
      duration,
      actions,
      onDismiss,
      showProgress,
      icon
    };
    
    setToasts((prev) => [...prev, newToast]);

    return id;
  }, []);

  const updateToast = useCallback((id: string, updates: Partial<SmartToast>) => {
    setToasts((prev) => prev.map((t) => 
      t.id === id ? { ...t, ...updates } : t
    ));
  }, []);

  return { toasts, addToast, removeToast, updateToast };
}

// Toast Item Component with progress bar and actions
interface ToastItemProps {
  toast: SmartToast;
  onDismiss: () => void;
  index: number;
}

function ToastItem({ toast, onDismiss, index }: ToastItemProps) {
  const [progress, setProgress] = useState(100);
  const [isPaused, setIsPaused] = useState(false);
  const progressRef = useRef<NodeJS.Timeout | null>(null);
  const duration = toast.duration || 5000;

  useEffect(() => {
    if (duration <= 0 || isPaused) return;

    const startTime = Date.now();
    const endTime = startTime + (progress / 100) * duration;

    const updateProgress = () => {
      const now = Date.now();
      const remaining = Math.max(0, endTime - now);
      const newProgress = (remaining / duration) * 100;
      
      setProgress(newProgress);
      
      if (newProgress > 0) {
        progressRef.current = setTimeout(updateProgress, 16);
      } else {
        onDismiss();
      }
    };

    progressRef.current = setTimeout(updateProgress, 16);

    return () => {
      if (progressRef.current) {
        clearTimeout(progressRef.current);
      }
    };
  }, [duration, isPaused, progress, onDismiss]);

  const handleMouseEnter = () => setIsPaused(true);
  const handleMouseLeave = () => setIsPaused(false);

  const icons = {
    success: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
    error: <AlertCircle className="h-5 w-5 text-red-500" />,
    info: <Info className="h-5 w-5 text-blue-500" />,
    warning: <AlertTriangle className="h-5 w-5 text-amber-500" />
  };

  const bgColors = {
    success: 'border-emerald-200 bg-emerald-50/50',
    error: 'border-red-200 bg-red-50/50',
    info: 'border-blue-200 bg-blue-50/50',
    warning: 'border-amber-200 bg-amber-50/50'
  };

  return (
    <div
      className={cn(
        "relative pointer-events-auto flex flex-col gap-2 w-full bg-background border shadow-lg rounded-lg overflow-hidden",
        "animate-in slide-in-from-right-full fade-in duration-300",
        bgColors[toast.type]
      )}
      style={{ 
        animationDelay: `${index * 100}ms`,
        zIndex: 100 - index 
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Main Content */}
      <div className="flex items-start gap-3 p-4">
        <div className="mt-0.5 shrink-0">
          {toast.icon || icons[toast.type]}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm">{toast.title}</h4>
          {toast.description && (
            <p className="text-xs text-muted-foreground mt-1">{toast.description}</p>
          )}
        </div>
        <button 
          onClick={onDismiss} 
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Actions */}
      {toast.actions && toast.actions.length > 0 && (
        <div className="flex gap-2 px-4 pb-3">
          {toast.actions.map((action, idx) => (
            <button
              key={idx}
              onClick={() => {
                action.onClick();
                onDismiss();
              }}
              className={cn(
                "text-xs font-medium px-3 py-1.5 rounded-md transition-colors",
                action.variant === 'danger' && "bg-red-100 text-red-700 hover:bg-red-200",
                action.variant === 'primary' && "bg-primary text-primary-foreground hover:bg-primary/90",
                (!action.variant || action.variant === 'secondary') && "bg-muted hover:bg-muted/80"
              )}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}

      {/* Progress Bar */}
      {toast.showProgress && duration > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted/50">
          <div
            className={cn(
              "h-full transition-all duration-100 ease-linear",
              toast.type === 'success' && "bg-emerald-500",
              toast.type === 'error' && "bg-red-500",
              toast.type === 'info' && "bg-blue-500",
              toast.type === 'warning' && "bg-amber-500"
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}

// Smart Toast Container
interface SmartToastContainerProps {
  toasts: SmartToast[];
  removeToast: (id: string) => void;
}

export function SmartToastContainer({ toasts, removeToast }: SmartToastContainerProps) {
  if (toasts.length === 0) return null;

  return createPortal(
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-full max-w-sm pointer-events-none">
      {toasts.map((toast, index) => (
        <div key={toast.id}>
          <ToastItem
            toast={toast}
            onDismiss={() => removeToast(toast.id)}
            index={index}
          />
        </div>
      ))}
    </div>,
    document.body
  );
}

// Context Provider for Smart Toasts
import { createContext, useContext } from 'react';

interface SmartToastContextType {
  toasts: SmartToast[];
  addToast: (toast: Omit<SmartToast, 'id'>) => string;
  removeToast: (id: string) => void;
  updateToast: (id: string, updates: Partial<SmartToast>) => void;
}

const SmartToastContext = createContext<SmartToastContextType | null>(null);

export function SmartToastProvider({ children }: { children: React.ReactNode }) {
  const { toasts, addToast, removeToast, updateToast } = useSmartToast();

  return (
    <SmartToastContext.Provider value={{ toasts, addToast, removeToast, updateToast }}>
      {children}
      <SmartToastContainer toasts={toasts} removeToast={removeToast} />
    </SmartToastContext.Provider>
  );
}

export function useSmartToastContext() {
  const context = useContext(SmartToastContext);
  if (!context) {
    throw new Error('useSmartToastContext must be used within SmartToastProvider');
  }
  return context;
}

// Preset toast configurations for common use cases
export const toastPresets = {
  undoDelete: (onUndo: () => void) => ({
    type: 'info' as ToastType,
    title: 'Item Deleted',
    description: 'The item has been deleted successfully.',
    duration: 6000,
    actions: [
      {
        label: 'Undo',
        onClick: onUndo,
        variant: 'primary' as const
      }
    ]
  }),

  saveSuccess: (itemName: string) => ({
    type: 'success' as ToastType,
    title: 'Saved Successfully',
    description: `${itemName} has been saved.`,
    duration: 3000
  }),

  errorWithRetry: (message: string, onRetry: () => void) => ({
    type: 'error' as ToastType,
    title: 'Error',
    description: message,
    duration: 8000,
    actions: [
      {
        label: 'Retry',
        onClick: onRetry,
        variant: 'primary' as const
      }
    ]
  }),

  loading: (message: string) => ({
    type: 'info' as ToastType,
    title: 'Loading',
    description: message,
    duration: 0,
    showProgress: false
  }),

  exportComplete: (filename: string, onView: () => void) => ({
    type: 'success' as ToastType,
    title: 'Export Complete',
    description: `${filename} has been exported.`,
    duration: 6000,
    actions: [
      {
        label: 'View',
        onClick: onView,
        variant: 'secondary' as const
      }
    ]
  })
};

export default SmartToastContainer;
