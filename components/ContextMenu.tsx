/**
 * ContextMenu Component
 * Right-click context menus for quick actions
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { cn } from './ui';

export interface ContextMenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  shortcut?: string;
  variant?: 'default' | 'danger';
  divider?: boolean;
}

interface ContextMenuProps {
  items: ContextMenuItem[];
  isOpen: boolean;
  position: { x: number; y: number };
  onClose: () => void;
}

export function ContextMenu({ items, isOpen, position, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  // Adjust position to keep menu on screen
  const adjustedPosition = React.useMemo(() => {
    if (!isOpen) return { x: 0, y: 0 };

    const menuWidth = 220;
    const menuHeight = Math.min(items.length * 40 + 16, 400);

    let x = position.x;
    let y = position.y;

    // Adjust if too close to right edge
    if (x + menuWidth > window.innerWidth) {
      x = window.innerWidth - menuWidth - 16;
    }

    // Adjust if too close to bottom edge
    if (y + menuHeight > window.innerHeight) {
      y = window.innerHeight - menuHeight - 16;
    }

    return { x, y };
  }, [isOpen, position, items.length]);

  if (!isOpen) return null;

  return createPortal(
    <div
      ref={menuRef}
      className="fixed z-[200] min-w-[200px] bg-background border border-border shadow-xl rounded-lg py-2 animate-in zoom-in-95 fade-in duration-100"
      style={{
        left: adjustedPosition.x,
        top: adjustedPosition.y
      }}
    >
      {items.map((item, index) => (
        <React.Fragment key={item.id}>
          {item.divider && index > 0 && (
            <div className="my-1 border-t border-border" />
          )}
          <button
            onClick={() => {
              if (!item.disabled) {
                item.onClick();
                onClose();
              }
            }}
            disabled={item.disabled}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors",
              "hover:bg-muted focus:bg-muted focus:outline-none",
              item.disabled && "opacity-50 cursor-not-allowed",
              item.variant === 'danger' && "text-red-600 hover:bg-red-50",
              !item.variant && "text-foreground"
            )}
          >
            {item.icon && (
              <span className="text-muted-foreground">
                {item.icon}
              </span>
            )}
            <span className="flex-1 text-left">{item.label}</span>
            {item.shortcut && (
              <kbd className="text-xs text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">
                {item.shortcut}
              </kbd>
            )}
          </button>
        </React.Fragment>
      ))}
    </div>,
    document.body
  );
}

// Hook to manage context menu state
export function useContextMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [items, setItems] = useState<ContextMenuItem[]>([]);

  const openMenu = useCallback((e: React.MouseEvent, menuItems: ContextMenuItem[]) => {
    e.preventDefault();
    setPosition({ x: e.clientX, y: e.clientY });
    setItems(menuItems);
    setIsOpen(true);
  }, []);

  const closeMenu = useCallback(() => {
    setIsOpen(false);
  }, []);

  return {
    isOpen,
    position,
    items,
    openMenu,
    closeMenu
  };
}

// Preset context menu configurations

export const officerContextMenu = (
  officer: { id: string; full_name: string; email: string },
  actions: {
    onView: () => void;
    onEdit: () => void;
    onDelete: () => void;
    onCopyEmail: () => void;
  }
): ContextMenuItem[] => [
  {
    id: 'view',
    label: 'View Profile',
    icon: <span>👤</span>,
    onClick: actions.onView,
    shortcut: '↵'
  },
  {
    id: 'edit',
    label: 'Edit',
    icon: <span>✏️</span>,
    onClick: actions.onEdit,
    shortcut: 'E'
  },
  {
    id: 'copy-email',
    label: 'Copy Email',
    icon: <span>📋</span>,
    onClick: actions.onCopyEmail
  },
  {
    id: 'divider-1',
    label: '',
    onClick: () => {},
    divider: true
  },
  {
    id: 'delete',
    label: 'Delete',
    icon: <span>🗑️</span>,
    onClick: actions.onDelete,
    variant: 'danger',
    shortcut: 'Del'
  }
];

export const scheduleContextMenu = (
  shift: { id: string },
  actions: {
    onEdit: () => void;
    onAssign: () => void;
    onDelete: () => void;
    onDuplicate: () => void;
  }
): ContextMenuItem[] => [
  {
    id: 'edit',
    label: 'Edit Shift',
    icon: <span>✏️</span>,
    onClick: actions.onEdit
  },
  {
    id: 'assign',
    label: 'Assign Officer',
    icon: <span>👮</span>,
    onClick: actions.onAssign
  },
  {
    id: 'duplicate',
    label: 'Duplicate',
    icon: <span>📄</span>,
    onClick: actions.onDuplicate
  },
  {
    id: 'divider-1',
    label: '',
    onClick: () => {},
    divider: true
  },
  {
    id: 'delete',
    label: 'Delete',
    icon: <span>🗑️</span>,
    onClick: actions.onDelete,
    variant: 'danger'
  }
];

export const dashboardContextMenu = (
  actions: {
    onRefresh: () => void;
    onAddOfficer: () => void;
    onCreateShift: () => void;
    onViewReports: () => void;
  }
): ContextMenuItem[] => [
  {
    id: 'refresh',
    label: 'Refresh Data',
    icon: <span>🔄</span>,
    onClick: actions.onRefresh,
    shortcut: 'R'
  },
  {
    id: 'divider-1',
    label: '',
    onClick: () => {},
    divider: true
  },
  {
    id: 'add-officer',
    label: 'Add Officer',
    icon: <span>👮</span>,
    onClick: actions.onAddOfficer
  },
  {
    id: 'create-shift',
    label: 'Create Shift',
    icon: <span>📅</span>,
    onClick: actions.onCreateShift
  },
  {
    id: 'view-reports',
    label: 'View Reports',
    icon: <span>📊</span>,
    onClick: actions.onViewReports
  }
];

// Wrapper component to add context menu to any element
interface ContextMenuWrapperProps {
  children: React.ReactNode;
  items: ContextMenuItem[];
  className?: string;
}

export function ContextMenuWrapper({ children, items, className }: ContextMenuWrapperProps) {
  const { isOpen, position, openMenu, closeMenu } = useContextMenu();

  return (
    <>
      <div
        className={className}
        onContextMenu={(e) => openMenu(e, items)}
      >
        {children}
      </div>
      <ContextMenu
        items={items}
        isOpen={isOpen}
        position={position}
        onClose={closeMenu}
      />
    </>
  );
}

export default ContextMenu;
