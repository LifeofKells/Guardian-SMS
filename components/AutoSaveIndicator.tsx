/**
 * AutoSaveIndicator Component
 * Shows saving status to prevent data loss anxiety
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Save, Check, AlertCircle } from 'lucide-react';
import { cn } from './ui';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface AutoSaveIndicatorProps {
  status: SaveStatus;
  lastSaved?: Date;
  className?: string;
  showTimestamp?: boolean;
  errorMessage?: string;
}

export function AutoSaveIndicator({ 
  status, 
  lastSaved, 
  className,
  showTimestamp = true,
  errorMessage
}: AutoSaveIndicatorProps) {
  const [displayStatus, setDisplayStatus] = useState(status);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setDisplayStatus(status);
    
    if (status !== 'idle') {
      setVisible(true);
    }

    // Auto-hide saved state after 3 seconds
    if (status === 'saved') {
      const timer = setTimeout(() => {
        setVisible(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  const getStatusConfig = () => {
    switch (displayStatus) {
      case 'saving':
        return {
          icon: <Save className="h-3.5 w-3.5 animate-pulse" />,
          text: 'Saving...',
          className: 'text-amber-600 bg-amber-50 border-amber-200'
        };
      case 'saved':
        return {
          icon: <Check className="h-3.5 w-3.5" />,
          text: 'Saved',
          className: 'text-green-600 bg-green-50 border-green-200'
        };
      case 'error':
        return {
          icon: <AlertCircle className="h-3.5 w-3.5" />,
          text: errorMessage || 'Error saving',
          className: 'text-red-600 bg-red-50 border-red-200'
        };
      default:
        return {
          icon: null,
          text: '',
          className: ''
        };
    }
  };

  const config = getStatusConfig();
  
  if (displayStatus === 'idle' || !visible) {
    return null;
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all duration-300",
        "animate-in fade-in slide-in-from-bottom-2",
        config.className,
        className
      )}
    >
      {config.icon}
      <span>{config.text}</span>
      {showTimestamp && lastSaved && displayStatus === 'saved' && (
        <span className="text-muted-foreground">
          at {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      )}
    </div>
  );
}

// Hook for managing auto-save state
interface UseAutoSaveOptions {
  onSave: () => Promise<void>;
  debounceMs?: number;
}

export function useAutoSave({ onSave, debounceMs = 1000 }: UseAutoSaveOptions) {
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [lastSaved, setLastSaved] = useState<Date | undefined>();
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const triggerSave = useCallback(() => {
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setStatus('saving');

    // Debounce the save
    timeoutRef.current = setTimeout(async () => {
      try {
        await onSave();
        setStatus('saved');
        setLastSaved(new Date());
      } catch (error) {
        setStatus('error');
        console.error('Auto-save failed:', error);
      }
    }, debounceMs);
  }, [onSave, debounceMs]);

  const reset = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setStatus('idle');
  }, []);

  return {
    status,
    lastSaved,
    triggerSave,
    reset
  };
}

// Form wrapper with auto-save
interface AutoSaveFormProps {
  children: React.ReactNode;
  onSave: () => Promise<void>;
  debounceMs?: number;
  className?: string;
  showIndicator?: boolean;
}

export function AutoSaveForm({ 
  children, 
  onSave, 
  debounceMs = 1000,
  className,
  showIndicator = true
}: AutoSaveFormProps) {
  const { status, lastSaved, triggerSave } = useAutoSave({ onSave, debounceMs });

  return (
    <div className={cn("space-y-4", className)}>
      {showIndicator && (
        <div className="flex justify-end">
          <AutoSaveIndicator status={status} lastSaved={lastSaved} />
        </div>
      )}
      <div onChange={triggerSave}>
        {children}
      </div>
    </div>
  );
}

export default AutoSaveIndicator;
