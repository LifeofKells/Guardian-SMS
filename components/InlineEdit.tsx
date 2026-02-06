import React, { useState, useRef, useEffect } from 'react';
import { Check, X, Pencil } from 'lucide-react';
import { cn } from './ui';

interface InlineEditProps {
  value: string;
  onSave: (value: string) => void;
  onCancel?: () => void;
  className?: string;
  inputClassName?: string;
  displayClassName?: string;
  validate?: (value: string) => boolean | string;
  multiline?: boolean;
  placeholder?: string;
  disabled?: boolean;
}

export function InlineEdit({
  value,
  onSave,
  onCancel,
  className,
  inputClassName,
  displayClassName,
  validate,
  multiline = false,
  placeholder = 'Click to edit...',
  disabled = false
}: InlineEditProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleDoubleClick = () => {
    if (!disabled) {
      setIsEditing(true);
      setEditValue(value);
      setError(null);
    }
  };

  const handleSave = () => {
    if (validate) {
      const validation = validate(editValue);
      if (validation !== true) {
        setError(typeof validation === 'string' ? validation : 'Invalid value');
        return;
      }
    }

    if (editValue !== value) {
      onSave(editValue);
    }
    setIsEditing(false);
    setError(null);
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
    setError(null);
    onCancel?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !multiline) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div className={cn("inline-flex items-center gap-2", className)}>
        {multiline ? (
          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSave}
            className={cn(
              "px-2 py-1 text-sm border rounded resize-none",
              "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary",
              error && "border-red-500 focus:border-red-500",
              inputClassName
            )}
            rows={3}
          />
        ) : (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSave}
            className={cn(
              "px-2 py-1 text-sm border rounded",
              "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary",
              error && "border-red-500 focus:border-red-500",
              inputClassName
            )}
          />
        )}
        
        <div className="flex items-center gap-1">
          <button
            onClick={handleSave}
            className="p-1 rounded hover:bg-green-100 text-green-600 transition-colors"
            title="Save"
          >
            <Check className="h-4 w-4" />
          </button>
          <button
            onClick={handleCancel}
            className="p-1 rounded hover:bg-red-100 text-red-600 transition-colors"
            title="Cancel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <span className="text-xs text-red-500 ml-2">{error}</span>
        )}
      </div>
    );
  }

  return (
    <span
      onDoubleClick={handleDoubleClick}
      className={cn(
        "inline-flex items-center gap-2 group cursor-pointer",
        "hover:bg-muted/50 rounded px-1 -mx-1 transition-colors",
        disabled && "cursor-default hover:bg-transparent",
        displayClassName
      )}
      title={disabled ? '' : 'Double-click to edit'}
    >
      <span className={cn(!value && "text-muted-foreground italic")}>
        {value || placeholder}
      </span>
      {!disabled && (
        <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
      )}
    </span>
  );
}

interface InlineEditFieldProps {
  label: string;
  value: string;
  onSave: (value: string) => void;
  className?: string;
  validate?: (value: string) => boolean | string;
}

export function InlineEditField({ label, value, onSave, className, validate }: InlineEditFieldProps) {
  return (
    <div className={cn("space-y-1", className)}>
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <div className="text-sm">
        <InlineEdit value={value} onSave={onSave} validate={validate} />
      </div>
    </div>
  );
}

export default InlineEdit;
