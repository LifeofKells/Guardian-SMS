/**
 * KeyboardShortcutsHelp Component
 * Press ? to show all available keyboard shortcuts
 */

import React, { useState, useEffect } from 'react';
import { Dialog, cn } from './ui';
import { Command, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Search, Plus, Edit, Trash2, Filter } from 'lucide-react';

interface Shortcut {
  keys: string[];
  description: string;
  category: 'Navigation' | 'Actions' | 'Selection' | 'Global';
}

const shortcuts: Shortcut[] = [
  // Global shortcuts
  { keys: ['?'], description: 'Show keyboard shortcuts', category: 'Global' },
  { keys: ['Ctrl', 'K'], description: 'Open Command Palette', category: 'Global' },
  { keys: ['Esc'], description: 'Close modal / Cancel', category: 'Global' },
  
  // Navigation
  { keys: ['G', 'then', 'D'], description: 'Go to Dashboard', category: 'Navigation' },
  { keys: ['G', 'then', 'S'], description: 'Go to Schedule', category: 'Navigation' },
  { keys: ['G', 'then', 'O'], description: 'Go to Officers', category: 'Navigation' },
  { keys: ['G', 'then', 'C'], description: 'Go to Clients', category: 'Navigation' },
  { keys: ['G', 'then', 'T'], description: 'Go to Timesheets', category: 'Navigation' },
  { keys: ['G', 'then', 'R'], description: 'Go to Reports', category: 'Navigation' },
  
  // Actions
  { keys: ['N'], description: 'Create new (context-aware)', category: 'Actions' },
  { keys: ['E'], description: 'Edit selected item', category: 'Actions' },
  { keys: ['Ctrl', 'Enter'], description: 'Save / Submit form', category: 'Actions' },
  { keys: ['Delete'], description: 'Delete selected item', category: 'Actions' },
  { keys: ['F'], description: 'Focus search', category: 'Actions' },
  
  // Selection
  { keys: ['Space'], description: 'Toggle selection', category: 'Selection' },
  { keys: ['Ctrl', 'A'], description: 'Select all', category: 'Selection' },
  { keys: ['Ctrl', 'Shift', 'A'], description: 'Deselect all', category: 'Selection' },
  { keys: ['↑', '↓'], description: 'Navigate up/down', category: 'Selection' },
  { keys: ['←', '→'], description: 'Navigate left/right', category: 'Selection' },
];

interface KeyboardShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsHelp({ isOpen, onClose }: KeyboardShortcutsHelpProps) {
  const [activeCategory, setActiveCategory] = useState<string>('All');

  const categories = ['All', ...Array.from(new Set(shortcuts.map(s => s.category)))];
  
  const filteredShortcuts = activeCategory === 'All' 
    ? shortcuts 
    : shortcuts.filter(s => s.category === activeCategory);

  const shortcutsByCategory = filteredShortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = [];
    }
    acc[shortcut.category].push(shortcut);
    return acc;
  }, {} as Record<string, Shortcut[]>);

  return (
    <Dialog
      open={isOpen}
      onOpenChange={onClose}
      className="max-w-2xl"
    >
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Command className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Keyboard Shortcuts</h2>
              <p className="text-sm text-muted-foreground">
                Press <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">?</kbd> anytime to show this help
              </p>
            </div>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={cn(
                "px-3 py-1.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap",
                activeCategory === category
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80 text-muted-foreground"
              )}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Shortcuts List */}
        <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2">
          {Object.entries(shortcutsByCategory).map(([category, categoryShortcuts]) => (
            <div key={category}>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                {category}
              </h3>
              <div className="space-y-2">
                {categoryShortcuts.map((shortcut, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <span className="text-sm">{shortcut.description}</span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, keyIdx) => (
                        <React.Fragment key={keyIdx}>
                          {keyIdx > 0 && (
                            <span className="text-muted-foreground text-xs mx-1">
                              {key === 'then' ? 'then' : '+'}
                            </span>
                          )}
                          <kbd
                            className={cn(
                              "px-2 py-1 text-xs font-mono rounded",
                              key === 'then'
                                ? "text-muted-foreground italic bg-transparent"
                                : "bg-muted border border-border shadow-sm"
                            )}
                          >
                            {key === '↑' && <ArrowUp className="h-3 w-3" />}
                            {key === '↓' && <ArrowDown className="h-3 w-3" />}
                            {key === '←' && <ArrowLeft className="h-3 w-3" />}
                            {key === '→' && <ArrowRight className="h-3 w-3" />}
                            {!['↑', '↓', '←', '→'].includes(key) && key}
                          </kbd>
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer Tip */}
        <div className="mt-6 pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">
            💡 Pro tip: Shortcuts work on most pages. Try them out!
          </p>
        </div>
      </div>
    </Dialog>
  );
}

// Hook to manage keyboard shortcuts visibility
export function useKeyboardShortcutsHelp() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === '?') {
        e.preventDefault();
        setIsOpen(true);
      }

      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return { isOpen, setIsOpen };
}

export default KeyboardShortcutsHelp;
