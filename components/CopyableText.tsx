import React, { useState, useCallback } from 'react';
import { Copy, Check } from 'lucide-react';
import { cn } from './ui';

interface CopyableTextProps {
  text: string;
  displayText?: string;
  className?: string;
  iconClassName?: string;
  showIcon?: boolean;
  onCopy?: () => void;
}

export function CopyableText({ 
  text, 
  displayText,
  className = '',
  iconClassName = '',
  showIcon = true,
  onCopy
}: CopyableTextProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      onCopy?.();
      
      // Reset after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [text, onCopy]);

  return (
    <span 
      className={cn(
        "inline-flex items-center gap-1.5 group cursor-pointer",
        "hover:text-primary transition-colors",
        className
      )}
      onClick={handleCopy}
      title="Click to copy"
    >
      <span className="truncate">{displayText || text}</span>
      {showIcon && (
        <span className={cn(
          "opacity-0 group-hover:opacity-100 transition-opacity",
          copied && "opacity-100 text-green-500",
          iconClassName
        )}>
          {copied ? (
            <Check className="h-3.5 w-3.5" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </span>
      )}
    </span>
  );
}

interface CopyButtonProps {
  text: string;
  className?: string;
  variant?: 'default' | 'ghost' | 'icon';
  size?: 'sm' | 'md' | 'lg';
  onCopy?: () => void;
}

export function CopyButton({ 
  text, 
  className = '',
  variant = 'default',
  size = 'md',
  onCopy
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      onCopy?.();
      
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [text, onCopy]);

  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-10 w-10'
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  if (variant === 'icon') {
    return (
      <button
        onClick={handleCopy}
        className={cn(
          "inline-flex items-center justify-center rounded-md transition-colors",
          "hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring",
          copied && "text-green-500 hover:text-green-600",
          sizeClasses[size],
          className
        )}
        title={copied ? 'Copied!' : 'Copy to clipboard'}
      >
        {copied ? (
          <Check className={iconSizes[size]} />
        ) : (
          <Copy className={iconSizes[size]} />
        )}
      </button>
    );
  }

  return (
    <button
      onClick={handleCopy}
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-sm transition-colors",
        variant === 'default' && "bg-muted hover:bg-muted/80",
        variant === 'ghost' && "hover:bg-muted",
        copied && "text-green-600 bg-green-50",
        className
      )}
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5" />
          <span>Copied</span>
        </>
      ) : (
        <>
          <Copy className="h-3.5 w-3.5" />
          <span>Copy</span>
        </>
      )}
    </button>
  );
}

export default CopyableText;
